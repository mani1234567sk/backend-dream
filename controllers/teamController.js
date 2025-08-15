const Team = require('../models/Team');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Helper function to normalize team names for comparison
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  try {
    // First trim and normalize spaces
    const trimmed = name.trim().replace(/\s+/g, ' ');
    // Then remove special characters except alphanumeric, hyphens and spaces
    const cleaned = trimmed.replace(/[^\w\s-]/g, '');
    // Convert to lowercase for case-insensitive comparison
    return cleaned.toLowerCase();
  } catch (error) {
    console.error('Error normalizing team name:', error);
    // Return a safe fallback
    return name ? name.toString().toLowerCase() : '';
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
    const { teamName: name, captain, password, logo, email } = req.body;
    
    // Validate required fields
    if (!name || !captain || !password) {
      return res.status(400).json({ message: 'Team name, captain, and password are required' });
    }
    
    // Sanitize and validate team name
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Team name cannot be empty' });
    }
    
    // Ensure teamName is properly mapped to name field for MongoDB
    const teamName = trimmedName;
    
    // Check for duplicate team names with proper normalization
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Checking for duplicate team name:', { 
      original: name, 
      trimmed: trimmedName, 
      normalized: normalizedNewName 
    });
    
    // Check if normalized name already exists using direct query
    // Use exact match on normalized name instead of regex to avoid pattern issues
    const existingTeams = await Team.find({});
    
    // Log all existing team names and their normalized versions for debugging
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
      // Skip comparison if either name is empty after normalization
      if (!team.name || !normalizedNewName) return false;
      
      const normalizedExistingName = normalizeTeamName(team.name);
      // Only consider it a duplicate if both normalized names are non-empty and match
      return normalizedExistingName && normalizedNewName && 
             normalizedExistingName === normalizedNewName;
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
      name: teamName,
      captain: captain.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      password: hashedPassword,
      logo: logo ? logo.trim() : undefined
    });

    console.log('Team created successfully:', { id: team._id, name: team.name });
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle MongoDB duplicate key error (E11000) as backup
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A team with this name already exists' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName: name, captain, logo, email } = req.body;
    
    // Validate and sanitize input data
    if (!name || !captain) {
      return res.status(400).json({ message: 'Name and captain are required' });
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
    
    // Log all existing team names and their normalized versions for debugging
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
      // Skip comparison if either name is empty after normalization
      if (!team.name || !normalizedNewName) return false;
      
      const normalizedExistingName = normalizeTeamName(team.name);
      // Only consider it a duplicate if both normalized names are non-empty and match
      return normalizedExistingName && normalizedNewName && 
             normalizedExistingName === normalizedNewName;
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
    ).populate('players', 'name').populate('currentLeague', 'name');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    console.log('Team updated successfully:', { id: team._id, name: team.name });
    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    console.error('Error updating team:', error);
    
    // Handle MongoDB duplicate key error as backup
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A team with this name already exists' });
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
