/**
 * Like Service
 * Handles all like-related API calls
 */

import api from './api';

export interface Like {
  _id: string;
  user: string;
  event: string;
  createdAt: string;
}

export interface LikeResponse {
  success: boolean;
  data: {
    liked: boolean;
    like: Like | null;
    likeCount: number;
  };
}

export interface LikeCheckResponse {
  success: boolean;
  data: {
    liked: boolean;
    like: Like | null;
    likeCount: number;
    canLike: boolean;
  };
}

/**
 * Toggle like for an event
 */
export const toggleLike = async (eventId: string): Promise<LikeResponse> => {
  const response = await api.post<LikeResponse>(`/events/${eventId}/like`);
  return response.data;
};

/**
 * Check if user has liked an event
 */
export const checkLike = async (eventId: string): Promise<LikeCheckResponse> => {
  const response = await api.get<LikeCheckResponse>(`/events/${eventId}/like/check`);
  return response.data;
};

/**
 * Get like count for an event (public)
 */
export const getLikeCount = async (eventId: string): Promise<{ success: boolean; data: { likeCount: number } }> => {
  const response = await api.get(`/events/${eventId}/likes/count`);
  return response.data;
};

/**
 * Get likes for an event
 */
export const getEventLikes = async (eventId: string, page: number = 1, limit: number = 50): Promise<{ success: boolean; data: { likes: Like[] } }> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  const response = await api.get(`/events/${eventId}/likes?${params.toString()}`);
  return response.data;
};

