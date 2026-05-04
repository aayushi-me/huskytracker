// src/components/organizer/UpcomingEventsWidget.tsx

import React, { useMemo } from "react";
import { OrganizerEvent } from "../../types/events";
import Skeleton from "../ui/Skeleton";

type Props = {
  events?: OrganizerEvent[];
  isLoading?: boolean;
};

const UpcomingEventsWidget: React.FC<Props> = ({ events, isLoading }) => {
  const upcomingEvents = useMemo(() => {
    if (!events) return [];

    const now = new Date();

    return events
      .filter(
        (e) =>
          e.status === "published" &&
          new Date(e.startDateTime).getTime() > now.getTime()
      )
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
      )
      .slice(0, 5);
  }, [events]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Upcoming Events
      </h3>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : upcomingEvents.length === 0 ? (
        // Empty state
        <p className="text-xs text-gray-500">
          No upcoming events. Published future events will show here.
        </p>
      ) : (
        // List of upcoming events
        <ul className="space-y-3 text-xs">
          {upcomingEvents.map((event) => (
            <li
              key={event.id}
              className="border-b border-gray-100 pb-2 last:border-none"
            >
              <div className="font-medium text-gray-900 line-clamp-1">
                {event.title}
              </div>
              <div className="text-[11px] text-gray-500">
                {new Date(event.startDateTime).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UpcomingEventsWidget;
