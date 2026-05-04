import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, ThumbsUp } from "lucide-react";
import BookmarkButton from "./BookmarkButton";
import { useLike } from "../../hooks/useLike";

export type EventStatus = "PUBLISHED" | "CANCELLED" | "DRAFT" | string;

type EventLocation =
  | string
  | {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      isVirtual?: boolean;
    };

export interface EventDto {
  _id?: string;
  title: string;
  category?: string;
  status?: EventStatus;
  location?: EventLocation;
  startDate?: string; // ISO string
  endDate?: string;
  description?: string;
  bannerImageUrl?: string;
  imageUrl?: string;
  maxRegistrations?: number;
  currentRegistrations?: number;
  tags?: string[];
}

function formatDateRange(start?: string, end?: string) {
  if (!start) return "";
  const startDate = new Date(start);
  const datePart = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (!end) {
    const time = startDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${datePart} • ${time}`;
  }

  const endDate = new Date(end);
  const startTime = startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = endDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart} • ${startTime}–${endTime}`;
}

export default function EventCard({
  event,
  variant = "grid",
  showBookmark = true,
}: {
  event: EventDto;
  variant?: "grid" | "list";
  showBookmark?: boolean;
}) {
  const image =
    event.bannerImageUrl || event.imageUrl || "/placeholder-event.png";

  const max = event.maxRegistrations ?? 0;
  const current = event.currentRegistrations ?? 0;
  const hasCapacity = max > 0;
  const spotsRemaining = hasCapacity ? Math.max(max - current, 0) : null;
  const isFull = hasCapacity && spotsRemaining === 0;

  const status = event.status || "PUBLISHED";

  const statusStyles: Record<EventStatus, string> = {
    PUBLISHED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    DRAFT: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  const statusLabel: Record<EventStatus, string> = {
    PUBLISHED: "Published",
    CANCELLED: "Cancelled",
    DRAFT: "Draft",
  };

  const statusClass =
    statusStyles[status] || "bg-gray-50 text-gray-700 border-gray-200";
  const statusText = statusLabel[status] || status;

  // Check if event is completed/past
  const now = new Date();
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const isPast = endDate ? endDate < now : false;
  
  // Get like count for past events (always call hook, but only auto-check if past)
  const { likeCount } = useLike(event._id || undefined, { autoCheck: isPast && !!event._id });

  return (
    <div className={`relative rounded-xl border border-gray-200 bg-white shadow-soft hover-lift animate-scaleIn
        ${variant === "list" ? "sm:flex sm:items-stretch" : ""}`}>
      {/* Bookmark Button - positioned absolutely */}
      {showBookmark && event._id && (
        <div className="absolute top-3 right-3 z-10">
          <BookmarkButton
            eventId={event._id}
            size="md"
            showCount={false}
            onToggle={(bookmarked, count) => {
              // Optional: Update local state if needed
            }}
          />
        </div>
      )}

      <Link
        to={`/app/events/${event._id}`}
        tabIndex={0}
        aria-label={`Open details for ${event.title}`}
        className="block"
      >
        {/* Image */}
        <div
          className={
            variant === "list"
              ? "h-40 w-full overflow-hidden rounded-t-xl sm:h-auto sm:w-48 sm:rounded-l-xl sm:rounded-tr-none"
              : "h-44 w-full overflow-hidden rounded-t-xl"
          }
        >
          <img
            src={image}
            alt={`Event: ${event.title}`}
            className="h-full w-full object-cover"
          />
        </div>

      {/* Content */}
      <div
        className={`p-4 space-y-2 ${
          variant === "list" ? "sm:flex-1 sm:p-5" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {event.category || "Event"}
            </p>
            <h3 className="font-semibold text-base sm:text-lg text-gray-900 line-clamp-2">
              {event.title}
            </h3>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClass}`}
          >
            {statusText}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {event.startDate && (
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateRange(event.startDate, event.endDate)}</span>
            </div>
          )}
          {event.location && (() => {
            const loc =
              typeof event.location === "string"
                ? event.location
                : event.location.name ||
                  event.location.city ||
                  event.location.address ||
                  event.location.country ||
                  (event.location.isVirtual ? "Online event" : "");
            if (!loc) return null;
            return (
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{loc}</span>
            </div>
            );
          })()}
        </div>

        {event.description && (
          <p
            className={`text-xs text-gray-600 ${
              variant === "grid" ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {event.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Capacity */}
            {hasCapacity && !isPast && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium
                  ${
                    isFull
                      ? "bg-gray-100 text-gray-600"
                      : "bg-green-50 text-green-700"
                  }`}
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                {isFull
                  ? "No spots left"
                  : `${spotsRemaining} / ${max} spots remaining`}
              </span>
            )}

            {/* Like Count for Past Events */}
            {isPast && likeCount > 0 && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-blue-50 text-blue-700">
                <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                {likeCount} {likeCount === 1 ? "like" : "likes"}
              </span>
            )}
          </div>

          {/* Tags (short) */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-auto justify-end">
              {event.tags.slice(0, variant === "grid" ? 2 : 4).map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      </Link>
    </div>
  );
}
