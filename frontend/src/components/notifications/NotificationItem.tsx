/**
 * NotificationItem Component
 * Displays a single notification with icon, message, and timestamp
 */

import { ReactNode, useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  Info,
  XCircle,
  ArrowUp,
  MessageCircle,
  Reply,
  Mail,
  Megaphone,
  Pencil,
} from "lucide-react";
import { Notification, NotificationType } from "../../types/notifications";
import { formatRelativeTime } from "../../utils/formatTimestamp";

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
}

/**
 * Get icon component for notification type
 */
function getNotificationIcon(type: NotificationType): ReactNode {
  const iconProps = { className: "w-5 h-5", "aria-hidden": true as const };

  switch (type) {
    case NotificationType.EVENT_REMINDER:
      return <Clock {...iconProps} />;
    case NotificationType.REGISTRATION_CONFIRMED:
    case NotificationType.REGISTRATION_APPROVED:
      return <CheckCircle {...iconProps} />;
    case NotificationType.EVENT_UPDATED:
      return <Pencil {...iconProps} />;
    case NotificationType.EVENT_CANCELLED:
      return <XCircle {...iconProps} />;
    case NotificationType.WAITLIST_PROMOTED:
    case NotificationType.REGISTRATION_WAITLISTED:
      return <ArrowUp {...iconProps} />;
    case NotificationType.NEW_COMMENT:
      return <MessageCircle {...iconProps} />;
    case NotificationType.COMMENT_REPLY:
      return <Reply {...iconProps} />;
    case NotificationType.EVENT_INVITATION:
      return <Mail {...iconProps} />;
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return <Megaphone {...iconProps} />;
    default:
      return <Info {...iconProps} />;
  }
}

/**
 * Get icon color class based on notification type
 */
function getIconColorClass(type: NotificationType, isRead: boolean): string {
  if (isRead) {
    return "text-gray-400";
  }

  switch (type) {
    case NotificationType.EVENT_REMINDER:
      return "text-blue-500";
    case NotificationType.REGISTRATION_CONFIRMED:
    case NotificationType.REGISTRATION_APPROVED:
      return "text-green-500";
    case NotificationType.EVENT_UPDATED:
      return "text-indigo-500";
    case NotificationType.EVENT_CANCELLED:
      return "text-red-500";
    case NotificationType.WAITLIST_PROMOTED:
      return "text-yellow-500";
    case NotificationType.NEW_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return "text-purple-500";
    case NotificationType.EVENT_INVITATION:
      return "text-blue-500";
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return "text-orange-500";
    default:
      return "text-gray-500";
  }
}

export default function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: NotificationItemProps) {
  // Determine read status - check both isRead property and status field
  // Ensure this updates reactively when notification changes
  const isRead = Boolean(
    notification.isRead === true || 
    notification.status === "READ"
  );
  const iconColorClass = getIconColorClass(notification.type, isRead);
  
  // State to force re-render every minute to update relative timestamps
  const [, setUpdateCounter] = useState(0);

  // Update timestamp every minute (60000ms) to refresh relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateCounter(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    // Mark as read if unread
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
    onClick(notification);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left px-4 py-3
        flex items-start gap-3
        hover:bg-gray-50 active:bg-gray-100
        transition-colors duration-150
        border-b border-gray-100 last:border-b-0
        ${isRead ? "bg-white" : "bg-blue-50/50"}
      `}
      aria-label={`${isRead ? "Read" : "Unread"} notification: ${notification.message}`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${iconColorClass}`}>
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        {notification.title && (
          <p
            className={`
              text-xs font-semibold mb-1
              ${isRead ? "text-gray-600" : "text-gray-800"}
            `}
          >
            {notification.title}
          </p>
        )}
        {/* Message */}
        <p
          className={`
            text-sm
            ${isRead ? "text-gray-600 font-normal" : "text-gray-900 font-medium"}
            line-clamp-2
          `}
        >
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator dot */}
      {!isRead && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" aria-hidden="true" />
      )}
    </button>
  );
}
