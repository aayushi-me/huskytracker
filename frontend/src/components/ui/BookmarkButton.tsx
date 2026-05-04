/**
 * Bookmark Button Component
 * Heart icon button for bookmarking/unbookmarking events
 * Supports optimistic updates, loading states, and animations
 */

import React from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBookmark } from '../../hooks/useBookmark';

interface BookmarkButtonProps {
  eventId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  onToggle?: (bookmarked: boolean, count: number) => void;
}

export default function BookmarkButton({
  eventId,
  size = 'md',
  showCount = false,
  className = '',
  onToggle
}: BookmarkButtonProps) {
  const { isAuthenticated } = useAuth();
  const {
    isBookmarked,
    isLoading,
    isChecking,
    bookmarkCount,
    toggleBookmark: handleToggle
  } = useBookmark(eventId);

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

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    const previousState = isBookmarked;
    await handleToggle();
    
    // Callback with new state (hook handles the state update)
    if (onToggle) {
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        onToggle(!previousState, bookmarkCount);
      }, 100);
    }
  };

  const isFilled = isBookmarked;

  // Loading state
  if (isChecking && isAuthenticated) {
    return (
      <button
        className={`
          ${config.button}
          rounded-full
          flex items-center justify-center
          bg-gray-100 text-gray-400
          cursor-not-allowed
          ${className}
        `}
        disabled
        aria-label="Checking bookmark status"
      >
        <Heart className={`${config.icon} animate-pulse`} />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          ${config.button}
          rounded-full
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isFilled
              ? 'bg-red-50 text-red-500 hover:bg-red-100 hover:scale-110 active:scale-95'
              : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-red-400 hover:scale-110 active:scale-95 border border-gray-200'
          }
          ${isLoading ? 'animate-pulse' : ''}
          ${className}
        `}
        aria-label={isFilled ? 'Remove bookmark' : 'Bookmark event'}
        aria-pressed={isFilled}
        title={!isAuthenticated ? 'Login to bookmark' : isFilled ? 'Remove bookmark' : 'Bookmark event'}
      >
        <Heart
          className={`
            ${config.icon}
            ${isFilled ? 'fill-current' : ''}
            transition-all duration-200
            ${isLoading ? 'animate-pulse' : ''}
          `}
        />
      </button>

      {showCount && bookmarkCount > 0 && (
        <span className={`${config.text} text-gray-600 font-medium`}>
          {bookmarkCount}
        </span>
      )}
    </div>
  );
}

