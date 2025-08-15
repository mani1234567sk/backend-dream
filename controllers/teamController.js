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
    console.log('Creating team with data:', req.body);
    console.log('User role:', req.user?.role);
    
    const { name, captain, password, logo } = req.body;
    
    // Validate required fields
    if (!name || !captain || !password) {
      return res.status(400).json({ message: 'Name, captain, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const team = await Team.create({
      name,
      captain,
      password: hashedPassword,
      logo: logo || ''
    });

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

    res.status(201).json({ message: 'Team created successfully', team: teamResponse });
  } catch (error) {
    console.error('Error creating team:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Team name already exists' });
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
