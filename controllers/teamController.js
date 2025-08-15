const Team = require('../models/Team');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Helper function to normalize team names for comparison
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  try {
    // Trim and normalize spaces
    const trimmed = name.trim().replace(/\s+/g, ' ');
    // Remove special characters except alphanumeric, hyphens, and spaces
    const cleaned = trimmed.replace(/[^\w\s-]/g, '');
    // Convert to lowercase for case-insensitive comparison
    const normalized = cleaned.toLowerCase();
    
    console.log(`Normalizing: "${name}" -> "${normalized}"`);
    return normalized;
  } catch (error) {
    console.error('Error normalizing team name:', error);
    return name ? name.toString().toLowerCase() : '';
  }
};

exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('players', 'name')
      .populate('currentLeague', 'name')
      .select('-password');
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTeam = async (req, res) => {
  try {
    console.log('Received team creation request:', req.body);
    
    const { name, captain, password, logo, email } = req.body;
    
    // Validate required fields
    if (!name || !captain || !password) {
      return res.status(400).json({ message: 'Team name, captain, and password are required' });
    }
    
    // Sanitize and validate team name
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Team name cannot be empty' });
    }
    
    // Check for duplicate team names with proper normalization
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Checking for duplicate team name:', { 
      original: name, 
      trimmed: trimmedName, 
      normalized: normalizedNewName 
    });
    
    const existingTeams = await Team.find({});
    
    console.log('All existing teams:');
    existingTeams.forEach(team => {
      const normalizedExistingName = normalizeTeamName(team.name);
      console.log({
        id: team._id,
        originalName: team.name,
        normalizedName: normalizedExistingName,
        matches: normalizedExistingName === normalizedNewName
      });
    });
    
    const duplicateTeam = existingTeams.find(team => {
      if (!team.name || !normalizedNewName) return false;
      
      const normalizedExistingName = normalizeTeamName(team.name);
      const isMatch = normalizedExistingName && normalizedNewName && 
             normalizedExistingName === normalizedNewName;
      
      console.log(`Comparing: "${team.name}" (${normalizedExistingName}) with "${trimmedName}" (${normalizedNewName}) - Match: ${isMatch}`);
      
      return isMatch;
    });
    
    if (duplicateTeam) {
      console.log('Duplicate team found:', duplicateTeam.name);
      return res.status(400).json({ 
        message: `A team with this name already exists: "${duplicateTeam.name}"` 
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
    
    // Return team without password
    const teamResponse = await Team.findById(team._id).select('-password');
    res.status(201).json({ message: 'Team created successfully', team: teamResponse });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle MongoDB duplicate key error (E11000)
    if (error.code === 11000) {
      const keyPattern = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const keyValue = error.keyValue ? JSON.stringify(error.keyValue) : 'unknown';
      
      console.log(`Duplicate key error: field=${keyPattern}, value=${keyValue}`);
      
      return res.status(400).json({ 
        message: `A team with this ${keyPattern} already exists: ${keyValue}`,
        details: { code: error.code, keyPattern, keyValue: error.keyValue }
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      details: error.message 
    });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, captain, logo, email } = req.body;
    
    // Validate and sanitize input data
    if (!name || !captain) {
      return res.status(400).json({ message: 'Team name and captain are required' });
    }
    
    const trimmedName = name.trim();
    const trimmedCaptain = captain.trim();
    
    if (!trimmedName || !trimmedCaptain) {
      return res.status(400).json({ message: 'Name and captain cannot be empty' });
    }
    
    // Check for duplicate team names (excluding current team)
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Update - Checking for duplicate team name:', { 
      id: id,
      original: name, 
      trimmed: trimmedName, 
      normalized: normalizedNewName 
    });
    
    const existingTeams = await Team.find({ _id: { $ne: id } });
    
    console.log('Update - All existing teams (excluding current):');
    existingTeams.forEach(team => {
      const normalizedExistingName = normalizeTeamName(team.name);
      console.log({
        id: team._id,
        originalName: team.name,
        normalizedName: normalizedExistingName,
        matches: normalizedExistingName === normalizedNewName
      });
    });
    
    const duplicateTeam = existingTeams.find(team => {
      if (!team.name || !normalizedNewName) return false;
      
      const normalizedExistingName = normalizeTeamName(team.name);
      const isMatch = normalizedExistingName && normalizedNewName && 
             normalizedExistingName === normalizedNewName;
      
      console.log(`Comparing (update): "${team.name}" (${normalizedExistingName}) with "${trimmedName}" (${normalizedNewName}) - Match: ${isMatch}`);
      
      return isMatch;
    });
    
    if (duplicateTeam) {
      return res.status(400).json({ 
        message: `A team with this name already exists: "${duplicateTeam.name}"` 
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
    ).populate('players', 'name').populate('currentLeague', 'name').select('-password');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    console.log('Team updated successfully:', { id: team._id, name: team.name });
    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    console.error('Error updating team:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const keyPattern = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const keyValue = error.keyValue ? JSON.stringify(error.keyValue) : 'unknown';
      
      console.log(`Duplicate key error (update): field=${keyPattern}, value=${keyValue}`);
      
      return res.status(400).json({ 
        message: `A team with this ${keyPattern} already exists: ${keyValue}`,
        details: { code: error.code, keyPattern, keyValue: error.keyValue }
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      details: error.message 
    });
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
      { $unset: { team: 1 } }
    );
    
    // Remove team from any leagues
    const League = require('../models/League');
    await League.updateMany(
      { teams: id },
      { $pull: { teams: id } }
    );
    
    await Team.findByIdAndDelete(id);
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
