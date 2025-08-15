const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Get all teams (public route)
router.get('/', teamController.getTeams);

// Admin only routes
router.post('/', authenticateToken, isAdmin, teamController.createTeam);
router.put('/:id', authenticateToken, isAdmin, teamController.updateTeam);
router.delete('/:id', authenticateToken, isAdmin, teamController.deleteTeam);

// Team specific routes
router.get('/:id', teamController.getTeamById);

module.exports = router;
