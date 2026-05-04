import api from "./api";

import { EventDto } from "../components/ui/EventCard";

export interface UserStats {
  attended: number;
  registered: number;
  bookmarked: number;
}

export interface DashboardNotification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  status: string;
  actionUrl?: string;
}

export interface CalendarEventInfo {
  id?: string;
  title: string;
}

export interface CalendarDateInfo {
  count: number;
  events: CalendarEventInfo[];
}

export interface CalendarData {
  start: string;
  end: string;
  dates: Record<string, CalendarDateInfo | number>; // Support both old format (number) and new format (object)
}

export interface DashboardFeedResponse {
  upcomingEvents: EventDto[];
  bookmarks: EventDto[];
  recommendations: EventDto[];
  stats: UserStats;
  notifications: DashboardNotification[];
  calendar: CalendarData;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function getDashboardFeed(): Promise<DashboardFeedResponse> {
  const res = await api.get<ApiResponse<DashboardFeedResponse>>("/dashboard/feed");

  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to load dashboard feed");
  }

  return res.data.data;
}

/**
 * Dismiss a recommendation
 * @param eventId - Event ID to dismiss
 */
export async function dismissRecommendation(eventId: string): Promise<void> {
  const res = await api.post<ApiResponse<{ message: string }>>(`/recommendations/${eventId}/dismiss`);
  
  if (!res.data.success) {
    throw new Error(res.data.message || "Failed to dismiss recommendation");
  }
}

/**
 * Mark a recommendation as interested (also bookmarks the event)
 * @param eventId - Event ID to mark as interested
 */
export async function markRecommendationInterested(eventId: string): Promise<void> {
  const res = await api.post<ApiResponse<{ message: string }>>(`/recommendations/${eventId}/interested`);
  
  if (!res.data.success) {
    throw new Error(res.data.message || "Failed to mark as interested");
  }
}


