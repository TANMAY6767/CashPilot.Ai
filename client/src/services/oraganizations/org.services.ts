import { apiClient } from "@/helper/commonHelper";
import { handleApiResponse } from "@/helper/zindex";
import type { ApiResponse } from "@/helper/commonHelper";

export type OrganizationRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  role: OrganizationRole;
  memberCount: number;
  teamCount: number;
}

// ---- Detail types (match your backend `getOrganization` select) ----
export interface OrgMember {
  id: string;
  userId: string;
  role: OrganizationRole;
  joinedAt: string;
  user: { name: string; email: string };
}

export interface OrgTeam {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  _count: { members: number; transactions: number };
}

export interface OrganizationDetail {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
  members: OrgMember[];
  teams: OrgTeam[];
}

// ---- List response ----
interface OrganizationApiItem {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  _count: { members: number; teams: number };
  members: { role: string }[];
}

export interface OrganizationApiResponse {
  status: string;
  data: OrganizationApiItem[];
  message: string;
  statusCode: number;
  apiVersion: string;
}

export interface OrganizationDetailApiResponse {
  status: string;
  data: OrganizationDetail;
  message: string;
  statusCode: number;
  apiVersion: string;
}

export const createOrg = async (name: string) => {
  return apiClient.post<OrganizationApiResponse>("/org", { name });
};

export const getAllOrgs = async (): Promise<Organization[] | null> => {
  const response = await apiClient.get<OrganizationApiResponse>("/org");
  if (!response.data) return null;

  return response.data.data.map((org) => ({
    id: org.id,
    name: org.name,
    createdById: org.createdById,
    createdAt: org.createdAt,
    role: org.members[0]?.role as OrganizationRole,
    memberCount: org._count.members,
    teamCount: org._count.teams,
  }));
};

// GET /org/:orgId  → backend route uses :orgId
export const getOrg = async (
  orgId: string
): Promise<OrganizationDetail | null> => {
  const response = await apiClient.get<OrganizationDetailApiResponse>(
    `/org/${orgId}`
  );
  return response.data?.data ?? null;
};




