const Team = require('../models/Team');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Helper function to normalize team names for comparison
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
    .toLowerCase();
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
    const { name, captain, password, logo } = req.body;
    
    // Validate required fields
    if (!name || !captain || !password) {
      return res.status(400).json({ message: 'Name, captain, and password are required' });
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
    
    // Get all existing team names and normalize them for comparison
    const existingTeams = await Team.find({}, 'name');
    const existingNormalizedNames = existingTeams.map(team => ({
      id: team._id,
      original: team.name,
      normalized: normalizeTeamName(team.name)
    }));
    
    console.log('Existing teams for comparison:', existingNormalizedNames);
    
    // Check if normalized name already exists
    const duplicateTeam = existingNormalizedNames.find(team => 
      team.normalized === normalizedNewName && team.normalized !== ''
    );
    
    if (duplicateTeam) {
      console.log('Duplicate team found:', duplicateTeam);
      return res.status(400).json({ 
        message: `A team with this name already exists: "${duplicateTeam.original}"` 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create team with sanitized data
    const team = await Team.create({
      name: trimmedName,
      captain: captain.trim(),
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
    const { name, captain, logo } = req.body;
    
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
    const existingTeams = await Team.find({ _id: { $ne: id } }, 'name');
    const existingNormalizedNames = existingTeams.map(team => ({
      id: team._id,
      original: team.name,
      normalized: normalizeTeamName(team.name)
    }));
    
    const duplicateTeam = existingNormalizedNames.find(team => 
      team.normalized === normalizedNewName && team.normalized !== ''
    );
    
    if (duplicateTeam) {
      return res.status(400).json({ 
        message: `A team with this name already exists: "${duplicateTeam.original}"` 
      });
    }

    const team = await Team.findByIdAndUpdate(
      id,
      { 
        name: trimmedName, 
        captain: trimmedCaptain, 
        logo: logo ? logo.trim() : undefined 
      },
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
