/**
 * Like Button Component
 * Thumbs up icon button for liking/unliking events
 * Only enabled for attendees of completed events
 * Supports optimistic updates, loading states, and animations
 */

import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLike } from '../../hooks/useLike';

interface LikeButtonProps {
  eventId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  onToggle?: (liked: boolean, count: number) => void;
}

export default function LikeButton({
  eventId,
  size = 'md',
  showCount = true,
  className = '',
  onToggle
}: LikeButtonProps) {
  const { isAuthenticated } = useAuth();
  const {
    isLiked,
    isLoading,
    isChecking,
    likeCount,
    canLike,
    toggleLike: handleToggle
  } = useLike(eventId);

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'h-4 w-4',
      button: 'h-8 w-8',
      text: 'text-xs'
    },
    md: {
      icon: 'h-5 w-5',
      button: 'h-10 w-10',
      text: 'text-sm'
    },
    lg: {
      icon: 'h-6 w-6',
      button: 'h-12 w-12',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  // Format large numbers (1K, 10K, etc.)
  const formatLikeCount = (count: number): string => {
    if (count === 0) return 'Be the first to like';
    if (count < 1000) return `${count} ${count === 1 ? 'like' : 'likes'}`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K likes`;
    return `${(count / 1000000).toFixed(1)}M likes`;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    const previousState = isLiked;
    await handleToggle();
    
    // Callback with new state
    if (onToggle) {
      setTimeout(() => {
        onToggle(!previousState, likeCount);
      }, 100);
    }
  };

  // Determine if button should appear filled
  const isFilled = isLiked;
  const isDisabled = !canLike || isLoading;

  // Loading state
  if (isChecking && isAuthenticated) {
    return (
      <button
        className={`
          ${config.button}
          rounded-lg
          flex items-center justify-center
          bg-gray-100 text-gray-400
          cursor-not-allowed
          ${className}
        `}
        disabled
        aria-label="Checking like status"
      >
        <ThumbsUp className={`${config.icon} animate-pulse`} />
      </button>
    );
  }

  // Determine tooltip message
  let tooltipMessage = '';
  if (!isAuthenticated) {
    tooltipMessage = 'Login to like';
  } else if (!canLike) {
    tooltipMessage = 'Only attendees can like events';
  } else if (isFilled) {
    tooltipMessage = 'Remove like';
  } else {
    tooltipMessage = 'Like this event';
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          ${config.button}
          rounded-lg
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isFilled
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 active:scale-95'
              : canLike
              ? 'bg-white text-gray-400 hover:bg-gray-50 hover:text-blue-600 hover:scale-110 active:scale-95 border border-gray-200'
              : 'bg-gray-50 text-gray-300 border border-gray-200 cursor-not-allowed'
          }
          ${isLoading ? 'animate-pulse' : ''}
          ${className}
        `}
        aria-label={isFilled ? 'Remove like' : 'Like event'}
        aria-pressed={isFilled}
        title={tooltipMessage}
      >
        <ThumbsUp
          className={`
            ${config.icon}
            ${isFilled ? 'fill-current' : ''}
            transition-all duration-200
            ${isLoading ? 'animate-pulse' : ''}
          `}
        />
      </button>

      {showCount && (
        <span className={`${config.text} text-gray-600 font-medium`}>
          {formatLikeCount(likeCount)}
        </span>
      )}
    </div>
  );
}

