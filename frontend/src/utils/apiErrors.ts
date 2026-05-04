/**
 * API Error Handling Utilities
 * Provides standardized error handling and user-friendly error messages
 */

import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Type guard for Axios errors
 */
const isAxiosError = (error: unknown): error is AxiosError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
};

/**
 * Extract error message from API response
 */
export const extractErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data;
      if (data && typeof data === 'object' && 'message' in data) {
        return String(data.message);
      }
      if (typeof data === 'string') {
        return data;
      }
      return error.response.statusText || 'An error occurred';
    } else if (error.request) {
      // Request was made but no response received
      return 'Network error. Please check your connection.';
    } else {
      // Something else happened
      return error.message || 'An unexpected error occurred';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Get HTTP status code from error
 */
export const getErrorStatus = (error: unknown): number | undefined => {
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return !error.response && !!error.request;
  }
  return false;
};

/**
 * Check if error is a timeout
 */
export const isTimeoutError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.code === 'ECONNABORTED' || error.message?.includes('timeout') || false;
  }
  if (error instanceof Error) {
    return error.message.includes('timeout');
  }
  return false;
};

/**
 * Check if error is a 401 Unauthorized
 */
export const isUnauthorizedError = (error: unknown): boolean => {
  return getErrorStatus(error) === 401;
};

/**
 * Check if error is a 403 Forbidden
 */
export const isForbiddenError = (error: unknown): boolean => {
  return getErrorStatus(error) === 403;
};

/**
 * Check if error is a 404 Not Found
 */
export const isNotFoundError = (error: unknown): boolean => {
  return getErrorStatus(error) === 404;
};

/**
 * Check if error is a 429 Too Many Requests (rate limit)
 */
export const isRateLimitError = (error: unknown): boolean => {
  return getErrorStatus(error) === 429;
};

/**
 * Check if error is a 5xx server error
 */
export const isServerError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status ? status >= 500 && status < 600 : false;
};

/**
 * Create a standardized API error object
 */
export const createApiError = (error: unknown): ApiError => {
  if (isAxiosError(error)) {
    return {
      message: extractErrorMessage(error),
      status: getErrorStatus(error),
      code: error.code,
      details: error.response?.data,
    };
  }
  
  return {
    message: extractErrorMessage(error),
    status: undefined,
    code: undefined,
    details: undefined,
  };
};

