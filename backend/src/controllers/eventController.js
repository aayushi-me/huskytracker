/**
 * Event Controller
 * Handles HTTP requests for event operations
 */

const eventSearchService = require('../services/eventSearch');
const eventService = require('../services/eventService');
const { asyncHandler } = require('../utils/errors');
const mongoose = require('mongoose');
const uploadService = require('../services/uploadService');

// NEW REQUIRED IMPORTS (unchanged ones kept)
const {
  sendRegistrationConfirmationEmail,
  sendEventUpdateEmail,
  sendEventCancellationEmail,
  sendEventReminderEmail
} = require('../services/notificationService');

// NEW REQUIRED IMPORT
const registrationService = require('../services/registrationService');
const { Notification, NotificationType } = require('../models/Notification');


/**
 * Create new event
 * POST /api/v1/events
 * Access: ORGANIZER, ADMIN
 */
const createEvent = asyncHandler(async (req, res) => {
    const organizerId = req.user.id;
    const eventData = req.body;

    // Handle image upload if present
    if (req.file) {
        try {
            console.log('[Event Create] Image file detected, uploading...');
            const uploadResult = await uploadService.handleImageUpload(req.file, req.user);
            eventData.imageUrl = uploadResult.imageUrl;
            console.log('[Event Create] Image uploaded successfully:', uploadResult.imageUrl);
            
            // Mark image as used for the event (will be updated with actual eventId after creation)
            // This is done asynchronously and non-blocking
        } catch (uploadError) {
            console.error('[Event Create] Image upload failed:', uploadError);
            // Continue with event creation even if image upload fails
            // User can add image later via update
        }
    }

    const event = await eventService.createEvent(eventData, organizerId);
    
    // If we uploaded an image, mark it as used by this event
    if (eventData.imageUrl && event._id) {
        uploadService.markImageAsUsed(eventData.imageUrl, event._id)
            .catch(err => console.error('[Event Create] Failed to mark image as used:', err));
    }

    // Send notification to organizer if event is published directly
    if (event.status === 'PUBLISHED') {
        try {
            const userIdObj = mongoose.Types.ObjectId.isValid(organizerId) 
              ? new mongoose.Types.ObjectId(organizerId) 
              : organizerId;
            
            console.log(`[Event Create] Creating publish notification for organizer ${userIdObj.toString()}, event: ${event._id}`);
            
            // Use EVENT_UPDATED type for publish confirmation (since it's an event status change)
            // This will show the Pencil icon to differentiate from other notifications
            const notification = await Notification.create({
                user: userIdObj,
                type: NotificationType.EVENT_UPDATED,
                title: 'Event Published Successfully',
                message: `Your event "${event.title}" has been published and is now visible to all users.`,
                event: event._id,
                actionUrl: `/app/events/${event._id}`
            });
            console.log(`[Event Create] ✓ Created notification for organizer ${userIdObj.toString()}, notification ID: ${notification._id}`);
        } catch (error) {
            console.error('[Event Create] ✗ Error creating publish notification:', error.message);
            console.error('[Event Create] Error details:', error);
            if (error.errors) {
                console.error('[Event Create] Validation errors:', error.errors);
            }
            // Don't fail the request if notification fails
        }
    }

    res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event }
    });
});


/**
 * Get all events with filters and pagination
 * GET /api/v1/events
 * Access: Public
 */
const getEvents = asyncHandler(async (req, res) => {
    const {
        page,
        limit,
        offset,
        category,
        status,
        search,
        searchQuery,
        startDate,
        endDate,
        tags,
        location,
        capacity,
        includePast,
        isPublic,
        sort,
        sortOrder
    } = req.query;

    // Determine if user can see drafts (organizer/admin)
    const userId = req.user?.id;
    const isOrganizerOrAdmin = req.user?.role === 'ORGANIZER' || req.user?.role === 'ADMIN';
    const includeDrafts = isOrganizerOrAdmin && req.query.includeDrafts === 'true';

    // Use advanced search service for better functionality
    const searchOptions = {
        searchQuery: searchQuery || search, // Support both parameter names
        category,
        status,
        startDate,
        endDate,
        tags,
        location,
        capacity,
        includePast: includePast === 'true' || includePast === true,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        sort,
        sortOrder,
        userId,
        includeDrafts
    };

    // Remove undefined values
    Object.keys(searchOptions).forEach(key => {
        if (searchOptions[key] === undefined) {
            delete searchOptions[key];
        }
    });

    const result = await eventSearchService.searchEvents(searchOptions);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Get upcoming events
 * GET /api/v1/events/upcoming
 * Access: Public
 */
const getUpcomingEvents = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        category
    } = req.query;

    const filters = {};
    if (category) filters.category = category;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const result = await eventService.getUpcomingEvents(filters, options);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Get event by ID
 * GET /api/v1/events/:id
 * Access: Public (published events), Organizer (own events)
 */
const getEventById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const event = await eventService.getEventById(id, userId);

    res.status(200).json({
        success: true,
        data: { event }
    });
});


