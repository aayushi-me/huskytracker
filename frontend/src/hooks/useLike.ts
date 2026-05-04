/**
 * useLike Hook
 * Custom hook for managing like state and operations
 * Handles attendance verification, optimistic updates, and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  toggleLike as toggleLikeAPI,
  checkLike,
  getLikeCount,
  LikeCheckResponse
} from '../services/likeService';
import { useToast } from './useToast';

interface UseLikeOptions {
  eventId?: string;
  autoCheck?: boolean;
}

interface UseLikeReturn {
  // State
  isLiked: boolean;
  isLoading: boolean;
  isChecking: boolean;
  error: string | null;
  likeCount: number;
  canLike: boolean; // Whether user can like (attended and event completed)

  // Actions
  toggleLike: () => Promise<void>;
  refreshLike: () => Promise<void>;
}

/**
 * Hook for managing a single event's like state
 */
export function useLike(eventId?: string, options: UseLikeOptions = {}): UseLikeReturn {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { autoCheck = true } = options;

  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [canLike, setCanLike] = useState(false);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  // Check like status
  const checkLikeStatus = useCallback(async () => {
    if (!eventId) {
      setIsChecking(false);
      return;
    }

    if (!isAuthenticated) {
      setIsChecking(false);
      // Still fetch public like count
      try {
        const countData = await getLikeCount(eventId);
        setLikeCount(countData.data.likeCount);
      } catch (err) {
        // Ignore errors for public count
      }
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      const [likeData, countData] = await Promise.all([
        checkLike(eventId),
        getLikeCount(eventId)
      ]);

      setIsLiked(likeData.data.liked);
      setCanLike(likeData.data.canLike);
      setLikeCount(countData.data.likeCount);
    } catch (err: any) {
      console.error('Error checking like status:', err);
      setError(err?.response?.data?.message || 'Failed to check like status');
      
      // Still try to get public count
      try {
        const countData = await getLikeCount(eventId);
        setLikeCount(countData.data.likeCount);
      } catch (countErr) {
        // Ignore
      }
    } finally {
      setIsChecking(false);
    }
  }, [eventId, isAuthenticated]);

  // Initial check
  useEffect(() => {
    if (autoCheck && eventId) {
      checkLikeStatus();
    }
  }, [eventId, autoCheck, checkLikeStatus]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!eventId) return;

    if (!isAuthenticated) {
      showToast('Please login to like events', 'info');
      return;
    }

    if (!canLike) {
      showToast('Only attendees can like events', 'info');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setOptimisticState(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    setIsLoading(true);
    setError(null);

    try {
      const response = await toggleLikeAPI(eventId);
      const { liked, likeCount: newCount } = response.data;

      // Update with server response
      setIsLiked(liked);
      setLikeCount(newCount);
      setOptimisticState(null);

      // Success feedback
      showToast(
        liked ? 'Event liked!' : 'Like removed',
        'success'
      );
    } catch (err: any) {
      // Revert optimistic update
      setIsLiked(!newLikedState);
      setLikeCount(prev => newLikedState ? Math.max(0, prev - 1) : prev + 1);
      setOptimisticState(null);

      const errorMessage = err?.response?.data?.message || 'Unable to like event. Try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, isAuthenticated, canLike, isLiked, isLoading, showToast]);

  // Refresh like status
  const refreshLike = useCallback(async () => {
    await checkLikeStatus();
  }, [checkLikeStatus]);

  return {
    isLiked: optimisticState !== null ? optimisticState : isLiked,
    isLoading,
    isChecking,
    error,
    likeCount,
    canLike,
    toggleLike,
    refreshLike
  };
}

