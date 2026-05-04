import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import { DashboardNotification } from "../../services/dashboardApi";

interface NotificationsPanelProps {
  notifications: DashboardNotification[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 5;

export default function NotificationsPanel({
  notifications,
  loading,
  error,
  onRefresh,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const hasNotifications = notifications && notifications.length > 0;
  
  const totalPages = hasNotifications ? Math.ceil(notifications.length / ITEMS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedNotifications = hasNotifications ? notifications.slice(startIndex, endIndex) : [];

  return (
    <DashboardWidget
      title="Notifications"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    >
      {!hasNotifications ? (
        <p className="text-xs text-gray-500">No notifications.</p>
      ) : (
        <>
          {/* Scrollable notifications list */}
          <div className="overflow-y-auto max-h-64 pr-1">
            <ul className="space-y-2 text-xs">
              {displayedNotifications.map((n, index) => (
                <li
                  key={n._id || `notification-${startIndex + index}-${n.createdAt}`}
                  className="flex flex-col gap-0.5 cursor-pointer hover:bg-gray-50 rounded-md px-2 py-1.5 transition-colors"
                  onClick={() => {
                    if (n.actionUrl) {
                      navigate(n.actionUrl.startsWith("/") ? n.actionUrl : `/app${n.actionUrl}`);
                    }
                  }}
                >
                  <span className="font-medium text-gray-900">{n.title}</span>
                  <span className="text-gray-600">{n.message}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-xs text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="text-xs text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </DashboardWidget>
  );
}


