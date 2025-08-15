const Booking = require('../models/Booking');
const Ground = require('../models/Ground');
const User = require('../models/User');

exports.createBooking = async (req, res) => {
  try {
    const { groundId, date, time } = req.body;
    const userId = req.user.userId;

    console.log('Creating booking:', { groundId, date, time, userId });
    const ground = await Ground.findById(groundId);
    if (!ground) {
      return res.status(404).json({ message: 'Ground not found' });
    }

    // Check if the ground is already booked for the given date and time
    const bookingDate = new Date(date);
    const existingBooking = await Booking.findOne({
      ground: groundId,
      date: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
      },
      time: time,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'Already booked for this date and time' });
    }

    const booking = await Booking.create({
      user: userId,
      ground: groundId,
      date: new Date(date),
      time,
      totalAmount: ground.pricePerHour,
      status: 'confirmed'
    });

    // Populate the booking with ground and user details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('ground', 'name location')
      .populate('user', 'name email');

    console.log('Booking created successfully:', populatedBooking);
    res.status(201).json({ message: 'Booking created successfully', booking: populatedBooking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching bookings for user:', userId);
    
    const bookings = await Booking.find({ user: userId })
      .populate('ground', 'name location image')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${bookings.length} bookings for user ${userId}`);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('ground', 'name location');
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    await Booking.findByIdAndDelete(id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
