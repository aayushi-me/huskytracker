// =============================
// Base Event Types
// =============================

export type EventStatus = "draft" | "published" | "cancelled" | "past";

export type EventCategory =
  | "workshop"
  | "seminar"
  | "cultural"
  | "sports";

// Location object for Create / Edit form
export interface EventLocation {
  venue: string;
  address: string;
  room?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// =============================
// Form representation (Create/Edit)
// =============================

export interface EventFormValues {
  id?: string;

  title: string;
  description: string; // HTML from TipTap editor

  category: EventCategory | "";
  tags: string[];

  startDate: string; // yyyy-mm-dd
  startTime: string; // hh:mm
  endDate: string;
  endTime: string;

  location: EventLocation;

  capacity: number | null;
  requiresApproval: boolean;

  imageFile?: File | null;
  imageUrl?: string | null;

  status?: EventStatus; // draft | published
}

// =============================
// EventItem: normalized format used everywhere else
// =============================
//
// This is used in:
// - Events listing (Task 2.4)
// - EventDetails
// - Organizer Dashboard (Task 3.7)
// =============================

export interface EventItem {
  id: string;
  title: string;
  description?: string; // Optional in case API does not return full description
  category: EventCategory;

  status: EventStatus; // "draft" | "published" | "cancelled" | "past"

  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string

  location: EventLocation;

  capacity: number;
  tags?: string[];
  imageUrl?: string | null;

  organizer?: string; // if backend sends it
}

// =============================
// Organizer Dashboard Data Types (Task 3.7)
// =============================

// Status tabs for organizer
export type OrganizerEventStatus = EventStatus;

// Event type used in OrganizerDashboard
export interface OrganizerEvent extends EventItem {
  registrationsCount: number; // number of attendees registered
}

// Stats cards on top
export interface OrganizerStats {
  totalEvents: number;
  totalAttendees: number;
  upcomingEventsCount: number;
  averageFillRate?: number; // percentage 0–100
}

// Recent registrations widget
export interface RecentRegistration {
  id: string;
  attendeeName: string;
  eventId: string;
  eventTitle: string;
  registeredAt: string; // ISO date/time
}
