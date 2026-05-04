/**
 * Dashboard Service
 * Aggregates data for the user dashboard feed
 */

const mongoose = require('mongoose');
const eventRepository = require('../repositories/eventRepository');
const eventRegistrationRepository = require('../repositories/eventRegistrationRepository');
const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
const { Bookmark } = require('../models/Bookmark');
const { Notification, NotificationStatus } = require('../models/Notification');
const { EventStatus } = require('../models/Event');
const recommendationService = require('./recommendationService');

class DashboardService {
  /**
   * Get dashboard feed data for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardFeed(userId) {
    const now = new Date();

    // 1. Upcoming registrations (next 5)
    const upcomingRegsPromise = eventRegistrationRepository.findByUser(userId, {
      page: 1,
      limit: 5,
      sort: { 'event.startDate': 1 },
      populate: true,
      lean: true
    });

    // 2. Recent bookmarks (5 most recent)
    const bookmarksPromise = Bookmark.findByUser(userId, { limit: 5 });

    // 3. User stats (attended, registered, bookmarked)
    const statsPromise = this._getUserStats(userId);

    // 4. Recent notifications (5 most recent, any status)
    // Mongoose will handle ObjectId conversion automatically
    console.log(`[Dashboard] Fetching notifications for user: ${userId}`);
    
    const notificationsPromise = Notification.find({
      user: userId,
      status: { $ne: NotificationStatus.ARCHIVED }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title message createdAt status actionUrl')
      .lean()
      .then((notifications) => {
        console.log(`[Dashboard] Found ${notifications.length} notifications for user ${userId}`);
        if (notifications.length > 0) {
          console.log(`[Dashboard] Notification titles:`, notifications.map(n => n.title));
        } else {
          // Debug: Check if there are ANY notifications for this user
          Notification.find({ user: userId })
            .limit(1)
            .lean()
            .then((allNotifs) => {
              console.log(`[Dashboard] Total notifications (any status) for user ${userId}: ${allNotifs.length}`);
            })
            .catch((err) => console.error('[Dashboard] Error checking all notifications:', err));
        }
        return notifications;
      });

    // 5. Recommended events
    const recommendationsPromise = recommendationService.getRecommendedEvents(userId, {
      limit: 10
    });

    // 6. Calendar data (current and next month)
    const calendarPromise = this._getCalendarData(userId, now);

    // 7. Upcoming events created by user (organizer view)
    const myUpcomingEventsPromise = eventRepository.findAll(
      {
        organizer: userId,
        status: EventStatus.PUBLISHED,
        startDate: { $gt: now },
      },
      {
        page: 1,
        limit: 5,
        sort: { startDate: 1 },
        populate: true,
        lean: true,
      }
    );

    const [
      upcomingRegs,
      bookmarks,
      stats,
      notifications,
      recommendations,
      calendar,
      myUpcomingEvents
    ] = await Promise.all([
      upcomingRegsPromise,
      bookmarksPromise,
      statsPromise,
      notificationsPromise,
      recommendationsPromise,
      calendarPromise,
      myUpcomingEventsPromise
    ]);

    const upcomingEventsFromRegs = (upcomingRegs.registrations || [])
      .filter((reg) => reg.event && reg.event.startDate > now)
      .slice(0, 5)
      .map((reg) => ({
        ...reg.event,
        registrationId: reg._id,
        registrationStatus: reg.status
      }));

    const myUpcomingEventsList = (myUpcomingEvents.events || []).filter(
      (ev) => ev && ev.startDate > now
    );

    // Merge and de‑duplicate by _id
    const seen = new Set();
    const mergedUpcoming = [];

    for (const ev of [...upcomingEventsFromRegs, ...myUpcomingEventsList]) {
      const id = ev._id?.toString();
      if (id && !seen.has(id)) {
        seen.add(id);
        mergedUpcoming.push(ev);
      }
      if (mergedUpcoming.length >= 5) break;
    }

    const bookmarkedEvents = (bookmarks || [])
      .filter((b) => b.event)
      .slice(0, 5)
      .map((b) => b.event);

    // Format notifications to match frontend expectations
    const formattedNotifications = (notifications || []).map((n, index) => {
      const notificationId = n._id ? (n._id.toString ? n._id.toString() : String(n._id)) : `temp-${Date.now()}-${index}`;
      return {
        _id: notificationId,
        title: n.title || 'Notification',
        message: n.message || '',
        createdAt: n.createdAt ? (n.createdAt.toISOString ? n.createdAt.toISOString() : new Date(n.createdAt).toISOString()) : new Date().toISOString(),
        status: n.status || 'UNREAD',
        actionUrl: n.actionUrl
      };
    });

    // Debug: Log notification count
    if (formattedNotifications.length > 0) {
      console.log(`[Dashboard] Found ${formattedNotifications.length} notifications for user ${userId}`);
    }

    return {
      upcomingEvents: mergedUpcoming,
      bookmarks: bookmarkedEvents,
      recommendations: recommendations || [],
      stats,
      notifications: formattedNotifications,
      calendar
    };
  }

  /**
   * Calculate user statistics
   * @param {String} userId
   * @returns {Promise<Object>}
   */
  async _getUserStats(userId) {
    const [attendedCount, registeredCount, bookmarkedCount] = await Promise.all([
      EventRegistration.countDocuments({
        user: userId,
        status: RegistrationStatus.ATTENDED
      }),
      EventRegistration.countDocuments({
        user: userId,
        status: {
          $in: [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED]
        }
      }),
      Bookmark.countDocuments({ user: userId })
    ]);

    return {
      attended: attendedCount,
      registered: registeredCount,
      bookmarked: bookmarkedCount
    };
  }

