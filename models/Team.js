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
  // Add teamName field to handle legacy data and maintain compatibility
  teamName: {
    type: String,
    sparse: true
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
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please provide a valid email address'
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

// Add indexes for better query performance
teamSchema.index({ name: 1 });
teamSchema.index({ email: 1 });
// Add teamName index to handle legacy data
teamSchema.index({ teamName: 1 });

// Pre-save middleware to ensure data consistency
teamSchema.pre('save', function(next) {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
    // Keep teamName in sync with name for backward compatibility
    this.teamName = null; // Set to null to avoid duplicate key issues
  }
  if (this.captain) {
    this.captain = this.captain.trim().replace(/\s+/g, ' ');
  }
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.logo) {
    this.logo = this.logo.trim();
  }
  next();
});

module.exports = mongoose.model('Team', teamSchema);
