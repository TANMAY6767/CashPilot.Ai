import prisma from "../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { statusType } from "../utils/statusType.js";

const getUserId = (req) => req.user?.sub;
const auditSelect = {
  id: true, userId: true, entityType: true, entityId: true, action: true,
  oldValue: true, newValue: true, createdAt: true,
  user: { select: { id: true, name: true, email: true } },
};

const getOrganizationAuditScope = async (organizationId, userId) => {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });
  if (!membership) throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.");

  const teams = await prisma.team.findMany({
    where: { organizationId, ...(membership.role === "owner" ? {} : { members: { some: { userId } } }) },
    select: { id: true },
  });
  const historicalTeams = membership.role === "owner" ? await prisma.auditLog.findMany({
    where: { entityType: "team", oldValue: { path: ["organizationId"], equals: organizationId } },
    select: { entityId: true },
  }) : [];
  const teamIds = [...new Set([...teams.map((team) => team.id), ...historicalTeams.map((team) => team.entityId).filter(Boolean)])];
  const [teamMembers, budgets, accounts, transactions, reimbursementClaims, organizationMembers, invitations] = await Promise.all([
    teamIds.length ? prisma.teamMember.findMany({ where: { teamId: { in: teamIds } }, select: { id: true } }) : [],
    teamIds.length ? prisma.budget.findMany({ where: { teamId: { in: teamIds } }, select: { id: true } }) : [],
    prisma.account.findMany({ where: { organizationId, OR: [{ teamId: null }, { teamId: { in: teamIds } }] }, select: { id: true } }),
    prisma.transaction.findMany({ where: { organizationId, OR: [{ teamId: null }, { teamId: { in: teamIds } }] }, select: { id: true } }),
    prisma.reimbursementClaim.findMany({ where: { organizationId, ...(membership.role === "owner" ? {} : { teamId: { in: teamIds } }) }, select: { id: true } }),
    prisma.organizationMember.findMany({ where: { organizationId }, select: { id: true } }),
    membership.role === "owner" ? prisma.organizationInvitation.findMany({ where: { organizationId }, select: { id: true } }) : [],
  ]);

  const entityIds = {
    organization: [organizationId],
    team: teamIds,
    team_member: teamMembers.map((item) => item.id),
    budget: budgets.map((item) => item.id),
    account: accounts.map((item) => item.id),
    transaction: transactions.map((item) => item.id),
    reimbursement_claim: reimbursementClaims.map((item) => item.id),
    organization_member: organizationMembers.map((item) => item.id),
    organization_invitation: invitations.map((item) => item.id),
  };
  const scope = Object.entries(entityIds).filter(([, ids]) => ids.length).map(([entityType, ids]) => ({ entityType, entityId: { in: ids } }));
  // Deleted entities are no longer in their source tables, so their saved
  // before-image carries the organization/team scope needed to retain history.
  scope.push(
    { entityType: "organization_member", oldValue: { path: ["organizationId"], equals: organizationId } },
  );
  if (membership.role === "owner") scope.push({ entityType: "organization_invitation", oldValue: { path: ["organizationId"], equals: organizationId } });
  if (teamIds.length) {
    for (const teamId of teamIds) {
      for (const entityType of ["team_member", "budget", "account", "transaction", "reimbursement_claim"]) scope.push({ entityType, oldValue: { path: ["teamId"], equals: teamId } });
    }
  }
  return { membership, entityIds, where: { OR: scope } };
};

