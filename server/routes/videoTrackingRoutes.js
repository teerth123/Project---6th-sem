// routes/videoTrackingRoutes.js

import express from 'express';
import {
    saveVideoTracking,          // Saves tracking data (likely for the viewer)
    getVideoTracking,         // Gets specific tracking data (whose? Needs controller logic clarification)
    getUserVideoTrackings,    // Gets all tracking for the logged-in user
    getVideoAnalytics,        // Gets aggregated analytics (likely admin only)
    getReceiverVideoAnalytics // <<< NEW controller function needed
} from '../controllers/videoTrackingController.js'; // <<< Make sure to add the new controller function here
import { protect, admin } from '../middleware/authMiddleware.js'; // Assuming 'protect' verifies login

const router = express.Router();

// --- Existing Routes (Consider renaming for clarity if needed) ---

// POST /api/video-tracking/
// Save video tracking data (for the currently logged-in user watching the video)
router.post('/', protect, saveVideoTracking);

// GET /api/video-tracking/my-data  (Example of clearer naming)
// Get all video tracking data created BY the logged-in user
router.get('/my-data', protect, getUserVideoTrackings);

// GET /api/video-tracking/my-data/:videoId (Example of clearer naming)
// Get tracking data for a specific video created BY the logged-in user
// NOTE: Verify the logic in `getVideoTracking` controller. If it's not for 'my-data', adjust accordingly.
router.get('/my-data/:videoId', protect, getVideoTracking);

// GET /api/video-tracking/admin-analytics/:videoId (Example of clearer naming)
// Get aggregated video analytics (ADMIN ONLY)
router.get('/admin-analytics/:videoId', protect, admin, getVideoAnalytics);


// --- NEW Route for Sender to View Receiver Analytics ---

// GET /api/video-tracking/receiver/:videoId?messageId=<message_id>
// Gets the tracking data for the RECEIVER of a specific video message.
// Requires videoId in path and messageId in query string.
// Access granted only if the requesting user (req.user) is the SENDER of the specified message.
router.get(
    '/receiver/:videoId',     // Unique path identifying the video
    protect,                  // Ensures user is logged in (req.user is available)
                              // NO 'admin' middleware here
    getReceiverVideoAnalytics // <<< Use the new controller function
);

export default router;