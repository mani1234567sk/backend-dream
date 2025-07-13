const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid authorization header format. Must start with "Bearer "' });
    }

    // Extract token after 'Bearer '
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if token exists and is not empty
    if (!token || token.trim() === '') {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Check if token looks like a valid JWT (has 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      } else {
        return res.status(401).json({ message: 'Token verification failed' });
      }
    }

    // Check if decoded token has required fields
    if (!decoded.userId || !decoded.email) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Find user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || user.role
    };

    next();
  } catch (error) {
    console.error('Error in authenticateToken middleware:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};