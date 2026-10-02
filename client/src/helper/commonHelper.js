import axios from "axios";
import { EventSourcePolyfill } from "event-source-polyfill";

const asyncHandler = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Error:", error);
      throw error; // Rethrow the error if needed
    }
  };
};

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
};

const handleRequest = async (axiosCall) => {
  try {
    const response = await axiosCall();
    return { data: response.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error.response?.data?.message || error.message || "Request failed",
    };
  }
};

const base_url = process.env.NEXT_PUBLIC_BACKEND_URL;

// 🔑 Function to get access token from localStorage
const getAccessToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem("User"));
    return user?.accessToken || null;
  } catch (err) {
    return null;
  }
};

export const apiClient = {
  get: async (url, config = {}) =>
    handleRequest(() =>
      axios.get(`${base_url}${url}`, {
        ...config,
        withCredentials: true,
        headers: {
          ...(config?.headers || {}),
          Authorization: `Bearer ${getAccessToken()}` // ✅ attach token
        }
      })
    ),

  post: async (url, data, headers = {}) => {
    if (data instanceof FormData) {
      delete headers["Content-Type"];
    } else if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return handleRequest(() =>
      axios.post(`${base_url}${url}`, data, {
        headers: {
          ...headers,
          Authorization: `Bearer ${getAccessToken()}` // ✅ attach token
        },
        withCredentials: true
      })
    );
  },

  put: async (url, data, headers = {}) => {
    if (data instanceof FormData) {
      delete headers["Content-Type"];
    } else if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return handleRequest(() =>
      axios.put(`${base_url}${url}`, data, {
        headers: {
          ...headers,
          Authorization: `Bearer ${getAccessToken()}` // ✅ attach token
        },
        withCredentials: true
      })
    );
  },

  patch: async (url, data, headers = {}) => {
    if (data instanceof FormData) {
      delete headers["Content-Type"];
    } else if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return handleRequest(() =>
      axios.patch(`${base_url}${url}`, data, {
        headers: {
          ...headers,
          Authorization: `Bearer ${getAccessToken()}` // ✅ attach token
        },
        withCredentials: true
      })
    );
  },

  delete: async (url, headers = {}) =>
    handleRequest(() =>
      axios.delete(`${base_url}${url}`, {
        headers: {
          ...headers,
          Authorization: `Bearer ${getAccessToken()}` // ✅ attach token
        },
        withCredentials: true
      })
    )
};

export const apiClientEvents = {
  events: (url, { onMessage, onError, onOpen } = {}, headers = {}) => {
    const evtSource = new EventSourcePolyfill(`${base_url}${url}`, {
      headers: {
        ...headers,
        Authorization: `Bearer ${getAccessToken()}`
      },
      withCredentials: true
    });

    if (onOpen) evtSource.onopen = onOpen;
    if (onMessage) {
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMessage(data, e);
        } catch {
          onMessage(e.data, e);
        }
      };
    }
    if (onError) evtSource.onerror = onError;

    return evtSource;
  }
};

// helper/responseHandler.js
export const handleApiResponse = (response, router) => {
  console.log(response, "reohweoihgoei");
  if (
    response?.error == "Unauthorized request: Invalid access token" ||
    response?.error == "Unauthorized request: Token missing" ||
    response?.error == "Unauthorized request: Token verification failed" ||
    response?.error == "jwt malformed" ||
    response?.error == "jwt expired"
  ) {
    localStorage.removeItem("User");
    router.push("/login"); // redirect to login
    return null;
  }
  return response;
};

// Helper function to check permissions
const checkPermission = (page, operation) => {
  if (typeof window === "undefined") return false;

  try {
    const permissionsStr = localStorage.getItem("permissions");
    if (!permissionsStr) return false;

    const permissions = JSON.parse(permissionsStr);
    return permissions.some(
      (permission) => permission.page === page && permission.operation === operation
    );
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
};

export { asyncHandler, getCookie,checkPermission };