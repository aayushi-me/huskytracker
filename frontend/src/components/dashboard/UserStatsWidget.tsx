import { useNavigate } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import { UserStats } from "../../services/dashboardApi";

interface UserStatsWidgetProps {
  stats: UserStats | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function UserStatsWidget({
  stats,
  loading,
  error,
  onRefresh,
}: UserStatsWidgetProps) {
  const navigate = useNavigate();

  const attended = stats?.attended ?? 0;
  const registered = stats?.registered ?? 0;
  const bookmarked = stats?.bookmarked ?? 0;

  return (
    <DashboardWidget title="Your stats" loading={loading} error={error} onRefresh={onRefresh}>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <button
          type="button"
          onClick={() => navigate("/app/events")}
          className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 px-2 py-2 hover:border-primary hover:bg-primary/5 transition"
        >
          <span className="text-[11px] text-gray-500">Attended</span>
          <span className="text-base font-semibold text-gray-900">{attended}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/app/events")}
          className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 px-2 py-2 hover:border-primary hover:bg-primary/5 transition"
        >
          <span className="text-[11px] text-gray-500">Registered</span>
          <span className="text-base font-semibold text-gray-900">{registered}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/app/events")}
          className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 px-2 py-2 hover:border-primary hover:bg-primary/5 transition"
        >
          <span className="text-[11px] text-gray-500">Bookmarked</span>
          <span className="text-base font-semibold text-gray-900">{bookmarked}</span>
        </button>
      </div>
    </DashboardWidget>
  );
}


