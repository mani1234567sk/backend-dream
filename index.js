const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Routes
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const groundRoutes = require('./routes/groundRoutes');
const leagueRoutes = require('./routes/leagueRoutes');
const newsRoutes = require('./routes/newsRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const matchRoutes = require('./routes/matchroutes');

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchroutes);

// Initialize default admin user
const User = require('./models/User');
const Ground = require('./models/Ground');
const News = require('./models/News');

const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@dreamarena.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin',
        email: 'admin@dreamarena.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

const initializeData = async () => {
  try {
    await createDefaultAdmin();
    
    const groundCount = await Ground.countDocuments();
    if (groundCount === 0) {
      const sampleGrounds = [
        {
          name: 'Dream Arena Stadium',
          location: 'Downtown Sports Complex',
          size: '11v11',
          pricePerHour: 100,
          image: 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg',
          features: ['Floodlights', 'Changing Rooms', 'Parking', 'Refreshments'],
          isAvailable: true
        },
        {
          name: 'Green Field Ground',
          location: 'North Park Area',
          size: '7v7',
          pricePerHour: 75,
          image: 'https://images.pexels.com/photos/1171084/pexels-photo-1171084.jpeg',
          features: ['Natural Grass', 'Seating Area', 'Parking'],
          isAvailable: true
        }
      ];
      await Ground.insertMany(sampleGrounds);
      console.log('Sample grounds created');
    }

    const newsCount = await News.countDocuments();
    if (newsCount === 0) {
      const sampleNews = [
        {
          type: 'text',
          content: 'Welcome to Dream Arena! Book your favorite football ground and enjoy the game with your team.'
        },
        {
          type: 'image',
          content: 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg'
        }
      ];
      await News.insertMany(sampleNews);
      console.log('Sample news created');
    }

    // Initialize sample matches if none exist
    const Match = require('./models/Match');
    const matchCount = await Match.countDocuments();
    if (matchCount === 0) {
      // Get admin user for sample matches
      const adminUser = await User.findOne({ email: 'admin@dreamarena.com' });
      if (adminUser) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const sampleMatches = [
          {
            name: 'Friday Night Football',
            date: tomorrow,
            time: '19:00',
            location: 'Dream Arena Stadium',
            matchType: '11v11',
            maxPlayers: 22,
            creator: adminUser._id,
            description: 'Join us for an exciting Friday night match!',
            joinedPlayers: []
          },
          {
            name: 'Weekend Kickabout',
            date: nextWeek,
            time: '15:00',
            location: 'Green Field Ground',
            matchType: '7v7',
            maxPlayers: 14,
            creator: adminUser._id,
            description: 'Casual weekend match for all skill levels.',
            joinedPlayers: []
          }
        ];
        
        await Match.insertMany(sampleMatches);
        console.log('Sample matches created');
      }
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeData();
});
