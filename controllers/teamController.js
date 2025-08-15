const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Team = require('../models/Team');
const User = require('../models/User');
const League = require('../models/League');

// Validation helper functions
const validateTeamData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push('Team name must be at least 2 characters long');
    }
    if (data.name && data.name.trim().length > 50) {
      errors.push('Team name cannot exceed 50 characters');
    }
  }
  
  if (!isUpdate || data.captain !== undefined) {
    if (!data.captain || typeof data.captain !== 'string' || data.captain.trim().length < 2) {
      errors.push('Captain name must be at least 2 characters long');
    }
    if (data.captain && data.captain.trim().length > 50) {
      errors.push('Captain name cannot exceed 50 characters');
    }
  }
  
  if (!isUpdate && (!data.password || data.password.length < 6)) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (data.email && data.email.trim() !== '') {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Please provide a valid email address');
    }
  }
  
  if (data.logo && data.logo.trim() !== '') {
    const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
    if (!urlRegex.test(data.logo.trim())) {
      errors.push('Logo must be a valid image URL');
    }
  }
  
  return errors;
};

// Sanitize team data
const sanitizeTeamData = (data) => {
  const sanitized = {};
  
  if (data.name !== undefined) {
    sanitized.name = data.name.toString().trim().replace(/\s+/g, ' ');
  }
  if (data.captain !== undefined) {
    sanitized.captain = data.captain.toString().trim().replace(/\s+/g, ' ');
  }
  if (data.password !== undefined) {
    sanitized.password = data.password.toString().trim();
  }
  if (data.email !== undefined) {
    sanitized.email = data.email.toString().trim().toLowerCase();
  }
  if (data.logo !== undefined) {
    sanitized.logo = data.logo.toString().trim();
  }
  
  return sanitized;
};

// Get all teams with populated data
exports.getTeams = async (req, res) => {
  try {
    console.log('Fetching all teams...');
    
    const teams = await Team.find({ isActive: true })
      .populate('players', 'name email position height profileImage')
      .populate('currentLeague', 'name status startDate endDate')
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 });
    
    console.log(`Found ${teams.length} teams`);
    
    // Add computed fields
    const teamsWithStats = teams.map(team => {
      const teamObj = team.toObject();
      return {
        ...teamObj,
        playerCount: team.players.length,
        winPercentage: team.winPercentage,
        goalDifference: team.goalDifference
      };
    });
    
    res.json(teamsWithStats);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ 
      message: 'Server error while fetching teams',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single team by ID
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }
    
    const team = await Team.findById(id)
      .populate('players', 'name email position height profileImage')
      .populate('currentLeague', 'name status startDate endDate')
      .select('-password');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const teamWithStats = {
      ...team.toObject(),
      playerCount: team.players.length,
      winPercentage: team.winPercentage,
      goalDifference: team.goalDifference
    };
    
    res.json(teamWithStats);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Server error while fetching team' });
  }
};

