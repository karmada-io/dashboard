import { apiClient } from './client';
import { User, LoginCredentials } from '../../types';

export const authAPI = {
  // Login with token
  async login(credentials: LoginCredentials): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>('/login', credentials, {
      headers: {
        Authorization: `Bearer ${credentials.token}`,
      },
    });
    return response.data;
  },

  // Get current user info
  async me(): Promise<{ authenticated: boolean }> {
    const response = await apiClient.get<{ authenticated: boolean }>('/me');
    return response.data;
  },

  // Logout (client-side only)
  logout(): void {
    apiClient.clearAuthToken();
  },

  // Set authentication token
  setToken(token: string): void {
    apiClient.setAuthToken(token);
  },

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('karmada_token');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export default authAPI;