import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    console.log('Fetching profile for user ID:', req.user._id);
    
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      console.log('User not found in database for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User profile found:', user.username);
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ 
      message: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

// Find user by unique code
router.get('/find/:code', protect, async (req, res) => {
  try {
    const user = await User.findOne({ uniqueCode: req.params.code }).select('_id username name roleDescription');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this code' });
    }
    
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if current user has sent a connection request to another user
router.get('/check-request/:userId', protect, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if target user has a pending connection from current user
    const isRequested = targetUser.pendingConnections.includes(req.user._id);
    
    res.status(200).json({ isRequested });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request connection with another user
router.post('/connect/:userId', protect, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.userId) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }
    
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if connection already exists
    if (targetUser.connections.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already connected with this user' });
    }
    
    // Check if connection is already pending
    if (targetUser.pendingConnections.includes(req.user._id)) {
      return res.status(400).json({ message: 'Connection request already sent' });
    }
    
    // Add current user to target user's pending connections
    await User.findByIdAndUpdate(req.params.userId, {
      $push: { pendingConnections: req.user._id }
    });
    
    res.status(200).json({ message: 'Connection request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept connection request
router.put('/accept/:userId', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    // Check if request exists in pending connections
    if (!currentUser.pendingConnections.includes(req.params.userId)) {
      return res.status(400).json({ message: 'No pending connection request from this user' });
    }
    
    // Add users to each other's connections
    await User.findByIdAndUpdate(req.user._id, {
      $push: { connections: req.params.userId },
      $pull: { pendingConnections: req.params.userId }
    });
    
    await User.findByIdAndUpdate(req.params.userId, {
      $push: { connections: req.user._id }
    });
    
    res.status(200).json({ message: 'Connection accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all connections
router.get('/connections', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('connections', '_id username name roleDescription')
      .populate('pendingConnections', '_id username name roleDescription');
    
    res.status(200).json({
      connections: user.connections,
      pendingConnections: user.pendingConnections
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user public profile by ID
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findById(userId).select('-password -email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the requesting user is connected with this user
    const currentUser = await User.findById(req.user._id);
    const isConnected = currentUser.connections.includes(userId);
    
    if (!isConnected && userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You must be connected with this user to view their profile' });
    }
    
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 