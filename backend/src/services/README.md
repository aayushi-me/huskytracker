# Services Documentation

This directory contains business logic services for the HuskyTrack application. Services handle complex operations, coordinate between repositories, and implement business rules.

## Services Overview

### 1. Event Search Service (`eventSearch.js`)

**Purpose:** Provides advanced event search functionality with text search, multiple filters, sorting, and pagination using MongoDB aggregation pipelines.

**Key Features:**
- Full-text search across event titles, descriptions, and tags with weighted relevance scoring
- Multiple filter combinations (category, date range, tags, location, capacity, status)
- Flexible sorting options (date, popularity, capacity, relevance, creation date)
- Efficient pagination with offset-based and page-based options
- Optimized MongoDB aggregation pipelines for performance
- Input validation and sanitization

#### Main Methods

##### `searchEvents(options)`

Main search function that accepts comprehensive search options and returns paginated results.

**Parameters:**
```javascript
{
  searchQuery: String,        // Text search query (optional)
  category: String|Array,    // Single or multiple categories (OR logic)
  startDate: Date|String,    // Filter events starting on or after this date
  endDate: Date|String,      // Filter events ending on or before this date
  tags: String|Array,        // Single or multiple tags (OR logic)
  location: String,          // Venue name or city (case-insensitive regex)
  capacity: String,          // 'available' or 'full'
  status: String|Array,      // Event status filter (defaults to PUBLISHED)
  includePast: Boolean,      // Include past events (default: false)
  sort: String,              // 'date', 'popularity', 'capacity', 'relevance', 'created'
  sortOrder: String,         // 'asc' or 'desc' (default: 'asc')
  page: Number,              // Page number (default: 1)
  limit: Number,             // Results per page (default: 20, max: 100)
  offset: Number,            // Alternative to page (skip N results)
  userId: String,            // User ID for authorization (optional)
  includeDrafts: Boolean    // Include draft events if user is organizer/admin
}
```

**Returns:**
```javascript
{
  events: Array,             // Array of event documents
  pagination: {
    currentPage: Number,
    totalPages: Number,
    totalCount: Number,
    limit: Number,
    hasNextPage: Boolean,
    hasPrevPage: Boolean
  },
  searchQuery: String,       // Included if text search was used
  relevanceScoring: Boolean   // Included if text search was used
}
```

**Example Usage:**
```javascript
const results = await eventSearchService.searchEvents({
  searchQuery: 'workshop',
  category: 'Academic',
  tags: ['tech', 'coding'],
  location: 'Boston',
  capacity: 'available',
  sort: 'popularity',
  sortOrder: 'desc',
  page: 1,
  limit: 20
});
```

##### `buildSearchQuery(options)`

Builds MongoDB query object from search options. Handles all filter types and combines them with AND logic.

**Filter Logic:**
- **Category**: Supports single or multiple categories (OR logic within category filter)
- **Tags**: Supports single or multiple tags (OR logic - events with any matching tag)
- **Date Range**: Events where startDate falls within the specified range
- **Location**: Case-insensitive regex match on venue name or city
- **Capacity**: Filters based on calculated available spots
- **Status**: Defaults to PUBLISHED unless user is organizer/admin

##### `buildSortObject(options)`

Builds MongoDB sort object from sort options.

**Sort Options:**
- `date` - Sort by event startDate
- `popularity` - Sort by currentRegistrations count
- `capacity` - Sort by available spots (calculated field)
- `relevance` - Sort by text search score (only valid with searchQuery)
- `created` - Sort by creation date

##### `buildAggregationPipeline(query, sortObj, limit, skip, options)`

Constructs optimized MongoDB aggregation pipeline with the following stages:
1. `$match` - Filter documents based on query
2. `$addFields` - Calculate availableSpots and include text score
3. `$match` - Additional filtering for capacity (if needed)
4. `$sort` - Sort results
5. `$skip` - Pagination offset
6. `$limit` - Results limit
7. `$lookup` - Join with users collection for organizer info
8. `$unwind` - Flatten organizer array
9. `$project` - Shape final output

#### Text Search

The service uses MongoDB's text search with weighted indexes:
- **Title**: Weight 10 (highest priority)
- **Description**: Weight 5
- **Tags**: Weight 3

Text search supports:
- Partial word matching
- Multiple word queries (OR logic by default)
- Relevance scoring via `textScore`
- Automatic sanitization (max 500 characters)

#### Filter Combinations

All filters use AND logic when combined:
- Search query + category + tags = events matching search AND in category AND with tags
- Multiple categories = events in ANY of the categories (OR logic)
- Multiple tags = events with ANY of the tags (OR logic)

#### Pagination

Supports two pagination methods:
1. **Page-based**: `page` and `limit` parameters
2. **Offset-based**: `offset` and `limit` parameters

Default limit: 20, Maximum limit: 100

#### Validation

