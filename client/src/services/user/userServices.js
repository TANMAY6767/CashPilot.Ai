import { apiClient } from "@/helper/commonHelper";
import { handleApiResponse } from "@/helper/zindex";

export const createOrUpdateUser = async (formData, router) => {
  const response = await apiClient.post("/user_management/create", formData);
  return handleApiResponse(response, router);
};

export const deleteUser = async (userId, router) => {
  const response = await apiClient.delete(`/user_management/${userId}`);
  return handleApiResponse(response, router);
};

export const getAllUsers = async (payload, router) => {
  const response = await apiClient.get(`/user_management/all`, {
    params: payload,
  });
  return handleApiResponse(response, router);
};

export const getUser = async (id, router) => {
  const response = await apiClient.get(`/user_management/${id}`);
  return handleApiResponse(response, router);
};

export const loginUser = async (payload, router) => {
  const response = await apiClient.post("/users/login", payload);
  return handleApiResponse(response, router);
};