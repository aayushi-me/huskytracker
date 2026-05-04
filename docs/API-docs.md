# HuskyTrack Complete API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Authentication](#1-authentication-api)
2. [Events Management](#2-events-management-api)
3. [Event Registration](#3-event-registration-api)
4. [Bookmarks](#4-bookmarks-api)
5. [Likes](#5-likes-api)
6. [Comments & Ratings](#6-comments--ratings-api)
7. [Notifications](#7-notifications-api)
8. [User Profile & Settings](#8-user-profile--settings-api)
9. [Image Upload](#9-image-upload-api)
10. [Dashboard & Feed](#10-dashboard--feed-api)

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### User Roles

- **STUDENT** - Default role, can view and register for events
- **ORGANIZER** - Can create and manage events
- **ADMIN** - Full system access

---

# 1. Authentication API

## 1.1 Register User

Create a new user account.

**Endpoint:** `POST /auth/register`  
**Authentication:** Not required  
**Rate Limit:** 5 attempts per 15 minutes

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@northeastern.edu",
  "password": "SecureP@ss123",
  "university": "Northeastern University",
  "role": "STUDENT"
}
```

### Success Response (201)

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@northeastern.edu",
      "university": "Northeastern University",
      "role": "STUDENT",
      "isActive": true,
      "createdAt": "2025-11-18T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@northeastern.edu",
    "password": "SecureP@ss123",
    "university": "Northeastern University",
    "role": "STUDENT"
  }'
```

---

## 1.2 Login

Authenticate user and receive tokens.

**Endpoint:** `POST /auth/login`  
**Authentication:** Not required  
**Rate Limit:** 5 attempts per 15 minutes

### Request Body

```json
{
  "email": "john.doe@northeastern.edu",
  "password": "SecureP@ss123"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@northeastern.edu",
      "role": "STUDENT"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@northeastern.edu",
    "password": "SecureP@ss123"
  }'
```

---

## 1.3 Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh-token`  
**Authentication:** Not required

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## 1.4 Logout

Invalidate refresh token.

**Endpoint:** `POST /auth/logout`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Logout successful"
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 1.5 Get Current User

Get authenticated user's profile.

**Endpoint:** `GET /auth/me`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@northeastern.edu",
      "university": "Northeastern University",
      "role": "STUDENT",
      "isActive": true,
      "createdAt": "2025-11-18T09:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 1.6 Update Profile

Update authenticated user's profile.

**Endpoint:** `PUT /auth/me`  
**Authentication:** Required

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "university": "Northeastern University"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.doe@northeastern.edu",
      "university": "Northeastern University"
    }
  }
}
```

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith"
  }'
```

---

## 1.7 Forgot Password

Request password reset email.

**Endpoint:** `POST /auth/forgot-password`  
**Authentication:** Not required  
**Rate Limit:** 3 attempts per 15 minutes

### Request Body

```json
{
  "email": "john.doe@northeastern.edu"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent"
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@northeastern.edu"
  }'
```

---

## 1.8 Reset Password

Reset password using token from email.

**Endpoint:** `POST /auth/reset-password/:token`  
**Authentication:** Not required

### URL Parameters

- `token` - Reset token from email

### Request Body

```json
{
  "password": "NewSecureP@ss123"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/reset-password/RESET_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecureP@ss123"
  }'
```

---

## 1.9 Change Password

Change password for authenticated user.

**Endpoint:** `POST /auth/change-password`  
**Authentication:** Required

### Request Body

```json
{
  "currentPassword": "SecureP@ss123",
  "newPassword": "NewSecureP@ss456"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecureP@ss123",
    "newPassword": "NewSecureP@ss456"
  }'
```

---

# 2. Events Management API

## 2.1 Create Event

Create a new event (ORGANIZER/ADMIN only).

**Endpoint:** `POST /events`  
**Authentication:** Required  
**Access:** ORGANIZER, ADMIN

### Request Body

```json
{
  "title": "HuskyHack 2025",
  "description": "Annual hackathon for Northeastern students. Join us for 24 hours of coding, collaboration, and innovation.",
  "category": "Academic",
  "startDate": "2025-12-15T09:00:00Z",
  "endDate": "2025-12-16T09:00:00Z",
  "location": {
    "name": "Curry Student Center",
    "address": "360 Huntington Ave",
    "city": "Boston",
    "state": "MA",
    "zipCode": "02115",
    "room": "Ballroom A",
    "isVirtual": false
  },
  "maxRegistrations": 200,
  "waitlistEnabled": true,
  "registrationDeadline": "2025-12-14T23:59:59Z",
  "tags": ["hackathon", "coding", "technology"],
  "images": ["https://example.com/image.jpg"],
  "isPublic": true
}
```

### Success Response (201)

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "event": {
      "_id": "673e1234567890abcdef1234",
      "title": "HuskyHack 2025",
      "description": "Annual hackathon for Northeastern students...",
      "organizer": {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "category": "Academic",
      "status": "DRAFT",
      "startDate": "2025-12-15T09:00:00.000Z",
      "endDate": "2025-12-16T09:00:00.000Z",
      "location": {
        "name": "Curry Student Center",
        "address": "360 Huntington Ave",
        "city": "Boston",
        "state": "MA",
        "zipCode": "02115"
      },
      "maxRegistrations": 200,
      "currentRegistrations": 0,
      "waitlistEnabled": true,
      "tags": ["hackathon", "coding", "technology"],
      "createdAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HuskyHack 2025",
    "description": "Annual hackathon for Northeastern students. Join us for 24 hours of coding.",
    "category": "Academic",
    "startDate": "2025-12-15T09:00:00Z",
    "endDate": "2025-12-16T09:00:00Z",
    "location": {
      "name": "Curry Student Center",
      "address": "360 Huntington Ave",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02115"
    },
    "maxRegistrations": 200,
    "tags": ["hackathon", "coding", "technology"]
  }'
```

---

## 2.2 Get All Events

Get list of published events with pagination.

**Endpoint:** `GET /events`  
**Authentication:** Not required

### Query Parameters

- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 10, max: 50)
- `category` (optional) - Filter by category
- `status` (optional) - Filter by status (default: PUBLISHED)
- `sort` (optional) - Sort field (e.g., startDate, -startDate)

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "673e1234567890abcdef1234",
        "title": "HuskyHack 2025",
        "description": "Annual hackathon...",
        "organizer": {
          "_id": "507f1f77bcf86cd799439011",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "category": "Academic",
        "status": "PUBLISHED",
        "startDate": "2025-12-15T09:00:00.000Z",
        "location": {
          "name": "Curry Student Center"
        },
        "maxRegistrations": 200,
        "currentRegistrations": 45,
        "images": ["https://example.com/image.jpg"]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 47,
      "limit": 10,
      "hasNextPage": true
    }
  }
}
```

### cURL Example

```bash
# Get all events
curl -X GET http://localhost:5000/api/v1/events

# With pagination and filters
curl -X GET "http://localhost:5000/api/v1/events?page=1&limit=20&category=Academic&sort=startDate"
```

---

## 2.3 Search Events

Search events with filters.

**Endpoint:** `GET /events/search`  
**Authentication:** Not required

### Query Parameters

- `q` (required) - Search query keyword
- `category` (optional) - Filter by category
- `tags` (optional) - Filter by tags (comma-separated)
- `startDate` (optional) - Events starting after this date
- `endDate` (optional) - Events ending before this date
- `location` (optional) - Filter by location
- `sort` (optional) - Sort: relevance, startDate, -startDate, popularity
- `page` (optional) - Page number
- `limit` (optional) - Results per page

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "673e1234567890abcdef1234",
        "title": "HuskyHack 2025",
        "description": "Annual hackathon...",
        "category": "Academic",
        "startDate": "2025-12-15T09:00:00.000Z",
        "relevanceScore": 0.95,
        "matchedTags": ["hackathon", "coding"]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 15
    }
  }
}
```

### cURL Example

```bash
# Basic search
curl -X GET "http://localhost:5000/api/v1/events/search?q=hackathon"

# Advanced search with filters
curl -X GET "http://localhost:5000/api/v1/events/search?q=tech&category=Academic&startDate=2025-12-01&endDate=2025-12-31&sort=startDate"
```

---

## 2.4 Get Event by ID

Get detailed information about a specific event.

**Endpoint:** `GET /events/:id`  
**Authentication:** Not required (for published), Required (for drafts)

### URL Parameters

- `id` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "event": {
      "_id": "673e1234567890abcdef1234",
      "title": "HuskyHack 2025",
      "description": "Annual hackathon for Northeastern students...",
      "organizer": {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@northeastern.edu"
      },
      "category": "Academic",
      "status": "PUBLISHED",
      "startDate": "2025-12-15T09:00:00.000Z",
      "endDate": "2025-12-16T09:00:00.000Z",
      "location": {
        "name": "Curry Student Center",
        "address": "360 Huntington Ave",
        "city": "Boston",
        "state": "MA"
      },
      "maxRegistrations": 200,
      "currentRegistrations": 45,
      "waitlistEnabled": true,
      "tags": ["hackathon", "coding"],
      "images": ["https://example.com/image.jpg"],
      "createdAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234
```

---

## 2.5 Update Event

Update event details (Owner/ADMIN only).

**Endpoint:** `PUT /events/:id`  
**Authentication:** Required  
**Access:** Event owner, ADMIN

### URL Parameters

- `id` - Event ID

### Request Body

```json
{
  "title": "HuskyHack 2025 - Updated",
  "description": "Updated description",
  "maxRegistrations": 250,
  "registrationDeadline": "2025-12-14T23:59:59Z"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "event": {
      "_id": "673e1234567890abcdef1234",
      "title": "HuskyHack 2025 - Updated",
      "description": "Updated description",
      "maxRegistrations": 250,
      "updatedAt": "2025-11-20T11:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/v1/events/673e1234567890abcdef1234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HuskyHack 2025 - Updated",
    "maxRegistrations": 250
  }'
```

---

## 2.6 Delete Event

Delete an event.

**Endpoint:** `DELETE /events/:id`  
**Authentication:** Required  
**Access:** Event owner, ADMIN

### URL Parameters

- `id` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/v1/events/673e1234567890abcdef1234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2.7 Publish Event

Change event status from DRAFT to PUBLISHED.

**Endpoint:** `POST /events/:id/publish`  
**Authentication:** Required  
**Access:** Event owner, ADMIN

### URL Parameters

- `id` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Event published successfully",
  "data": {
    "event": {
      "_id": "673e1234567890abcdef1234",
      "title": "HuskyHack 2025",
      "status": "PUBLISHED",
      "publishedAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/publish \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2.8 Cancel Event

Cancel an event.

**Endpoint:** `POST /events/:id/cancel`  
**Authentication:** Required  
**Access:** Event owner, ADMIN

### URL Parameters

- `id` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Event cancelled successfully. Registered users have been notified.",
  "data": {
    "event": {
      "_id": "673e1234567890abcdef1234",
      "status": "CANCELLED",
      "cancelledAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2.9 Update Event Status

Update event status directly.

**Endpoint:** `PATCH /events/:id/status`  
**Authentication:** Required  
**Access:** Event owner, ADMIN

### URL Parameters

- `id` - Event ID

### Request Body

```json
{
  "status": "PUBLISHED"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Event status updated successfully",
  "data": {
    "event": {
      "_id": "673e1234567890abcdef1234",
      "status": "PUBLISHED",
      "updatedAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X PATCH http://localhost:5000/api/v1/events/673e1234567890abcdef1234/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PUBLISHED"
  }'
```

---

## 2.10 Get My Events (Organizer)

Get all events created by authenticated organizer.

**Endpoint:** `GET /organizer/events`  
**Authentication:** Required  
**Access:** ORGANIZER, ADMIN

### Query Parameters

- `status` (optional) - Filter by status
- `page` (optional) - Page number
- `limit` (optional) - Results per page

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "673e1234567890abcdef1234",
        "title": "HuskyHack 2025",
        "status": "PUBLISHED",
        "startDate": "2025-12-15T09:00:00.000Z",
        "currentRegistrations": 45,
        "maxRegistrations": 200
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 15
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/organizer/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filter by status
curl -X GET "http://localhost:5000/api/v1/organizer/events?status=DRAFT" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2.11 Get Organizer Draft Events

Get only draft events for organizer.

**Endpoint:** `GET /organizer/events/drafts`  
**Authentication:** Required  
**Access:** ORGANIZER, ADMIN

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "673e1234567890abcdef1234",
        "title": "My Draft Event",
        "status": "DRAFT",
        "startDate": "2025-12-20T10:00:00.000Z",
        "createdAt": "2025-11-19T15:00:00.000Z"
      }
    ]
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/organizer/events/drafts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2.12 Get Event Capacity Info

Get event capacity information.

**Endpoint:** `GET /events/:id/capacity`  
**Authentication:** Not required

### URL Parameters

- `id` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "eventId": "673e1234567890abcdef1234",
    "maxRegistrations": 200,
    "currentRegistrations": 45,
    "availableSpots": 155,
    "isFull": false,
    "waitlistEnabled": true
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/capacity
```

---

## 2.13 Check Registration Eligibility

Check if user can register for an event.

**Endpoint:** `GET /events/:id/can-register`  
**Authentication:** Required

### URL Parameters

- `id` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "canRegister": true,
    "reason": null,
    "availableSpots": 155,
    "waitlistAvailable": true,
    "registrationDeadline": "2025-12-14T23:59:59.000Z"
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/can-register \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 3. Event Registration API

## 3.1 Register for Event

Register authenticated user for an event.

**Endpoint:** `POST /events/:eventId/register`  
**Authentication:** Required

### URL Parameters

- `eventId` - Event ID

### Request Body

No body required (user ID from token).

### Success Response (201)

```json
{
  "success": true,
  "message": "Successfully registered for event",
  "data": {
    "registration": {
      "_id": "673e5678901234abcdef5678",
      "userId": "507f1f77bcf86cd799439011",
      "eventId": "673e1234567890abcdef1234",
      "status": "CONFIRMED",
      "registeredAt": "2025-11-20T10:00:00.000Z",
      "attended": false
    },
    "event": {
      "_id": "673e1234567890abcdef1234",
      "title": "HuskyHack 2025",
      "startDate": "2025-12-15T09:00:00.000Z"
    }
  }
}
```

### Waitlist Response (201)

```json
{
  "success": true,
  "message": "Added to waitlist - you will be notified if a spot becomes available",
  "data": {
    "registration": {
      "_id": "673e5678901234abcdef5678",
      "userId": "507f1f77bcf86cd799439011",
      "eventId": "673e1234567890abcdef1234",
      "status": "WAITLISTED",
      "waitlistPosition": 5,
      "registeredAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/register \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3.2 Cancel Registration

Cancel user's registration for an event.

**Endpoint:** `DELETE /registrations/:registrationId`  
**Authentication:** Required  
**Access:** Registration owner

### URL Parameters

- `registrationId` - Registration ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Registration cancelled successfully",
  "data": {
    "registration": {
      "_id": "673e5678901234abcdef5678",
      "status": "CANCELLED",
      "cancelledAt": "2025-11-20T11:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/v1/registrations/673e5678901234abcdef5678 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3.3 Get My Registrations

Get all registrations for authenticated user.

**Endpoint:** `GET /registrations/me`  
**Authentication:** Required

### Query Parameters

- `status` (optional) - Filter by status: CONFIRMED, WAITLISTED, CANCELLED
- `page` (optional) - Page number
- `limit` (optional) - Results per page
- `sort` (optional) - Sort field

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "registrations": [
      {
        "_id": "673e5678901234abcdef5678",
        "event": {
          "_id": "673e1234567890abcdef1234",
          "title": "HuskyHack 2025",
          "startDate": "2025-12-15T09:00:00.000Z",
          "location": {
            "name": "Curry Student Center"
          }
        },
        "status": "CONFIRMED",
        "registeredAt": "2025-11-20T10:00:00.000Z",
        "attended": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 15
    }
  }
}
```

### cURL Example

```bash
# All registrations
curl -X GET http://localhost:5000/api/v1/registrations/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filter by status
curl -X GET "http://localhost:5000/api/v1/registrations/me?status=CONFIRMED" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3.4 Get Event Attendees

Get attendees for an event (organizer only).

**Endpoint:** `GET /events/:eventId/attendees`  
**Authentication:** Required  
**Access:** Event organizer, ADMIN

### URL Parameters

- `eventId` - Event ID

### Query Parameters

- `status` (optional) - Filter by status
- `page` (optional) - Page number
- `limit` (optional) - Results per page

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "_id": "673e5678901234abcdef5678",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@northeastern.edu"
        },
        "status": "CONFIRMED",
        "registeredAt": "2025-11-20T10:00:00.000Z",
        "attended": false
      }
    ],
    "statistics": {
      "total": 48,
      "confirmed": 45,
      "waitlisted": 3,
      "attended": 0
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/attendees \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3.5 Mark Attendance

Mark attendance for a registration (organizer only).

**Endpoint:** `POST /registrations/:registrationId/attendance`  
**Authentication:** Required  
**Access:** Event organizer, ADMIN

### URL Parameters

- `registrationId` - Registration ID

### Request Body

```json
{
  "attended": true
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "registration": {
      "_id": "673e5678901234abcdef5678",
      "attended": true,
      "checkInTime": "2025-12-15T09:15:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/registrations/673e5678901234abcdef5678/attendance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "attended": true
  }'
```

---

## 3.6 Get Registration Details

Get details of a specific registration.

**Endpoint:** `GET /registrations/:registrationId`  
**Authentication:** Required  
**Access:** Registration owner, Event organizer, ADMIN

### URL Parameters

- `registrationId` - Registration ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "registration": {
      "_id": "673e5678901234abcdef5678",
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe"
      },
      "event": {
        "_id": "673e1234567890abcdef1234",
        "title": "HuskyHack 2025",
        "startDate": "2025-12-15T09:00:00.000Z"
      },
      "status": "CONFIRMED",
      "registeredAt": "2025-11-20T10:00:00.000Z",
      "attended": false
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/registrations/673e5678901234abcdef5678 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 4. Bookmarks API

## 4.1 Toggle Bookmark

Add or remove bookmark for an event.

**Endpoint:** `POST /events/:eventId/bookmark`  
**Authentication:** Required

### URL Parameters

- `eventId` - Event ID

### Request Body (Optional)

```json
{
  "tags": ["must-attend", "career"]
}
```

### Success Response - Added (201)

```json
{
  "success": true,
  "message": "Event bookmarked successfully",
  "data": {
    "bookmark": {
      "_id": "673e9012345678abcdef9012",
      "userId": "507f1f77bcf86cd799439011",
      "eventId": "673e1234567890abcdef1234",
      "tags": ["must-attend", "career"],
      "bookmarkedAt": "2025-11-20T10:00:00.000Z"
    },
    "action": "added"
  }
}
```

### Success Response - Removed (200)

```json
{
  "success": true,
  "message": "Bookmark removed successfully",
  "data": {
    "action": "removed"
  }
}
```

### cURL Example

```bash
# Bookmark with tags
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/bookmark \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["must-attend", "career"]
  }'

# Toggle bookmark without tags
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/bookmark \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4.2 Get My Bookmarks

Get all bookmarks for authenticated user.

**Endpoint:** `GET /bookmarks/me`  
**Authentication:** Required

### Query Parameters

- `tags` (optional) - Filter by tags (comma-separated)
- `page` (optional) - Page number
- `limit` (optional) - Results per page

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "bookmarks": [
      {
        "_id": "673e9012345678abcdef9012",
        "event": {
          "_id": "673e1234567890abcdef1234",
          "title": "HuskyHack 2025",
          "startDate": "2025-12-15T09:00:00.000Z",
          "location": {
            "name": "Curry Student Center"
          },
          "category": "Academic",
          "images": ["https://example.com/image.jpg"]
        },
        "tags": ["must-attend", "career"],
        "bookmarkedAt": "2025-11-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 15
    }
  }
}
```

### cURL Example

```bash
# All bookmarks
curl -X GET http://localhost:5000/api/v1/bookmarks/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filter by tags
curl -X GET "http://localhost:5000/api/v1/bookmarks/me?tags=career,networking" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4.3 Remove Bookmark

Remove a specific bookmark.

**Endpoint:** `DELETE /bookmarks/:bookmarkId`  
**Authentication:** Required  
**Access:** Bookmark owner

### URL Parameters

- `bookmarkId` - Bookmark ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Bookmark removed successfully"
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/v1/bookmarks/673e9012345678abcdef9012 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4.4 Get Bookmark Status

Check if user has bookmarked an event.

**Endpoint:** `GET /events/:eventId/bookmark/status`  
**Authentication:** Required

### URL Parameters

- `eventId` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "isBookmarked": true,
    "bookmark": {
      "_id": "673e9012345678abcdef9012",
      "tags": ["must-attend"],
      "bookmarkedAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/bookmark/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 5. Likes API

## 5.1 Toggle Like

Like or unlike an attended event.

**Endpoint:** `POST /events/:eventId/like`  
**Authentication:** Required  
**Access:** Users who attended the event

### URL Parameters

- `eventId` - Event ID

### Request Body

No body required.

### Success Response - Liked (201)

```json
{
  "success": true,
  "message": "Event liked successfully",
  "data": {
    "like": {
      "_id": "673ea123456789abcdefa123",
      "userId": "507f1f77bcf86cd799439011",
      "eventId": "673e1234567890abcdef1234",
      "likedAt": "2025-11-20T10:00:00.000Z"
    },
    "action": "liked",
    "likeCount": 48
  }
}
```

### Success Response - Unliked (200)

```json
{
  "success": true,
  "message": "Like removed successfully",
  "data": {
    "action": "unliked",
    "likeCount": 47
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/like \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5.2 Get Like Count

Get total likes for an event.

**Endpoint:** `GET /events/:eventId/likes/count`  
**Authentication:** Not required

### URL Parameters

- `eventId` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "eventId": "673e1234567890abcdef1234",
    "likeCount": 48
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/likes/count
```

---

## 5.3 Check Like Status

Check if user has liked an event.

**Endpoint:** `GET /events/:eventId/likes/status`  
**Authentication:** Required

### URL Parameters

- `eventId` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "isLiked": true,
    "likedAt": "2025-11-20T10:00:00.000Z"
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/likes/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 6. Comments & Ratings API

## 6.1 Create Comment

Create a comment and rating for an attended event.

**Endpoint:** `POST /events/:eventId/comments`  
**Authentication:** Required  
**Access:** Users who attended the event

### URL Parameters

- `eventId` - Event ID

### Request Body

```json
{
  "text": "Great event! Learned a lot about React and met amazing people. The workshops were well-organized.",
  "rating": 5
}
```

### Success Response (201)

```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "comment": {
      "_id": "673eb234567890abcdefb234",
      "userId": {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe"
      },
      "eventId": "673e1234567890abcdef1234",
      "text": "Great event! Learned a lot about React and met amazing people.",
      "rating": 5,
      "flaggedCount": 0,
      "isFlagged": false,
      "isEdited": false,
      "createdAt": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/events/673e1234567890abcdef1234/comments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Great event! Learned a lot about React and met amazing people.",
    "rating": 5
  }'
```

---

## 6.2 Get Event Comments

Get all comments for an event.

**Endpoint:** `GET /events/:eventId/comments`  
**Authentication:** Not required

### URL Parameters

- `eventId` - Event ID

### Query Parameters

- `page` (optional) - Page number
- `limit` (optional) - Results per page
- `sort` (optional) - Sort: newest, oldest, highest_rated

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "673eb234567890abcdefb234",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "firstName": "John",
          "lastName": "Doe"
        },
        "text": "Great event! Learned a lot about React.",
        "rating": 5,
        "isFlagged": false,
        "isEdited": false,
        "createdAt": "2025-11-20T10:00:00.000Z"
      }
    ],
    "averageRating": 4.5,
    "totalRatings": 23,
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 23
    }
  }
}
```

### cURL Example

```bash
# Get all comments
curl -X GET http://localhost:5000/api/v1/events/673e1234567890abcdef1234/comments

# Sort by highest rated
curl -X GET "http://localhost:5000/api/v1/events/673e1234567890abcdef1234/comments?sort=highest_rated&page=1&limit=20"
```

---

## 6.3 Update Comment

Update own comment.

**Endpoint:** `PUT /comments/:commentId`  
**Authentication:** Required  
**Access:** Comment owner

### URL Parameters

- `commentId` - Comment ID

### Request Body

```json
{
  "text": "Updated comment text with more details.",
  "rating": 4
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "comment": {
      "_id": "673eb234567890abcdefb234",
      "text": "Updated comment text with more details.",
      "rating": 4,
      "isEdited": true,
      "updatedAt": "2025-11-20T11:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/v1/comments/673eb234567890abcdefb234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Updated comment text with more details.",
    "rating": 4
  }'
```

---

## 6.4 Delete Comment

Delete own comment.

**Endpoint:** `DELETE /comments/:commentId`  
**Authentication:** Required  
**Access:** Comment owner, ADMIN

### URL Parameters

- `commentId` - Comment ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/v1/comments/673eb234567890abcdefb234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 6.5 Flag Comment

Report inappropriate comment.

**Endpoint:** `POST /comments/:commentId/flag`  
**Authentication:** Required

### URL Parameters

- `commentId` - Comment ID

### Request Body

```json
{
  "reason": "Spam"
}
```

**Valid Reasons:** Spam, Inappropriate, Offensive, Other

### Success Response (200)

```json
{
  "success": true,
  "message": "Comment flagged successfully. Our moderators will review it."
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/comments/673eb234567890abcdefb234/flag \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Spam"
  }'
```

---

## 6.6 Get Flagged Comments

Get all flagged comments for moderation (ADMIN only).

**Endpoint:** `GET /comments/flagged`  
**Authentication:** Required  
**Access:** ADMIN

### Query Parameters

- `page` (optional) - Page number
- `limit` (optional) - Results per page

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "673eb234567890abcdefb234",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "email": "user@example.com"
        },
        "event": {
          "_id": "673e1234567890abcdef1234",
          "title": "Event Title"
        },
        "text": "Comment text",
        "flaggedCount": 3,
        "flagReasons": ["Spam", "Inappropriate"],
        "createdAt": "2025-11-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 15
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/comments/flagged \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 6.7 Unflag Comment

Remove flags from a comment (ADMIN only).

**Endpoint:** `POST /comments/:commentId/unflag`  
**Authentication:** Required  
**Access:** ADMIN

### URL Parameters

- `commentId` - Comment ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Comment unflagged successfully"
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/comments/673eb234567890abcdefb234/unflag \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 7. Notifications API

## 7.1 Get My Notifications

Get all notifications for authenticated user.

**Endpoint:** `GET /notifications/me`  
**Authentication:** Required

### Query Parameters

- `isRead` (optional) - Filter by read status (true/false)
- `type` (optional) - Filter by notification type
- `page` (optional) - Page number
- `limit` (optional) - Results per page

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "673ec345678901abcdefc345",
        "userId": "507f1f77bcf86cd799439011",
        "type": "EVENT_REMINDER",
        "message": "HuskyHack 2025 starts in 30 minutes!",
        "relatedEventId": {
          "_id": "673e1234567890abcdef1234",
          "title": "HuskyHack 2025"
        },
        "relatedData": {
          "eventTitle": "HuskyHack 2025",
          "startTime": "2025-12-15T09:00:00.000Z"
        },
        "isRead": false,
        "createdAt": "2025-12-15T08:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25
    }
  }
}
```

### cURL Example

```bash
# All notifications
curl -X GET http://localhost:5000/api/v1/notifications/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Only unread
curl -X GET "http://localhost:5000/api/v1/notifications/me?isRead=false" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filter by type
curl -X GET "http://localhost:5000/api/v1/notifications/me?type=EVENT_REMINDER" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7.2 Get Unread Count

Get count of unread notifications.

**Endpoint:** `GET /notifications/unread/count`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/notifications/unread/count \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7.3 Mark Notification as Read

Mark a notification as read.

**Endpoint:** `PATCH /notifications/:notificationId/read`  
**Authentication:** Required  
**Access:** Notification owner

### URL Parameters

- `notificationId` - Notification ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "notification": {
      "_id": "673ec345678901abcdefc345",
      "isRead": true,
      "readAt": "2025-11-20T10:30:00.000Z"
    }
  }
}
```

### cURL Example

```bash
curl -X PATCH http://localhost:5000/api/v1/notifications/673ec345678901abcdefc345/read \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7.4 Mark All as Read

Mark all notifications as read.

**Endpoint:** `PATCH /notifications/read-all`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 5
  }
}
```

### cURL Example

```bash
curl -X PATCH http://localhost:5000/api/v1/notifications/read-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7.5 Delete Notification

Delete a notification.

**Endpoint:** `DELETE /notifications/:notificationId`  
**Authentication:** Required  
**Access:** Notification owner

### URL Parameters

- `notificationId` - Notification ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/v1/notifications/673ec345678901abcdefc345 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 8. User Profile & Settings API

## 8.1 Update Profile

Update user profile information.

**Endpoint:** `PUT /users/profile`  
**Authentication:** Required

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "university": "Northeastern University"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.doe@northeastern.edu",
      "university": "Northeastern University"
    }
  }
}
```

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/v1/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith"
  }'
```

