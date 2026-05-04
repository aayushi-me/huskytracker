/**
 * Event API Service
 * Handles all event-related API calls including search
 */

import api from './api';
import { EventDto } from '../components/ui/EventCard';

/**
 * Map frontend category names to backend category enum values
 * Frontend uses: Workshop, Seminar, Cultural, Sports, Networking
 * Backend expects: Academic, Career, Clubs, Sports, Social, Cultural, Other
 *
 * We map:
 * - Seminar -> Academic
 * - Workshop -> Career
 * so a seminar event only appears under the Seminar filter, not both.
 */
const mapCategoryToBackend = (category: string): string => {
  if (!category) return category;

  const categoryMap: Record<string, string> = {
    Workshop: "Career",
    Seminar: "Academic",
    Cultural: "Cultural",
    Sports: "Sports",
    Networking: "Social",
  };

  // Return mapped value or original if no mapping exists
  return categoryMap[category] || category;
};

export interface EventSearchParams {
  q?: string; // Search query
  page?: number;
  limit?: number;
  category?: string | string[]; // Single category or array of categories
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  tags?: string[]; // Array of tag strings
  location?: string; // Venue or city
  sort?: string; // Sort option: 'relevance', 'startDate', '-startDate', 'popularity', '-popularity', etc.
}

export interface EventSearchResponse {
  events: EventDto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Search events with filters and pagination
 * @param params - Search parameters
 * @returns Promise with search results
 */
export const searchEvents = async (
  params: EventSearchParams
): Promise<EventSearchResponse> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    // Search query
    if (params.q && params.q.trim()) {
      queryParams.set('q', params.q.trim());
    }

    // Pagination
    if (params.page) {
      queryParams.set('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    // Category filter - handle both single and array
    if (params.category) {
      if (Array.isArray(params.category)) {
        // If multiple categories, map each and use first one
        // Backend currently only supports single category
        if (params.category.length > 0) {
          queryParams.set('category', mapCategoryToBackend(params.category[0]));
        }
      } else {
        queryParams.set('category', mapCategoryToBackend(params.category));
      }
    }

    // Date range
    if (params.startDate) {
      queryParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.set('endDate', params.endDate);
    }

    // Sort
    if (params.sort) {
      queryParams.set('sort', params.sort);
    }

    // Note: tags and location are not yet supported by backend search endpoint
    // They can be added when backend supports them

    const response = await api.get<ApiResponse<EventSearchResponse>>(
      `/events/search?${queryParams.toString()}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Invalid response format from search API');
  } catch (error: any) {
    // Re-throw with more context
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        `Search failed with status ${status}`;

      if (status === 400) {
        throw new Error(`Invalid search parameters: ${message}`);
      } else if (status === 404) {
        throw new Error('Search endpoint not found');
      } else if (status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(message);
      }
    } else if (error.request) {
      // Request was made but no response received (network offline)
      throw new Error(
        'Network error. Please check your connection and try again.'
      );
    } else {
      // Error in request setup
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
};

/**
 * Get all events with filters (non-search endpoint)
 * @param params - Filter parameters
 * @returns Promise with events
 */
export const getEvents = async (
  params: Omit<EventSearchParams, 'q'>
): Promise<EventSearchResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) {
      queryParams.set('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    // Category filter - handle both single and array
    if (params.category) {
      if (Array.isArray(params.category)) {
        if (params.category.length > 0) {
          queryParams.set('category', mapCategoryToBackend(params.category[0]));
        }
      } else {
        queryParams.set('category', mapCategoryToBackend(params.category));
      }
    }

    if (params.startDate) {
      queryParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.set('endDate', params.endDate);
    }

    if (params.sort) {
      queryParams.set('sort', params.sort);
    }

    const response = await api.get<ApiResponse<EventSearchResponse>>(
      `/events?${queryParams.toString()}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Invalid response format from events API');
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        `Failed to load events (status ${status})`;

      if (status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        'Network error. Please check your connection and try again.'
      );
    } else {
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
};

