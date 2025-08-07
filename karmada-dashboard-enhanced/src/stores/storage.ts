import { create } from 'zustand';
import { getStorageClasses } from '../services/storage';
import { StorageClass } from '../types/storage';

interface StorageStore {
  storageClasses: StorageClass[];
  loading: boolean;
  fetchStorageClasses: () => Promise<void>;
}

export const useStorageStore = create<StorageStore>((set) => ({
  storageClasses: [],
  loading: false,
  fetchStorageClasses: async () => {
    set({ loading: true });
    try {
      const response = await getStorageClasses();
      set({ storageClasses: response.items, loading: false });
    } catch (error) {
      console.error('Failed to fetch storage classes:', error);
      set({ loading: false });
    }
  },
}));