---

## 8.2 Update Preferences

Update notification preferences.

**Endpoint:** `PUT /users/preferences`  
**Authentication:** Required

### Request Body

```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "reminderTime": 30,
  "categories": ["Academic", "Career"],
  "interests": ["technology", "networking", "workshops"]
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "preferences": {
      "emailNotifications": true,
      "pushNotifications": false,
      "reminderTime": 30,
      "categories": ["Academic", "Career"],
      "interests": ["technology", "networking", "workshops"]
    }
  }
}
```

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/v1/users/preferences \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "emailNotifications": true,
    "reminderTime": 30,
    "categories": ["Academic", "Career"]
  }'
```

---

## 8.3 Get Preferences

Get current user preferences.

**Endpoint:** `GET /users/preferences`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "preferences": {
      "emailNotifications": true,
      "pushNotifications": false,
      "reminderTime": 30,
      "categories": ["Academic", "Career"],
      "interests": ["technology", "networking"]
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/users/preferences \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 9. Image Upload API

## 9.1 Upload Image

Upload an image file (ORGANIZER/ADMIN only).

**Endpoint:** `POST /upload/image`  
**Authentication:** Required  
**Access:** ORGANIZER, ADMIN  
**Rate Limit:** 10 uploads per hour

### Request Format

**Content-Type:** `multipart/form-data`

### Form Fields

- `image` (File) - Image file (JPG, PNG, WebP, max 5MB)

### Success Response (201)

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "imageUrl": "https://huskytrack-images.s3.amazonaws.com/events/abc123.webp",
    "filename": "abc123.webp",
    "size": 245678,
    "type": "image/webp"
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/upload/image \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "image=@/path/to/your/image.jpg"
```

