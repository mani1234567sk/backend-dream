const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  matchType: { type: String, required: true },
  maxPlayers: { type: Number, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedPlayers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    playerName: String,
    teamName: String,
    contactInfo: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

// Add index for better query performance
matchSchema.index({ date: 1, time: 1 });
matchSchema.index({ creator: 1 });
matchSchema.index({ status: 1 });

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
