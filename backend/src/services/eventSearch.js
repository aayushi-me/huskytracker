/**
 * Event Search Service
 * Provides advanced event search functionality with text search, multiple filters,
 * sorting, and pagination using MongoDB aggregation pipelines
 */

const { Event, EventStatus } = require('../models/Event');
const { ValidationError } = require('../utils/errors');

class EventSearchService {
  // Default pagination settings
  DEFAULT_LIMIT = 20;
  MAX_LIMIT = 100;
  DEFAULT_PAGE = 1;

  /**
   * Search events with advanced filtering, sorting, and pagination
   * @param {Object} options - Search options
   * @param {String} options.searchQuery - Text search query (optional)
   * @param {String|Array} options.category - Category filter (single or multiple)
   * @param {Date|String} options.startDate - Filter events starting on or after this date
   * @param {Date|String} options.endDate - Filter events ending on or before this date
   * @param {String|Array} options.tags - Tag filter (single or multiple, OR logic)
   * @param {String} options.location - Location filter (venue name or city)
   * @param {String} options.capacity - Capacity filter ('available' or 'full')
   * @param {String|Array} options.status - Status filter (defaults to PUBLISHED)
   * @param {Boolean} options.includePast - Include past events (default: false)
   * @param {String} options.sort - Sort option ('date', 'popularity', 'capacity', 'relevance', 'created')
   * @param {String} options.sortOrder - Sort order ('asc' or 'desc', default: 'asc')
   * @param {Number} options.page - Page number (default: 1)
   * @param {Number} options.limit - Results per page (default: 20, max: 100)
   * @param {Number} options.offset - Alternative to page (skip N results)
   * @param {String} options.userId - User ID for authorization (optional)
   * @param {Boolean} options.includeDrafts - Include draft events if user is organizer/admin
   * @returns {Promise<Object>} Search results with pagination metadata
   */
  async searchEvents(options = {}) {
    // Validate and normalize input
    this.validateSearchOptions(options);

    // Build base query
    const query = this.buildSearchQuery(options);

    // Build sort object
    const sortObj = this.buildSortObject(options);

    // Calculate pagination
    const { limit, skip, page } = this.calculatePagination(options);

    // Build aggregation pipeline
    const pipeline = this.buildAggregationPipeline(query, sortObj, limit, skip, options);

    // Execute queries in parallel
    const [results, totalCount] = await Promise.all([
      Event.aggregate(pipeline),
      this.getTotalCount(query)
    ]);

    // Format response
    return this.formatSearchResponse(results, totalCount, page, limit, options);
  }

  /**
   * Build MongoDB query object from search options
   * @param {Object} options - Search options
   * @returns {Object} MongoDB query object
   */
  buildSearchQuery(options = {}) {
    const query = {};

    // Status filter - default to PUBLISHED only
    if (options.status) {
      if (Array.isArray(options.status)) {
        query.status = { $in: options.status };
      } else {
        query.status = options.status;
      }
    } else {
      // Default: only published events unless user is organizer/admin
      if (!options.includeDrafts) {
        query.status = EventStatus.PUBLISHED;
      }
    }

    // Text search - if provided, use $text operator
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const sanitizedQuery = this.sanitizeSearchQuery(options.searchQuery);
      if (sanitizedQuery.length > 0) {
        query.$text = { $search: sanitizedQuery };
      }
    }

    // Category filter - support single or multiple categories (OR logic)
    if (options.category) {
      if (Array.isArray(options.category)) {
        query.category = { $in: options.category };
      } else {
        query.category = options.category;
      }
    }

    // Date range filter
    if (options.startDate || options.endDate || !options.includePast) {
      const dateFilter = {};
      
      if (options.startDate) {
        dateFilter.$gte = new Date(options.startDate);
      } else if (!options.includePast) {
        // Default: only upcoming events if no startDate specified
        dateFilter.$gte = new Date();
      }

      if (options.endDate) {
        dateFilter.$lte = new Date(options.endDate);
      }

      if (Object.keys(dateFilter).length > 0) {
        query.startDate = dateFilter;
      }
    }

    // Tags filter - support single or multiple tags (OR logic)
    if (options.tags) {
      const tagsArray = Array.isArray(options.tags) ? options.tags : [options.tags];
      query.tags = { $in: tagsArray };
    }

    // Location filter - match venue name or city
    if (options.location) {
      query.$or = [
        { 'location.name': { $regex: options.location, $options: 'i' } },
        { 'location.city': { $regex: options.location, $options: 'i' } }
      ];
    }

    // Capacity filter - will be handled in aggregation pipeline
    // Store in query for later use in pipeline
    if (options.capacity) {
      query._capacityFilter = options.capacity;
    }

