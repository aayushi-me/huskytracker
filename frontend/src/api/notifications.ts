/**
 * Notification API Service
 * API calls for notification operations
 */

import api from "../services/api";
import {
  Notification,
  NotificationResponse,
  NotificationFilters,
} from "../types/notifications";

const API_BASE = "/notifications";

/**
 * Get notifications for the authenticated user
 */
export async function getNotifications(
  filters?: NotificationFilters,
  signal?: AbortSignal
): Promise<NotificationResponse> {
  try {
    const params = new URLSearchParams();

    // Only add isRead filter if explicitly set (not undefined or null)
    if (filters?.isRead !== undefined && filters?.isRead !== null) {
      params.append("isRead", String(filters.isRead));
    }
    // If isRead is undefined/null/empty, we don't add it to params, so backend returns ALL notifications
    if (filters?.type) {
      params.append("type", filters.type);
    }
    if (filters?.page) {
      params.append("page", String(filters.page));
    }
    if (filters?.limit) {
      params.append("limit", String(filters.limit));
    }

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/me?${queryString}` : `${API_BASE}/me`;

    const res = await api.get(url, { signal });
    const payload = res.data;

    console.log(`[Notifications API] Raw API response:`, {
      success: payload?.success,
      hasData: !!payload?.data,
      notificationsCount: payload?.data?.notifications?.length,
      pagination: payload?.data?.pagination,
      fullPayload: payload
    });

    if (!payload?.success) {
      throw new Error(payload?.message || "Failed to fetch notifications");
    }

    // Map notifications and ensure isRead property exists
    // Normalize event field - backend may return 'event' but API docs show 'relatedEventId'
    const rawNotifications = payload.data?.notifications || [];
    console.log(`[Notifications API] Received ${rawNotifications.length} notifications from backend`);
    if (rawNotifications.length > 0) {
      console.log(`[Notifications API] First notification sample:`, rawNotifications[0]);
    }
    
    const notifications: Notification[] = rawNotifications.map((n: any) => {
      // Handle both 'event' and 'relatedEventId' fields
      const eventId = n.relatedEventId || n.event;
      
      return {
        ...n,
        _id: n._id?.toString() || n._id, // Ensure _id is a string
        relatedEventId: eventId,
        isRead: n.status === "READ" || n.isRead === true,
      };
    });

    // Deduplicate by _id in case backend sends duplicates
    const uniqueNotifications = notifications.reduce((acc, n) => {
      const existing = acc.find(item => item._id === n._id);
      if (!existing) {
        acc.push(n);
      } else {
        console.warn(`[Notifications API] Duplicate notification ID found: ${n._id}`);
      }
      return acc;
    }, [] as Notification[]);

    console.log(`[Notifications API] Returning ${uniqueNotifications.length} unique notifications`);

    return {
      notifications: uniqueNotifications,
      pagination: payload.data?.pagination,
    };
  } catch (err: any) {
    throw new Error(err?.message || "Failed to fetch notifications");
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(signal?: AbortSignal): Promise<number> {
  try {
    const res = await api.get(`${API_BASE}/unread/count`, { signal });
    const payload = res.data;

    if (!payload?.success) {
      throw new Error(payload?.message || "Failed to fetch unread count");
    }

    const count = payload.data?.unreadCount || 0;
    console.log(`[Notifications API] Unread count: ${count}`);
    return count;
  } catch (err: any) {
    // Ignore canceled/aborted requests - these are expected
    if (
      err.name === 'AbortError' || 
      err.code === 'ERR_CANCELED' ||
      err.message === 'canceled' || 
      (err.response && err.response.status === 499)
    ) {
      // Re-throw but don't log as error - this is expected behavior
      throw err;
    }
    console.error('[Notifications API] Error fetching unread count:', err);
    throw new Error(err?.message || "Failed to fetch unread count");
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  try {
    const res = await api.patch(`${API_BASE}/${notificationId}/read`);
    const payload = res.data;

    if (!payload?.success) {
      throw new Error(payload?.message || "Failed to mark notification as read");
    }

    const notification = payload.data?.notification || payload.data;
    return {
      ...notification,
      isRead: true,
      status: "READ",
    };
  } catch (err: any) {
    throw new Error(err?.message || "Failed to mark notification as read");
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  try {
    const res = await api.patch(`${API_BASE}/read-all`);
    const payload = res.data;

    if (!payload?.success) {
      throw new Error(payload?.message || "Failed to mark all notifications as read");
    }

    return payload.data?.updatedCount || 0;
  } catch (err: any) {
    throw new Error(err?.message || "Failed to mark all notifications as read");
  }
}
