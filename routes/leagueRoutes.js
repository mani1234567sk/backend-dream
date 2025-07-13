const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/leagueController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', leagueController.getLeagues);
router.post('/', authenticateToken, leagueController.createLeague);
router.post('/:id/join', authenticateToken, leagueController.joinLeague);

module.exports = router;