The service validates:
- Search query length (max 500 characters)
- Category values (must be valid enum)
- Date formats and ranges
- Capacity filter values
- Sort options
- Pagination parameters

#### Performance Considerations

- Uses MongoDB aggregation pipeline for efficient querying
- Leverages compound indexes for common query patterns
- Calculates availableSpots in pipeline to avoid multiple queries
- Includes text score only when text search is used
- Optimized pipeline stage ordering

#### Database Indexes

The Event model includes the following indexes optimized for search:
- Text index on `title`, `description`, `tags` (weighted)
- Compound index on `(status, startDate, category)`
- Index on `tags` for tag filtering
- Index on `location.name` for venue search
- Index on `location.city` for city search
- Index on `currentRegistrations` for popularity sorting

---

### 2. Event Service (`eventService.js`)

**Purpose:** Contains business logic for event management, including validation, capacity management, status transitions, and waitlist logic.

**Key Features:**
- Event CRUD operations
- Status transition validation
- Capacity management
- Authorization checks
- Event lifecycle management

See individual method documentation in the service file.

---

### 3. Event Scheduler Service (`eventScheduler.js`)

**Purpose:** Handles scheduled tasks for event status updates and other time-based operations.

**Key Features:**
- Automatic status updates (PUBLISHED → IN_PROGRESS → COMPLETED)
- Scheduled job execution
- Event lifecycle automation

---

## API Endpoints

### Search Events

**GET** `/api/v1/events/search`

Search events with text search and filters.

**Query Parameters:**
- `q` or `searchQuery` (optional) - Text search query
- `category` (optional) - Single category or comma-separated list
- `tags` (optional) - Single tag or comma-separated list
- `location` (optional) - Venue name or city
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `capacity` (optional) - 'available' or 'full'
- `status` (optional) - Event status or comma-separated list
- `includePast` (optional) - 'true' to include past events
- `sort` (optional) - 'date', 'popularity', 'capacity', 'relevance', 'created'
- `sortOrder` (optional) - 'asc' or 'desc'
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 20, max: 100)
- `offset` (optional) - Skip N results

**Example Requests:**
```bash
# Basic text search
GET /api/v1/events/search?q=workshop&category=Academic

# Advanced search with multiple filters
GET /api/v1/events/search?searchQuery=networking&category=Career&tags=tech,startup&location=Boston&capacity=available&sort=popularity&sortOrder=desc&page=1&limit=20

# Filter without search
GET /api/v1/events?category=Sports&startDate=2024-01-01&endDate=2024-12-31&sort=date
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "...",
        "title": "Event Title",
        "description": "Event description",
        "category": "Academic",
        "status": "PUBLISHED",
        "startDate": "2024-12-01T10:00:00Z",
        "endDate": "2024-12-01T12:00:00Z",
        "location": { ... },
        "maxRegistrations": 100,
        "currentRegistrations": 45,
        "availableSpots": 55,
        "tags": ["tech", "workshop"],
        "score": 2.5,
        "organizer": { ... }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 95,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "searchQuery": "workshop",
    "relevanceScoring": true
  }
}
```

### Get Events

**GET** `/api/v1/events`

Get all events with filters and pagination (uses same search service).

**Query Parameters:** Same as search endpoint, except `searchQuery` is optional.

---

## Usage Examples

### Example 1: Simple Text Search
```javascript
const results = await eventSearchService.searchEvents({
  searchQuery: 'workshop'
});
```

### Example 2: Category Filter with Date Range
```javascript
const results = await eventSearchService.searchEvents({
  category: 'Career',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  sort: 'date',
  sortOrder: 'asc'
});
```

### Example 3: Multiple Tags with Location
```javascript
const results = await eventSearchService.searchEvents({
  tags: ['tech', 'startup', 'networking'],
  location: 'Boston',
  capacity: 'available',
  sort: 'popularity',
  sortOrder: 'desc'
});
```

### Example 4: Complex Search with All Filters
```javascript
const results = await eventSearchService.searchEvents({
  searchQuery: 'coding workshop',
  category: ['Academic', 'Career'],
  tags: ['javascript', 'react'],
  location: 'Northeastern',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  capacity: 'available',
  sort: 'relevance',
  page: 1,
  limit: 20
});
```

---

## Error Handling

The service throws `ValidationError` for:
- Invalid search query length (> 500 characters)
- Invalid category values
- Invalid date formats
- Invalid sort options
- Invalid pagination parameters

All errors are handled by the controller and returned as appropriate HTTP responses.

---

## Notes

- Text search requires a text index on the Event collection (automatically created by the model)
- The service defaults to showing only PUBLISHED events unless `includeDrafts` is true and user is authorized
- Capacity filter calculates available spots dynamically in the aggregation pipeline
- Text search score is only included in results when a search query is provided
- All date comparisons use the event's `startDate` field
- Location filter uses case-insensitive regex matching on venue name or city

