const mongoose = require('mongoose');

/**
 * RegistrationStatus Enum
 * Represents the status of a user's event registration
 */
const RegistrationStatus = {
  REGISTERED: 'REGISTERED',
  WAITLISTED: 'WAITLISTED',
  CANCELLED: 'CANCELLED',
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW'
};

/**
 * EventRegistration Schema
 * Represents a user's registration for an event
 */
const EventRegistrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: Object.values(RegistrationStatus),
      message: 'Invalid registration status'
    },
    default: RegistrationStatus.REGISTERED,
    index: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  attendedAt: {
    type: Date,
    default: null
  },
  waitlistPosition: {
    type: Number,
    min: [1, 'Waitlist position must be at least 1'],
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: A user can only register once per event
EventRegistrationSchema.index({ user: 1, event: 1 }, { unique: true });

// Indexes for frequent queries
EventRegistrationSchema.index({ event: 1, status: 1 }); // For event registrations list
EventRegistrationSchema.index({ user: 1, status: 1 }); // For user's registrations
EventRegistrationSchema.index({ event: 1, waitlistPosition: 1 }); // For waitlist ordering

// Virtual property: Check if registration is active
EventRegistrationSchema.virtual('isActive').get(function() {
  return this.status === RegistrationStatus.REGISTERED || 
         this.status === RegistrationStatus.WAITLISTED;
});

// Virtual property: Check if user attended
EventRegistrationSchema.virtual('didAttend').get(function() {
  return this.status === RegistrationStatus.ATTENDED;
});

// Pre-save hook: Set cancelledAt when status changes to CANCELLED
EventRegistrationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === RegistrationStatus.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
    if (this.status === RegistrationStatus.ATTENDED && !this.attendedAt) {
      this.attendedAt = new Date();
    }
  }
  next();
});

// Post-save hook: Update event's currentRegistrations count
EventRegistrationSchema.post('save', async function(doc) {
  try {
    const { Event } = require('./Event');
    const mongoose = require('mongoose');
    const EventRegistrationModel = mongoose.model('EventRegistration');
    
    const event = await Event.findById(doc.event);
    if (!event) return;

    // Count active registrations (REGISTERED status only, not WAITLISTED)
    const activeCount = await EventRegistrationModel.countDocuments({
      event: doc.event,
      status: RegistrationStatus.REGISTERED
    });

    event.currentRegistrations = activeCount;
    // Save without validation to avoid issues with past event dates
    await event.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Error updating event registration count:', error);
  }
});

// Post-remove hook: Update event's currentRegistrations count when registration is deleted
EventRegistrationSchema.post('findOneAndDelete', async function(doc) {
  if (!doc) return;
  try {
    const { Event } = require('./Event');
    const mongoose = require('mongoose');
    const EventRegistrationModel = mongoose.model('EventRegistration');
    
    const event = await Event.findById(doc.event);
    if (!event) return;

    const activeCount = await EventRegistrationModel.countDocuments({
      event: doc.event,
      status: RegistrationStatus.REGISTERED
    });

    event.currentRegistrations = activeCount;
    // Save without validation to avoid issues with past event dates
    await event.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Error updating event registration count:', error);
  }
});

// Post-delete hook: Update event's currentRegistrations count
EventRegistrationSchema.post('deleteOne', async function() {
  try {
    const doc = this.getQuery();
    if (!doc._id) return;
    
    const mongoose = require('mongoose');
    const EventRegistrationModel = mongoose.model('EventRegistration');
    const registration = await EventRegistrationModel.findById(doc._id);
    if (!registration) return;

    const { Event } = require('./Event');
    const event = await Event.findById(registration.event);
    if (!event) return;

    const activeCount = await EventRegistrationModel.countDocuments({
      event: registration.event,
      status: RegistrationStatus.REGISTERED
    });

    event.currentRegistrations = activeCount;
    // Save without validation to avoid issues with past event dates
    await event.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Error updating event registration count:', error);
  }
});

/**
 * Model Methods
 */

/**
 * Find registrations for an event
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of registrations
 */
EventRegistrationSchema.statics.findByEvent = function(eventId, options = {}) {
  return this.find({ event: eventId })
    .populate('user', 'firstName lastName email')
    .sort({ registeredAt: 1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find active registrations for an event (not cancelled)
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Array>} Array of active registrations
 */
EventRegistrationSchema.statics.findActiveByEvent = function(eventId) {
  return this.find({
    event: eventId,
    status: { $in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED] }
  })
    .populate('user', 'firstName lastName email')
    .sort({ registeredAt: 1 });
};

/**
 * Find user's registrations
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of registrations
 */
EventRegistrationSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ user: userId })
    .populate('event')
    .sort({ registeredAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find user's upcoming registrations
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of upcoming registrations
 */
EventRegistrationSchema.statics.findUpcomingByUser = function(userId) {
  return this.find({
    user: userId,
    status: { $in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED] }
  })
    .populate({
      path: 'event',
      match: { startDate: { $gt: new Date() } }
    })
    .sort({ 'event.startDate': 1 });
};

/**
 * Check if user is registered for event
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<EventRegistration|null>} Registration document or null
 */
EventRegistrationSchema.statics.findUserRegistration = function(userId, eventId) {
  return this.findOne({ user: userId, event: eventId });
};

/**
 * Get waitlist count for an event
 * @param {mongoose.Types.ObjectId} eventId - Event ID
 * @returns {Promise<Number>} Count of waitlisted registrations
 */
EventRegistrationSchema.statics.getWaitlistCount = function(eventId) {
  return this.countDocuments({
    event: eventId,
    status: RegistrationStatus.WAITLISTED
  });
};

/**
 * Cancel registration
 * @returns {Promise<EventRegistration>} Updated registration document
 */
EventRegistrationSchema.methods.cancel = function() {
  this.status = RegistrationStatus.CANCELLED;
  this.cancelledAt = new Date();
  return this.save();
};

/**
 * Mark as attended
 * @returns {Promise<EventRegistration>} Updated registration document
 */
EventRegistrationSchema.methods.markAttended = function() {
  this.status = RegistrationStatus.ATTENDED;
  this.attendedAt = new Date();
  return this.save();
};

/**
 * Mark as no-show
 * @returns {Promise<EventRegistration>} Updated registration document
 */
EventRegistrationSchema.methods.markNoShow = function() {
  this.status = RegistrationStatus.NO_SHOW;
  return this.save();
};

const EventRegistration = mongoose.model('EventRegistration', EventRegistrationSchema);

module.exports = { EventRegistration, RegistrationStatus };

