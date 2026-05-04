/**
 * Notification Types
 * Type definitions for the notification system
 */

export enum NotificationType {
  EVENT_REMINDER = "EVENT_REMINDER",
  REGISTRATION_CONFIRMED = "REGISTRATION_CONFIRMED",
  EVENT_UPDATED = "EVENT_UPDATED",
  EVENT_CANCELLED = "EVENT_CANCELLED",
  WAITLIST_PROMOTED = "WAITLIST_PROMOTED",
  NEW_COMMENT = "NEW_COMMENT",
  COMMENT_REPLY = "COMMENT_REPLY",
  REGISTRATION_WAITLISTED = "REGISTRATION_WAITLISTED",
  REGISTRATION_APPROVED = "REGISTRATION_APPROVED",
  EVENT_INVITATION = "EVENT_INVITATION",
  SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT",
}

export enum NotificationStatus {
  UNREAD = "UNREAD",
  READ = "READ",
  ARCHIVED = "ARCHIVED",
}

export interface RelatedEvent {
  _id: string;
  title: string;
}

export interface NotificationRelatedData {
  eventTitle?: string;
  startTime?: string;
  [key: string]: any;
}

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  relatedEventId?: RelatedEvent | string; // Backend may also send 'event' field
  event?: RelatedEvent | string; // Allow both for flexibility
  relatedData?: NotificationRelatedData;
  actionUrl?: string;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean; // Convenience property (status === READ)
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}
