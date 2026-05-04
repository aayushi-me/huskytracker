/**
 * NotificationCenter Component
 * Dropdown/modal displaying notifications with mark as read functionality
 */

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, CheckCheck } from "lucide-react";
import { Notification, NotificationType } from "../../types/notifications";
import NotificationItem from "./NotificationItem";
import EmptyNotificationState from "./EmptyNotificationState";
import Spinner from "../ui/Spinner";
import Button from "../ui/Button";
import { useOutsideClick } from "../../hooks/useOutsideClick";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isFetching: boolean;
  isLoadingMore?: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  } | null;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
}

/**
 * Get navigation URL based on notification type and data
 */
function getNotificationUrl(notification: Notification): string | null {
  // Handle both relatedEventId and event fields
  const eventRef = notification.relatedEventId || notification.event;
  
  // Extract event ID - handle both string and object formats
  let eventId: string | undefined;
  if (typeof eventRef === "string") {
    eventId = eventRef;
  } else if (eventRef && typeof eventRef === "object") {
    // Could be { _id: string, title: string } or ObjectId
    eventId = eventRef._id || eventRef.toString?.() || String(eventRef);
  }
  
  console.log('[getNotificationUrl] Extracted event ID:', {
    eventRef,
    eventId,
    type: notification.type
  });

  switch (notification.type) {
    case NotificationType.EVENT_REMINDER:
    case NotificationType.EVENT_UPDATED:
    case NotificationType.REGISTRATION_CONFIRMED:
    case NotificationType.WAITLIST_PROMOTED:
    case NotificationType.NEW_COMMENT:
    case NotificationType.COMMENT_REPLY:
    case NotificationType.EVENT_INVITATION:
      if (eventId) {
        // For comment notifications, we can add a hash to scroll to comments
        if (
          notification.type === NotificationType.NEW_COMMENT ||
          notification.type === NotificationType.COMMENT_REPLY
        ) {
          return `/app/events/${eventId}#comments`;
        }
        return `/app/events/${eventId}`;
      }
      return null;

    case NotificationType.EVENT_CANCELLED:
      // Navigate to events list
      return "/app/events";

    case NotificationType.SYSTEM_ANNOUNCEMENT:
      // Use actionUrl if provided, but normalize it
      if (notification.actionUrl) {
        // If actionUrl doesn't start with /app, prepend it
        const actionUrl = notification.actionUrl.startsWith('/app') 
          ? notification.actionUrl 
          : `/app${notification.actionUrl}`;
        return actionUrl;
      }
      // If there's an event ID, navigate to that event
      if (eventId) {
        return `/app/events/${eventId}`;
      }
      return null;

    default:
      if (eventId) {
        return `/app/events/${eventId}`;
      }
      return null;
  }
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isLoading,
  isFetching,
  isLoadingMore = false,
  error,
  pagination,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  onRefresh,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const centerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset drag state when closed
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      setDragOffset(0);
      setIsDragging(false);
      dragOffsetRef.current = 0;
    }
  }, [isOpen]);

  // Close on outside click
  useOutsideClick(centerRef, () => {
    if (isOpen) {
      onClose();
    }
  });

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when notification center is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, isMobile]);

  const handleNotificationClick = async (notification: Notification) => {
    const url = getNotificationUrl(notification);
    
    console.log('[NotificationCenter] Clicked notification:', {
      id: notification._id,
      type: notification.type,
      url: url,
      actionUrl: notification.actionUrl,
      eventId: notification.relatedEventId || notification.event,
      isRead: notification.isRead
    });
    
    // Mark as read if unread (do this first, don't wait for navigation)
    if (!notification.isRead && notification.status !== "READ" && onMarkAsRead) {
      try {
        // Mark as read optimistically (don't await - let it happen in background)
        onMarkAsRead(notification._id);
      } catch (err) {
        console.error('[NotificationCenter] Error marking notification as read:', err);
        // Don't block navigation if mark as read fails
      }
    }
    
    if (url) {
      // Close notification center first
      onClose();
      
      // Small delay to ensure center closes smoothly, then navigate
      setTimeout(() => {
        // URL should already be normalized by getNotificationUrl, but ensure it's correct
        // getNotificationUrl already returns URLs starting with /app
        console.log('[NotificationCenter] Navigating to:', url);
        navigate(url);
      }, 100);
    } else {
      console.warn('[NotificationCenter] No URL found for notification:', notification);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await onMarkAllAsRead();
    }
  };

  // Simplified drag handlers for mobile bottom sheet
  const handleDragStart = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  // Global touch handlers attached to document for smooth dragging
  useEffect(() => {
    if (!isMobile || !isOpen || !isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const currentY = e.touches[0].clientY;
      const deltaY = startYRef.current - currentY; // Positive = dragging up
      
      dragOffsetRef.current = deltaY;
      setDragOffset(deltaY);
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      
      const threshold = 80; // pixels to trigger expand/collapse
      const finalOffset = dragOffsetRef.current;
      const viewportHeight = window.innerHeight;

      // Calculate the target height based on drag
      const collapsedHeight = viewportHeight * 0.85;
      const currentHeight = isExpanded ? viewportHeight : collapsedHeight;
      const newHeight = currentHeight + finalOffset;
      const heightPercentage = (newHeight / viewportHeight) * 100;

      // Determine action based on drag distance and final position
      if (finalOffset > threshold && !isExpanded) {
        // Dragged up enough - expand to full screen
        setIsExpanded(true);
      } else if (finalOffset < -threshold && isExpanded) {
        // Dragged down enough - collapse
        setIsExpanded(false);
      } else if (finalOffset < -150 && !isExpanded && heightPercentage < 70) {
        // Dragged down far enough to close
        onClose();
      }

      setIsDragging(false);
      setDragOffset(0);
      dragOffsetRef.current = 0;
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDragging, isMobile, isOpen, isExpanded, onClose]);

  // Calculate height based on drag and expansion state
  const getMobileStyles = () => {
    if (!isMobile) return {};
    
    const viewportHeight = window.innerHeight;
    const collapsedHeight = viewportHeight * 0.85; // 85vh
    const fullHeight = viewportHeight; // 100vh
    
    let targetHeight: number;
    
    if (isDragging && dragOffset !== 0) {
      // During drag, calculate new height based on drag offset
      // dragOffset is positive when dragging UP (should increase height)
      const baseHeight = isExpanded ? fullHeight : collapsedHeight;
      const newHeight = baseHeight + dragOffset; // Adding dragOffset increases height when dragging up
      
      // Clamp between 50% and 100% of viewport
      const minHeight = viewportHeight * 0.5;
      const maxHeight = viewportHeight;
      targetHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
    } else {
      // Not dragging - use expanded state
      targetHeight = isExpanded ? fullHeight : collapsedHeight;
    }
    
    return {
      height: `${targetHeight}px`,
      bottom: 0, // Always anchored to bottom
    };
  };

  if (!isOpen) {
    return null;
  }

  // Notification Center Content
  const notificationContent = (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Notification Center */}
      <div
        ref={centerRef}
        className={`
          fixed md:absolute
          left-0 right-0 bottom-0
          md:bottom-auto md:top-full md:mt-2
          md:left-auto md:right-0
          md:w-96 md:min-w-[320px]
          bg-white rounded-t-2xl md:rounded-2xl
          shadow-xl border border-gray-200
          flex flex-col
          z-50
          ${!isDragging && !isExpanded ? "animate-slideUp md:animate-fadeIn" : ""}
          ${isExpanded ? "rounded-none md:rounded-2xl" : ""}
        `}
        style={{
          ...(isMobile ? getMobileStyles() : { maxHeight: "600px" }),
          transition: isDragging ? "none" : "height 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease-out",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* Drag Handle and Header - both draggable on mobile */}
        <div
          onTouchStart={handleDragStart}
          className={isMobile ? "flex flex-col flex-shrink-0 select-none" : "flex flex-col flex-shrink-0"}
          style={{ touchAction: isMobile ? "none" : "auto" }}
        >
          {/* Drag Handle for Mobile */}
          {isMobile && (
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 border-b border-gray-200"
            onTouchStart={isMobile ? handleDragStart : undefined}
          >
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <div 
              className="flex items-center gap-2" 
              onTouchStart={(e) => {
                e.stopPropagation();
                // Allow button clicks
              }}
            >
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  isLoading={isFetching}
                  disabled={isFetching}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all as read
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ touchAction: isMobile && !isDragging ? "pan-y" : "none" }}
          onTouchStart={(e) => {
            // Prevent drag when touching content area (allow scrolling)
            if (isMobile) {
              e.stopPropagation();
            }
          }}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size={32} />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline" size="sm">
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && notifications.length === 0 && (
            <EmptyNotificationState />
          )}
          
          {/* Debug: Show notification count in development */}
          {process.env.NODE_ENV === 'development' && notifications.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''} 
              ({notifications.filter(n => !n.isRead).length} unread, {notifications.filter(n => n.isRead).length} read)
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && !error && notifications.length > 0 && (
            <>
              <div className="divide-y divide-gray-100" role="list">
                {notifications.map((notification) => {
                  // Ensure unique key - use _id with timestamp as fallback to avoid duplicates
                  const uniqueKey = notification._id 
                    ? `${notification._id}-${notification.createdAt || ''}` 
                    : `notification-${notification.type}-${notification.createdAt || Date.now()}`;
                  return (
                    <NotificationItem
                      key={uniqueKey}
                      notification={notification}
                      onClick={handleNotificationClick}
                      onMarkAsRead={onMarkAsRead}
                    />
                  );
                })}
              </div>

              {/* Load More Button */}
              {pagination?.hasMore && onLoadMore && (
                <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
                  <Button
                    onClick={onLoadMore}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    isLoading={isLoadingMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideUpFromBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 767px) {
          .animate-slideUp {
            animation: slideUpFromBottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        @media (min-width: 768px) {
          .animate-fadeIn {
            animation: fadeIn 0.15s ease-out;
          }
        }
      `}</style>
    </>
  );

  // On mobile, render in portal to avoid header positioning issues
  // On desktop, render in place (relative to bell)
  if (isMobile && typeof document !== "undefined") {
    return createPortal(notificationContent, document.body);
  }

  return notificationContent;
}