/**
 * Get events by organizer
 */
const getEventsByOrganizer = asyncHandler(async (req, res) => {
    const { organizerId } = req.params;
    const requesterId = req.user.id;
    const {
        page = 1,
        limit = 20
    } = req.query;

    if (organizerId !== requesterId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
        success: false,
        message: 'You do not have permission to view these events'
        });
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const result = await eventService.getEventsByOrganizer(organizerId, requesterId, options);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Get my events
 */
const getMyEvents = asyncHandler(async (req, res) => {
    const organizerId = req.user.id;
    const {
        page = 1,
        limit = 20
    } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const result = await eventService.getEventsByOrganizer(organizerId, organizerId, options);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Get my draft events
 */
const getMyDraftEvents = asyncHandler(async (req, res) => {
    const organizerId = req.user.id;
    const {
        page = 1,
        limit = 20
    } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const result = await eventService.getDraftEventsByOrganizer(organizerId, options);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * UPDATE EVENT (EMAIL LOGIC ADDED HERE)
 * PUT /api/v1/events/:id
 */
const updateEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Handle image upload if present
    if (req.file) {
        try {
            console.log('[Event Update] Image file detected, uploading...');
            const uploadResult = await uploadService.handleImageUpload(req.file, req.user);
            updateData.imageUrl = uploadResult.imageUrl;
            console.log('[Event Update] Image uploaded successfully:', uploadResult.imageUrl);
            
            // TODO: Consider deleting old image if it exists
            // This would require fetching the event first to get the old imageUrl
        } catch (uploadError) {
            console.error('[Event Update] Image upload failed:', uploadError);
            // Continue with event update even if image upload fails
        }
    }

    // 1. Update event
    const event = await eventService.updateEvent(id, updateData, userId);
    
    // If we uploaded a new image, mark it as used by this event
    if (updateData.imageUrl && event._id) {
        uploadService.markImageAsUsed(updateData.imageUrl, event._id)
            .catch(err => console.error('[Event Update] Failed to mark image as used:', err));
    }

    // 2. Fetch attendees (registered users)
    const attendeesResult = await registrationService.getEventAttendees(id, userId, {}, { page: 1, limit: 500 });
    const attendees = attendeesResult?.registrations || [];
    
    console.log(`[Event Update] Found ${attendees.length} registered attendees for event ${id}`);
    
    if (attendees.length === 0) {
      console.log(`[Event Update] No registered attendees found. Notifications will only be sent to registered users.`);
    }

    // 3. Send update email and notification to each attendee
    let notificationCount = 0;
    for (const reg of attendees) {
        const attendee = reg.user;
        if (!attendee || !attendee.email) continue;

        // Extract user ID - handle both populated object and ObjectId
        // Note: Using attendeeUserId to avoid conflict with organizer userId
        const attendeeUserId = attendee._id || attendee.id || (typeof attendee === 'string' ? attendee : null);
        if (!attendeeUserId) {
            console.error('Could not determine user ID for notification:', attendee);
            continue;
        }

        // Send email
        await sendEventUpdateEmail({
            to: attendee.email,
            userName: attendee.firstName || attendee.name || "User",
            eventName: event.title,
            eventDate: new Date(event.startDate).toLocaleString(),
            eventLocation: event.location?.name || "Campus",
            eventUrl: `https://huskytrack.app/events/${event._id}`,
            unsubscribeUrl: "https://huskytrack.app/unsubscribe/preview"
        }).catch(err => console.error('Email error:', err));

        // Create in-app notification
        try {
            // Ensure attendeeUserId is properly formatted as ObjectId
            const userIdObj = mongoose.Types.ObjectId.isValid(attendeeUserId) 
              ? new mongoose.Types.ObjectId(attendeeUserId) 
              : attendeeUserId;
            
            console.log(`[Event Update] Creating notification for user ${userIdObj.toString()}, event: ${event._id}`);
            
            const notification = await Notification.create({
                user: userIdObj,
                type: NotificationType.EVENT_UPDATED,
                title: 'Event Updated',
                message: `"${event.title}" has been updated. Check the event page for details.`,
                event: event._id,
                actionUrl: `/app/events/${event._id}`,
                metadata: {
                    eventTitle: event.title,
                    updateType: 'event_modified'
                }
            });
            console.log(`[Event Update] ✓ Created notification for user ${userIdObj.toString()}, notification ID: ${notification._id}`);
            notificationCount++;
        } catch (notifError) {
            console.error('[Event Update] ✗ Notification creation error:', notifError.message);
            console.error('[Event Update] Error details:', notifError);
            if (notifError.errors) {
                console.error('[Event Update] Validation errors:', notifError.errors);
            }
            // Don't fail the request if notification fails
        }
    }
    
    console.log(`[Event Update] Created ${notificationCount} notifications for ${attendees.length} attendees`);

    // 4. Also send notification to organizer as confirmation
    try {
        const organizerIdObj = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId) 
          : userId;
        
        const attendeeCount = attendees.length;
        console.log(`[Event Update] Creating confirmation notification for organizer ${organizerIdObj.toString()}, event: ${event._id}`);
        
        // Use EVENT_UPDATED type (already correct, but keeping for clarity)
        const organizerNotification = await Notification.create({
            user: organizerIdObj,
            type: NotificationType.EVENT_UPDATED,
            title: 'Event Updated Successfully',
            message: `Your event "${event.title}" has been updated.${attendeeCount > 0 ? ` ${attendeeCount} registered attendee${attendeeCount > 1 ? 's have' : ' has'} been notified.` : ''}`,
            event: event._id,
            actionUrl: `/app/events/${event._id}`,
            metadata: {
                eventTitle: event.title,
                attendeeCount: attendeeCount
            }
        });
        console.log(`[Event Update] ✓ Created confirmation notification for organizer ${organizerIdObj.toString()}, notification ID: ${organizerNotification._id.toString()}`);
    } catch (notifError) {
        console.error('[Event Update] ✗ Error creating organizer confirmation notification:', notifError.message);
        console.error('[Event Update] Error details:', notifError);
        if (notifError.errors) {
            console.error('[Event Update] Validation errors:', notifError.errors);
        }
        // Don't fail the request if notification fails
    }

    res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: { event }
    });
});


