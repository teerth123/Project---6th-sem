import express from 'express';
import { 
  saveVideoTracking, 
  getVideoTracking, 
  getUserVideoTrackings, 
  getVideoAnalytics 
} from '../controllers/videoTrackingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Save video tracking data
router.post('/', protect, saveVideoTracking);

// Get video tracking data for a specific video
router.get('/:videoId', protect, getVideoTracking);

// Get all video tracking data for a user
router.get('/', protect, getUserVideoTrackings);

// Get video analytics (admin only)
router.get('/analytics/:videoId', protect, admin, getVideoAnalytics);

export default router; 