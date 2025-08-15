const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const authMiddleware = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: './uploads/team-logos/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb('Error: Images only!');
  }
});

// List all teams with populated fields
router.get('/', authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('captain', 'username')
      .populate('players', 'username')
      .populate('currentLeague', 'name');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new team
router.post('/', 
  [
    authMiddleware,
    upload.single('logo'),
    check('name', 'Name is required').not().isEmpty(),
    check('password', 'Password is required').isLength({ min: 6 }),
    check('captain', 'Captain is required').isMongoId()
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const team = new Team({
        name: req.body.name,
        captain: req.body.captain,
        password: req.body.password,
        logo: req.file ? req.file.path : req.body.logo || '',
        players: req.body.players ? JSON.parse(req.body.players) : [],
        currentLeague: req.body.currentLeague || null,
        matchesPlayed: parseInt(req.body.matchesPlayed) || 0,
        wins: parseInt(req.body.wins) || 0
      });

      const newTeam = await team.save();
      const populatedTeam = await Team.findById(newTeam._id)
        .populate('captain', 'username')
        .populate('players', 'username')
        .populate('currentLeague', 'name');
      res.status(201).json(populatedTeam);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: `A team with this ${Object.keys(err.keyValue)[0]} already exists` });
      }
      res.status(400).json({ message: err.message });
    }
  }
);

// Update a team
router.put('/:id', 
  [
    authMiddleware,
    upload.single('logo'),
    check('name', 'Name is required').optional().not().isEmpty(),
    check('password', 'Password must be at least 6 characters').optional().isLength({ min: 6 })
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updates = {
        name: req.body.name,
        captain: req.body.captain,
        ...(req.body.password && { password: req.body.password }),
        logo: req.file ? req.file.path : req.body.logo,
        players: req.body.players ? JSON.parse(req.body.players) : undefined,
        currentLeague: req.body.currentLeague || undefined,
        matchesPlayed: req.body.matchesPlayed ? parseInt(req.body.matchesPlayed) : undefined,
        wins: req.body.wins ? parseInt(req.body.wins) : undefined
      };

      // Remove undefined fields
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      const team = await Team.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      )
      .populate('captain', 'username')
      .populate('players', 'username')
      .populate('currentLeague', 'name');

      if (!team) return res.status(404).json({ message: 'Team not found' });
      res.json(team);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: `A team with this ${Object.keys(err.keyValue)[0]} already exists` });
      }
      res.status(400).json({ message: err.message });
    }
  }
);

// Delete a team
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
