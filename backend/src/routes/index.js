const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/events', require('./event'));
router.use('/recommendations', require('./recommendation'));
router.use('/bookmarks', require('./bookmark'));
router.use('/likes', require('./like'));
router.use('/upload', require('./upload'));
router.use('/dashboard', require('./dashboard'));
router.use('/notifications', require('./notification'));
router.use('/', require('./registration'));
router.use('/', require('./comment'));

module.exports = router;
