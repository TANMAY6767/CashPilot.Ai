import prisma from "../prisma/client.js";

const entityFromPath = (path) => {
  if (path === "/org" || path === "/org/") return "organization";
  if (/\/reimbursement-claims(?:\/|$)/.test(path)) return "reimbursement_claim";
  if (/\/accounts\/reimbursements/.test(path)) return "account";
  if (/\/teams\/[^/]+\/transactions/.test(path) || /\/addfunds$/.test(path)) return "transaction";
  if (/\/members\/[^/]+$/.test(path) && /\/teams\//.test(path)) return "team_member";
  if (/\/members/.test(path) && path.includes("/org/")) return "organization_member";
  if (/\/invitations/.test(path) && path.includes("/org/")) return "organization_invitation";
  if (/\/invitations/.test(path)) return "team_invitation";
  if (/\/budget/.test(path)) return "budget";
  if (/\/accounts/.test(path)) return "account";
  if (/\/org\/[^/]+\/teams(?:\/[^/]+)?$/.test(path)) return "team";
  if (/\/org\/[^/]+$/.test(path)) return "organization";
  return null;
};

const unwrap = (body) => body?.data ?? body;

const entityIdFrom = (entityType, body, params) => {
  const data = unwrap(body);
  const singular = {
    team: "team",
    budget: "budget",
    account: "account",
    transaction: "transaction",
    reimbursement_claim: "claim",
    organization: "organization",
    organization_member: "member",
    team_member: "member",
    organization_invitation: "invitation",
    team_invitation: "invitation",
  }[entityType];
  const candidates = [data?.[singular], data?.[`${singular}s`], data, data?.data];
  for (const candidate of candidates) {
    if (candidate?.id) return candidate.id;
    if (Array.isArray(candidate) && candidate[0]?.id) return candidate[0].id;
  }
  if (entityType === "organization") return params.orgId;
  if (entityType === "team") return params.teamId;
  if (entityType === "team_member") return params.memberUserId;
  if (entityType === "organization_member") return params.memberUserId;
  if (entityType === "budget") return params.budgetId ?? params.teamId;
  if (entityType === "account") return params.accountId;
  if (entityType === "transaction") return params.transactionId;
  if (entityType === "reimbursement_claim") return params.claimId;
  return params.invitationId;
};

export const writeAuditLog = async ({ userId, entityType, entityId, action, oldValue = null, newValue = null }) => {
  if (!entityType || !entityId) return null;
  return prisma.auditLog.create({
    data: { userId: userId || null, entityType, entityId, action, ...(oldValue == null ? {} : { oldValue }), ...(newValue == null ? {} : { newValue }) },
    select: {
      id: true, userId: true, entityType: true, entityId: true, action: true,
      oldValue: true, newValue: true, createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

// Record successful mutations centrally so new routes can participate without
// duplicating audit code in every controller.
const loadPriorEntity = async (entityType, params) => {
  if (entityType === "organization" && params.orgId) return prisma.organization.findUnique({ where: { id: params.orgId } });
  if (entityType === "team" && params.teamId) return prisma.team.findUnique({ where: { id: params.teamId } });
  if (entityType === "team_member" && params.teamId && params.memberUserId) return prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: params.teamId, userId: params.memberUserId } } });
  if (entityType === "organization_member" && params.orgId && params.memberUserId) return prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: params.orgId, userId: params.memberUserId } } });
  if (entityType === "budget" && params.teamId) return prisma.budget.findUnique({ where: { teamId: params.teamId } });
  if (entityType === "account" && params.accountId) return prisma.account.findUnique({ where: { id: params.accountId } });
  if (entityType === "transaction" && params.transactionId) return prisma.transaction.findUnique({ where: { id: params.transactionId } });
  if (entityType === "reimbursement_claim" && params.claimId) return prisma.reimbursementClaim.findUnique({ where: { id: params.claimId } });
  if (entityType === "organization_invitation" && params.token) return prisma.organizationInvitation.findUnique({
    where: { token: params.token },
    select: { id: true, organizationId: true, email: true, invitedById: true, role: true, status: true, expiresAt: true, createdAt: true },
  });
  return null;
};

export const auditMutation = async (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const entityType = entityFromPath(req.originalUrl.split("?")[0]);
  if (!entityType) return next();
  try {
    const prior = await loadPriorEntity(entityType, req.params || {});
    req.auditPriorEntity = prior ? JSON.parse(JSON.stringify(prior)) : null;
    req.auditEntityId = prior?.id ?? null;
  } catch (error) {
    console.error("auditMutation pre-read:", error);
  }

  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 200 || res.statusCode >= 300) return sendJson(body);
    const entityId = req.auditEntityId || entityIdFrom(entityType, body, req.params || {});
    const action = req.method === "POST" ? "create" : req.method === "DELETE" ? "delete" : "update";
    const data = unwrap(body);
    const resultValue = action === "delete" ? null : data?.[entityType] ?? data?.[entityType.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] ?? data ?? req.body ?? null;
    const newValue = resultValue && typeof resultValue === "object" && !Array.isArray(resultValue)
      ? { ...resultValue, ...(req.params?.teamId ? { teamId: req.params.teamId } : {}), ...(req.params?.orgId ? { organizationId: req.params.orgId } : {}) }
      : resultValue;

    void (async () => {
      try {
        await writeAuditLog({ userId: req.user?.sub, entityType, entityId, action, oldValue: req.auditPriorEntity, newValue });
      } catch (error) {
        console.error("auditMutation:", error);
      } finally {
        sendJson(body);
      }
    })();
    return res;
  };
  next();
};
