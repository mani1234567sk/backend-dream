const mongoose = require('mongoose');
const League = require('../models/League');
const Team = require('../models/Team');
const User = require('../models/User');

// Helper function to validate ISO date strings
const isValidDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date.toISOString().startsWith(dateString.split('T')[0]);
};

exports.updateLeague = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, status } = req.body;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid league ID' });
    }
    
    const league = await League.findById(id);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    // Validate dates if provided
    if (startDate && !isValidDate(startDate)) {
      return res.status(400).json({ message: 'Invalid startDate format. Use ISO 8601 (e.g., YYYY-MM-DD)' });
    }
    
    if (endDate && !isValidDate(endDate)) {
      return res.status(400).json({ message: 'Invalid endDate format. Use ISO 8601 (e.g., YYYY-MM-DD)' });
    }
    
    const start = startDate ? new Date(startDate) : league.startDate;
    const end = endDate ? new Date(endDate) : league.endDate;
    
    if (end <= start) {
      return res.status(400).json({ message: 'endDate must be after startDate' });
    }
    
    const updatedLeague = await League.findByIdAndUpdate(
      id,
      {
        name: name || league.name,
        description: description !== undefined ? description : league.description,
        startDate: start,
        endDate: end,
        status: status || league.status
      },
      { new: true }
    );
    
    res.json({ message: 'League updated successfully', league: updatedLeague });
  } catch (error) {
    console.error('Error updating league:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeagues = async (req, res) => {
  try {
    const leagues = await League.find()
      .populate('teams', 'name')
      .select('-__v');
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeagueById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid league ID' });
    }

    const league = await League.findById(id)
      .populate('teams', 'name')
      .select('-__v');

    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }

    res.json(league);
  } catch (error) {
    console.error('Error fetching league by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createLeague = async (req, res) => {
  try {
    const { name, description, startDate, endDate } = req.body;

    console.log('Request body:', req.body); // Debug log

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields: name, startDate, and endDate are required' });
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({ message: 'Invalid startDate or endDate format. Use ISO 8601 (e.g., YYYY-MM-DD)' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ message: 'endDate must be after startDate' });
    }

    const league = await League.create({
      name,
      description: description || '',
      startDate: start,
      endDate: end,
      status: start <= new Date() ? 'active' : 'upcoming'
    });

    res.status(201).json({ message: 'League created successfully', league });
  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteLeague = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid league ID' });
    }

    const league = await League.findById(id);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }

    // Remove league reference from all teams
    await Team.updateMany(
      { currentLeague: id },
      { $unset: { currentLeague: '' } }
    );

    await League.findByIdAndDelete(id);
    
    res.json({ message: 'League deleted successfully' });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ message: 'Failed to delete league' });
  }
};

exports.joinLeague = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid league ID' });
    }

    const user = await User.findById(userId).populate({
      path: 'team',
      select: 'teamName captain players currentLeague'
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.team) {
      return res.status(400).json({ message: 'You must be part of a team to join a league' });
    }

    // Any team member can join a league on behalf of their team
    const league = await League.findById(id);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }

    // Check if team is already in this league
    if (league.teams.includes(user.team._id)) {
      return res.status(400).json({ message: 'Team already in this league' });
    }

    if (league.status === 'completed') {
      return res.status(400).json({ message: 'Cannot join a completed league' });
    }

    // Check if team is already in another league
    if (user.team.currentLeague) {
      return res.status(400).json({ message: 'Team is already participating in another league' });
    }
    
    // Add team to league
    await League.findByIdAndUpdate(id, {
      $push: { teams: user.team._id }
    });

    // Update team's current league
    await Team.findByIdAndUpdate(user.team._id, {
      currentLeague: id
    });

    res.json({ message: 'Team successfully joined league' });
  } catch (error) {
    console.error('Error joining league:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
