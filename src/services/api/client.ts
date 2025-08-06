import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse } from '../../types';

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Get path prefix from window or default to empty
    let pathPrefix = (window as any).__path_prefix__ || '';
    if (!pathPrefix.startsWith('/')) {
      pathPrefix = '/' + pathPrefix;
    }
    if (!pathPrefix.endsWith('/')) {
      pathPrefix = pathPrefix + '/';
    }

    this.baseURL = pathPrefix + 'api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('karmada_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('karmada_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.get(url, config);
    return response.data;
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.put(url, data, config);
    return response.data;
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.patch(url, data, config);
    return response.data;
  }

  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.delete(url, config);
    return response.data;
  }

  public setAuthToken(token: string) {
    localStorage.setItem('karmada_token', token);
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public clearAuthToken() {
    localStorage.removeItem('karmada_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  public getBaseURL(): string {
    return this.baseURL;
  }
}

export const apiClient = new APIClient();
export default apiClient;