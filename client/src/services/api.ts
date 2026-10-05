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
    await apiClient.get<User>("/users/me");

  if (response.error || !response.data) {
    throw new Error(
      response.error || "Not authenticated"
    );
  }

  return response.data;
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