  /**
   * Get calendar data for current and next month
   * Returns map of date (YYYY-MM-DD) -> count
   * Includes both events user is registered for AND events user created (if organizer)
   * @param {String} userId
   * @param {Date} now
   * @returns {Promise<Object>}
   */
  async _getCalendarData(userId, now) {
    // Expand range to 6 months (3 months back, current month, 2 months forward)
    // This ensures users can see events in a wider range when navigating the calendar
    const startOfRange = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endOfRange = new Date(now.getFullYear(), now.getMonth() + 3, 1);

    // Fetch all upcoming events user is registered for within range
    const registrationsPromise = eventRegistrationRepository.findByUser(userId, {
      page: 1,
      limit: 200,
      sort: { 'event.startDate': 1 },
      populate: true,
      lean: true
    });

    // Also fetch events created by user (organizer events)
    const myEventsPromise = eventRepository.findAll(
      {
        organizer: userId,
        status: EventStatus.PUBLISHED,
        startDate: {
          $gte: startOfRange,
          $lt: endOfRange
        }
      },
      {
        page: 1,
        limit: 200,
        sort: { startDate: 1 },
        populate: true,
        lean: true
      }
    );

    const [{ registrations }, myEventsResult] = await Promise.all([
      registrationsPromise,
      myEventsPromise
    ]);

    // Debug: Log what we received
    console.log(`[Calendar] Found ${registrations?.length || 0} registrations, ${myEventsResult?.events?.length || 0} user events`);
    console.log(`[Calendar] Date range: ${startOfRange.toISOString()} to ${endOfRange.toISOString()}`);

    // Get events from registrations
    // Note: We convert dates to Date objects for proper comparison
    const eventsFromRegs = (registrations || [])
      .filter(
        (reg) => {
          if (!reg.event || !reg.event.startDate) return false;
          const eventDate = new Date(reg.event.startDate);
          const inRange = eventDate >= startOfRange && eventDate < endOfRange;
          if (!inRange && reg.event) {
            console.log(`[Calendar] Registration event out of range: ${reg.event.title} (${reg.event.startDate})`);
          }
          return inRange;
        }
      )
      .map((reg) => reg.event);

    // Get events created by user
    // Note: myEventsResult already has date filtering in the query, but we double-check here
    const myEvents = (myEventsResult.events || [])
      .filter(
        (ev) => {
          if (!ev || !ev.startDate) return false;
          const eventDate = new Date(ev.startDate);
          const inRange = eventDate >= startOfRange && eventDate < endOfRange;
          if (!inRange) {
            console.log(`[Calendar] User event out of range: ${ev.title || ev._id} (${ev.startDate})`);
          }
          return inRange;
        }
      );
    
    console.log(`[Calendar] After filtering: ${eventsFromRegs.length} from registrations, ${myEvents.length} user events`);

    // Merge and de-duplicate by _id
    const seen = new Set();
    const allEvents = [];

    for (const ev of [...eventsFromRegs, ...myEvents]) {
      const id = ev._id?.toString();
      if (id && !seen.has(id)) {
        seen.add(id);
        allEvents.push(ev);
      }
    }

    const byDate = {};
    
    // Debug: Log events being processed
    console.log(`[Calendar] Processing ${allEvents.length} events for user ${userId}`);
    
    allEvents.forEach((ev) => {
      if (!ev.startDate) {
        console.warn('[Calendar] Event missing startDate:', ev._id, ev.title);
        return;
      }
      
      const d = new Date(ev.startDate);
      // Validate date
      if (isNaN(d.getTime())) {
        console.warn('[Calendar] Invalid event date:', ev.startDate, 'for event:', ev._id, ev.title);
        return;
      }
      
      // Extract date in local timezone to match frontend calendar display
      // This ensures dates are highlighted correctly regardless of timezone
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
      
      // Store event info (count and titles) for each date
      if (!byDate[key]) {
        byDate[key] = {
          count: 0,
          events: []
        };
      }
      byDate[key].count += 1;
      byDate[key].events.push({
        id: ev._id?.toString(),
        title: ev.title || 'Untitled Event'
      });
      
      // Debug: Log first few dates being added
      if (Object.keys(byDate).length <= 5) {
        console.log(`[Calendar] Added date key: ${key} for event: ${ev.title || ev._id}`);
      }
    });
    
    // Debug: Log final result
    console.log(`[Calendar] Final date keys:`, Object.keys(byDate).slice(0, 10));

    return {
      start: startOfRange.toISOString(),
      end: endOfRange.toISOString(),
      dates: byDate
    };
  }
}

module.exports = new DashboardService();


