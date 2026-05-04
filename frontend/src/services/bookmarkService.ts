/**
 * Bookmark Service
 * Handles all bookmark-related API calls
 */

import api from './api';

import { EventDto } from '../components/ui/EventCard';

export interface Bookmark {
  _id: string;
  user: string;
  event: EventDto;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkResponse {
  success: boolean;
  data: {
    bookmarked: boolean;
    bookmark: Bookmark | null;
    bookmarkCount: number;
  };
}

export interface BookmarksListResponse {
  success: boolean;
  data: {
    bookmarks: Bookmark[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface BookmarkCheckResponse {
  success: boolean;
  data: {
    bookmarked: boolean;
    bookmark: Bookmark | null;
    bookmarkCount: number;
  };
}

/**
 * Toggle bookmark for an event
 */
export const toggleBookmark = async (eventId: string): Promise<BookmarkResponse> => {
  const response = await api.post<BookmarkResponse>(`/bookmarks/${eventId}/toggle`);
  return response.data;
};

/**
 * Get user's bookmarks
 */
export const getMyBookmarks = async (
  page: number = 1,
  limit: number = 20,
  tag?: string,
  search?: string
): Promise<BookmarksListResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (tag) params.append('tag', tag);
  if (search) params.append('search', search);

  const response = await api.get<BookmarksListResponse>(`/bookmarks?${params.toString()}`);
  return response.data;
};

/**
 * Check if user has bookmarked an event
 */
export const checkBookmark = async (eventId: string): Promise<BookmarkCheckResponse> => {
  const response = await api.get<BookmarkCheckResponse>(`/bookmarks/${eventId}/check`);
  return response.data;
};

/**
 * Get bookmark count for an event (public)
 */
export const getBookmarkCount = async (eventId: string): Promise<{ success: boolean; data: { bookmarkCount: number } }> => {
  const response = await api.get(`/bookmarks/${eventId}/count`);
  return response.data;
};

/**
 * Update bookmark (tags, notes)
 */
export const updateBookmark = async (
  bookmarkId: string,
  data: { tags?: string[]; notes?: string }
): Promise<{ success: boolean; data: { bookmark: Bookmark } }> => {
  const response = await api.put(`/bookmarks/${bookmarkId}`, data);
  return response.data;
};

/**
 * Delete bookmark
 */
export const deleteBookmark = async (bookmarkId: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/bookmarks/${bookmarkId}`);
  return response.data;
};

/**
 * Get user's bookmark tags
 */
export const getMyTags = async (): Promise<{ success: boolean; data: { tags: string[] } }> => {
  const response = await api.get('/bookmarks/tags/all');
  return response.data;
};

/**
 * Get upcoming bookmarked events
 */
export const getUpcomingBookmarks = async (): Promise<{ success: boolean; data: { bookmarks: Bookmark[] } }> => {
  const response = await api.get('/bookmarks/upcoming/all');
  return response.data;
};

