const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image', 'video'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('News', newsSchema);