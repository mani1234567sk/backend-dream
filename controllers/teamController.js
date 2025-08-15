const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Team = require('../models/Team');
const User = require('../models/User');

exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error while fetching teams' });
  }
};

exports.createTeam = async (req, res) => {
  try {
    console.log('Received team creation request:', req.body);
    
    const { name, captain, password, logo, email } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Team name is required and must be a non-empty string' });
    }

    if (!captain || typeof captain !== 'string' || !captain.trim()) {
      return res.status(400).json({ message: 'Captain name is required and must be a non-empty string' });
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ message: 'Password is required and must be at least 6 characters long' });
    }

    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
    }

    // Check if team name already exists (case-insensitive)
    const existingTeam = await Team.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    
    if (existingTeam) {
      return res.status(400).json({ 
        message: 'A team with this name already exists',
        code: 11000,
        details: { keyPattern: { name: 1 }, keyValue: { name: name.trim() } }
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const teamData = {
      name: name.trim(),
      captain: captain.trim(),
      password: hashedPassword,
      logo: logo ? logo.trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      players: [],
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };

    console.log('Creating team with data:', { ...teamData, password: '[HIDDEN]' });

    const team = await Team.create(teamData);
    
    // Return team without password
    const { password: _, ...teamResponse } = team.toObject();
    
    console.log('Team created successfully:', teamResponse);
    res.status(201).json({ 
      message: 'Team created successfully', 
      team: teamResponse 
    });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'name';
      const value = error.keyValue ? error.keyValue[field] : 'unknown';
      return res.status(400).json({ 
        message: `A team with this ${field} already exists: ${value}`,
        code: 11000,
        details: { keyPattern: error.keyPattern, keyValue: error.keyValue }
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ message: 'Server error while creating team' });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, captain, logo, email } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    if (!captain || !captain.trim()) {
      return res.status(400).json({ message: 'Captain name is required' });
    }

    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
    }

    // Check if another team with the same name exists (excluding current team)
    const existingTeam = await Team.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (existingTeam) {
      return res.status(400).json({ 
        message: 'A team with this name already exists' 
      });
    }

    const updateData = {
      name: name.trim(),
      captain: captain.trim(),
      logo: logo ? logo.trim() : '',
      email: email ? email.trim().toLowerCase() : ''
    };

    const team = await Team.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true 
    }).populate('players', 'name email position').populate('currentLeague', 'name');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Return team without password
    const { password: _, ...teamResponse } = team.toObject();
    
    res.json({ 
      message: 'Team updated successfully', 
      team: teamResponse 
    });
  } catch (error) {
    console.error('Error updating team:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'name';
      return res.status(400).json({ 
        message: `A team with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ message: 'Server error while updating team' });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Remove team reference from all users
    await User.updateMany(
      { team: id },
      { $unset: { team: '' } }
    );

    await Team.findByIdAndDelete(id);
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error while deleting team' });
  }
};
