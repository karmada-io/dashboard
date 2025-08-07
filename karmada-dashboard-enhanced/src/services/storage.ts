import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1', // Assuming the API base URL is /api/v1
});

export const getPersistentVolumes = async () => {
  const response = await apiClient.get('/persistentvolume');
  return response.data;
};

export const getPersistentVolumeClaims = async () => {
  const response = await apiClient.get('/persistentvolumeclaim');
  return response.data;
};

export const getStorageClasses = async () => {
  const response = await apiClient.get('/storageclass');
  return response.data;
};
