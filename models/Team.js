const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  captain: { type: String, required: true },
  password: { type: String, required: true },
  logo: String,
  email: String,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentLeague: { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Create index on name field instead of teamName
teamSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