// Create new team (Admin only)
exports.createTeam = async (req, res) => {
  try {
    console.log('Creating new team with data:', req.body);
    
    // Validate request data
    const validationErrors = validateTeamData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Sanitize input data
    const sanitizedData = sanitizeTeamData(req.body);
    
    // Check if team name already exists
    const existingTeam = await Team.findOne({ 
      name: { $regex: new RegExp(`^${sanitizedData.name}$`, 'i') }
    });
    
    if (existingTeam) {
      return res.status(400).json({ 
        message: 'A team with this name already exists',
        details: { field: 'name', value: sanitizedData.name }
      });
    }
    
    // Check if email is already used by another team (if provided)
    if (sanitizedData.email && sanitizedData.email !== '') {
      const existingEmailTeam = await Team.findOne({ 
        email: sanitizedData.email 
      });
      
      if (existingEmailTeam) {
        return res.status(400).json({ 
          message: 'A team with this email already exists',
          details: { field: 'email', value: sanitizedData.email }
        });
      }
    }
    
    // Create team (password will be hashed by pre-save middleware)
    const team = await Team.create(sanitizedData);
    
    // Populate the created team
    const populatedTeam = await Team.findById(team._id)
      .populate('players', 'name email position height profileImage')
      .populate('currentLeague', 'name status startDate endDate')
      .select('-password');
    
    console.log('Team created successfully:', populatedTeam.name);
    
    res.status(201).json({ 
      message: 'Team created successfully', 
      team: populatedTeam 
    });
  } catch (error) {
    console.error('Error creating team:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `A team with this ${field} already exists`,
        details: { field, value }
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Server error while creating team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update team (Admin only)
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }
    
    console.log('Updating team:', id, 'with data:', req.body);
    
    // Find existing team
    const existingTeam = await Team.findById(id);
    if (!existingTeam) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Validate update data
    const validationErrors = validateTeamData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Sanitize input data
    const sanitizedData = sanitizeTeamData(req.body);
    
    // Check for name conflicts (if name is being updated)
    if (sanitizedData.name && sanitizedData.name !== existingTeam.name) {
      const nameConflict = await Team.findOne({ 
        name: { $regex: new RegExp(`^${sanitizedData.name}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (nameConflict) {
        return res.status(400).json({ 
          message: 'A team with this name already exists',
          details: { field: 'name', value: sanitizedData.name }
        });
      }
    }
    
    // Check for email conflicts (if email is being updated)
    if (sanitizedData.email && sanitizedData.email !== '' && sanitizedData.email !== existingTeam.email) {
      const emailConflict = await Team.findOne({ 
        email: sanitizedData.email,
        _id: { $ne: id }
      });
      
      if (emailConflict) {
        return res.status(400).json({ 
          message: 'A team with this email already exists',
          details: { field: 'email', value: sanitizedData.email }
        });
      }
    }
    
    // Remove password from update data (passwords should not be updated via this endpoint)
    delete sanitizedData.password;
    
    // Update team
    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      sanitizedData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    )
    .populate('players', 'name email position height profileImage')
    .populate('currentLeague', 'name status startDate endDate')
    .select('-password');
    
    console.log('Team updated successfully:', updatedTeam.name);
    
    res.json({ 
      message: 'Team updated successfully', 
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Error updating team:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({ 
        message: `A team with this ${field} already exists`,
        details: { field, value }
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Server error while updating team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete team (Admin only)
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }
    
    console.log('Deleting team:', id);
    
    // Find the team first
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Start a transaction for data consistency
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Remove team reference from all users
        await User.updateMany(
          { team: id },
          { $unset: { team: '' } },
          { session }
        );
        
        // Remove team from any leagues
        await League.updateMany(
          { teams: id },
          { $pull: { teams: id } },
          { session }
        );
        
        // Soft delete the team (mark as inactive instead of hard delete)
        await Team.findByIdAndUpdate(
          id,
          { 
            isActive: false,
            updatedAt: new Date()
          },
          { session }
        );
      });
      
      console.log('Team deleted successfully:', team.name);
      
      res.json({ 
        message: 'Team deleted successfully',
        teamName: team.name
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ 
      message: 'Server error while deleting team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add player to team (Admin only)
exports.addPlayerToTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId } = req.body;
    
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(playerId)) {
      return res.status(400).json({ message: 'Invalid team or player ID format' });
    }
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const player = await User.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    // Check if player is already in this team
    if (team.players.includes(playerId)) {
      return res.status(400).json({ message: 'Player is already in this team' });
    }
    
    // Check if player is already in another team
    if (player.team && player.team.toString() !== id) {
      return res.status(400).json({ message: 'Player is already in another team' });
    }
    
    // Add player to team and update user's team reference
    await Team.findByIdAndUpdate(id, { $push: { players: playerId } });
    await User.findByIdAndUpdate(playerId, { team: id });
    
    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('players', 'name email position height profileImage')
      .populate('currentLeague', 'name status startDate endDate')
      .select('-password');
    
    res.json({ 
      message: 'Player added to team successfully', 
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Error adding player to team:', error);
    res.status(500).json({ message: 'Server error while adding player to team' });
  }
};

// Remove player from team (Admin only)
exports.removePlayerFromTeam = async (req, res) => {
  try {
    const { id, playerId } = req.params;
    
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(playerId)) {
      return res.status(400).json({ message: 'Invalid team or player ID format' });
    }
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if player is in this team
    if (!team.players.includes(playerId)) {
      return res.status(400).json({ message: 'Player is not in this team' });
    }
    
    // Remove player from team and update user's team reference
    await Team.findByIdAndUpdate(id, { $pull: { players: playerId } });
    await User.findByIdAndUpdate(playerId, { $unset: { team: '' } });
    
    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('players', 'name email position height profileImage')
      .populate('currentLeague', 'name status startDate endDate')
      .select('-password');
    
    res.json({ 
      message: 'Player removed from team successfully', 
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Error removing player from team:', error);
    res.status(500).json({ message: 'Server error while removing player from team' });
  }
};

// Get team statistics
exports.getTeamStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }
    
    const team = await Team.getTeamStats(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const stats = {
      ...team.toObject(),
      playerCount: team.players.length,
      winPercentage: team.winPercentage,
      goalDifference: team.goalDifference,
      averageGoalsPerMatch: team.matchesPlayed > 0 ? (team.goalsFor / team.matchesPlayed).toFixed(2) : 0,
      averageGoalsConcededPerMatch: team.matchesPlayed > 0 ? (team.goalsAgainst / team.matchesPlayed).toFixed(2) : 0
    };
    
    delete stats.password; // Ensure password is not included
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ message: 'Server error while fetching team statistics' });
  }
};
