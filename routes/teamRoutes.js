const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.get('/', teamController.getTeams);
router.get('/:id', teamController.getTeamById);
router.get('/:id/stats', teamController.getTeamStats);

// Admin-only routes (authentication + admin role required)
router.post('/', authenticateToken, isAdmin, teamController.createTeam);
router.put('/:id', authenticateToken, isAdmin, teamController.updateTeam);
router.delete('/:id', authenticateToken, isAdmin, teamController.deleteTeam);

// Player management routes (Admin only)
router.post('/:id/players', authenticateToken, isAdmin, teamController.addPlayerToTeam);
router.delete('/:id/players/:playerId', authenticateToken, isAdmin, teamController.removePlayerFromTeam);

module.exports = router;
