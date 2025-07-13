const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  captain: { type: String, required: true },
  password: { type: String, required: true },
  logo: String,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentLeague: { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);