const parseAuditFilters = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25));
  const where = {};
  if (query.entityType) where.entityType = String(query.entityType).slice(0, 50);
  if (query.action) where.action = String(query.action).slice(0, 30);
  if (query.from || query.to) {
    const from = query.from ? new Date(String(query.from)) : undefined;
    const to = query.to ? new Date(String(query.to)) : undefined;
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setUTCHours(23, 59, 59, 999);
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw new ApiError(statusType.BAD_REQUEST, "Date filters must be valid dates.");
    if (from && to && from > to) throw new ApiError(statusType.BAD_REQUEST, "Start date must be before end date.");
    where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }
  const search = String(query.search || "").trim().slice(0, 100);
  if (search) where.OR = [
    { action: { contains: search, mode: "insensitive" } },
    { entityType: { contains: search, mode: "insensitive" } },
    { user: { is: { name: { contains: search, mode: "insensitive" } } } },
    { user: { is: { email: { contains: search, mode: "insensitive" } } } },
    ...( /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search) ? [{ entityId: search }] : []),
  ];
  return { page, limit, where };
};

export const getOrganizationAuditLogs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const organizationId = req.params.organizationId;
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  const scope = await getOrganizationAuditScope(organizationId, userId);
  const { page, limit, where: filters } = parseAuditFilters(req.query);
  const where = { AND: [scope.where, filters] };
  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, select: auditSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ data: { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, message: "Audit log loaded." });
});

export const getMyAuditLogs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  const { page, limit, where: filters } = parseAuditFilters(req.query);
  const where = { AND: [{ userId }, filters] };
  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, select: auditSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ data: { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, message: "Audit log loaded." });
});

export const getEntityAuditLogs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { entityType, entityId } = req.params;
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  const access = await getEntityAccess(entityType, entityId, userId);
  if (!access) throw new ApiError(statusType.FORBIDDEN, "You do not have access to this entity.");
  const logs = await prisma.auditLog.findMany({ where: { entityType, entityId }, select: auditSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
  res.json({ data: { logs }, message: "Entity audit log loaded." });
});

async function getEntityAccess(entityType, entityId, userId) {
  const organizationEntity = entityType === "organization" ? entityId : null;
  if (organizationEntity) return !!(await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: organizationEntity, userId } }, select: { id: true } }));
  const organizationMemberEntity = entityType === "organization_member" ? await prisma.organizationMember.findUnique({ where: { id: entityId }, select: { organizationId: true } }) : null;
  if (organizationMemberEntity) return !!(await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: organizationMemberEntity.organizationId, userId } }, select: { id: true } }));
  const teamMemberEntity = entityType === "team_member" ? await prisma.teamMember.findUnique({ where: { id: entityId }, select: { teamId: true } }) : null;
  const teamId = entityType === "team" ? entityId : teamMemberEntity?.teamId;
  if (teamId) return hasTeamAccess(teamId, userId);
  if (entityType === "budget") {
    const budget = await prisma.budget.findUnique({ where: { id: entityId }, select: { teamId: true } });
    return budget ? hasTeamAccess(budget.teamId, userId) : false;
  }
  if (entityType === "account") {
    const account = await prisma.account.findUnique({ where: { id: entityId }, select: { teamId: true, organizationId: true } });
    if (!account) return false;
    return account.teamId ? hasTeamAccess(account.teamId, userId) : !!(await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: account.organizationId, userId } }, select: { id: true } }));
  }
  if (entityType === "transaction") {
    const transaction = await prisma.transaction.findUnique({ where: { id: entityId }, select: { teamId: true, organizationId: true } });
    if (!transaction) return false;
    return transaction.teamId ? hasTeamAccess(transaction.teamId, userId) : !!(await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: transaction.organizationId, userId } }, select: { id: true } }));
  }
  if (entityType === "reimbursement_claim") {
    const claim = await prisma.reimbursementClaim.findUnique({ where: { id: entityId }, select: { teamId: true, organizationId: true } });
    if (!claim) return false;
    return claim.teamId ? hasTeamAccess(claim.teamId, userId) : !!(await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: claim.organizationId, userId } }, select: { id: true } }));
  }
  return false;
}

async function hasTeamAccess(teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { organizationId: true } });
  if (!team) return false;
  const [teamMembership, organizationMembership] = await Promise.all([
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } }, select: { id: true } }),
    prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: team.organizationId, userId } }, select: { role: true } }),
  ]);
  return !!teamMembership || organizationMembership?.role === "owner";
}
