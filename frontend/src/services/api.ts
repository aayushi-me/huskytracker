/**
 * API Service Layer
 * Centralized Axios instance with interceptors for authentication and error handling
 */
import { Event, Registration } from '../types';
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  isTokenExpiringSoon,
  isTokenExpired,
} from '../utils/tokenStorage';
import { createApiError, isUnauthorizedError } from '../utils/apiErrors';
import type { UserProfile, NotificationPreferences, PasswordChangePayload } from '../types';

// API base URL - adjust based on your backend configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing the token to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

// Process queued requests after token refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh-token`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.success && response.data?.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      setAccessToken(accessToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      return accessToken;
    }

    throw new Error('Failed to refresh token');
  } catch (error: any) {
    clearTokens();
    throw error;
  }
};

/**
 * Request Interceptor
 * - Attaches JWT token to all requests
 * - Checks if token is expiring soon and refreshes proactively
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    // If token exists and is expiring soon, refresh it proactively
    if (token && isTokenExpiringSoon(token, 5)) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } catch (error) {
          console.error('Proactive token refresh failed:', error);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Attach token to request
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - Handles 401 errors and attempts token refresh
 * - Implements retry logic for failed requests
 * - Processes queued requests after token refresh
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (isUnauthorizedError(error) && originalRequest && !originalRequest._retry) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Check if we have a refresh token
      const refreshToken = getRefreshToken();
      if (!refreshToken || isTokenExpired(refreshToken)) {
        clearTokens();
        processQueue(new Error('Refresh token expired'), null);

        window.location.href = '/auth/login';
        return Promise.reject(createApiError(error));
      }

      // Attempt to refresh the token
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);

        // Retry the original request with new token
        if (originalRequest.headers && newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();

        window.location.href = '/auth/login';
        return Promise.reject(createApiError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, return the error
    return Promise.reject(createApiError(error));
  }
);

/**
 * Retry logic for failed requests
 * @param fn - Function to retry
 * @param retries - Number of retries (default: 3)
 * @param delay - Delay between retries in ms (default: 1000)
 */
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && !isUnauthorizedError(error)) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

/**
 * Event API Services
 */
export const getEvents = async (params?: any): Promise<Event[]> => {
  const response = await api.get('/events', { params });
  return response.data.data || response.data;
};

export const getEventById = async (id: string): Promise<Event> => {
  const response = await api.get(`/events/${id}`);
  return response.data.data || response.data;
};

// --- Registration API Services (Task 3.2) ---

/**
 * Register for an event
 */
export const registerForEvent = async (eventId: string) => {
  const response = await api.post(`/events/${eventId}/register`);
  return response.data;
};

/**
 * Cancel a registration
 */
export const cancelRegistration = async (registrationId: string) => {
  const response = await api.delete(`/registrations/${registrationId}`);
  return response.data;
};

/**
 * Get user's registrations (My Events)
 */
export const getMyRegistrations = async (
  params?: any
): Promise<Registration[]> => {
  const response = await api.get('/registrations/me', { params });
  return response.data.data?.registrations || response.data.registrations || response.data.data || response.data;
};

// --- Profile & Settings API (Task 3.5) ---

/**
 * Update User Profile (Name, University, Bio, Interests)
 */
export const updateProfile = async (data: Partial<UserProfile>) => {
  const response = await api.put('/users/profile', data);
  return response.data.data || response.data;
};

/**
 * Update Notification Preferences
 */
export const updatePreferences = async (prefs: NotificationPreferences) => {
  const response = await api.put('/users/preferences', prefs);
  return response.data.data || response.data;
};

/**
 * Change Password
 */
export const changePassword = async (data: PasswordChangePayload) => {
  const response = await api.put('/users/password', data);
  return response.data;
};

/**
 * Upload Avatar
 * (Simulate upload for now if backend Task 2.8 is not fully integrated)
 */
export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  // Assuming Task 2.8 created this endpoint
  const response = await api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.url; // Assuming backend returns the image URL
};

export default api;