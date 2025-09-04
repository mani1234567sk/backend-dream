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

exports.getLeagues = async (req, res) => {
  try {
    const leagues = await League.find()
      .populate({
        path: 'teams',
        select: 'teamName captain players matchesPlayed wins losses draws logo email',
        populate: {
          path: 'players',
          select: 'name position'
        }
      })
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ message: 'Server error while fetching leagues' });
  }
};

exports.getLeagueById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid league ID' });
    }

    const league = await League.findById(id)
      .populate({
        path: 'teams',
        select: 'teamName captain players matchesPlayed wins losses draws logo email',
        populate: {
          path: 'players',
          select: 'name position email'
        }
      })
      .select('-__v');

    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }

    res.json(league);
  } catch (error) {
    console.error('Error fetching league details:', error);
    res.status(500).json({ message: 'Server error while fetching league details' });
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
    ).populate({
      path: 'teams',
      select: 'teamName captain players matchesPlayed wins losses draws logo email'
    });
    
    res.json({ message: 'League updated successfully', league: updatedLeague });
  } catch (error) {
    console.error('Error updating league:', error);
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

    // Get user with team information
    const user = await User.findById(userId).populate('team');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a team
    if (!user.team) {
      return res.status(400).json({ message: 'You must be part of a team to join a league' });
    }

    // Get the team with full details
    const team = await Team.findById(user.team._id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is the team captain
    if (team.captain !== user.name) {
      return res.status(403).json({ message: 'Only team captains can join leagues' });
    }

    // Check if team is already in another league
    if (team.currentLeague) {
      return res.status(400).json({ message: 'Team is already participating in another league' });
    }

    const league = await League.findById(id);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }

    // Check if team is already in this league
    if (league.teams.includes(team._id)) {
      return res.status(400).json({ message: 'Team is already in this league' });
    }

    // Check league status
    if (league.status === 'completed') {
      return res.status(400).json({ message: 'Cannot join a completed league' });
    }

    // Add team to league
    await League.findByIdAndUpdate(id, {
      $push: { teams: team._id }
    });

    // Update team's current league
    await Team.findByIdAndUpdate(team._id, {
      currentLeague: id
    });

    // Return updated league with team information
    const updatedLeague = await League.findById(id)
      .populate({
        path: 'teams',
        select: 'teamName captain players matchesPlayed wins losses draws logo email'
      });

    res.json({ 
      message: 'Successfully joined league',
      league: updatedLeague
    });
  } catch (error) {
    console.error('Error joining league:', error);
    res.status(500).json({ message: 'Server error while joining league' });
  }
};
