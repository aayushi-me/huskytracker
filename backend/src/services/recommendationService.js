/**
 * Recommendation Service
 * Generates personalized event recommendations for a user
 */

const { EventStatus } = require('../models/Event');
const eventRepository = require('../repositories/eventRepository');
const { EventRegistration, RegistrationStatus } = require('../models/EventRegistration');
const { Bookmark } = require('../models/Bookmark');
const { RecommendationFeedback } = require('../models/RecommendationFeedback');
const eventRegistrationRepository = require('../repositories/eventRegistrationRepository');

class RecommendationService {
  /**
   * Get recommended events for a user
   * @param {String} userId - User ID
   * @param {Object} options - Options ({ limit })
   * @returns {Promise<Array>} Recommended events
   */
  async getRecommendedEvents(userId, options = {}) {
    const limit = options.limit || 10;

    // 1. Derive user interests from bookmarks and past attendance
    const [bookmarks, pastRegistrations] = await Promise.all([
      Bookmark.findByUser(userId, { limit: 50 }),
      EventRegistration.find({
        user: userId,
        status: RegistrationStatus.ATTENDED
      })
        .populate('event')
        .lean()
    ]);

    const interestCategories = new Set();

    bookmarks.forEach((bm) => {
      if (bm.event && bm.event.category) {
        interestCategories.add(bm.event.category);
      }
    });

    pastRegistrations.forEach((reg) => {
      if (reg.event && reg.event.category) {
        interestCategories.add(reg.event.category);
      }
    });

    const interestCategoryArray = Array.from(interestCategories);

    // 2. Build base filter for upcoming, published, public events
    const baseFilters = {
      status: EventStatus.PUBLISHED,
      startDate: { $gt: new Date() }
    };

    // If user has interests, filter by those categories first
    let filters = { ...baseFilters };
    if (interestCategoryArray.length > 0) {
      filters.category = { $in: interestCategoryArray };
    }

    // 3. Fetch candidate events sorted by popularity (currentRegistrations)
    const { events } = await eventRepository.findAll(filters, {
      page: 1,
      limit: limit * 2, // fetch more to filter out already registered
      sort: { currentRegistrations: -1, startDate: 1 },
      populate: true,
      lean: true
    });

    if (!events || events.length === 0) {
      // Fallback: popular upcoming events across all categories
      const fallback = await eventRepository.findAll(baseFilters, {
        page: 1,
        limit,
        sort: { currentRegistrations: -1, startDate: 1 },
        populate: true,
        lean: true
      });
      return fallback.events || [];
    }

    // 4. Get dismissed event IDs
    const dismissedEventIds = await RecommendationFeedback.getDismissedEventIds(userId);
    const dismissedSet = new Set(dismissedEventIds);

    // 5. Exclude events user is already registered for AND dismissed events
    const filtered = [];
    for (const ev of events) {
      const hasRegistration = await eventRegistrationRepository.hasActiveRegistration(
        userId,
        ev._id
      );
      const isDismissed = dismissedSet.has(ev._id.toString());
      
      if (!hasRegistration && !isDismissed) {
        filtered.push(ev);
      }
      if (filtered.length >= limit) break;
    }

    return filtered;
  }
}

module.exports = new RecommendationService();


