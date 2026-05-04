// src/components/organizer/OrganizerEventCard.tsx

import React from "react";
import { OrganizerEvent } from "../../types/events";
import EventQuickActions from "./EventQuickActions";
import { format } from "date-fns";

type Props = {
  event: OrganizerEvent;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
};

const OrganizerEventCard: React.FC<Props> = ({
  event,
  onView,
  onEdit,
  onCancel,
  onDelete,
}) => {
  const {
    id,
    title,
    category,
    status,
    startDateTime,
    endDateTime,
    location,
    capacity,
    registrationsCount,
  } = event;

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  const fillRate =
    capacity > 0 ? Math.round((registrationsCount / capacity) * 100) : 0;

  // badge colors
  const statusColors: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
    past: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between gap-4">
      {/* Left Side */}
      <div className="flex-1 space-y-2">
        {/* Title + Category + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">
              {title}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>

              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                {category}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <EventQuickActions
            status={status}
            onView={() => onView(id)}
            onEdit={() => onEdit(id)}
            onCancel={
              status === "published" ? () => onCancel(id) : undefined
            }
            onDelete={() => onDelete(id)}
          />
        </div>

        {/* Date + Time */}
        <div className="text-xs text-gray-700 space-y-1">
          <p>
            {format(start, "EEE, MMM d, h:mm a")} –{" "}
            {format(end, "h:mm a")}
          </p>
          <p className="text-gray-500">{location.venue}</p>
        </div>

        {/* Registration Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>
              {registrationsCount}/{capacity} attendees
            </span>
            <span>{fillRate}% full</span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${fillRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerEventCard;
