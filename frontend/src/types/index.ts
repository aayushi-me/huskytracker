// =============================
// Common Enums & Sub-types
// =============================

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type EventCategory = "workshop" | "seminar" | "cultural" | "sports" | "other";

export interface EventLocation {
  venue: string;
  address: string;
  room?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface EventOrganizer {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  email?: string;
}

// =============================
// Main Event Entity
// =============================
export interface Event {
  _id: string;
  title: string;
  description: string;

  category: EventCategory;
  tags: string[];
  imageUrl?: string;

  startDate: string; // ISO string (e.g., "2024-05-10T12:00:00Z")
  endDate: string;   // ISO string

  location: EventLocation;
  organizer: EventOrganizer;

  status: EventStatus;

  // Capacity & Registration Info
  capacity: number;
  registeredUsers: string[]; // array of user IDs
  waitlist: string[];        // array of user IDs

  // Event interaction fields (used in EventDetails and UI)
  price: number;
  isBookmarked?: boolean;
  isLiked?: boolean;
  likes?: number;
  
}

// =============================
// Registration Entity
// =============================
export interface Registration {
  _id: string;
  event: Event; // 
  user: string; // 
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED';
  createdAt: string;
}

// =============================
// Notification Preferences
// =============================

export interface NotificationPreferences {
  emailUpdates: boolean;
  pushNotifications: boolean;
  reminderTime: 15 | 30 | 60; // minutes before event
}

// =============================
// User Profile Extension
// =============================

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  avatar?: string;
  bio?: string;

  // New fields for Task 3.5
  interests: string[];
  preferences: NotificationPreferences;
}

// =============================
// Password Change Payload
// =============================

export interface PasswordChangePayload {
  currentPassword?: string; // Backend might verify this
  newPassword: string;
  confirmPassword: string;
}