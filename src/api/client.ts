import axios, { AxiosResponse, AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// In build environments CRA injects `process.env`. Some editors/TS configs
// may complain about `process`. Declare it here to silence the type error
// when editors don't include `@types/node`.
declare const process: any;

// Prefer explicit env var. If it's not set, fall back to the current origin + `/api/v1`.
// This prevents requests from being sent to `/auth/login` without the `/api/v1` prefix.
const envUrl = process.env.REACT_APP_API_URL;
const API_BASE_URL = (() => {
  if (envUrl && envUrl.trim() !== '') return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
})();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available (safe header handling)
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    // Ensure headers object exists and set Authorization safely
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (guard window usage)
apiClient.interceptors.response.use(
  (response: AxiosResponse<any>) => response,
  (error: AxiosError<any> | any) => {
    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location?.pathname || '';
        const isPublicPage = path.startsWith('/submit-form') || path === '/login' || path === '/register';
        if (!isPublicPage) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

