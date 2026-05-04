import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EventDto } from "../ui/EventCard";
import DashboardWidget from "./DashboardWidget";
import Skeleton from "../ui/Skeleton";

interface UpcomingEventsWidgetProps {
  events: EventDto[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

function formatCountdown(startDate?: string) {
  if (!startDate) return "";
  const now = new Date();
  const start = new Date(startDate);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return "Started";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    const hours = diffHours;
    const minutes = diffMinutes % 60;
    return `in ${hours}h ${minutes}m`;
  }

  return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export default function UpcomingEventsWidget({
  events,
  loading,
  error,
  onRefresh,
}: UpcomingEventsWidgetProps) {
  const navigate = useNavigate();
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hasEvents = events && events.length > 0;

  return (
    <DashboardWidget title="Upcoming events" loading={loading} error={error} onRefresh={onRefresh}>
      {!hasEvents ? (
        <div className="text-xs text-gray-500 flex flex-col gap-1">
          <p>No upcoming events.</p>
          <button
            type="button"
            onClick={() => navigate("/app/events")}
            className="text-primary text-[11px] mt-1 hover:underline self-start"
          >
            Browse events
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.slice(0, 5).map((event) => {
            const urgent =
              event.startDate && new Date(event.startDate).getTime() - now.getTime() < 24 * 60 * 60 * 1000;
            return (
              <li
                key={event._id}
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => navigate(`/app/events/${event._id}`)}
              >
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                  {event.startDate ? new Date(event.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBD"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-primary">
                    {event.title}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatCountdown(event.startDate)}{" "}
                    {urgent && <span className="text-red-500 font-medium ml-1">Starting soon</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardWidget>
  );
}


