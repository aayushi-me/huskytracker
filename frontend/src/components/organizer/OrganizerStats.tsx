import React from "react";
import { OrganizerStats as StatsType } from "../../types/events";
import Skeleton from "../ui/Skeleton";

type OrganizerStatsProps = {
  stats?: StatsType;
  isLoading?: boolean;
};

const OrganizerStats: React.FC<OrganizerStatsProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const { totalEvents, totalAttendees, upcomingEventsCount, averageFillRate } = stats;

  const cards = [
    { label: "Total Events", value: totalEvents },
    { label: "Total Attendees", value: totalAttendees },
    { label: "Upcoming Events", value: upcomingEventsCount },
    {
      label: "Average Fill Rate",
      value: averageFillRate != null ? `${averageFillRate}%` : "–",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1"
        >
          <span className="text-sm text-gray-500">{card.label}</span>
          <span className="text-2xl font-semibold text-gray-900">{card.value}</span>
        </div>
      ))}
    </div>
  );
};

export default OrganizerStats;
