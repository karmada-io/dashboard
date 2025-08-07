import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1', // Assuming the API base URL is /api/v1
});

export const getDeployments = async (namespace?: string) => {
  const url = namespace ? `/deployment/${namespace}` : '/deployment';
  const response = await apiClient.get(url);
  return response.data;
};

export const getStatefulSets = async (namespace?: string) => {
  const url = namespace ? `/statefulset/${namespace}` : '/statefulset';
  const response = await apiClient.get(url);
  return response.data;
};

export const getDaemonSets = async (namespace?: string) => {
  const url = namespace ? `/daemonset/${namespace}` : '/daemonset';
  const response = await apiClient.get(url);
  return response.data;
};

export const getJobs = async (namespace?: string) => {
  const url = namespace ? `/job/${namespace}` : '/job';
  const response = await apiClient.get(url);
  return response.data;
};

export const getCronJobs = async (namespace?: string) => {
  const url = namespace ? `/cronjob/${namespace}` : '/cronjob';
  const response = await apiClient.get(url);
  return response.data;
};

export const getPods = async (namespace?: string) => {
  const url = namespace ? `/pod/${namespace}` : '/pod';
  const response = await apiClient.get(url);
  return response.data;
};
