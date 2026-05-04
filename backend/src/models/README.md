# Database Models Documentation

This directory contains all Mongoose models and schemas for the HuskyTrack application. Each model represents a core entity in the system and includes validation, indexes, virtual properties, and hooks for data consistency.

## Models Overview

### 1. Event Model (`Event.js`)

**Purpose:** Represents a campus event that students can discover, register for, and interact with.

**Key Features:**
- Location subdocument schema for physical/virtual locations
- EventStatus enum: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`
- Registration management with max capacity tracking
- Text search capabilities
- Auto-status updates (e.g., COMPLETED when endDate passes)

**Main Fields:**
- `title` (required, 3-200 chars)
- `description` (required, 10-5000 chars)
- `organizer` (ObjectId ref to User)
- `category` (enum: Academic, Career, Clubs, Sports, Social, Cultural, Other)
- `status` (EventStatus enum)
- `startDate`, `endDate` (required, validated)
- `location` (Location subdocument)
- `maxRegistrations`, `currentRegistrations`
- `tags` (array of strings)
- `isPublic` (boolean)

**Indexes:**
- `startDate + status` (upcoming events)
- `category + status` (category filtering)
- `organizer + status` (user's events)
- Text index on `title`, `description`, `tags`
- Location-based indexes

**Virtual Properties:**
- `isFull` - Check if event has reached capacity
- `isUpcoming` - Check if event is in the future
- `isPast` - Check if event has ended

**Model Methods:**
- `findUpcoming(filters, options)` - Find upcoming published events
- `search(searchText, filters)` - Text search events
- `findByOrganizer(organizerId, options)` - Find events by organizer
- `hasAvailableSpots()` - Check if registration spots available
- `incrementRegistrations()` - Increment registration count
- `decrementRegistrations()` - Decrement registration count

---

### 2. EventRegistration Model (`EventRegistration.js`)

**Purpose:** Represents a user's registration for an event.

**Key Features:**
- RegistrationStatus enum: `REGISTERED`, `WAITLISTED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`
- Compound unique index (user + event) - prevents duplicate registrations
- Waitlist position tracking
- Auto-updates Event's `currentRegistrations` count via hooks

**Main Fields:**
- `user` (ObjectId ref to User, required, indexed)
- `event` (ObjectId ref to Event, required, indexed)
- `status` (RegistrationStatus enum, default: REGISTERED)
- `registeredAt` (Date, default: now)
- `cancelledAt`, `attendedAt` (Date, auto-set)
- `waitlistPosition` (Number, for waitlisted registrations)
- `notes` (String, optional)

**Indexes:**
- Compound unique: `user + event`
- `event + status` (event registrations list)
- `user + status` (user's registrations)
- `event + waitlistPosition` (waitlist ordering)

**Virtual Properties:**
- `isActive` - Check if registration is active (REGISTERED or WAITLISTED)
- `didAttend` - Check if user attended

**Hooks:**
- Post-save/delete hooks update Event's `currentRegistrations` count

**Model Methods:**
- `findByEvent(eventId, options)` - Find all registrations for an event
- `findActiveByEvent(eventId)` - Find active registrations
- `findByUser(userId, options)` - Find user's registrations
- `findUpcomingByUser(userId)` - Find user's upcoming registrations
- `findUserRegistration(userId, eventId)` - Check if user is registered
- `getWaitlistCount(eventId)` - Get waitlist count
- `cancel()` - Cancel registration
- `markAttended()` - Mark as attended
- `markNoShow()` - Mark as no-show

---

### 3. Comment Model (`Comment.js`)

**Purpose:** Represents a user's comment on an event, with support for nested replies.

**Key Features:**
- Threaded comments (parent-child relationships)
- Soft delete and flagging for moderation
- Like count tracking
- Reply count tracking (auto-updated via hooks)
- Edit tracking

**Main Fields:**
- `user` (ObjectId ref to User, required, indexed)
- `event` (ObjectId ref to Event, required, indexed)
- `parentComment` (ObjectId ref to Comment, null for top-level)
- `content` (required, 1-2000 chars)
- `rating` (Number, optional, 1-5 stars for event reviews)
- `isEdited`, `editedAt` (track edits)
- `isFlagged`, `flaggedAt`, `flagReason`, `flaggedBy` (moderation)
- `isDeleted`, `deletedAt` (soft delete)
- `likeCount`, `replyCount` (counters)

**Indexes:**
- `event + createdAt` (event comments list)
- `user + createdAt` (user's comments)
- `parentComment + createdAt` (comment replies)
- `isFlagged + isDeleted` (moderation queries)

**Virtual Properties:**
- `isReply` - Check if comment is a reply
- `isVisible` - Check if comment is visible (not deleted/flagged)

**Hooks:**
- Post-save/delete hooks update parent comment's `replyCount`

**Model Methods:**
- `findByEvent(eventId, options)` - Find top-level comments for event
- `findReplies(commentId, options)` - Find replies to a comment
- `findByUser(userId, options)` - Find user's comments
- `findFlagged(options)` - Find flagged comments for moderation
- `flagComment(commentId, userId, reason)` - Flag a comment
- `deleteComment()` - Soft delete comment
- `restore()` - Restore deleted comment
- `incrementLikes()`, `decrementLikes()` - Update like count
- `incrementReplies()`, `decrementReplies()` - Update reply count

---

### 4. Like Model (`Like.js`)

**Purpose:** Represents a user's like on an event or comment.

**Key Features:**
- Supports both event likes and comment likes
- Compound unique indexes prevent duplicate likes
- Auto-updates Comment's `likeCount` via hooks

**Main Fields:**
- `user` (ObjectId ref to User, required, indexed)
- `event` (ObjectId ref to Event, one of event/comment required)
- `comment` (ObjectId ref to Comment, one of event/comment required)

**Indexes:**
- Compound unique: `user + event` (sparse, for event likes)
- Compound unique: `user + comment` (sparse, for comment likes)
- `event + createdAt` (event likes)
- `comment + createdAt` (comment likes)
- `user + createdAt` (user's likes)

**Validation:**
- Pre-validate hook ensures either event or comment is provided (not both)

**Hooks:**
- Post-save/delete hooks update Comment's `likeCount` when comment is liked

**Model Methods:**
- `findByEvent(eventId, options)` - Find likes for an event
- `findByComment(commentId, options)` - Find likes for a comment
- `findByUser(userId, options)` - Find user's likes
- `findUserEventLike(userId, eventId)` - Check if user liked event
- `findUserCommentLike(userId, commentId)` - Check if user liked comment
- `getEventLikeCount(eventId)` - Get event like count
- `getCommentLikeCount(commentId)` - Get comment like count
- `toggleEventLike(userId, eventId)` - Toggle like for event
- `toggleCommentLike(userId, commentId)` - Toggle like for comment

---

### 5. Bookmark Model (`Bookmark.js`)

**Purpose:** Represents a user's bookmark/save of an event.

**Key Features:**
- User-defined tags for organization
- Notes field for personal annotations
- Compound unique index prevents duplicate bookmarks

**Main Fields:**
- `user` (ObjectId ref to User, required, indexed)
- `event` (ObjectId ref to Event, required, indexed)
- `tags` (array of strings, max 50 chars each)
- `notes` (String, optional, max 1000 chars)

**Indexes:**
- Compound unique: `user + event`
- `user + createdAt` (user's bookmarks)
- `event` (event bookmark count)
- `user + tags` (tag-based filtering)

**Model Methods:**
- `findByUser(userId, options)` - Find user's bookmarks
- `findByUserAndTag(userId, tag, options)` - Find bookmarks by tag
- `findUpcomingByUser(userId)` - Find upcoming bookmarked events
- `findUserBookmark(userId, eventId)` - Check if user bookmarked event
- `getEventBookmarkCount(eventId)` - Get bookmark count
- `getUserTags(userId)` - Get all unique tags for user
- `addTag(tag)` - Add tag to bookmark
- `removeTag(tag)` - Remove tag from bookmark
- `toggleBookmark(userId, eventId)` - Toggle bookmark

---

### 6. Notification Model (`Notification.js`)

**Purpose:** Represents a notification sent to a user.

**Key Features:**
- NotificationType enum for different notification types
- NotificationStatus enum: `UNREAD`, `READ`, `ARCHIVED`
- Supports event, comment, and registration references
- Action URLs for deep linking

**Main Fields:**
- `user` (ObjectId ref to User, required, indexed)
- `type` (NotificationType enum, required)
- `status` (NotificationStatus enum, default: UNREAD)
- `title` (required, max 200 chars)
- `message` (required, max 1000 chars)
- `event`, `comment`, `registration` (ObjectId refs, optional)
- `actionUrl` (String, optional)
- `readAt`, `archivedAt` (Date, auto-set)
- `metadata` (Mixed, for additional data)

**Notification Types:**
- `EVENT_REMINDER`, `EVENT_CANCELLED`, `EVENT_UPDATED`
- `NEW_COMMENT`, `COMMENT_REPLY`
- `REGISTRATION_CONFIRMED`, `REGISTRATION_WAITLISTED`, `REGISTRATION_APPROVED`
- `EVENT_INVITATION`, `SYSTEM_ANNOUNCEMENT`

**Indexes:**
- `user + status + createdAt` (user's notifications)
- `user + type` (filtering by type)
- `status: UNREAD + createdAt` (unread notifications)
- `event` (event-related notifications)

**Virtual Properties:**
- `isUnread` - Check if notification is unread

**Model Methods:**
- `findByUser(userId, options)` - Find user's notifications
- `findUnreadByUser(userId, options)` - Find unread notifications
- `getUnreadCount(userId)` - Get unread count
- `markAsRead()` - Mark notification as read
- `archive()` - Archive notification
- `markAllAsRead(userId)` - Mark all user's notifications as read
- `createNotification(notificationData)` - Create notification

---

### 7. NotificationPreferences Schema (`NotificationPreferences.js`)

**Purpose:** Embedded schema for user notification preferences (embedded in User model).

**Key Features:**
- Per-channel preferences (email, push, inApp)
- Per-type preferences (event reminders, comments, etc.)
- Quiet hours support
- Reminder time configuration

**Main Fields:**
- `email`, `push`, `inApp` (objects with boolean preferences)
- `reminderTime` (Number, hours before event, default: 24)
- `quietHours` (object with enabled, start, end)

**Helper Methods:**
- `isEnabled(channel, notificationType)` - Check if notification is enabled
- `isQuietHours()` - Check if currently in quiet hours

**Usage:**
```javascript
const { NotificationPreferencesSchema } = require('./models');
const UserSchema = new mongoose.Schema({
  // ... other fields
  notificationPreferences: NotificationPreferencesSchema
});
```

---

### 8. CalendarSync Model (`CalendarSync.js`)

**Purpose:** Represents a user's calendar synchronization settings.

**Key Features:**
- Multiple provider support (Google, Outlook, Apple, iCal)
- Sync direction (IMPORT, EXPORT, BIDIRECTIONAL)
- Token management with expiration tracking
- Error tracking and status management

**Main Fields:**
- `user` (ObjectId ref to User, required, indexed)
- `provider` (CalendarProvider enum, required)
- `status` (SyncStatus enum: ACTIVE, PAUSED, ERROR, DISCONNECTED)
- `calendarId` (String, required)
- `accessToken`, `refreshToken` (String, for OAuth)
- `tokenExpiresAt` (Date)
- `lastSyncAt` (Date)
- `syncDirection` (enum: IMPORT, EXPORT, BIDIRECTIONAL)
- `syncFilters` (object with categories, includePastEvents, etc.)
- `errorMessage`, `errorOccurredAt` (error tracking)

**Calendar Providers:**
- `GOOGLE`, `OUTLOOK`, `APPLE`, `ICAL`

**Indexes:**
- Compound unique: `user + provider`
- `user + status` (user's active syncs)
- `status: ACTIVE + lastSyncAt` (sync jobs)

**Virtual Properties:**
- `isActive` - Check if sync is active
- `isTokenExpired` - Check if token is expired

**Model Methods:**
- `findByUser(userId, options)` - Find user's calendar syncs
- `findActiveByUser(userId)` - Find active syncs
- `findByUserAndProvider(userId, provider)` - Find sync by provider
- `findNeedingTokenRefresh()` - Find syncs needing token refresh
- `activate()` - Activate sync
- `pause()` - Pause sync
- `markError(errorMessage)` - Mark sync as error
- `disconnect()` - Disconnect sync
- `updateLastSync()` - Update last sync timestamp
- `updateTokens(accessToken, refreshToken, expiresAt)` - Update tokens

---

## Common Patterns

### Timestamps
All models include `createdAt` and `updatedAt` timestamps via Mongoose's `timestamps: true` option.

### Virtual Properties
Models use virtual properties for computed values that don't need to be stored in the database.

### Indexes
Indexes are created for:
- Foreign key lookups (user, event, etc.)
- Compound queries (user + status, event + status)
- Text search (Event model)
- Unique constraints (prevent duplicates)

### Hooks
Post-save/delete hooks maintain data consistency:
- EventRegistration updates Event's `currentRegistrations`
- Comment updates parent comment's `replyCount`
- Like updates Comment's `likeCount`

### Validation
All models include:
- Required field validation
- String length constraints
- Enum validation
- Custom validators (dates, URLs, etc.)

---

## Usage Example

```javascript
const { Event, EventRegistration, Comment, Like } = require('./models');

// Create an event
const event = await Event.create({
  title: 'Hackathon 2024',
  description: 'Annual coding competition',
  organizer: userId,
  category: 'Academic',
  status: 'PUBLISHED',
  startDate: new Date('2024-12-01'),
  endDate: new Date('2024-12-02'),
  location: {
    name: 'Northeastern University',
    address: '360 Huntington Ave',
    city: 'Boston',
    state: 'MA',
    zipCode: '02115'
  },
  maxRegistrations: 100
});

// Register for event
const registration = await EventRegistration.create({
  user: userId,
  event: event._id,
  status: 'REGISTERED'
});

// Add a comment
const comment = await Comment.create({
  user: userId,
  event: event._id,
  content: 'Looking forward to this!'
});

// Like the event
const like = await Like.create({
  user: userId,
  event: event._id
});
```

---

## Notes

- All models use Mongoose ObjectId references for relationships
- Models are designed to be imported and used in other modules via the `index.js` file
- Hooks use try-catch blocks to prevent errors from breaking the application
- Circular dependencies in hooks are avoided by using `mongoose.model()` instead of direct imports

