const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

// GET /api/v1/dashboard/feed - authenticated users only
router.get('/feed', authenticate, getDashboard);

module.exports = router;


