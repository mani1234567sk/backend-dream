const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
const Booking = require('../models/Booking');
const { sendWelcomeEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.register = async (req, res) => {
  try {
    const { name, email, password, height, position, teamId, teamPassword, profileImage } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'USER_EXISTS',
        message: 'User with this email already exists'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 6 characters long'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      height,
      position,
      profileImage: profileImage || null
    };

    if (teamId && teamPassword) {
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(400).json({ message: 'Team not found' });
      }

      const isTeamPasswordValid = await bcrypt.compare(teamPassword, team.password);
      if (!isTeamPasswordValid) {
        return res.status(400).json({ message: 'Invalid team password' });
      }

      userData.team = teamId;
    }

    const user = await User.create(userData);

    if (teamId) {
      await Team.findByIdAndUpdate(teamId, {
        $push: { players: user._id }
      });
    }

    // Send welcome email automatically
    try {
      await sendWelcomeEmail(email, name);
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({ 
      success: true,
      message: 'User created successfully',
      user: {
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'An error occurred during registration. Please try again.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('team');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      height: user.height,
      position: user.position,
      team: user.team,
      profileImage: user.profileImage
    };

    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('team', 'name').select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, height, position, role, teamId } = req.body;

    const updateData = {
      name,
      email,
      height,
      position,
      role
    };

    if (teamId) {
      updateData.team = teamId;
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).populate('team');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete all bookings by this user
    await Booking.deleteMany({ user: id });
    
    // Remove user from their team if they're in one
    await Team.updateMany(
      { players: id },
      { $pull: { players: id } }
    );
    
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { profileImage } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage },
      { new: true }
    ).populate('team');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      height: updatedUser.height,
      position: updatedUser.position,
      team: updatedUser.team,
      profileImage: updatedUser.profileImage
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
