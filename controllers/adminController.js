const User = require('../models/User');
const Team = require('../models/Team');
const Ground = require('../models/Ground');
const Booking = require('../models/Booking');

exports.getStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [totalUsers, totalTeams, totalGrounds, totalBookings] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Team.countDocuments(),
      Ground.countDocuments(),
      Booking.countDocuments()
    ]);

    res.json({
      totalUsers,
      totalTeams,
      totalGrounds,
      totalBookings
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};