import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1', // Assuming the API base URL is /api/v1
});

export const getCrds = async () => {
  const response = await apiClient.get('/crd');
  return response.data;
};

export const getCrdObjects = async (crdName: string, namespace?: string) => {
  const url = namespace
    ? `/crd/${crdName}/object/${namespace}`
    : `/crd/${crdName}/object`;
  const response = await apiClient.get(url);
  return response.data;
};
