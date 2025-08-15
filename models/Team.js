const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  password: { type: String, required: true },
  logo: { type: String, default: '' },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentLeague: { type: mongoose.Schema.Types.ObjectId, ref: 'League', default: null },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
TeamSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('Team', TeamSchema);
