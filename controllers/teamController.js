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
    res.status(500).json({ message: 'Server error while fetching teams', error: error.message });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const team = await Team.findById(id)
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Server error while fetching team', error: error.message });
  }
};

exports.createTeam = async (req, res) => {
  try {
    console.log('Creating team with data:', req.body);
    
    const { teamName, captain, password, logo, email } = req.body;
    
    // Validate required fields
    console.log('Validating fields:', { teamName, captain, password, email });
    if (!teamName || typeof teamName !== 'string' || teamName.trim() === '') {
      console.log('Validation failed: Invalid teamName');
      return res.status(400).json({ message: 'Team name is required and must be a non-empty string' });
    }
    
    if (!captain || typeof captain !== 'string' || captain.trim() === '') {
      console.log('Validation failed: Invalid captain');
      return res.status(400).json({ message: 'Captain name is required and must be a non-empty string' });
    }
    
    if (!password || typeof password !== 'string' || password.trim() === '') {
      console.log('Validation failed: Invalid password');
      return res.status(400).json({ message: 'Password is required and must be a non-empty string' });
    }
    
    if (password.trim().length < 6) {
      console.log('Validation failed: Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    if (email && email.trim() !== '') {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email.trim())) {
        console.log('Validation failed: Invalid email');
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
    }
    
    const cleanTeamName = teamName.trim().replace(/\s+/g, ' ');
    const cleanCaptain = captain.trim().replace(/\s+/g, ' ');
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanLogo = logo && logo.trim() !== '' ? logo.trim() : 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg';
    
    console.log('Sanitized data:', { cleanTeamName, cleanCaptain, cleanEmail, cleanLogo });
    
    // Check for existing email (if provided)
    if (cleanEmail) {
      const existingEmailTeam = await Team.findOne({ email: cleanEmail });
      console.log('Email check:', { cleanEmail, existingEmailTeam });
      if (existingEmailTeam) {
        return res.status(400).json({ 
          message: `A team with the email "${cleanEmail}" already exists.`,
          code: 11000,
          details: { keyPattern: { email: 1 }, keyValue: { email: cleanEmail } }
        });
      }
    }
    
    // Option 2: Add manual check for exact teamName duplicates (uncomment to enable)
    /*
    const existingTeam = await Team.findOne({ teamName: cleanTeamName });
    console.log('Checking for existing team:', cleanTeamName, 'Found:', existingTeam);
    if (existingTeam) {
      return res.status(400).json({ 
        message: `A team with the name "${cleanTeamName}" already exists.`,
        code: 11000,
        details: { keyPattern: { teamName: 1 }, keyValue: { teamName: cleanTeamName } }
      });
    }
    */
    
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    
    const teamData = {
      teamName: cleanTeamName,
      captain: cleanCaptain,
      password: hashedPassword,
      logo: cleanLogo
    };
    
    if (cleanEmail) teamData.email = cleanEmail;
    
    console.log('Creating team with cleaned data:', teamData);
    
    const team = await Team.create(teamData);
    
    const responseTeam = await Team.findById(team._id)
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    
    console.log('Team created successfully:', responseTeam);
    res.status(201).json({ 
      message: 'Team created successfully', 
      team: responseTeam 
    });
  } catch (error) {
    console.error('Error creating team:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      validationErrors: error.errors ? Object.values(error.errors).map(err => err.message) : undefined
    });
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const value = error.keyValue ? error.keyValue[field] : 'unknown';
      return res.status(400).json({ 
        message: `A team with this ${field} already exists: ${value}`,
        code: 11000,
        details: { keyPattern: error.keyPattern, keyValue: error.keyValue }
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ message: 'Server error while creating team', error: error.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, captain, logo, email } = req.body;
    
    console.log('Updating team:', id, 'with data:', req.body);
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    if (!teamName || typeof teamName !== 'string' || teamName.trim() === '') {
      return res.status(400).json({ message: 'Team name is required and must be a non-empty string' });
    }
    
    if (!captain || typeof captain !== 'string' || captain.trim() === '') {
      return res.status(400).json({ message: 'Captain name is required and must be a non-empty string' });
    }
    
    const cleanTeamName = teamName.trim().replace(/\s+/g, ' ');
    const cleanCaptain = captain.trim().replace(/\s+/g, ' ');
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanLogo = logo && logo.trim() !== '' ? logo.trim() : team.logo;
    
    // Option 2: Check for exact teamName duplicates (uncomment to enable)
    /*
    if (cleanTeamName !== team.teamName) {
      const existingTeam = await Team.findOne({ 
        teamName: cleanTeamName,
        _id: { $ne: id }
      });
      if (existingTeam) {
        return res.status(400).json({ 
          message: `A team with the name "${cleanTeamName}" already exists.`
        });
      }
    }
    */
    
    if (cleanEmail && cleanEmail !== team.email) {
      const existingEmailTeam = await Team.findOne({ 
        email: cleanEmail,
        _id: { $ne: id }
      });
      if (existingEmailTeam) {
        return res.status(400).json({ 
          message: `A team with the email "${cleanEmail}" already exists.`
        });
      }
    }
    
    const updateData = {
      teamName: cleanTeamName,
      captain: cleanCaptain,
      logo: cleanLogo
    };
    
    if (cleanEmail) {
      updateData.email = cleanEmail;
    } else {
      updateData.$unset = { email: 1 };
    }
    
    const updatedTeam = await Team.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    })
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    
    console.log('Team updated successfully:', updatedTeam);
    res.json({ 
      message: 'Team updated successfully', 
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Server error while updating team', error: error.message });
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
    
    await User.updateMany(
      { team: id },
      { $unset: { team: 1 } }
    );
    
    await Team.findByIdAndDelete(id);
    
    console.log('Team deleted successfully:', id);
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error while deleting team', error: error.message });
  }
};
