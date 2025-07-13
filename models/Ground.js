const mongoose = require('mongoose');

const groundSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  size: { type: String, required: true },
  pricePerHour: { type: Number, required: true },
  image: String,
  features: [String],
  isAvailable: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ground', groundSchema);