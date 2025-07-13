const Team = require('../models/Team');
const User = require('../models/User');

const bcrypt = require('bcryptjs');

exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find().select('-password');
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, captain, password, logo } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const team = await Team.create({
      name,
      captain,
      password: hashedPassword,
      logo
    });

    res.status(201).json({ message: 'Team created successfully', team });
  } catch (error) {
    console.error('Error creating team:', error);
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