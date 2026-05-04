import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { useDashboard } from "../hooks/useDashboard";
import UpcomingEventsWidget from "../components/dashboard/UpcomingEventsWidget";
import BookmarkedEventsWidget from "../components/dashboard/BookmarkedEventsWidget";
import SuggestedEventsWidget from "../components/dashboard/SuggestedEventsWidget";
import UserStatsWidget from "../components/dashboard/UserStatsWidget";
import CalendarWidget from "../components/dashboard/CalendarWidget";
import NotificationsPanel from "../components/dashboard/NotificationsPanel";
import QuickActionsWidget from "../components/dashboard/QuickActionsWidget";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, isRefreshing, error, refresh } = useDashboard();

  const loading = isLoading && !data;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            {user?.firstName ? `Welcome back, ${user.firstName}!` : "Welcome back 👋"}
      </h1>
          <p className="text-xs text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your events today.
          </p>
        </div>
        <div className="flex items-center gap-2">
      <Button
            size="sm"
            variant="outline"
            onClick={() => refresh()}
            disabled={isRefreshing || loading}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
      </Button>
        </div>
      </div>

      {/* GLOBAL ERROR */}
      {error && !loading && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2 flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => refresh()}>
            Retry
      </Button>
        </div>
      )}

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Column 1 */}
        <div className="space-y-4">
          <UpcomingEventsWidget
            events={data?.upcomingEvents || []}
            loading={loading}
            error={null}
            onRefresh={refresh}
          />
          <BookmarkedEventsWidget
            events={data?.bookmarks || []}
            loading={loading}
            error={null}
            onRefresh={refresh}
      />
        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          <SuggestedEventsWidget
            events={data?.recommendations || []}
            loading={loading}
            error={null}
            onRefresh={refresh}
          />
          <UserStatsWidget
            stats={data?.stats || null}
            loading={loading}
            error={null}
            onRefresh={refresh}
          />
          <QuickActionsWidget />
        </div>

        {/* Column 3 */}
        <div className="space-y-4">
          <CalendarWidget
            calendar={data?.calendar || null}
            loading={loading}
            error={null}
            onRefresh={refresh}
          />
          <NotificationsPanel
            notifications={data?.notifications || []}
            loading={loading}
            error={null}
            onRefresh={refresh}
          />
        </div>
      </div>

      {/* Top-level skeleton while everything loads first time */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`dashboard-skeleton-${idx}`}
              className="bg-white rounded-xl shadow-soft border border-gray-100 p-4"
            >
              <Skeleton className="h-4 w-1/3 mb-3" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-5/6 mb-1" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
