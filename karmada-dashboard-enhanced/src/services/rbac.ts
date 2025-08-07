import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1', // Assuming the API base URL is /api/v1
});

export const getRoles = async (namespace?: string) => {
  const url = namespace ? `/role/${namespace}` : '/role';
  const response = await apiClient.get(url);
  return response.data;
};

export const getClusterRoles = async () => {
  const response = await apiClient.get('/clusterrole');
  return response.data;
};

export const getRoleBindings = async (namespace?: string) => {
  const url = namespace ? `/rolebinding/${namespace}` : '/rolebinding';
  const response = await apiClient.get(url);
  return response.data;
};

export const getClusterRoleBindings = async () => {
  const response = await apiClient.get('/clusterrolebinding');
  return response.data;
};

export const getServiceAccounts = async (namespace?: string) => {
  const url = namespace ? `/serviceaccount/${namespace}` : '/serviceaccount';
  const response = await apiClient.get(url);
  return response.data;
};
