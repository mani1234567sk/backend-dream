const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', authenticateToken, isAdmin, authController.getAllUsers);
router.put('/users/:id', authenticateToken, isAdmin, authController.updateUser);
router.delete('/users/:id', authenticateToken, isAdmin, authController.deleteUser);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
