const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Team name cannot be empty'
    }
  },
  captain: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Captain name cannot be empty'
    }
  },
  password: { type: String, required: true },
  logo: { 
    type: String,
    trim: true
  },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentLeague: { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Add a compound index for better query performance
teamSchema.index({ name: 1 });

// Pre-save middleware to ensure data consistency
teamSchema.pre('save', function(next) {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }
  if (this.captain) {
    this.captain = this.captain.trim().replace(/\s+/g, ' ');
  }
  if (this.logo) {
    this.logo = this.logo.trim();
  }
  next();
});

module.exports = mongoose.model('Team', teamSchema);
