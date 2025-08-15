const Team = require('../models/Team');
const User = require('../models/User');
const League = require('../models/League'); // Add League model for reference cleanup
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Helper function to normalize team names for comparison
const normalizeTeamName = (name) => {
  if (!name || typeof name !== 'string') return '';
  try {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const cleaned = trimmed.replace(/[^\w\s-]/g, '');
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
    res.status(500).json({ message: 'Server error', details: error.message });
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

    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Team name cannot be empty' });
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Check for duplicate team name
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Checking for duplicate team name:', { 
      original: name, 
      trimmed: trimmedName, 
      normalized: normalizedNewName 
    });

    const existingTeam = await Team.findOne({ name: trimmedName });
    if (existingTeam) {
      console.log('Duplicate team found:', existingTeam.name);
      return res.status(400).json({ 
        message: `A team with this name already exists: "${existingTeam.name}"` 
      });
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await Team.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        console.log('Duplicate email found:', existingEmail.email);
        return res.status(400).json({ 
          message: `A team with this email already exists: "${existingEmail.email}"` 
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const team = await Team.create({
      name: trimmedName,
      captain: captain.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      password: hashedPassword,
      logo: logo ? logo.trim() : undefined
    });

    console.log('Team created successfully:', { id: team._id, name: team.name, email: team.email });

    const teamResponse = await Team.findById(team._id)
      .populate('players', 'name')
      .populate('currentLeague', 'name')
      .select('-password');
    res.status(201).json({ message: 'Team created successfully', team: teamResponse });
  } catch (error) {
    console.error('Error creating team:', error);
    console.log('Error details:', {
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });

    if (error.code === 11000) {
      const keyPattern = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const keyValue = error.keyValue ? JSON.stringify(error.keyValue) : 'unknown';
      console.log(`Duplicate key error: field=${keyPattern}, value=${keyValue}`);
      return res.status(400).json({ 
        message: `A team with this ${keyPattern} already exists: ${keyValue}`,
        details: { code: error.code, keyPattern, keyValue }
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

    // Validate required fields
    if (!name || !captain) {
      return res.status(400).json({ message: 'Team name and captain are required' });
    }

    const trimmedName = name.trim();
    const trimmedCaptain = captain.trim();

    if (!trimmedName || !trimmedCaptain) {
      return res.status(400).json({ message: 'Name and captain cannot be empty' });
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Check for duplicate team name (excluding current team)
    const normalizedNewName = normalizeTeamName(trimmedName);
    console.log('Update - Checking for duplicate team name:', { 
      id: id,
      original: name, 
      trimmed: trimmedName, 
      normalized: normalizedNewName 
    });

    const existingTeam = await Team.findOne({ name: trimmedName, _id: { $ne: id } });
    if (existingTeam) {
      return res.status(400).json({ 
        message: `A team with this name already exists: "${existingTeam.name}"` 
      });
    }

    // Check for duplicate email if provided (excluding current team)
    if (email) {
      const existingEmail = await Team.findOne({ 
        email: email.trim().toLowerCase(), 
        _id: { $ne: id } 
      });
      if (existingEmail) {
        return res.status(400).json({ 
          message: `A team with this email already exists: "${existingEmail.email}"` 
        });
      }
    }

    // Prepare update data
    const updateData = { 
      name: trimmedName,
      captain: trimmedCaptain,
      logo: logo ? logo.trim() : undefined
    };

    // Only update email if provided (allow clearing email by sending empty string)
    if (email !== undefined) {
      updateData.email = email ? email.trim().toLowerCase() : '';
    }

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('players', 'name').populate('currentLeague', 'name').select('-password');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    console.log('Team updated successfully:', { id: team._id, name: team.name, email: team.email });
    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    console.error('Error updating team:', error);
    console.log('Error details:', {
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });

    if (error.code === 11000) {
      const keyPattern = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const keyValue = error.keyValue ? JSON.stringify(error.keyValue) : 'unknown';
      console.log(`Duplicate key error (update): field=${keyPattern}, value=${keyValue}`);
      return res.status(400).json({ 
        message: `A team with this ${keyPattern} already exists: ${keyValue}`,
        details: { code: error.code, keyPattern, keyValue }
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

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Remove team reference from users
    await User.updateMany(
      { team: id },
      { $unset: { team: 1 } }
    );

    // Remove team from leagues
    await League.updateMany(
      { teams: id },
      { $pull: { teams: id } }
    );

    await Team.findByIdAndDelete(id);
    console.log('Team deleted successfully:', { id });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};
