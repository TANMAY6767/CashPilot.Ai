import {
  apiClient,
  clearAccessToken,
  restoreAccessToken,
} from "@/helper/commonHelper.ts";

import type { User } from "@/types";

export interface AuthResult {
  message: string;
  user: User;
}

interface AuthPayload {
  accessToken: string;
  user: User;
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
}

export {
  clearAccessToken,
  restoreAccessToken,
};

export interface InvitationDetails {
  organizationId: string;
  organizationName: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
}

export async function acceptInvitation(
  token: string
): Promise<{ message: string; organizationId: string }> {
  const response = await apiClient.post<
    ApiEnvelope<{ organizationId: string }>
  >(`/org/invitations/${encodeURIComponent(token)}/accept`);

  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to accept invitation');
  }

  return {
    message: response.data.message,
    organizationId: response.data.data.organizationId,
  };
}

export async function getInvitationDetails(
  token: string
): Promise<InvitationDetails> {
  const response = await apiClient.get<ApiEnvelope<InvitationDetails>>(
    `/org/invitations/${encodeURIComponent(token)}`,
    {}
  );
  if (response.error || !response.data) {
    throw new Error(response.error || 'Invitation not found');
  }

  return response.data.data;
}

export async function sendOrganizationInvitation(
  organizationId: string,
  email: string,
  role: string
): Promise<{ message: string }> {
  const response = await apiClient.post<ApiEnvelope<null>>(
    `/org/${encodeURIComponent(organizationId)}/invitations`,
    { email, role }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to send invitation');
  }

  return { message: response.data.message };
}

export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  const response =
    await apiClient.post<ApiEnvelope<AuthPayload>>(
      "/users/login",
      {
        email,
        password,
      },
      {},
      false
    );

  if (response.error || !response.data) {
    throw new Error(
      response.error || "Login failed"
    );
  }

  return {
    message: response.data.message,
    user: response.data.data.user,
  };
}

export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const response =
    await apiClient.post<ApiEnvelope<AuthPayload>>(
      "/users",
      {
        name,
        email,
        password,
      },
      {},
      false
    );

  if (response.error || !response.data) {
    throw new Error(
      response.error || "Signup failed"
    );
  }

  return {
    message: response.data.message,
    user: response.data.data.user,
  };
}

export async function getCurrentUser(): Promise<User> {
  const response =
    await apiClient.get<ApiEnvelope<User>>("/users/me");

  if (response.error || !response.data) {
    throw new Error(
      response.error || "Not authenticated"
    );
  }

  return response.data.data;
}

export async function logout(): Promise<void> {
  try {
    const response =
      await apiClient.post<unknown>(
        "/users/logout"
      );

    if (response.error) {
      throw new Error(response.error);
    }
  } finally {
    clearAccessToken();
  }
}
