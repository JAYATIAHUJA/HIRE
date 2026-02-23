import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Something went wrong. Please try again.';

    if (!error.response) {
      // Network error (no internet, server unreachable, CORS issues)
      toast.error('Network error. Please check your connection.');
    } else {
      switch (error.response.status) {
        case 401:
          toast.error('Session expired. Please log in again.');
          // Clear user data and redirect to onboarding
          localStorage.removeItem('userId');
          localStorage.removeItem('token');
          window.location.href = '/onboarding';
          break;

        case 403:
          toast.error('You do not have permission to perform this action.');
          break;

        case 404:
          toast.error(message || 'Resource not found.');
          break;

        case 500:
          toast.error('Server error. Please try again later.');
          break;

        case 502:
        case 503:
        case 504:
          toast.error('Server is temporarily unavailable. Please try again later.');
          break;

        default:
          toast.error(message);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Helper for success notifications
export const notifySuccess = (message: string) => toast.success(message);

// Helper for info notifications
export const notifyInfo = (message: string) => toast.info(message);

// Helper for warning notifications
export const notifyWarning = (message: string) => toast.warning(message);
