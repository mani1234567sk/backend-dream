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

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

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
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeData();
});