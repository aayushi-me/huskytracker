/**
 * NotificationBell Component
 * Bell icon button with unread badge in header
 */

import { Bell } from "lucide-react";
import UnreadBadge from "./UnreadBadge";

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export default function NotificationBell({
  unreadCount,
  onClick,
  className = "",
}: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg
        text-gray-600 hover:text-gray-900
        hover:bg-gray-100
        transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${className}
      `}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="w-6 h-6" aria-hidden="true" />
      <UnreadBadge count={unreadCount} />
    </button>
  );
}
