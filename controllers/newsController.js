const mongoose = require('mongoose');
const News = require('../models/News');

exports.createNews = async (req, res) => {
  try {
    console.log('Full request body:', req.body); // Debug log
    console.log('Request headers:', req.headers); // Debug log
    
    const { type, content } = req.body;
    
    // Validate required fields
    if (!type || typeof type !== 'string' || type.trim() === '') {
      return res.status(400).json({ message: 'Type is required and must be a non-empty string' });
    }
    
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ message: 'Content is required and must be a non-empty string' });
    }
    
    // Validate type enum
    if (!['text', 'image', 'video'].includes(type.trim())) {
      return res.status(400).json({ message: 'Type must be text, image, or video' });
    }
    
    console.log('Validated data:', { type: type.trim(), content: content.trim() });
    
    const news = await News.create({ type, content });
    console.log('News created successfully:', news);
    res.status(201).json({ message: 'News created successfully', news });
  } catch (error) {
    console.error('Error creating news:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation failed: ' + validationErrors.join(', ') });
    }
    res.status(500).json({ message: 'Server error while creating news' });
  }
};

exports.getNews = async (req, res) => {
  try {
    const news = await News.find().select('-__v');
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content } = req.body;

    console.log('Update request body:', req.body); // Debug log

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }

    if (!type || !content) {
      return res.status(400).json({ message: 'Type and content are required' });
    }

    if (!['text', 'image', 'video'].includes(type)) {
      return res.status(400).json({ message: 'Type must be text, image, or video' });
    }

    const news = await News.findByIdAndUpdate(
      id,
      { type, content },
      { new: true, runValidators: true }
    );

    if (!news) {
      return res.status(404).json({ message: 'News item not found' });
    }

    res.json({ message: 'News updated successfully', news });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }
    
    const news = await News.findByIdAndDelete(id);
    if (!news) {
      return res.status(404).json({ message: 'News item not found' });
    }
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting news:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid news ID format' });
    }
    res.status(500).json({ message: 'Server error while deleting news' });
  }
};
