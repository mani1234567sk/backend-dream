const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/leagueController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', leagueController.getLeagues);
router.post('/', authenticateToken, leagueController.createLeague);
router.put('/:id', authenticateToken, isAdmin, leagueController.updateLeague);
router.delete('/:id', authenticateToken, isAdmin, leagueController.deleteLeague);
router.post('/:id/join', authenticateToken, leagueController.joinLeague);

module.exports = router;
