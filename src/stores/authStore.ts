import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (token: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (token: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // First, set the token
          authAPI.setToken(token);
          
          // Then verify the token by calling the login endpoint
          await authAPI.login({ token });
          
          // Check authentication status
          const authResult = await authAPI.me();
          
          if (authResult.authenticated) {
            set({
              isAuthenticated: true,
              isLoading: false,
              user: {
                id: 'user', // This would come from a real user endpoint
                username: 'karmada-user',
                email: 'user@karmada.io',
                roles: ['admin'],
                authenticated: true,
              },
            });
          } else {
            throw new Error('Authentication failed');
          }
        } catch (error) {
          console.error('Login error:', error);
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          authAPI.clearAuthToken();
          throw error;
        }
      },

      logout: () => {
        authAPI.logout();
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        try {
          const token = authAPI.getToken();
          if (!token) {
            set({ isAuthenticated: false, user: null });
            return;
          }

          set({ isLoading: true });
          const result = await authAPI.me();
          
          if (result.authenticated) {
            set({
              isAuthenticated: true,
              isLoading: false,
              user: {
                id: 'user',
                username: 'karmada-user',
                email: 'user@karmada.io',
                roles: ['admin'],
                authenticated: true,
              },
            });
          } else {
            set({ isAuthenticated: false, user: null, isLoading: false });
            authAPI.clearAuthToken();
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
          authAPI.clearAuthToken();
        }
      },

      setUser: (user: User | null) => set({ user }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;