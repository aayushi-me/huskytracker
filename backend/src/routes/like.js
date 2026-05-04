/**
 * Like Routes
 * Defines routes for like operations (standalone routes for DELETE)
 */

const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const { authenticate } = require('../middleware/auth');

// Delete a specific like - requires auth and ownership check
// DELETE /api/v1/likes/:likeId
router.delete('/:likeId', authenticate, likeController.deleteLike);

module.exports = router;

