const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, bookingController.createBooking);
router.get('/user', authenticateToken, bookingController.getUserBookings);
router.get('/', authenticateToken, isAdmin, bookingController.getAllBookings);
router.delete('/:id', authenticateToken, isAdmin, bookingController.deleteBooking);

module.exports = router;