    // Public events only (unless user is organizer/admin)
    if (!options.includeDrafts && !query.isPublic) {
      query.isPublic = true;
    }

    return query;
  }

  /**
   * Build sort object from sort options
   * @param {Object} options - Search options
   * @returns {Object} MongoDB sort object
   */
  buildSortObject(options = {}) {
    const sort = options.sort || 'date';
    const order = options.sortOrder === 'desc' ? -1 : 1;

    switch (sort) {
      case 'date':
        return { startDate: order };
      
      case 'popularity':
        return { currentRegistrations: -1 * order };
      
      case 'capacity':
        // Sort by available spots (calculated field)
        return { availableSpots: -1 * order };
      
      case 'relevance':
        // Only valid if text search is used
        if (options.searchQuery) {
          return { score: { $meta: 'textScore' } };
        }
        // Fallback to date if no search query
        return { startDate: 1 };
      
      case 'created':
        return { createdAt: -1 * order };
      
      default:
        // Default: date ascending
        return { startDate: 1 };
    }
  }

  /**
   * Build MongoDB aggregation pipeline
   * @param {Object} query - MongoDB query object
   * @param {Object} sortObj - Sort object
   * @param {Number} limit - Results limit
   * @param {Number} skip - Results to skip
   * @param {Object} options - Search options
   * @returns {Array} Aggregation pipeline stages
   */
  buildAggregationPipeline(query, sortObj, limit, skip, options) {
    const pipeline = [];

    // Stage 1: Match documents
    pipeline.push({ $match: query });

    // Stage 2: Add calculated fields
    const addFieldsStage = {
      $addFields: {
        // Calculate available spots
        availableSpots: {
          $cond: {
            if: { $eq: ['$maxRegistrations', null] },
            then: null, // Unlimited
            else: { $subtract: ['$maxRegistrations', '$currentRegistrations'] }
          }
        }
      }
    };

    pipeline.push(addFieldsStage);

    // Stage 3: Additional filtering based on calculated fields
    // Handle capacity filter using calculated availableSpots
    if (query._capacityFilter) {
      const capacityMatch = {};
      if (query._capacityFilter === 'available') {
        capacityMatch.$or = [
          { availableSpots: null }, // Unlimited capacity
          { availableSpots: { $gt: 0 } } // Has available spots
        ];
      } else if (query._capacityFilter === 'full') {
        capacityMatch.$and = [
          { availableSpots: { $ne: null } }, // Has capacity limit
          { availableSpots: { $lte: 0 } } // No spots remaining
        ];
      }
      if (Object.keys(capacityMatch).length > 0) {
        pipeline.push({ $match: capacityMatch });
      }
      // Remove temporary field from query
      delete query._capacityFilter;
    }

    // Stage 4: Sort
    pipeline.push({ $sort: sortObj });

    // Stage 5: Skip
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }

    // Stage 6: Limit
    pipeline.push({ $limit: limit });

    // Stage 7: Lookup organizer information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizer'
      }
    });

    // Stage 8: Unwind organizer
    pipeline.push({
      $unwind: {
        path: '$organizer',
        preserveNullAndEmptyArrays: true
      }
    });

    // Stage 9: Project final fields
    const projectStage = {
      $project: {
        title: 1,
        description: 1,
        category: 1,
        status: 1,
        startDate: 1,
        endDate: 1,
        location: 1,
        maxRegistrations: 1,
        currentRegistrations: 1,
        availableSpots: 1,
        imageUrl: 1,
        tags: 1,
        isPublic: 1,
        createdAt: 1,
        updatedAt: 1,
        organizer: {
          _id: '$organizer._id',
          firstName: '$organizer.firstName',
          lastName: '$organizer.lastName',
          email: '$organizer.email',
          university: '$organizer.university'
        }
      }
    };

    // Add text score to projection if text search was used
    // MongoDB automatically makes textScore available after $match with $text
    // Check both options.searchQuery and query.$text to be safe
    if (options.searchQuery && options.searchQuery.trim().length > 0 && query.$text) {
      projectStage.$project.score = { $meta: 'textScore' };
    }

    pipeline.push(projectStage);

    return pipeline;
  }

  /**
   * Get total count of matching documents
   * @param {Object} query - MongoDB query object
   * @returns {Promise<Number>} Total count
   */
  async getTotalCount(query) {
    // Remove temporary fields and aggregation-only fields before counting
    const countQuery = { ...query };
    delete countQuery._capacityFilter;
    return await Event.countDocuments(countQuery);
  }

  /**
   * Calculate pagination parameters
   * @param {Object} options - Search options
   * @returns {Object} Pagination parameters
   */
  calculatePagination(options = {}) {
    let limit = parseInt(options.limit) || this.DEFAULT_LIMIT;
    let page = parseInt(options.page) || this.DEFAULT_PAGE;
    let offset = parseInt(options.offset);

    // Validate and constrain limit
    if (isNaN(limit) || limit < 1) {
      limit = this.DEFAULT_LIMIT;
    }
    if (limit > this.MAX_LIMIT) {
      limit = this.MAX_LIMIT;
    }

    // Calculate skip from page or offset
    let skip = 0;
    if (!isNaN(offset) && offset >= 0) {
      skip = offset;
      // Calculate page from offset
      page = Math.floor(offset / limit) + 1;
    } else {
      // Validate page
      if (isNaN(page) || page < 1) {
        page = this.DEFAULT_PAGE;
      }
      skip = (page - 1) * limit;
    }

    return { limit, skip, page };
  }

  /**
   * Format search response with results and pagination metadata
   * @param {Array} results - Search results
   * @param {Number} totalCount - Total matching documents
   * @param {Number} page - Current page
   * @param {Number} limit - Results per page
   * @param {Object} options - Search options
   * @returns {Object} Formatted response
   */
  formatSearchResponse(results, totalCount, page, limit, options) {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      events: results,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      ...(options.searchQuery && {
        searchQuery: options.searchQuery,
        relevanceScoring: true
      })
    };
  }

  /**
   * Sanitize and validate search query
   * @param {String} searchQuery - Raw search query
   * @returns {String} Sanitized search query
   */
  sanitizeSearchQuery(searchQuery) {
    if (!searchQuery || typeof searchQuery !== 'string') {
      return '';
    }

    // Trim whitespace
    let sanitized = searchQuery.trim();

    // Validate length
    if (sanitized.length > 500) {
      throw new ValidationError('Search query cannot exceed 500 characters');
    }

    // Remove or escape special MongoDB text search characters if needed
    // MongoDB $text search handles most special characters, but we can clean up
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Validate search options
   * @param {Object} options - Search options
   * @throws {ValidationError} If validation fails
   */
  validateSearchOptions(options) {
    // Validate search query length
    if (options.searchQuery && options.searchQuery.length > 500) {
      throw new ValidationError('Search query cannot exceed 500 characters');
    }

    // Validate category
    if (options.category) {
      const validCategories = ['Academic', 'Career', 'Clubs', 'Sports', 'Social', 'Cultural', 'Other'];
      const categories = Array.isArray(options.category) ? options.category : [options.category];
      
      for (const cat of categories) {
        if (!validCategories.includes(cat)) {
          throw new ValidationError(
            `Invalid category: ${cat}. Must be one of: ${validCategories.join(', ')}`
          );
        }
      }
    }

    // Validate dates
    if (options.startDate) {
      const startDate = new Date(options.startDate);
      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid start date format');
      }
    }

    if (options.endDate) {
      const endDate = new Date(options.endDate);
      if (isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid end date format');
      }
    }

    // Validate date range
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      if (startDate > endDate) {
        throw new ValidationError('Start date must be before or equal to end date');
      }
    }

    // Validate capacity filter
    if (options.capacity && !['available', 'full'].includes(options.capacity)) {
      throw new ValidationError("Capacity filter must be 'available' or 'full'");
    }

    // Validate sort option
    const validSorts = ['date', 'popularity', 'capacity', 'relevance', 'created'];
    if (options.sort && !validSorts.includes(options.sort)) {
      throw new ValidationError(
        `Invalid sort option: ${options.sort}. Must be one of: ${validSorts.join(', ')}`
      );
    }

    // Validate sort order
    if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
      throw new ValidationError("Sort order must be 'asc' or 'desc'");
    }

    // Validate pagination
    if (options.limit !== undefined) {
      const limit = parseInt(options.limit);
      if (isNaN(limit) || limit < 1) {
        throw new ValidationError('Limit must be a positive number');
      }
      if (limit > this.MAX_LIMIT) {
        throw new ValidationError(`Limit cannot exceed ${this.MAX_LIMIT}`);
      }
    }

    if (options.page !== undefined) {
      const page = parseInt(options.page);
      if (isNaN(page) || page < 1) {
        throw new ValidationError('Page must be a positive number');
      }
    }

    if (options.offset !== undefined) {
      const offset = parseInt(options.offset);
      if (isNaN(offset) || offset < 0) {
        throw new ValidationError('Offset must be a non-negative number');
      }
    }
  }
}

module.exports = new EventSearchService();

