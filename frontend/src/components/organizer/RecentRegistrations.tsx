// src/components/organizer/RecentRegistrations.tsx

import React from "react";
import { RecentRegistration } from "../../types/events";
import Skeleton from "../ui/Skeleton";

type Props = {
  items?: RecentRegistration[];
  isLoading?: boolean;
};

const RecentRegistrations: React.FC<Props> = ({ items, isLoading }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Recent Registrations
      </h3>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        // Empty state
        <p className="text-xs text-gray-500">
          No registrations yet. Once attendees register, they will appear here.
        </p>
      ) : (
        // List state
        <ul className="space-y-3 text-xs">
          {items.map((reg) => (
            <li key={reg.id} className="border-b border-gray-100 pb-2 last:border-none">
              <div className="font-medium text-gray-900">
                {reg.attendeeName}
              </div>
              <div className="text-gray-600">{reg.eventTitle}</div>
              <div className="text-[11px] text-gray-400">
                {new Date(reg.registeredAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentRegistrations;
