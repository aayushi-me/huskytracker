/**
 * Dashboard Controller
 * Handles HTTP requests for user dashboard feed
 */

const dashboardService = require('../services/dashboardService');
const { asyncHandler } = require('../utils/errors');

/**
 * Get dashboard feed for authenticated user
 * GET /api/v1/dashboard/feed
 */
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Ensure userId is a valid ObjectId string
  const userIdStr = userId.toString();
  
  const data = await dashboardService.getDashboardFeed(userIdStr);

  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getDashboard
};


