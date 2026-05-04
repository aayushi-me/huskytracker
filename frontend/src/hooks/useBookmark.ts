/**
 * useBookmark Hook
 * Custom hook for managing bookmark state and operations
 * Handles optimistic updates, error handling, and state synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  toggleBookmark as toggleBookmarkAPI,
  checkBookmark,
  getMyBookmarks,
  Bookmark,
  BookmarksListResponse
} from '../services/bookmarkService';
import { useToast } from './useToast';

interface UseBookmarkOptions {
  eventId?: string;
  autoCheck?: boolean;
}

interface UseBookmarkReturn {
  // State
  isBookmarked: boolean;
  isLoading: boolean;
  isChecking: boolean;
  error: string | null;
  bookmark: Bookmark | null;
  bookmarkCount: number;

  // Actions
  toggleBookmark: () => Promise<void>;
  refreshBookmark: () => Promise<void>;
}

/**
 * Hook for managing a single event's bookmark state
 */
export function useBookmark(eventId?: string, options: UseBookmarkOptions = {}): UseBookmarkReturn {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { autoCheck = true } = options;

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  // Check bookmark status
  const checkBookmarkStatus = useCallback(async () => {
    if (!eventId || !isAuthenticated) {
      setIsChecking(false);
      // Still fetch public bookmark count
      try {
        const { getBookmarkCount } = await import('../services/bookmarkService');
        const countData = await getBookmarkCount(eventId!);
        setBookmarkCount(countData.data.bookmarkCount);
      } catch (err) {
        // Ignore errors for public count
      }
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      const [bookmarkData, countData] = await Promise.all([
        checkBookmark(eventId),
        import('../services/bookmarkService').then(m => m.getBookmarkCount(eventId))
      ]);

      setIsBookmarked(bookmarkData.data.bookmarked);
      setBookmark(bookmarkData.data.bookmark);
      setBookmarkCount(countData.data.bookmarkCount);
    } catch (err: any) {
      console.error('Error checking bookmark status:', err);
      setError(err?.response?.data?.message || 'Failed to check bookmark status');
    } finally {
      setIsChecking(false);
    }
  }, [eventId, isAuthenticated]);

  // Initial check
  useEffect(() => {
    if (autoCheck && eventId) {
      checkBookmarkStatus();
    }
  }, [eventId, autoCheck, checkBookmarkStatus]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async () => {
    if (!eventId) return;

    if (!isAuthenticated) {
      showToast('Please login to bookmark events', 'info');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    setOptimisticState(newBookmarkedState);
    setBookmarkCount(prev => newBookmarkedState ? prev + 1 : Math.max(0, prev - 1));

    setIsLoading(true);
    setError(null);

    try {
      const response = await toggleBookmarkAPI(eventId);
      const { bookmarked, bookmark: newBookmark, bookmarkCount: newCount } = response.data;

      // Update with server response
      setIsBookmarked(bookmarked);
      setBookmark(newBookmark);
      setBookmarkCount(newCount);
      setOptimisticState(null);

      // Success feedback
      showToast(
        bookmarked ? 'Event bookmarked!' : 'Bookmark removed',
        'success'
      );
    } catch (err: any) {
      // Revert optimistic update
      setIsBookmarked(!newBookmarkedState);
      setBookmarkCount(prev => newBookmarkedState ? Math.max(0, prev - 1) : prev + 1);
      setOptimisticState(null);

      const errorMessage = err?.response?.data?.message || 'Unable to bookmark event. Try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, isAuthenticated, isBookmarked, isLoading, showToast]);

  // Refresh bookmark status
  const refreshBookmark = useCallback(async () => {
    await checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  return {
    isBookmarked: optimisticState !== null ? optimisticState : isBookmarked,
    isLoading,
    isChecking,
    error,
    bookmark,
    bookmarkCount,
    toggleBookmark,
    refreshBookmark
  };
}

interface UseBookmarksOptions {
  page?: number;
  limit?: number;
  tag?: string;
  search?: string;
  autoFetch?: boolean;
}

interface UseBookmarksReturn {
  // State
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  pagination: BookmarksListResponse['data']['pagination'] | null;
  tags: string[];

  // Actions
  fetchBookmarks: (options?: UseBookmarksOptions) => Promise<void>;
  refreshBookmarks: () => Promise<void>;
}

/**
 * Hook for managing user's bookmarks list
 */
export function useBookmarks(options: UseBookmarksOptions = {}): UseBookmarksReturn {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const {
    page = 1,
    limit = 20,
    tag,
    search,
    autoFetch = true
  } = options;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<BookmarksListResponse['data']['pagination'] | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async (fetchOptions?: UseBookmarksOptions) => {
    if (!isAuthenticated) {
      setError('Please login to view your bookmarks');
      return;
    }

    const opts = fetchOptions || options;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getMyBookmarks(
        opts.page || page,
        opts.limit || limit,
        opts.tag || tag,
        opts.search || search
      );

      setBookmarks(response.data.bookmarks);
      setPagination(response.data.pagination);

      // Fetch tags if not already fetched
      if (tags.length === 0) {
        try {
          const { getMyTags } = await import('../services/bookmarkService');
          const tagsResponse = await getMyTags();
          setTags(tagsResponse.data.tags);
        } catch (err) {
          console.error('Error fetching tags:', err);
        }
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to load bookmarks';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, page, limit, tag, search, options, tags.length, showToast]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchBookmarks();
    }
  }, [autoFetch, isAuthenticated, fetchBookmarks]);

  // Refresh bookmarks
  const refreshBookmarks = useCallback(async () => {
    await fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    pagination,
    tags,
    fetchBookmarks,
    refreshBookmarks
  };
}

