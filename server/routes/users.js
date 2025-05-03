import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

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

// Special route to find a user by code for the search feature
// Route needs to be before /:id to avoid conflict
router.get('/find-by-code/:code', protect, async (req, res) => {
  try {
    // Format code by removing spaces and hyphens
    const code = req.params.code.toUpperCase().replace(/[\s-]/g, '');
    const user = await User.findOne({ uniqueCode: code });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this code' });
    }
    
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      uniqueCode: user.uniqueCode,
      roleDescription: user.roleDescription,
      userType: user.userType,
      location: user.location,
      typeOfService: user.typeOfService,
      workExperience: user.workExperience,
      yearsOfExperience: user.yearsOfExperience,
      specializedSkills: user.specializedSkills,
      shortBio: user.shortBio
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get service providers
// @route   GET /api/users/service-providers
// @access  Public
router.get('/service-providers', async (req, res) => {
  try {
    const serviceProviders = await User.find({ 
      userType: 'service_provider'
    }).select('-password -isAdmin -pendingConnections -connections');
    
    res.json(serviceProviders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user connections and pending connections
// @route   GET /api/users/connections
// @access  Private
router.get('/connections', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('connections', '_id username name uniqueCode roleDescription')
      .populate('pendingConnections', '_id username name uniqueCode roleDescription');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      connections: user.connections,
      pendingConnections: user.pendingConnections
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Search users by name or username
// @route   GET /api/users/search
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude the current user
    }).select('_id username name uniqueCode roleDescription userType location typeOfService');
    
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Find user by unique code
// @route   GET /api/users/code/:code
// @access  Private
router.get('/code/:code', protect, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().replace(/[\s-]/g, '');
    const user = await User.findOne({ uniqueCode: code });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with that code' });
    }
    
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      uniqueCode: user.uniqueCode,
      roleDescription: user.roleDescription
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      uniqueCode: user.uniqueCode,
      roleDescription: user.roleDescription,
      userType: user.userType,
      location: user.location,
      typeOfService: user.typeOfService,
      workExperience: user.workExperience,
      yearsOfExperience: user.yearsOfExperience,
      specializedSkills: user.specializedSkills,
      shortBio: user.shortBio
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Send connection request
// @route   POST /api/users/connect
// @access  Private
router.post('/connect', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check if valid ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Cannot connect to yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot connect with yourself' });
    }
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already connected
    if (targetUser.connections.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already connected with this user' });
    }
    
    // Check if already in pending
    if (targetUser.pendingConnections.includes(req.user._id)) {
      return res.status(400).json({ message: 'Connection request already sent' });
    }
    
    // Check for reciprocal pending connection (user has already sent you a request)
    const currentUser = await User.findById(req.user._id);
    if (currentUser.pendingConnections.includes(userId)) {
      // If the other user already sent a request, accept it instead
      currentUser.pendingConnections = currentUser.pendingConnections.filter(
        id => id.toString() !== userId
      );
      currentUser.connections.push(userId);
      
      targetUser.pendingConnections = targetUser.pendingConnections.filter(
        id => id.toString() !== req.user._id.toString()
      );
      targetUser.connections.push(req.user._id);
      
      await currentUser.save();
      await targetUser.save();
      
      return res.status(200).json({ message: 'Connection established' });
    }
    
    // Send new connection request
    targetUser.pendingConnections.push(req.user._id);
    await targetUser.save();
    
    res.status(200).json({ message: 'Connection request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Accept/Reject connection request
// @route   PUT /api/users/connection-request
// @access  Private
router.put('/connection-request', protect, async (req, res) => {
  try {
    const { userId, action } = req.body;
    
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    
    const currentUser = await User.findById(req.user._id);
    
    // Check if the request exists
    if (!currentUser.pendingConnections.includes(userId)) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }
    
    // Remove from pending connections
    currentUser.pendingConnections = currentUser.pendingConnections.filter(
      id => id.toString() !== userId
    );
    
    if (action === 'accept') {
      // Add to connections
      currentUser.connections.push(userId);
      
      // Update the other user's connections too
      const otherUser = await User.findById(userId);
      otherUser.connections.push(req.user._id);
      await otherUser.save();
    }
    
    await currentUser.save();
    
    res.json({ 
      message: action === 'accept' ? 'Connection accepted' : 'Connection rejected',
      action
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get("/all", protect, async(req, res) => {
  const user = await User.find({}).select('_id username name uniqueCode roleDescription createdAt');;

  res.json({
    users : user
  })
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