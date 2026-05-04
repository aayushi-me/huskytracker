/**
 * Relative Timestamp Utility
 * Formats dates as relative time (e.g., "2 minutes ago", "Yesterday")
 */

import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from "date-fns";

/**
 * Format a date as relative time
 * @param dateString - ISO date string or Date object
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return "";

  const date = typeof dateString === "string" ? new Date(dateString) : dateString;

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Less than a minute ago
  if (diffInSeconds < 60) {
    return "just now";
  }

  // Less than an hour ago - show minutes
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  // Today - show hours
  if (isToday(date)) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  // Yesterday
  if (isYesterday(date)) {
    return "Yesterday";
  }

  // Within the same year - show month and day
  if (isThisYear(date)) {
    return format(date, "MMM d");
  }

  // Older than this year - show month, day, and year
  return format(date, "MMM d, yyyy");
}

/**
 * Format a date as a full timestamp (for tooltips or detailed views)
 * @param dateString - ISO date string or Date object
 * @returns Formatted timestamp string
 */
export function formatFullTimestamp(dateString: string | Date): string {
  if (!dateString) return "";

  const date = typeof dateString === "string" ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  return format(date, "PPpp"); // e.g., "Apr 29th, 2021 at 3:45 PM"
}
