const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'team', 'admin'], default: 'customer' },
  height: String,
  position: String,
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamName: String, // Store team name for easy access
  profileImage: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