/**
 * Delete event
 */
const deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const result = await eventService.deleteEvent(id, userId, isAdmin);

    res.status(200).json({
        success: true,
        ...result
    });
});


/**
 * Publish event
 */
const publishEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await eventService.publishEvent(id, userId);

    // Send notification to organizer
    try {
        const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId) 
          : userId;
        
        console.log(`[Event Publish] Creating notification for organizer ${userIdObj.toString()}, event: ${event._id}`);
        
        // Use EVENT_UPDATED type for publish confirmation (since it's an event status change)
        // This will show the Pencil icon to differentiate from other notifications
        const notification = await Notification.create({
            user: userIdObj,
            type: NotificationType.EVENT_UPDATED,
            title: 'Event Published Successfully',
            message: `Your event "${event.title}" has been published and is now visible to all users.`,
            event: event._id,
            actionUrl: `/app/events/${event._id}`
        });
        console.log(`[Event Publish] ✓ Created notification for organizer ${userIdObj.toString()}, notification ID: ${notification._id}`);
    } catch (error) {
        console.error('[Event Publish] ✗ Error creating publish notification:', error.message);
        console.error('[Event Publish] Error details:', error);
        if (error.errors) {
            console.error('[Event Publish] Validation errors:', error.errors);
        }
        // Don't fail the request if notification fails
    }

    res.status(200).json({
        success: true,
        message: 'Event published successfully',
        data: { event }
    });
});


/**
 * Cancel event
 * POST /api/v1/events/:id/cancel
 * Access: Organizer (own events), Admin
 */
const cancelEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Cancel the event
    const event = await eventService.cancelEvent(id, userId);

    // 2. Fetch attendees (registered users)
    const attendeesResult = await registrationService.getEventAttendees(
        id,
        userId,
        { status: "REGISTERED" },  // only registered users get cancellation email
        { page: 1, limit: 500 }
    );

    const attendees = attendeesResult?.registrations || [];

    // 3. Send cancellation email and notification to each attendee
    for (const reg of attendees) {
        const attendee = reg.user;
        if (!attendee || !attendee.email) continue;

        // Extract user ID
        const attendeeUserId = attendee._id || attendee.id || (typeof attendee === 'string' ? attendee : null);
        if (!attendeeUserId) {
            console.error('Could not determine user ID for cancellation notification:', attendee);
            continue;
        }

        // Send email
        await sendEventCancellationEmail({
            to: attendee.email,
            userName: attendee.firstName || attendee.name || "User",
            eventName: event.title,
            eventDate: new Date(event.startDate).toLocaleString(),
            eventLocation: event.location?.name || "Campus",
            eventUrl: `https://huskytrack.app/events/${event._id}`,
            unsubscribeUrl: "https://huskytrack.app/unsubscribe/preview"
        }).catch(err => console.error('Email error:', err));

        // Create in-app notification
        try {
            const notification = await Notification.create({
                user: attendeeUserId,
                type: NotificationType.EVENT_CANCELLED,
                title: 'Event Cancelled',
                message: `"${event.title}" has been cancelled.`,
                event: event._id,
                actionUrl: `/app/events`,
                metadata: {
                    eventTitle: event.title,
                    cancellationType: 'organizer_cancelled'
                }
            });
            console.log(`[Event Cancel] Created notification for user ${attendeeUserId.toString()}, notification ID: ${notification._id}`);
        } catch (notifError) {
            console.error('[Event Cancel] Notification creation error:', notifError);
            // Don't fail the request if notification fails
        }
    }

    // 4. Also send notification to organizer as confirmation
    try {
        const organizerIdObj = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId) 
          : userId;
        
        const attendeeCount = attendees.length;
        console.log(`[Event Cancel] Creating confirmation notification for organizer ${organizerIdObj.toString()}, event: ${event._id}`);
        
        // Use EVENT_CANCELLED type for cancel confirmation (matches the attendee notification type)
        const organizerNotification = await Notification.create({
            user: organizerIdObj,
            type: NotificationType.EVENT_CANCELLED,
            title: 'Event Cancelled Successfully',
            message: `Your event "${event.title}" has been cancelled.${attendeeCount > 0 ? ` ${attendeeCount} registered attendee${attendeeCount > 1 ? 's have' : ' has'} been notified.` : ''}`,
            event: event._id,
            actionUrl: `/app/events`,
            metadata: {
                eventTitle: event.title,
                attendeeCount: attendeeCount
            }
        });
        console.log(`[Event Cancel] ✓ Created confirmation notification for organizer ${organizerIdObj.toString()}, notification ID: ${organizerNotification._id.toString()}`);
    } catch (notifError) {
        console.error('[Event Cancel] ✗ Error creating organizer confirmation notification:', notifError.message);
        console.error('[Event Cancel] Error details:', notifError);
        if (notifError.errors) {
            console.error('[Event Cancel] Validation errors:', notifError.errors);
        }
        // Don't fail the request if notification fails
    }

    res.status(200).json({
        success: true,
        message: "Event cancelled successfully",
        data: { event }
    });
});



/**
 * Search events
 */
const searchEvents = asyncHandler(async (req, res) => {
    const {
        q,
        searchQuery,
        page,
        limit,
        offset,
        category,
        status,
        startDate,
        endDate,
        tags,
        location,
        capacity,
        includePast,
        sort = 'relevance',
        sortOrder
    } = req.query;

    // Determine if user can see drafts (organizer/admin)
    const userId = req.user?.id;
    const isOrganizerOrAdmin = req.user?.role === 'ORGANIZER' || req.user?.role === 'ADMIN';
    const includeDrafts = isOrganizerOrAdmin && req.query.includeDrafts === 'true';

    // Use searchQuery or q (backward compatibility)
    const query = searchQuery || q;

    // If no search query provided, return all published events (filtering only)
    const searchOptions = {
        searchQuery: query,
        category,
        status,
        startDate,
        endDate,
        tags,
        location,
        capacity,
        includePast: includePast === 'true' || includePast === true,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        sort,
        sortOrder,
        userId,
        includeDrafts
    };

    // Remove undefined values
    Object.keys(searchOptions).forEach(key => {
        if (searchOptions[key] === undefined) {
            delete searchOptions[key];
        }
    });

    const result = await eventSearchService.searchEvents(searchOptions);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Get events by category
 */
const getEventsByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const {
        page = 1,
        limit = 20
    } = req.query;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const result = await eventService.getEventsByCategory(category, options);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Check if user can register
 */
const canUserRegister = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await eventService.canUserRegister(id, userId);

    res.status(200).json({
        success: true,
        data: result
    });
});


/**
 * Get event capacity
 */
const getEventCapacity = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const capacity = await eventService.getEventCapacity(id);

    res.status(200).json({
        success: true,
        data: capacity
    });
});


module.exports = {
    createEvent,
    getEvents,
    getUpcomingEvents,
    getEventById,
    getEventsByOrganizer,
    getMyEvents,
    getMyDraftEvents,
    updateEvent,
    deleteEvent,
    publishEvent,
    cancelEvent,
    searchEvents,
    getEventsByCategory,
    canUserRegister,
    getEventCapacity
};
