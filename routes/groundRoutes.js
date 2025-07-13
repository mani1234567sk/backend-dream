const express = require('express');
const router = express.Router();
const groundController = require('../controllers/groundController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', groundController.getGrounds);
router.post('/', authenticateToken, groundController.createGround);
router.get('/:id/reviews', groundController.getReviews);
router.post('/:id/reviews', authenticateToken, groundController.createReview);

module.exports = router;