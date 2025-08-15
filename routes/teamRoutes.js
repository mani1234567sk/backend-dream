const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', teamController.getTeams);
router.post('/', authenticateToken, isAdmin, teamController.createTeam);
router.put('/:id', authenticateToken, isAdmin, teamController.updateTeam);
router.delete('/:id', authenticateToken, isAdmin, teamController.deleteTeam);

module.exports = router;
