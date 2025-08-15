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
    console.log('Creating team with data:', JSON.stringify(req.body));
    
    const { teamName, captain, password, logo, email } = req.body;
    
    const sanitizedData = {
      teamName: teamName?.trim()?.replace(/\s+/g, ' ') || '',
      captain: captain?.trim()?.replace(/\s+/g, ' ') || '',
      password: password || '',
      logo: logo?.trim() || 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg',
      email: email?.trim()?.toLowerCase() || '',
    };
    
    console.log('Sanitized data:', JSON.stringify(sanitizedData));
    
    // Check for existing email (if provided)
    if (sanitizedData.email) {
      const existingEmailTeam = await Team.findOne({ email: sanitizedData.email });
      console.log('Email check:', { email: sanitizedData.email, existingEmailTeam });
      if (existingEmailTeam) {
        return res.status(400).json({ 
          message: `A team with the email "${sanitizedData.email}" already exists.`,
          code: 11000,
          details: { keyPattern: { email: 1 }, keyValue: { email: sanitizedData.email } }
        });
      }
    }
    
    // Hash password
    if (sanitizedData.password) {
      sanitizedData.password = await bcrypt.hash(sanitizedData.password.trim(), 10);
    } else {
      throw new Error('Password is required');
    }
    
    console.log('Creating team with cleaned data:', JSON.stringify(sanitizedData));
    
    const team = await Team.create(sanitizedData);
    
    const responseTeam = await Team.findById(team._id)
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    
    console.log('Team created successfully:', JSON.stringify(responseTeam));
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
        message: validationErrors.join(', ')
      });
    }
    
    res.status(500).json({ message: error.message || 'Server error while creating team' });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, captain, logo, email } = req.body;
    
    console.log('Updating team:', id, 'with data:', JSON.stringify(req.body));
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const sanitizedData = {
      teamName: teamName?.trim()?.replace(/\s+/g, ' ') || '',
      captain: captain?.trim()?.replace(/\s+/g, ' ') || '',
      logo: logo?.trim() || team.logo,
      email: email?.trim()?.toLowerCase() || '',
    };
    
    console.log('Sanitized data:', JSON.stringify(sanitizedData));
    
    if (sanitizedData.email && sanitizedData.email !== team.email) {
      const existingEmailTeam = await Team.findOne({ 
        email: sanitizedData.email,
        _id: { $ne: id }
      });
      if (existingEmailTeam) {
        return res.status(400).json({ 
          message: `A team with the email "${sanitizedData.email}" already exists.`
        });
      }
    }
    
    const updateData = { ...sanitizedData };
    if (!sanitizedData.email) {
      updateData.$unset = { email: 1 };
    }
    
    const updatedTeam = await Team.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    })
      .populate('players', 'name email position')
      .populate('currentLeague', 'name')
      .select('-password -__v');
    
    console.log('Team updated successfully:', JSON.stringify(updatedTeam));
    res.json({ 
      message: 'Team updated successfully', 
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Error updating team:', error);
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
        message: validationErrors.join(', ')
      });
    }
    
    res.status(500).json({ message: error.message || 'Server error while updating team' });
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
