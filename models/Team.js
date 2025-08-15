const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Team name must be at least 2 characters long'],
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  captain: { 
    type: String, 
    required: [true, 'Captain name is required'],
    trim: true,
    minlength: [2, 'Captain name must be at least 2 characters long'],
    maxlength: [50, 'Captain name cannot exceed 50 characters']
  },
  password: { 
    type: String, 
    required: [true, 'Team password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  logo: { 
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty string
        // Basic URL validation
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Logo must be a valid image URL'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty string
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  players: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  currentLeague: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'League' 
  },
  matchesPlayed: { 
    type: Number, 
    default: 0,
    min: [0, 'Matches played cannot be negative']
  },
  wins: { 
    type: Number, 
    default: 0,
    min: [0, 'Wins cannot be negative']
  },
  losses: { 
    type: Number, 
    default: 0,
    min: [0, 'Losses cannot be negative']
  },
  draws: { 
    type: Number, 
    default: 0,
    min: [0, 'Draws cannot be negative']
  },
  goalsFor: { 
    type: Number, 
    default: 0,
    min: [0, 'Goals for cannot be negative']
  },
  goalsAgainst: { 
    type: Number, 
    default: 0,
    min: [0, 'Goals against cannot be negative']
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes for better query performance
teamSchema.index({ name: 1 });
teamSchema.index({ captain: 1 });
teamSchema.index({ currentLeague: 1 });
teamSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
teamSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update the updatedAt field
teamSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-update middleware to update the updatedAt field
teamSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance method to check password
teamSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Virtual for win percentage
teamSchema.virtual('winPercentage').get(function() {
  if (this.matchesPlayed === 0) return 0;
  return Math.round((this.wins / this.matchesPlayed) * 100);
});

// Virtual for goal difference
teamSchema.virtual('goalDifference').get(function() {
  return this.goalsFor - this.goalsAgainst;
});

// Ensure virtual fields are serialized
teamSchema.set('toJSON', { virtuals: true });
teamSchema.set('toObject', { virtuals: true });

// Static method to find teams by league
teamSchema.statics.findByLeague = function(leagueId) {
  return this.find({ currentLeague: leagueId })
    .populate('players', 'name email position')
    .populate('currentLeague', 'name status');
};

// Static method to get team statistics
teamSchema.statics.getTeamStats = function(teamId) {
  return this.findById(teamId)
    .populate('players', 'name email position height')
    .populate('currentLeague', 'name status startDate endDate');
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
