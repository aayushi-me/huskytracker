/**
 * FormData Parser Middleware
 * Parses JSON string fields from FormData back into objects
 * Should run after multer but before validation
 */

/**
 * Parse JSON fields from FormData
 * When using multipart/form-data, complex objects are sent as JSON strings
 * This middleware converts them back to objects before validation
 */
const parseFormDataFields = (req, res, next) => {
  // Only parse if we have a file upload (indicates FormData was used)
  if (!req.file) {
    return next();
  }

  try {
    // Parse location if it's a string
    if (req.body.location && typeof req.body.location === 'string') {
      try {
        req.body.location = JSON.parse(req.body.location);
      } catch (e) {
        console.error('[FormData Parser] Failed to parse location:', e.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid location data format'
        });
      }
    }

    // Parse tags if it's a string
    if (req.body.tags && typeof req.body.tags === 'string') {
      try {
        req.body.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.error('[FormData Parser] Failed to parse tags:', e.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid tags data format'
        });
      }
    }

    // Convert maxRegistrations to number
    if (req.body.maxRegistrations && typeof req.body.maxRegistrations === 'string') {
      const parsed = parseInt(req.body.maxRegistrations, 10);
      if (!isNaN(parsed)) {
        req.body.maxRegistrations = parsed;
      }
    }

    // Convert isPublic to boolean
    if (req.body.isPublic && typeof req.body.isPublic === 'string') {
      req.body.isPublic = req.body.isPublic === 'true';
    }

    next();
  } catch (error) {
    console.error('[FormData Parser] Unexpected error:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to parse form data'
    });
  }
};

module.exports = {
  parseFormDataFields
};

