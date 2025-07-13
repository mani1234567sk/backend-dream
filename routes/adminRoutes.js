const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/stats', authenticateToken, adminController.getStats);

module.exports = router;