---

## 9.2 Delete Image

Delete an uploaded image.

**Endpoint:** `DELETE /upload/image/:filename`  
**Authentication:** Required  
**Access:** Image owner, ADMIN

### URL Parameters

- `filename` - Filename from upload response

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/v1/upload/image/abc123.webp \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

# 10. Dashboard & Feed API

## 10.1 Get Dashboard Feed

Get personalized dashboard data.

**Endpoint:** `GET /dashboard/feed`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "upcomingEvents": [
      {
        "_id": "673e1234567890abcdef1234",
        "title": "HuskyHack 2025",
        "startDate": "2025-12-15T09:00:00.000Z",
        "location": {
          "name": "Curry Student Center"
        },
        "registration": {
          "status": "CONFIRMED",
          "registeredAt": "2025-11-20T10:00:00.000Z"
        },
        "timeUntilStart": "3 days"
      }
    ],
    "recentBookmarks": [
      {
        "_id": "673e9012345678abcdef9012",
        "event": {
          "_id": "673e1234567890abcdef5678",
          "title": "Career Fair 2025",
          "startDate": "2025-12-20T10:00:00.000Z"
        },
        "bookmarkedAt": "2025-11-19T15:00:00.000Z"
      }
    ],
    "recommendations": [
      {
        "_id": "673e1234567890abcdef9999",
        "title": "React Workshop",
        "category": "Academic",
        "reason": "Based on your interests in Technology",
        "startDate": "2025-12-18T14:00:00.000Z",
        "relevanceScore": 0.85
      }
    ],
    "statistics": {
      "eventsAttended": 12,
      "eventsRegistered": 5,
      "eventsBookmarked": 8
    },
    "recentNotifications": [
      {
        "_id": "673ec345678901abcdefc345",
        "type": "EVENT_REMINDER",
        "message": "HuskyHack 2025 starts tomorrow!",
        "createdAt": "2025-11-20T10:00:00.000Z"
      }
    ],
    "calendarData": {
      "currentMonth": "December 2025",
      "eventDates": [
        "2025-12-15",
        "2025-12-18",
        "2025-12-20"
      ]
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/dashboard/feed \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 10.2 Get Recommendations

Get personalized event recommendations.

**Endpoint:** `GET /dashboard/recommendations`  
**Authentication:** Required

### Query Parameters

- `limit` (optional) - Number of recommendations (default: 10)
- `categories` (optional) - Filter by categories (comma-separated)

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "_id": "673e1234567890abcdef9999",
        "title": "React Workshop",
        "category": "Academic",
        "startDate": "2025-12-18T14:00:00.000Z",
        "location": {
          "name": "Snell Library"
        },
        "reason": "Based on your interests in Technology",
        "relevanceScore": 0.85,
        "matchedTags": ["react", "javascript", "web-development"]
      }
    ],
    "metadata": {
      "totalRecommendations": 15,
      "basedOn": ["interests", "pastAttendance", "popularity"],
      "lastUpdated": "2025-11-20T10:00:00.000Z"
    }
  }
}
```

### cURL Example

```bash
# All recommendations
curl -X GET http://localhost:5000/api/v1/dashboard/recommendations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filter by categories
curl -X GET "http://localhost:5000/api/v1/dashboard/recommendations?categories=Academic,Career&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 10.3 Dismiss Recommendation

Mark a recommendation as not interested.

**Endpoint:** `POST /dashboard/recommendations/:eventId/dismiss`  
**Authentication:** Required

### URL Parameters

- `eventId` - Event ID

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "message": "Recommendation dismissed. We'll show you fewer events like this."
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/v1/dashboard/recommendations/673e1234567890abcdef9999/dismiss \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 10.4 Get User Statistics

Get user activity statistics.

**Endpoint:** `GET /dashboard/statistics`  
**Authentication:** Required

### Request Body

No body required.

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalEventsAttended": 12,
      "totalEventsRegistered": 5,
      "totalEventsBookmarked": 8,
      "favoriteCategories": [
        {
          "category": "Academic",
          "count": 7
        },
        {
          "category": "Career",
          "count": 3
        }
      ],
      "attendanceRate": 0.857,
      "mostActiveMonth": "November 2025"
    }
  }
}
```

### cURL Example

```bash
curl -X GET http://localhost:5000/api/v1/dashboard/statistics \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 413 | Payload Too Large - File too large |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---