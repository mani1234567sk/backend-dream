const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Team = require('../models/Team');
const User = require('../models/User');

exports.getTeams = async (req, res) => {
  try {
    console.log('Fetching all teams...');
    const teams = await Team.find()
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    
    console.log(`Found ${teams.length} teams`);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error while fetching teams' });
  }
};

exports.createTeam = async (req, res) => {
  try {
    console.log('Creating new team with data:', req.body);
    
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

    // Sanitize and validate inputs
    const sanitizedName = name.trim().replace(/\s+/g, ' ');
    const sanitizedCaptain = captain.trim().replace(/\s+/g, ' ');
    const sanitizedEmail = email ? email.trim().toLowerCase() : '';

    // Validate email format if provided
    if (sanitizedEmail && !/^\S+@\S+\.\S+$/.test(sanitizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Check if team with this name already exists
    const existingTeam = await Team.findOne({ 
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') } 
    });
    
    if (existingTeam) {
      return res.status(400).json({ 
        message: 'A team with this name already exists',
        details: { field: 'name', value: sanitizedName }
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Create the team
    const teamData = {
      name: sanitizedName,
      captain: sanitizedCaptain,
      password: hashedPassword,
      logo: logo ? logo.trim() : '',
      email: sanitizedEmail,
      players: [],
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };

    console.log('Creating team with sanitized data:', { ...teamData, password: '[HIDDEN]' });

    const team = await Team.create(teamData);
    
    console.log('Team created successfully:', team._id);

    // Return team without password
    const { password: _, ...teamResponse } = team.toObject();
    res.status(201).json({ 
      message: 'Team created successfully', 
      team: teamResponse 
    });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'unknown field';
      const value = error.keyValue ? error.keyValue[field] : 'unknown value';
      
      return res.status(400).json({
        message: `A team with this ${field} already exists`,
        details: { field, value }
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

    // Sanitize inputs
    const sanitizedName = name.trim().replace(/\s+/g, ' ');
    const sanitizedCaptain = captain.trim().replace(/\s+/g, ' ');
    const sanitizedEmail = email ? email.trim().toLowerCase() : '';

    // Validate email format if provided
    if (sanitizedEmail && !/^\S+@\S+\.\S+$/.test(sanitizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Check if another team with this name exists (excluding current team)
    const existingTeam = await Team.findOne({ 
      name: { $regex: new RegExp(`^${sanitizedName}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (existingTeam) {
      return res.status(400).json({ 
        message: 'A team with this name already exists',
        details: { field: 'name', value: sanitizedName }
      });
    }

    const updateData = {
      name: sanitizedName,
      captain: sanitizedCaptain,
      logo: logo ? logo.trim() : '',
      email: sanitizedEmail
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
    res.json({ message: 'Team updated successfully', team: teamResponse });
  } catch (error) {
    console.error('Error updating team:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'unknown field';
      const value = error.keyValue ? error.keyValue[field] : 'unknown value';
      
      return res.status(400).json({
        message: `A team with this ${field} already exists`,
        details: { field, value }
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

    // Delete the team
    await Team.findByIdAndDelete(id);
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error while deleting team' });
  }
};
