import { apiClient } from "@/helper/commonHelper";

/* =========================================================
   SHARED TYPES
   ========================================================= */

export type TeamRole = "owner" | "admin" | "member";

/* ---------- Team list and detail ---------- */

export interface TeamListItem {
  id: string;
  name: string;
  organizationId: string;
  createdById: string;
  createdAt: string;

  _count: {
    members: number;
  };

  /** Only the *current user's* membership, if any. */
  members: { role: TeamRole }[];

  /** null when no budget is set yet. */
  budget: {
    totalBudget: string; // Decimal → serialized as string
    currency: string;
  } | null;
}

/* ---------- Team detail ---------- */

export interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeamDetail {
  id: string;
  name: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;

  organization: {
    id: string;
    name: string;
  };

  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  members: TeamMember[];

  budget: {
    id: string;
    totalBudget: string;
    currency: string;
    createdAt: string;
    updatedAt: string;
  } | null;

  _count: {
    members: number;
    transactions: number;
    accounts: number;
  };
}

export interface RemainingBudget {
  team: { id: string; name: string };
  budget: { total: number; currency: string };
  spending: { spent: number };
  remaining: number;
}

/* ---------- Team creation ---------- */

export interface CreateTeamInput {
  name: string;
}

/**
 * `createTeam` backend returns the raw `prisma.team.create()` result
 * (no select), so it contains scalar fields only.
 */
export interface CreateTeamResult {
  id: string;
  name: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTeamResponse {
  data: { team: CreateTeamResult };
}

/* =========================================================
   SERVICES
   ========================================================= */

/**
 * GET /org/:orgId/teams
 * Returns a list of teams in the organization (with the
 * current user's membership info and budget summary).
 */
export const getAllTeams = async (orgId: string): Promise<TeamListItem[]> => {
  const response = await apiClient.get<{ data: TeamListItem[] }>(
    `/org/${encodeURIComponent(orgId)}/teams`
  );
  if (response.error || !response.data) throw new Error(response.error || 'Could not load teams.');
  return response.data?.data ?? [];
};

/**
 * GET /org/:orgId/teams/:teamId
 * Full detail for one team.
 */
export const getOneTeam = async (
  orgId: string,
  teamId: string
): Promise<TeamDetail | null> => {
  const response = await apiClient.get<{ data: TeamDetail }>(
    `/org/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}`
  );
  if (response.error) throw new Error(response.error);
  return response.data?.data ?? null;
};

/**
 * POST /org/:orgId/teams
 * Creates a team; creator is auto-added as "owner".
 */
export const createTeam = async (
  orgId: string,
  input: CreateTeamInput
): Promise<CreateTeamResult | null> => {
  const response = await apiClient.post<CreateTeamResponse>(
    `/org/${encodeURIComponent(orgId)}/teams`,
    input
  );
  if (response.error) throw new Error(response.error);
  return response.data?.data.team ?? null;
};

interface TeamEnvelope<T> {
  data: T;
  message: string;
}

interface BudgetResponse {
  data: { budget: TeamDetail['budget'] };
  message: string;
}

const assertMutationSucceeded = <T>(
  response: { data: T | null; error: string | null },
  fallback: string
): T => {
  if (response.error || !response.data) {
    throw new Error(response.error || fallback);
  }
  return response.data;
};

export const updateTeam = async (
  orgId: string,
  teamId: string,
  name: string
): Promise<void> => {
  const response = await apiClient.patch<TeamEnvelope<unknown>>(
    `/org/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}`,
    { name }
  );
  assertMutationSucceeded(response, 'Could not update team.');
};

export const deleteTeam = async (orgId: string, teamId: string): Promise<void> => {
  const response = await apiClient.delete<TeamEnvelope<null>>(
    `/org/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}`
  );
  assertMutationSucceeded(response, 'Could not delete team.');
};

export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  const response = await apiClient.get<TeamEnvelope<TeamMember[]>>(
    `/teams/${encodeURIComponent(teamId)}/members`
  );
  return assertMutationSucceeded(response, 'Could not load team members.').data;
};

export const addTeamMember = async (
  teamId: string,
  userId: string,
  role: Exclude<TeamRole, 'owner'> = 'member'
): Promise<TeamMember> => {
  const response = await apiClient.post<TeamEnvelope<TeamMember>>(
    `/teams/${encodeURIComponent(teamId)}/members`,
    { userId, role }
  );
  return assertMutationSucceeded(response, 'Could not add team member.').data;
};

export const updateTeamMemberRole = async (
  teamId: string,
  userId: string,
  role: Exclude<TeamRole, 'owner'>
): Promise<TeamMember> => {
  const response = await apiClient.patch<TeamEnvelope<TeamMember>>(
    `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    { role }
  );
  return assertMutationSucceeded(response, 'Could not update team member role.').data;
};

export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const response = await apiClient.delete<TeamEnvelope<null>>(
    `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`
  );
  assertMutationSucceeded(response, 'Could not remove team member.');
};

export const createTeamBudget = async (
  teamId: string,
  totalBudget: number,
  currency = 'INR'
): Promise<NonNullable<TeamDetail['budget']>> => {
  const response = await apiClient.post<BudgetResponse>(
    `/teams/${encodeURIComponent(teamId)}/budget`,
    { totalBudget, currency }
  );
  return assertMutationSucceeded(response, 'Could not create team budget.').data.budget!;
};

export const updateTeamBudget = async (
  teamId: string,
  totalBudget: number,
  currency: string
): Promise<NonNullable<TeamDetail['budget']>> => {
  const response = await apiClient.patch<BudgetResponse>(
    `/teams/${encodeURIComponent(teamId)}/budget`,
    { totalBudget, currency }
  );
  return assertMutationSucceeded(response, 'Could not update team budget.').data.budget!;
};

export const getRemainingBudget = async (teamId: string): Promise<RemainingBudget> => {
  const response = await apiClient.get<TeamEnvelope<RemainingBudget>>(
    `/teams/${encodeURIComponent(teamId)}/budget/remaining`
  );
  return assertMutationSucceeded(response, 'Could not load the remaining team budget.').data;
};
