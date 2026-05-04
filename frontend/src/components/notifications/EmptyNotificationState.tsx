/**
 * EmptyNotificationState Component
 * Displays when user has no notifications
 */

import { BellOff } from "lucide-react";

export default function EmptyNotificationState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <BellOff className="w-12 h-12 text-gray-400 mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-gray-500">No notifications yet</p>
      <p className="text-xs text-gray-400 mt-1 text-center">
        When you receive notifications, they&apos;ll appear here
      </p>
    </div>
  );
}
