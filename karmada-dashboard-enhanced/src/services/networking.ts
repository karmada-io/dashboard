import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1', // Assuming the API base URL is /api/v1
});

export const getServices = async (namespace?: string) => {
  const url = namespace ? `/service/${namespace}` : '/service';
  const response = await apiClient.get(url);
  return response.data;
};

export const getIngresses = async (namespace?: string) => {
  const url = namespace ? `/ingress/${namespace}` : '/ingress';
  const response = await apiClient.get(url);
  return response.data;
};

export const getNetworkPolicies = async (namespace?: string) => {
  const url = namespace ? `/networkpolicy/${namespace}` : '/networkpolicy';
  const response = await apiClient.get(url);
  return response.data;
};
