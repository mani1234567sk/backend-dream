const mongoose = require('mongoose');
const Match = require('../models/Match');
const User = require('../models/User');

exports.getMatches = async (req, res) => {
  try {
    console.log('Fetching matches from database...');
    console.log('Match model:', Match); // Debug log
    
    // Check if Match model is properly loaded
    if (!Match) {
      console.error('Match model is not defined');
      return res.status(500).json({ message: 'Match model not found' });
    }
    
    const matches = await Match.find()
      .populate('creator', 'name email')
      .populate('joinedPlayers.user', 'name email')
      .sort({ date: 1, time: 1 })
      .select('-__v');
    
    console.log(`Found ${matches.length} matches`);
    console.log('Sample match data:', matches[0]); // Debug log
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error while fetching matches' });
  }
};

exports.createMatch = async (req, res) => {
  try {
    console.log('Received match creation request:', req.body);
    console.log('Request headers:', req.headers);
    
    const { name, date, time, location, matchType, description, maxPlayers } = req.body;
    const userId = req.user.userId;

    // Verify admin role (additional check)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to create matches' });
    }

    // Trim string values to avoid empty string issues
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedLocation = typeof location === 'string' ? location.trim() : '';
    const trimmedTime = typeof time === 'string' ? time.trim() : '';
    const trimmedMatchType = typeof matchType === 'string' ? matchType.trim() : '';
    const trimmedDescription = typeof description === 'string' ? description.trim() : '';

    // Validate required fields
    if (!trimmedName || !date || !trimmedTime || !trimmedLocation || !trimmedMatchType) {
      console.log('Validation failed - missing fields:', {
        name: trimmedName,
        date,
        time: trimmedTime,
        location: trimmedLocation,
        matchType: trimmedMatchType
      });
      return res.status(400).json({ 
        message: 'Missing required fields: name, date, time, location, and matchType are required' 
      });
    }

    // Validate match type and set default max players if not provided
    // Use provided maxPlayers or default to 22 if not specified
    const finalMaxPlayers = maxPlayers && Number(maxPlayers) > 0 ? Number(maxPlayers) : 22;

    // Validate date
    const matchDate = new Date(date);
    if (isNaN(matchDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (matchDate < new Date()) {
      return res.status(400).json({ message: 'Match date cannot be in the past' });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(trimmedTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM format' });
    }

    console.log('Creating match with data:', {
      name: trimmedName,
      date: matchDate,
      time: trimmedTime,
      location: trimmedLocation,
      matchType: trimmedMatchType,
      maxPlayers: finalMaxPlayers,
      description: trimmedDescription
    });

    const match = await Match.create({
      name: trimmedName,
      date: matchDate,
      time: trimmedTime,
      location: trimmedLocation,
      matchType: trimmedMatchType,
      maxPlayers: finalMaxPlayers,
      creator: userId,
      description: trimmedDescription,
      joinedPlayers: []
    });

    console.log('Match created successfully:', match);

    const populatedMatch = await Match.findById(match._id)
      .populate('creator', 'name email')
      .populate('joinedPlayers.user', 'name email');

    res.status(201).json({ 
      message: 'Match created successfully', 
      match: populatedMatch 
    });
  } catch (error) {
    console.error('Error creating match:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error while creating match' });
  }
};

exports.joinMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { playerName, teamName, contactInfo } = req.body;
    const userId = req.user.userId;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    // Validate required fields
    if (!playerName || !contactInfo) {
      return res.status(400).json({ 
        message: 'Player name and contact info are required' 
      });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Check if match is full
    if (match.joinedPlayers.length >= match.maxPlayers) {
      return res.status(400).json({ message: 'Match is already full' });
    }

    // Check if user already joined
    const alreadyJoined = match.joinedPlayers.some(
      player => player.user.toString() === userId
    );
    if (alreadyJoined) {
      return res.status(400).json({ message: 'You have already joined this match' });
    }

    // Check if match is still upcoming
    if (match.status !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot join a match that is not upcoming' });
    }

    // Check if match date has passed
    const matchDateTime = new Date(`${match.date.toISOString().split('T')[0]}T${match.time}:00`);
    if (matchDateTime < new Date()) {
      return res.status(400).json({ message: 'Cannot join a match that has already started or passed' });
    }

    // Add player to match
    await Match.findByIdAndUpdate(id, {
      $push: {
        joinedPlayers: {
          user: userId,
          playerName,
          teamName: teamName || '',
          contactInfo
        }
      }
    });

    const updatedMatch = await Match.findById(id)
      .populate('creator', 'name email')
      .populate('joinedPlayers.user', 'name email');

    res.json({ 
      message: 'Successfully joined the match', 
      match: updatedMatch 
    });
  } catch (error) {
    console.error('Error joining match:', error);
    res.status(500).json({ message: 'Server error while joining match' });
  }
};

exports.updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, time, location, matchType, description, status } = req.body;
    const userId = req.user.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Only creator or admin can update match
    if (match.creator.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the match creator or admin can update this match' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = time;
    if (location) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    if (matchType) {
      updateData.matchType = matchType;
      // Only update maxPlayers if explicitly provided in the update
      if (req.body.maxPlayers) {
        updateData.maxPlayers = Number(req.body.maxPlayers);
      }
    }

    const updatedMatch = await Match.findByIdAndUpdate(id, updateData, { new: true })
      .populate('creator', 'name email')
      .populate('joinedPlayers.user', 'name email');

    res.json({ 
      message: 'Match updated successfully', 
      match: updatedMatch 
    });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ message: 'Server error while updating match' });
  }
};

exports.deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Only creator or admin can delete match
    if (match.creator.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the match creator or admin can delete this match' });
    }

    await Match.findByIdAndDelete(id);
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ message: 'Server error while deleting match' });
  }
};
