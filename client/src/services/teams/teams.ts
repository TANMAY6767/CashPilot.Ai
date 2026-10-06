import { apiClient } from "@/helper/commonHelper";

/* =========================================================
   SHARED TYPES
   ========================================================= */

export type TeamRole = "owner" | "admin" | "member";

/* ---------- List (GET /org/:orgId/teams) ---------- */

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

/* ---------- Detail (GET /org/:orgId/teams/:teamId) ---------- */

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

/* ---------- Create (POST /org/:orgId/teams) ---------- */

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
    `/org/${orgId}/teams`
  );
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
    `/org/${orgId}/teams/${teamId}`
  );
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
  const response = await apiClient.post<{ data: CreateTeamResult }>(
    `/org/${orgId}/teams`,
    input
  );
  return response.data?.data ?? null;
};