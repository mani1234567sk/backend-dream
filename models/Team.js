const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  captain: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  logo: { 
    type: String, 
    default: 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg'
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
    default: 0 
  },
  wins: { 
    type: Number, 
    default: 0 
  },
  losses: { 
    type: Number, 
    default: 0 
  },
  draws: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Keep email index as sparse and unique (for optional email field)
teamSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Team', teamSchema);

