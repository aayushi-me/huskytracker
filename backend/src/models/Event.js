const mongoose = require('mongoose');

/**
 * EventStatus Enum
 * Represents the lifecycle state of an event
 */
const EventStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  IN_PROGRESS: 'IN_PROGRESS',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

/**
 * Location Subdocument Schema
 * Represents the physical or virtual location of an event
 */
const LocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [200, 'Location name cannot exceed 200 characters']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  zipCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Zip code cannot exceed 20 characters']
  },
  country: {
    type: String,
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters'],
    default: 'USA'
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  virtualLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // If isVirtual is true, virtualLink should be provided
        return !this.isVirtual || (v && v.length > 0);
      },
      message: 'Virtual link is required for virtual events'
    }
  }
}, { _id: false });

/**
 * Event Schema
 * Represents a campus event that students can discover, register for, and interact with
 */
const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [3, 'Event title must be at least 3 characters'],
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    minlength: [10, 'Event description must be at least 10 characters'],
    maxlength: [5000, 'Event description cannot exceed 5000 characters']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event organizer is required'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    trim: true,
    enum: {
      values: ['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other'],
      message: 'Invalid event category'
    },
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: Object.values(EventStatus),
      message: 'Invalid event status'
    },
    default: EventStatus.DRAFT,
    index: true
  },
  startDate: {
    type: Date,
    required: [true, 'Event start date is required'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Event start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'Event end date is required'],
    validate: {
      validator: function(v) {
        // Get startDate - during updates, this might be the new value or old value
        // We rely on service-level validation for proper multi-day event handling
        const start = this.startDate;
        if (!start) return true; // Skip validation if startDate not set yet
        
        // Extract date strings (YYYY-MM-DD) for comparison
        const startDateOnly = start.toISOString().slice(0, 10);
        const endDateOnly = v.toISOString().slice(0, 10);
        const isSameDate = startDateOnly === endDateOnly;
        
        if (!isSameDate) {
          // Multi-day event: compare date strings only (times don't matter)
          // This allows events like Nov 30 3:25 PM to Dec 2 4:25 PM
          return endDateOnly > startDateOnly;
        } else {
          // Same-day event: compare full date/time
          return v > start;
        }
      },
      message: 'Event end date must be after start date'
    }
  },
  location: {
    type: LocationSchema,
    required: [true, 'Event location is required']
  },
  maxRegistrations: {
    type: Number,
    min: [1, 'Maximum registrations must be at least 1'],
    default: null // null means unlimited
  },
  currentRegistrations: {
    type: Number,
    default: 0,
    min: [0, 'Current registrations cannot be negative']
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Image URL must be a valid HTTP/HTTPS URL'
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for frequent queries
EventSchema.index({ startDate: 1, status: 1 }); // For upcoming events query
EventSchema.index({ category: 1, status: 1 }); // For category filtering
EventSchema.index({ organizer: 1, status: 1 }); // For user's events
// Text search index with weights (title: 10, description: 5, tags: 3)
EventSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 3
  },
  name: 'text_search_index'
}); 
EventSchema.index({ 'location.city': 1, 'location.state': 1 }); // Location-based search
EventSchema.index({ 'location.name': 1 }); // Venue name search
EventSchema.index({ tags: 1 }); // Tag filtering
EventSchema.index({ currentRegistrations: -1 }); // Popularity sorting
EventSchema.index({ status: 1, startDate: 1, category: 1 }); // Compound index for common queries

// Virtual property: Check if event is full
EventSchema.virtual('isFull').get(function() {
  return this.maxRegistrations !== null && this.currentRegistrations >= this.maxRegistrations;
});

// Virtual property: Check if event is upcoming
EventSchema.virtual('isUpcoming').get(function() {
  return this.status === EventStatus.PUBLISHED && this.startDate > new Date();
});

// Virtual property: Check if event is past
EventSchema.virtual('isPast').get(function() {
  return this.endDate < new Date();
});

// Pre-save hook: Ensure currentRegistrations doesn't exceed maxRegistrations
EventSchema.pre('save', function(next) {
  if (this.maxRegistrations !== null && this.currentRegistrations > this.maxRegistrations) {
    return next(new Error('Current registrations cannot exceed maximum registrations'));
  }
  next();
});

// Pre-save hook: Auto-update status to COMPLETED if endDate has passed
EventSchema.pre('save', function(next) {
  if (this.status === EventStatus.PUBLISHED && this.endDate < new Date()) {
    this.status = EventStatus.COMPLETED;
  }
  next();
});

// Post-save hook: Update related registrations count (if needed)
// This would be called after EventRegistration is created/deleted

/**
 * Model Methods
 */

/**
 * Find upcoming published events
 * @param {Object} filters - Additional filters (category, location, etc.)
 * @param {Object} options - Query options (limit, skip, sort)
 * @returns {Promise<Array>} Array of upcoming events
 */
EventSchema.statics.findUpcoming = function(filters = {}, options = {}) {
  const query = {
    status: EventStatus.PUBLISHED,
    startDate: { $gt: new Date() },
    ...filters
  };
  
  return this.find(query)
    .populate('organizer', 'firstName lastName email')
    .sort({ startDate: 1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Search events by text
 * @param {String} searchText - Text to search for
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of matching events
 */
EventSchema.statics.search = function(searchText, filters = {}) {
  const query = {
    status: EventStatus.PUBLISHED,
    $text: { $search: searchText },
    ...filters
  };
  
  return this.find(query)
    .populate('organizer', 'firstName lastName email')
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Find events by organizer
 * @param {mongoose.Types.ObjectId} organizerId - Organizer user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of events
 */
EventSchema.statics.findByOrganizer = function(organizerId, options = {}) {
  return this.find({ organizer: organizerId })
    .populate('organizer', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Check if event has available spots
 * @returns {Boolean} True if event has available registration spots
 */
EventSchema.methods.hasAvailableSpots = function() {
  return this.maxRegistrations === null || this.currentRegistrations < this.maxRegistrations;
};

/**
 * Increment registration count
 * @returns {Promise<Event>} Updated event document
 */
EventSchema.methods.incrementRegistrations = function() {
  if (!this.hasAvailableSpots()) {
    throw new Error('Event is full');
  }
  this.currentRegistrations += 1;
  return this.save();
};

/**
 * Decrement registration count
 * @returns {Promise<Event>} Updated event document
 */
EventSchema.methods.decrementRegistrations = function() {
  if (this.currentRegistrations > 0) {
    this.currentRegistrations -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

const Event = mongoose.model('Event', EventSchema);

module.exports = { Event, EventStatus };

