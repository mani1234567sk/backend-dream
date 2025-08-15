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
    // Make this more lenient by keeping more characters
    const cleaned = trimmed.replace(/[^\w\s-]/g, '');
    // Convert to lowercase for case-insensitive comparison
    const normalized = cleaned.toLowerCase();
    
    console.log(`Normalizing: "${name}" -> "${normalized}"`);
    return normalized;
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
    console.log('Received team creation request:', req.body);
    
    // Extract fields from request body - handle both 'name' and 'teamName'
    const { name, teamName, captain, password, logo, email } = req.body;
    
    // Use 'name' if provided, otherwise use 'teamName' for backward compatibility
    const finalTeamName = name || teamName;
    
    // Validate required fields
    if (!finalTeamName || !captain || !password) {
      return res.status(400).json({ message: 'Team name, captain, and password are required' });
    }
    
    // Sanitize and validate team name
    const trimmedName = finalTeamName.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Team name cannot be empty' });
    }
    
    // Check for duplicate team names with proper normalization
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Checking for duplicate team name:', { 
      original: finalTeamName, 
      trimmed: trimmedName, 
      normalized: normalizedNewName 
    });
    
    // Check if normalized name already exists using direct query
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
      // Only consider it a duplicate if both normalized names are non-empty and match exactly
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
    
    // Handle MongoDB duplicate key error (E11000) with more detailed message
    if (error.code === 11000) {
      // Extract the duplicate key field name from the error message
      const keyPattern = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const keyValue = error.keyValue ? JSON.stringify(error.keyValue) : 'unknown';
      
      console.log(`Duplicate key error: field=${keyPattern}, value=${keyValue}`);
      
      return res.status(400).json({ 
        message: `A team with this ${keyPattern} already exists: ${keyValue}`,
        details: {
          code: error.code,
          keyPattern,
          keyValue: error.keyValue
        }
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
    const { name, teamName, captain, logo, email } = req.body;
    
    // Use 'name' if provided, otherwise use 'teamName' for backward compatibility
    const finalTeamName = name || teamName;
    
    // Validate and sanitize input data
    if (!finalTeamName || !captain) {
      return res.status(400).json({ message: 'Team name and captain are required' });
    }
    
    const trimmedName = finalTeamName.trim();
    const trimmedCaptain = captain.trim();
    
    if (!trimmedName || !trimmedCaptain) {
      return res.status(400).json({ message: 'Name and captain cannot be empty' });
    }
    
    // Check for duplicate team names (excluding current team)
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Update - Checking for duplicate team name:', { 
      id: id,
      original: finalTeamName, 
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
      // Only consider it a duplicate if both normalized names are non-empty and match exactly
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
    
    // Handle MongoDB duplicate key error with more detailed message
    if (error.code === 11000) {
      // Extract the duplicate key field name from the error message
      const keyPattern = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const keyValue = error.keyValue ? JSON.stringify(error.keyValue) : 'unknown';
      
      console.log(`Duplicate key error (update): field=${keyPattern}, value=${keyValue}`);
      
      return res.status(400).json({ 
        message: `A team with this ${keyPattern} already exists: ${keyValue}`,
        details: {
          code: error.code,
          keyPattern,
          keyValue: error.keyValue
        }
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
