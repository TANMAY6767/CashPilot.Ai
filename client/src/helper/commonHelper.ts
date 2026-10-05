import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  RawAxiosRequestHeaders,
} from "axios";

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

interface Permission {
  page: string;
  operation: string;
}

interface RefreshResponse {
  accessToken: string;
}

type RequestHeaders =
  | RawAxiosRequestHeaders
  | Record<string, string>;

interface ApiConfig extends AxiosRequestConfig {
  headers?: RequestHeaders;
}

interface BackendError {
  message?: string;
  error?: string;
}


const asyncHandler = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };
};

const getCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }

  return undefined;
};

const base_url = import.meta.env.VITE_BACKEND_URL;

let accessToken: string | null = null;

let refreshInFlight: Promise<string> | null = null;

export const getAccessToken = (): string | null => {
  return accessToken;
};

const saveAccessToken = (token: string | null): void => {
  accessToken = token;
};

const clearAccessToken = (): void => {
  accessToken = null;
};

const restoreAccessToken = async (): Promise<string> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await axios.post<{
        data: RefreshResponse;
      }>(
        `${base_url}/users/refresh`,
        {},
        {
          withCredentials: true,
        }
      );

      const token = response.data.data?.accessToken;

      if (!token) {
        throw new Error("Access token missing from refresh response");
      }

      saveAccessToken(token);

      return token;
    } catch (error) {
      clearAccessToken();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:expired"));
      }

      const axiosError = error as AxiosError<BackendError>;

      throw new Error(
        axiosError.response?.data?.message ||
          axiosError.response?.data?.error ||
          axiosError.message ||
          "Could not restore your session."
      );
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

const handleRequest = async <T>(
  axiosCall: () => Promise<AxiosResponse<T>>
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosCall();

    return {
      data: response.data,
      error: null,
    };
  } catch (error) {
    const axiosError = error as AxiosError<BackendError>;

    return {
      data: null,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        "Request failed",
    };
  }
};

const requestWithAuthRefresh = async <T>(
  axiosCall: (token: string | null) => Promise<AxiosResponse<T>>,
  authenticated = true
): Promise<ApiResponse<T>> => {
  let tokenUsed = accessToken;

  try {
    let response = await axiosCall(
      authenticated ? accessToken : null
    );

    if (
      response.status !== 401 ||
      !authenticated
    ) {
      return {
        data: response.data,
        error: null,
      };
    }

    /*
      Access token expired.

      If another request already refreshed the token,
      use that new token instead of refreshing again.
    */
    if (accessToken === tokenUsed) {
      await restoreAccessToken();
    }

    tokenUsed = accessToken;

    response = await axiosCall(tokenUsed);

    return {
      data: response.data,
      error: null,
    };
  } catch (error) {
    const axiosError = error as AxiosError<BackendError>;

    return {
      data: null,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        "Request failed",
    };
  }
};

export const apiClient = {

  get: async <T = unknown>(
    url: string,
    config: ApiConfig = {}
  ): Promise<ApiResponse<T>> => {
    return requestWithAuthRefresh<T>(
      (token) =>
        axios.get<T>(`${base_url}${url}`, {
          ...config,
          withCredentials: true,
          headers: {
            ...(config.headers || {}),
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }),
      true
    );
  },

  /* -------------------------------------------------------
     POST
  ------------------------------------------------------- */

  post: async <T = unknown>(
    url: string,
    data?: unknown,
    headers: Record<string, string> = {},
    authenticated = true
  ): Promise<ApiResponse<T>> => {
    const requestHeaders = { ...headers };

    if (data instanceof FormData) {
      delete requestHeaders["Content-Type"];
    } else if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    return requestWithAuthRefresh<T>(
      (token) =>
        axios.post<T>(
          `${base_url}${url}`,
          data,
          {
            headers: {
              ...requestHeaders,
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            withCredentials: true,
          }
        ),
      authenticated
    );
  },

  /* -------------------------------------------------------
     PUT
  ------------------------------------------------------- */

  put: async <T = unknown>(
    url: string,
    data?: unknown,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> => {
    const requestHeaders = { ...headers };

    if (data instanceof FormData) {
      delete requestHeaders["Content-Type"];
    } else if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    return requestWithAuthRefresh<T>(
      (token) =>
        axios.put<T>(
          `${base_url}${url}`,
          data,
          {
            headers: {
              ...requestHeaders,
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            withCredentials: true,
          }
        ),
      true
    );
  },

  /* -------------------------------------------------------
     PATCH
  ------------------------------------------------------- */

  patch: async <T = unknown>(
    url: string,
    data?: unknown,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> => {
    const requestHeaders = { ...headers };

    if (data instanceof FormData) {
      delete requestHeaders["Content-Type"];
    } else if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    return requestWithAuthRefresh<T>(
      (token) =>
        axios.patch<T>(
          `${base_url}${url}`,
          data,
          {
            headers: {
              ...requestHeaders,
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            withCredentials: true,
          }
        ),
      true
    );
  },

  /* -------------------------------------------------------
     DELETE
  ------------------------------------------------------- */

  delete: async <T = unknown>(
    url: string,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> => {
    return requestWithAuthRefresh<T>(
      (token) =>
        axios.delete<T>(`${base_url}${url}`, {
          headers: {
            ...headers,
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          withCredentials: true,
        }),
      true
    );
  },
};


export const handleApiResponse = <T>(
  response: ApiResponse<T>
): ApiResponse<T> => {
  return response;
};

const checkPermission = (
  page: string,
  operation: string
): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const permissionsStr =
      localStorage.getItem("permissions");

    if (!permissionsStr) {
      return false;
    }

    const permissions =
      JSON.parse(permissionsStr) as Permission[];

    return permissions.some(
      (permission) =>
        permission.page === page &&
        permission.operation === operation
    );
  } catch (error) {
    console.error(
      "Error checking permissions:",
      error
    );

    return false;
  }
};

export {
  asyncHandler,
  getCookie,
  checkPermission,
  restoreAccessToken,
  clearAccessToken
};