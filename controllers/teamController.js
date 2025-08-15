const Team = require('../models/Team');
const User = require('../models/User');

const bcrypt = require('bcryptjs');

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
    console.log('Creating team with request body:', req.body);
    
    const { name, captain, password, logo } = req.body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Team name is required and must be a non-empty string' });
    }
    
    if (!captain || typeof captain !== 'string' || captain.trim() === '') {
      return res.status(400).json({ message: 'Captain name is required and must be a non-empty string' });
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password is required and must be at least 6 characters long' });
    }
    
    // Check if team name already exists
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return res.status(400).json({ message: 'A team with this name already exists' });
    }
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    const team = await Team.create({
      name: name.trim(),
      captain: captain.trim(),
      password: hashedPassword,
      logo: logo?.trim() || ''
    });

    console.log('Team created successfully:', team._id);
    
    // Return team without password
    const teamResponse = {
      _id: team._id,
      name: team.name,
      captain: team.captain,
      logo: team.logo,
      players: team.players,
      currentLeague: team.currentLeague,
      matchesPlayed: team.matchesPlayed,
      wins: team.wins,
      createdAt: team.createdAt
    };
    
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (error) {
    console.error('Error creating team:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation failed: ' + validationErrors.join(', ') });
    }
    
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

    const team = await Team.findByIdAndUpdate(
      id,
      { name, captain, logo },
      { new: true }
    ).populate('players', 'name').populate('currentLeague', 'name');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    console.error('Error updating team:', error);
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
