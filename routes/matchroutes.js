const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Public route for getting matches (no auth required for viewing)
router.get('/', matchController.getMatches);
router.post('/', authenticateToken, isAdmin, matchController.createMatch);
router.post('/:id/join', authenticateToken, matchController.joinMatch);
router.put('/:id', authenticateToken, isAdmin, matchController.updateMatch);
router.delete('/:id', authenticateToken, isAdmin, matchController.deleteMatch);

module.exports = router;
