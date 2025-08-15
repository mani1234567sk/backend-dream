const Team = require('../models/Team');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication Middleware
exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid authorization header format. Must start with "Bearer "' });
    }
    const token = authHeader.substring(7);
    if (!token || token.trim() === '') {
      return res.status(401).json({ message: 'No token provided' });
    }
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      } else {
        return res.status(401).json({ message: 'Token verification failed' });
      }
    }
    if (!decoded.userId || !decoded.email) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || user.role
    };
    next();
  } catch (error) {
    console.error('Error in authenticateToken middleware:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Team Controller
// Helper function to sanitize team names
const sanitizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  try {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    return trimmed.replace(/[^\w\s-]/g, ''); // Remove special characters except alphanumeric, spaces, and hyphens
  } catch (error) {
    console.error('Error sanitizing team name:', error);
    return name ? name.toString() : '';
  }
};

exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('players', 'name').populate('currentLeague', 'name').select('-password');
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTeam = async (req, res) => {
  try {
    console.log('Received request body:', req.body); // Log incoming request body
    const { name, captain, password, logo, email } = req.body;
    
    // Validate required fields
    if (!name || !captain || !password) {
      return res.status(400).json({ message: 'Team name, captain, and password are required' });
    }
    
    // Sanitize and validate team name
    const trimmedName = sanitizeTeamName(name);
    if (!trimmedName) {
      return res.status(400).json({ message: 'Team name cannot be empty' });
    }
    
    // Check for duplicate team names (case-sensitive to match MongoDB index)
    console.log('Checking for duplicate team name:', { original: name, sanitized: trimmedName });
    const existingTeam = await Team.findOne({ name: trimmedName });
    
    if (existingTeam) {
      console.log('Duplicate team found:', existingTeam.name);
      return res.status(400).json({ 
        message: `A team with this name already exists: "${existingTeam.name}"` 
      });
    }
    
    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create team with sanitized data
    const team = await Team.create({
      name: trimmedName,
      captain: captain.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      password: hashedPassword,
      logo: logo ? logo.trim() : undefined
    });

    console.log('Team created successfully:', { id: team._id, name: team.name });
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: `A team with this name already exists: "${req.body.name}"` });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    console.log('Received request body for update:', req.body);
    const { id } = req.params;
    const { name, captain, logo, email } = req.body;
    
    // Validate and sanitize input data
    if (!name || !captain) {
      return res.status(400).json({ message: 'Name and captain are required' });
    }
    
    const trimmedName = sanitizeTeamName(name);
    const trimmedCaptain = captain.trim();
    
    if (!trimmedName || !trimmedCaptain) {
      return res.status(400).json({ message: 'Name and captain cannot be empty' });
    }
    
    // Check for duplicate team names (case-sensitive, excluding current team)
    console.log('Update - Checking for duplicate team name:', { id, original: name, sanitized: trimmedName });
    const existingTeam = await Team.findOne({ name: trimmedName, _id: { $ne: id } });
    
    if (existingTeam) {
      return res.status(400).json({ 
        message: `A team with this name already exists: "${existingTeam.name}"` 
      });
    }
    
    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const updateData = { 
      name: trimmedName, 
      captain: trimmedCaptain,
      logo: logo ? logo.trim() : undefined
    };
    
    // Only update email if provided
    if (email !== undefined) {
      updateData.email = email ? email.trim().toLowerCase() : '';
    }

    const team = await Team.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('players', 'name').populate('currentLeague', 'name');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    console.log('Team updated successfully:', { id: team._id, name: team.name });
    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    console.error('Error updating team:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: `A team with this name already exists: "${req.body.name}"` });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove team reference from all users
    await User.updateMany(
      { team: id },
      { $unset: { team: 1 } }
    );
    
    await Team.findByIdAndDelete(id);
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
