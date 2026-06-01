const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // 1. Check for Passport Session Authentication first
    if (req.isAuthenticated && req.isAuthenticated()) {
      if (req.user && req.user.isActive) {
        return next();
      } else if (req.user && !req.user.isActive) {
        return res.status(401).json({ message: 'Your account is no longer active. Please contact support.' });
      }
    }

    // 2. Fallback to JWT Header Authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token missing. Please log in again.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2026');
    
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Your account is no longer active. Please contact support.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid authentication token. Please log in again.' });
    }
    return res.status(401).json({ message: 'Authentication failed. Please log in again.' });
  }
};