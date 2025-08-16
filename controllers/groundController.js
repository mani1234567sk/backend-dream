const mongoose = require('mongoose');
const Ground = require('../models/Ground');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Match = require('../models/Match');

exports.getGrounds = async (req, res) => {
  try {
    const grounds = await Ground.find().select('-__v'); 
    res.json(grounds);
  } catch (error) {
    console.error('Error fetching grounds:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createGround = async (req, res) => {
  try {
    const { name, location, size, pricePerHour, image, features, isAvailable } = req.body;

    // Validate required fields
    if (!name || !location || !size || !pricePerHour) {
      return res.status(400).json({ message: 'Missing required fields: name, location, size, and pricePerHour are required' });
    }

    // Validate pricePerHour
    const price = Number(pricePerHour);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'pricePerHour must be a positive number' });
    }

    // Handle features: convert to array if string, use as-is if array, or default to empty array
    let featureArray = [];
    if (typeof features === 'string') {
      featureArray = features.split(',').map(f => f.trim()).filter(f => f);
    } else if (Array.isArray(features)) {
      featureArray = features.map(f => String(f).trim()).filter(f => f);
    }

    const ground = await Ground.create({
      name,
      location,
      size,
      pricePerHour: price,
      image,
      features: featureArray,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true // Default to true
    });

    res.status(201).json({ message: 'Ground created successfully', ground });
  } catch (error) {
    console.error('Error creating ground:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateGround = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, size, pricePerHour, image, features, isAvailable } = req.body;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid ground ID' });
    }

    // Check if ground exists
    const ground = await Ground.findById(id);
    if (!ground) {
      return res.status(404).json({ message: 'Ground not found' });
    }

    // Validate required fields if provided
    if (name && typeof name !== 'string') {
      return res.status(400).json({ message: 'Name must be a string' });
    }
    if (location && typeof location !== 'string') {
      return res.status(400).json({ message: 'Location must be a string' });
    }
    if (size && typeof size !== 'string') {
      return res.status(400).json({ message: 'Size must be a string' });
    }
    if (pricePerHour !== undefined) {
      const price = Number(pricePerHour);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({ message: 'pricePerHour must be a positive number' });
      }
      ground.pricePerHour = price;
    }

    // Handle features
    let featureArray = ground.features;
    if (features !== undefined) {
      if (typeof features === 'string') {
        featureArray = features.split(',').map(f => f.trim()).filter(f => f);
      } else if (Array.isArray(features)) {
        featureArray = features.map(f => String(f).trim()).filter(f => f);
      } else {
        featureArray = [];
      }
    }

    // Update fields if provided
    ground.name = name !== undefined ? name : ground.name;
    ground.location = location !== undefined ? location : ground.location;
    ground.size = size !== undefined ? size : ground.size;
    ground.image = image !== undefined ? image : ground.image;
    ground.features = featureArray;
    ground.isAvailable = isAvailable !== undefined ? Boolean(isAvailable) : ground.isAvailable;

    // Save the updated ground
    const updatedGround = await ground.save();
    res.status(200).json({ message: 'Ground updated successfully', ground: updatedGround });
  } catch (error) {
    console.error('Error updating ground:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteGround = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid ground ID' });
    }

    // Check if ground exists
    const ground = await Ground.findById(id);
    if (!ground) {
      return res.status(404).json({ message: 'Ground not found' });
    }

    // Check for related bookings or matches
    const bookings = await Booking.find({ ground: id });
    const matches = await Match.find({ location: ground.name }); // Assuming location is ground name
    if (bookings.length > 0 || matches.length > 0) {
      return res.status(400).json({ message: 'Cannot delete ground with active bookings or matches' });
    }

    // Delete associated reviews
    await Review.deleteMany({ ground: id });

    // Delete the ground
    await Ground.findByIdAndDelete(id);
    res.status(200).json({ message: 'Ground deleted successfully' });
  } catch (error) {
    console.error('Error deleting ground:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid ground ID' });
    }

    const reviews = await Review.find({ ground: id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid ground ID' });
    }

    const ratingNum = Number(rating);
    if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }

    // Check if ground exists
    const ground = await Ground.findById(id);
    if (!ground) {
      return res.status(404).json({ message: 'Ground not found' });
    }

    const review = await Review.create({
      user: userId,
      ground: id,
      rating: ratingNum,
      comment: comment || '' // Allow empty comments
    });

    // Calculate average rating
    const reviews = await Review.find({ ground: id });
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length || 0;

    // Update ground with new average rating and review count
    await Ground.findByIdAndUpdate(id, {
      averageRating,
      reviewCount: reviews.length
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

