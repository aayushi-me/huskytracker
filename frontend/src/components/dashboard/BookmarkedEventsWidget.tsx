import { useNavigate } from "react-router-dom";
import { EventDto } from "../ui/EventCard";
import DashboardWidget from "./DashboardWidget";

interface BookmarkedEventsWidgetProps {
  events: EventDto[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function BookmarkedEventsWidget({
  events,
  loading,
  error,
  onRefresh,
}: BookmarkedEventsWidgetProps) {
  const navigate = useNavigate();
  const hasEvents = events && events.length > 0;

  return (
    <DashboardWidget title="Bookmarked events" loading={loading} error={error} onRefresh={onRefresh}>
      {!hasEvents ? (
        <div className="text-xs text-gray-500 flex flex-col gap-1">
          <p>You have no bookmarked events yet.</p>
          <button
            type="button"
            onClick={() => navigate("/app/events")}
            className="text-primary text-[11px] mt-1 hover:underline self-start"
          >
            Browse events
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <ul className="space-y-1.5">
            {events.slice(0, 5).map((event) => (
              <li
                key={event._id}
                className="text-xs text-gray-800 flex items-center justify-between gap-2 cursor-pointer hover:text-primary"
                onClick={() => navigate(`/app/events/${event._id}`)}
              >
                <span className="truncate">{event.title}</span>
                <span className="text-[11px] text-gray-400">
                  {event.startDate
                    ? new Date(event.startDate).toLocaleDateString()
                    : "TBD"}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="text-[11px] text-primary hover:underline mt-1"
            onClick={() => navigate("/app/events")}
          >
            View all
          </button>
        </div>
      )}
    </DashboardWidget>
  );
}


