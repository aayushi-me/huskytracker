// src/api/events.ts

import {
  EventFormValues,
  EventStatus,
  OrganizerEvent,
  OrganizerEventStatus,
  OrganizerStats,
  RecentRegistration,
} from "../types/events";
import api from "../services/api";
import { EventCategory } from "../types/events";

// Axios instance already has baseURL `/api/v1`
const API_BASE = "/events";

/* =======================================================
   CREATE EVENT
   ======================================================= */
export async function createEvent(
  data: EventFormValues,
  status: EventStatus
) {
  try {
    // If image file is present, send as FormData (multipart/form-data)
    // Otherwise, send as JSON
    if (data.imageFile) {
      const formData = buildEventFormData(data, status);
      const res = await api.post(API_BASE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    } else {
      const payload = buildEventPayload(data, status);
      const res = await api.post(API_BASE, payload);
      return res.data;
    }
  } catch (err: any) {
    // api.ts wraps errors into ApiError with optional 'details'
    let message = err?.message || "Failed to create event";
    const details = err?.details;
    if (details && typeof details === "object" && "errors" in details) {
      const firstError = Array.isArray((details as any).errors)
        ? (details as any).errors[0]
        : null;
      if (firstError?.message) {
        message = `Validation: ${firstError.message}`;
      }
    }
    throw new Error(message);
  }
}

/* =======================================================
   UPDATE EVENT
   ======================================================= */
export async function updateEvent(
  id: string,
  data: EventFormValues,
  status: EventStatus
) {
  try {
    // If image file is present, send as FormData (multipart/form-data)
    // Otherwise, send as JSON
    if (data.imageFile) {
      const formData = buildEventFormData(data, status);
      const res = await api.put(`${API_BASE}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    } else {
      const payload = buildEventPayload(data, status);
      const res = await api.put(`${API_BASE}/${id}`, payload);
      return res.data;
    }
  } catch (err: any) {
    // api.ts wraps errors into ApiError with optional 'details'
    let message = err?.message || "Failed to update event";
    const details = err?.details;
    if (details && typeof details === "object" && "errors" in details) {
      const firstError = Array.isArray((details as any).errors)
        ? (details as any).errors[0]
        : null;
      if (firstError?.message) {
        message = `Validation: ${firstError.message}`;
      }
    }
    throw new Error(message);
  }
}

/* =======================================================
   GET EVENT BY ID
   ======================================================= */
export async function getEventById(id: string) {
  try {
    const res = await api.get(`${API_BASE}/${id}`);
    const payload = res.data;
    if (!payload?.success || !payload.data?.event) {
      throw new Error(payload?.message || "Event not found");
    }
    return payload.data.event;
  } catch (err: any) {
    throw new Error(err?.message || "Failed to load event");
  }
}

/* =======================================================
   ORGANIZER DASHBOARD — NEW (TASK 3.7)
   ======================================================= */

/**
 * Fetch organizer dashboard stats and recent registrations.
 */
export async function getOrganizerDashboardData(): Promise<{
  stats: OrganizerStats;
  recentRegistrations: RecentRegistration[];
}> {
  // For now, derive basic stats from organizer's own events and skip recent registrations
  const events = await getOrganizerEvents({});

  // Filter out cancelled events for stats calculations
  const activeEvents = events.filter((e) => e.status !== "cancelled");
  
  const totalEvents = activeEvents.length;
  const upcomingEvents = activeEvents.filter(
    (e) => new Date(e.startDateTime) > new Date()
  );
  const totalAttendees = activeEvents.reduce(
    (sum, e) => sum + e.registrationsCount,
    0
  );

  const stats: OrganizerStats = {
    totalEvents,
    totalAttendees,
    upcomingEventsCount: upcomingEvents.length,
    averageFillRate:
      activeEvents.length > 0
        ? Math.round(
            (activeEvents.reduce((sum, e) => {
              if (e.capacity > 0) {
                return sum + e.registrationsCount / e.capacity;
              }
              return sum;
            }, 0) / activeEvents.length) *
              100
          )
        : 0,
  };

  // Recent registrations can be wired to backend later
  return {
    stats,
    recentRegistrations: [],
  };
}

/**
 * Fetch organizer's events list.
 */
export async function getOrganizerEvents(options?: {
  status?: OrganizerEventStatus;
  search?: string;
  sort?: "date" | "registrations" | "capacity";
}): Promise<OrganizerEvent[]> {
  const res = await api.get("/events/my/events");
  const payload = res.data;

  if (!payload?.success || !payload.data) {
    throw new Error(payload?.message || "Failed to load organizer events");
  }

  const { events } = payload.data as {
    events: any[];
    pagination: any;
  };

  const mapBackendStatusToFront = (status: string): OrganizerEventStatus => {
    switch (status) {
      case "PUBLISHED":
        return "published";
      case "DRAFT":
        return "draft";
      case "CANCELLED":
        return "cancelled";
      case "PAST":
      case "COMPLETED":
        return "past";
      default:
        return "draft";
    }
  };

  const mapBackendCategoryToFront = (category: string): EventCategory => {
    const lower = (category || "").toLowerCase();
    if (lower === "cultural") return "cultural";
    if (lower === "sports") return "sports";
    // Map academic/career/clubs/social to workshop/seminar buckets
    if (lower === "academic" || lower === "career") return "seminar";
    return "workshop";
  };

  return (events || []).map((e) => ({
    id: e._id,
    title: e.title,
    category: mapBackendCategoryToFront(e.category),
    status: mapBackendStatusToFront(e.status),
    startDateTime: e.startDate,
    endDateTime: e.endDate,
    location: {
      venue: e.location?.name || "",
      address: e.location?.address || "",
    },
    capacity: e.maxRegistrations ?? 0,
    registrationsCount: e.currentRegistrations ?? 0,
    tags: e.tags ?? [],
  }));
}

/**
 * Cancel event (status -> cancelled)
 */
export async function cancelEvent(id: string): Promise<void> {
  try {
    const res = await api.post(`${API_BASE}/${id}/cancel`);
    return res.data;
  } catch (err: any) {
    throw new Error(err?.message || "Failed to cancel event");
  }
}

/**
 * Publish event (transition from DRAFT to PUBLISHED)
 */
export async function publishEvent(id: string): Promise<void> {
  try {
    const res = await api.post(`${API_BASE}/${id}/publish`);
    return res.data;
  } catch (err: any) {
    throw new Error(err?.message || "Failed to publish event");
  }
}

/**
 * Delete event permanently.
 */
export async function deleteEvent(id: string): Promise<void> {
  try {
    const res = await api.delete(`${API_BASE}/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(err?.message || "Failed to delete event");
  }
}

/* =======================================================
   Payload Builder — map form values to backend schema
   ======================================================= */

/**
 * Build FormData for event creation/update with image upload
 * Used when imageFile is present
 */
function buildEventFormData(values: EventFormValues, status?: EventStatus): FormData {
  const formData = new FormData();
  
  // Add the image file if present
  if (values.imageFile) {
    formData.append('image', values.imageFile);
  }
  
  // Parse dates and build the event data (same as buildEventPayload)
  const parseDate = (dateStr: string, timeStr: string): Date => {
    if (!dateStr || !timeStr) {
      throw new Error(`Missing date or time: date="${dateStr}", time="${timeStr}"`);
    }
    
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
    }
    
    const [, yearStr, monthStr, dayStr] = dateMatch;
    const [, hoursStr, minutesStr] = timeMatch;
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}`);
    }
    if (day < 1 || day > 31) {
      throw new Error(`Invalid day: ${day}`);
    }
    if (hours < 0 || hours > 23) {
      throw new Error(`Invalid hours: ${hours}`);
    }
    if (minutes < 0 || minutes > 59) {
      throw new Error(`Invalid minutes: ${minutes}`);
    }
    
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error(`Invalid date: ${year}-${month}-${day}`);
    }
    
    return date;
  };
  
  let start: Date;
  let end: Date;
  
  try {
    start = parseDate(values.startDate, values.startTime);
  } catch (err: any) {
    throw new Error(`Start date/time error: ${err.message}`);
  }
  
  try {
    end = parseDate(values.endDate, values.endTime);
  } catch (err: any) {
    throw new Error(`End date/time error: ${err.message}`);
  }
  
  const isSameDate = values.startDate === values.endDate;
  
  if (!isSameDate) {
    if (values.endDate < values.startDate) {
      throw new Error(
        `End date (${values.endDate}) must be after start date (${values.startDate})`
      );
    }
  } else {
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    if (endTime <= startTime) {
      throw new Error(
        `End time (${values.endTime}) must be after start time (${values.startTime}) for same-day events`
      );
    }
    
    const durationMs = endTime - startTime;
    const minDurationMs = 30 * 60 * 1000;
    if (durationMs < minDurationMs) {
      const durationMinutes = Math.round(durationMs / (60 * 1000));
      throw new Error(
        `Event must be at least 30 minutes long (current duration: ${durationMinutes} minutes)`
      );
    }
  }

  const mappedStatus =
    status === "published"
      ? "PUBLISHED"
      : status === "cancelled"
      ? "CANCELLED"
      : status === "past"
      ? "PAST"
      : "DRAFT";

  // Build location object
  const location: any = {
    name: values.location.venue,
    address: values.location.address || undefined,
  };
  
  if (values.location.latitude !== null && values.location.longitude !== null) {
    location.coordinates = {
      latitude: values.location.latitude,
      longitude: values.location.longitude,
    };
  }
  
  if (values.location.room) {
    location.room = values.location.room;
  }

  // Append all event data as JSON string fields (FormData requires strings)
  formData.append('title', values.title);
  formData.append('description', values.description);
  formData.append('category', mapCategoryToBackend(values.category));
  formData.append('status', mappedStatus);
  formData.append('startDate', start.toISOString());
  formData.append('endDate', end.toISOString());
  formData.append('location', JSON.stringify(location));
  formData.append('tags', JSON.stringify(values.tags || []));
  formData.append('isPublic', 'true');
  
  if (values.capacity !== null && values.capacity !== undefined) {
    formData.append('maxRegistrations', values.capacity.toString());
  }
  
  // If imageUrl already exists (when updating), include it
  if (values.imageUrl && !values.imageFile) {
    formData.append('imageUrl', values.imageUrl);
  }
  
  return formData;
}

function mapCategoryToBackend(category: EventCategory | ""): string {
  const map: Record<string, string> = {
    workshop: "Academic",
    seminar: "Academic",
    cultural: "Cultural",
    sports: "Sports",
  };
  return category ? map[category] || "Other" : "Other";
}

function buildEventPayload(values: EventFormValues, status?: EventStatus) {
  // Parse date and time components
  // dateStr is in format "YYYY-MM-DD" (from HTML5 date input)
  // timeStr is in format "HH:mm" (from HTML5 time input, always 24-hour format)
  const parseDate = (dateStr: string, timeStr: string): Date => {
    if (!dateStr || !timeStr) {
      throw new Error(`Missing date or time: date="${dateStr}", time="${timeStr}"`);
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    
    // Validate time format (HH:mm)
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
    }
    
    const [, yearStr, monthStr, dayStr] = dateMatch;
    const [, hoursStr, minutesStr] = timeMatch;
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Validate ranges
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}`);
    }
    if (day < 1 || day > 31) {
      throw new Error(`Invalid day: ${day}`);
    }
    if (hours < 0 || hours > 23) {
      throw new Error(`Invalid hours: ${hours}`);
    }
    if (minutes < 0 || minutes > 59) {
      throw new Error(`Invalid minutes: ${minutes}`);
    }
    
    // Create date in local timezone (this handles DST correctly)
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // Verify the date was created correctly (handles invalid dates like Feb 30)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error(`Invalid date: ${year}-${month}-${day}`);
    }
    
    return date;
  };
  
  let start: Date;
  let end: Date;
  
  try {
    start = parseDate(values.startDate, values.startTime);
  } catch (err: any) {
    throw new Error(`Start date/time error: ${err.message}`);
  }
  
  try {
    end = parseDate(values.endDate, values.endTime);
  } catch (err: any) {
    throw new Error(`End date/time error: ${err.message}`);
  }
  
  // Check if start and end dates are the same (compare date strings, not times)
  const isSameDate = values.startDate === values.endDate;
  
  // For multi-day events: only check that end date is after start date (ignore time)
  // For same-day events: check both date and time, plus minimum duration
  if (!isSameDate) {
    // Multi-day event: just ensure end date string is after start date string
    if (values.endDate < values.startDate) {
      throw new Error(
        `End date (${values.endDate}) must be after start date (${values.startDate})`
      );
    }
    // If dates are different, times don't matter - validation passes
  } else {
    // Same-day event: validate time and duration
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    if (endTime <= startTime) {
      throw new Error(
        `End time (${values.endTime}) must be after start time (${values.startTime}) for same-day events`
      );
    }
    
    // Validate minimum duration (30 minutes) for same-day events
    const durationMs = endTime - startTime;
    const minDurationMs = 30 * 60 * 1000; // 30 minutes in milliseconds
    if (durationMs < minDurationMs) {
      const durationMinutes = Math.round(durationMs / (60 * 1000));
      throw new Error(
        `Event must be at least 30 minutes long (current duration: ${durationMinutes} minutes)`
      );
    }
  }

  const mappedStatus =
    status === "published"
      ? "PUBLISHED"
      : status === "cancelled"
      ? "CANCELLED"
      : status === "past"
      ? "PAST"
      : "DRAFT";

  // Build location object matching backend schema
  const location: any = {
    name: values.location.venue,
    address: values.location.address || undefined,
  };
  
  // Add coordinates if provided
  if (values.location.latitude !== null && values.location.longitude !== null) {
    location.coordinates = {
      latitude: values.location.latitude,
      longitude: values.location.longitude,
    };
  }
  
  // Add room if provided (backend may accept it even if not in schema)
  if (values.location.room) {
    location.room = values.location.room;
  }

  // Build payload, ensuring no undefined values
  const payload: any = {
    title: values.title,
    description: values.description,
    category: mapCategoryToBackend(values.category),
    status: mappedStatus,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    location,
    tags: values.tags || [],
    isPublic: true,
  };
  
  // Only include optional fields if they have values
  if (values.capacity !== null && values.capacity !== undefined) {
    payload.maxRegistrations = values.capacity;
  }
  
  if (values.imageUrl) {
    payload.imageUrl = values.imageUrl;
  }
  
  return payload;
}

/* Note: safeError helper removed; Axios + global api.ts already normalize errors */
