import { apiClient } from "@/helper/commonHelper";
import { handleApiResponse } from "@/helper/zindex";
import type { ApiResponse } from "@/helper/commonHelper";
export interface Organization {
  id: string;
  name: string;
  _count?: {
    members: number;
  };
}
export interface OrganizationResponse {
  organizations: Organization[];
}

interface Router {
  push: (path: string) => void;
}

interface GetAllUsersPayload {
  [key: string]: string | number | boolean | undefined;
}

interface User {
  id: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

export const deleteUser = async (
  userId: string
): Promise<ApiResponse<unknown> | null> => {
  const response = await apiClient.delete(
    `/user_management/${userId}`
  );

  return handleApiResponse(response);
};

export const getAllOrgs = async (
): Promise<ApiResponse<OrganizationResponse> | null> => {
  const response = await apiClient.get<OrganizationResponse>("/org");

  return handleApiResponse(response);
};

export const getUser = async (
  id: string,
): Promise<ApiResponse<User> | null> => {
  const response = await apiClient.get<User>(
    `/user_management/${id}`
  );

  return handleApiResponse(response);
};



