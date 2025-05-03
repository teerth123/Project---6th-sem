// controllers/videoTrackingController.js

import VideoTracking from '../models/VideoTracking.js';
import Message from '../models/Message.js';             // <<< Import Message model
import Conversation from '../models/Conversation.js';   // <<< Import Conversation model
import User from '../models/User.js';                 // <<< Import User model (optional, for name)

// @desc    Save video tracking data
// @route   POST /api/video-tracking
// @access  Private
export const saveVideoTracking = async (req, res) => {
  try {
    const {
      videoId,
      totalWatchTime,
      watchPercentage,
      completed,
      segments,
      interactions,
      // Consider adding videoDuration from frontend if needed for percentage accuracy
    } = req.body;
    const userId = req.user._id; // The user WATCHING the video

    if (!videoId) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    // Use findOneAndUpdate for atomicity and efficiency
    const updatedTracking = await VideoTracking.findOneAndUpdate(
      { userId: userId, videoId: videoId },
      {
        $set: { // Set fields that should be overwritten or updated
          completed: completed || false, // Update completion status
          watchDate: new Date(), // Update last watched time
          // Update percentage/time only if the new value is greater
          // Using aggregation pipeline might be better for conditional max updates,
          // but $set with frontend logic to send highest value is simpler here.
          // Ensure frontend sends the CUMULATIVE watch time/percentage
          totalWatchTime: totalWatchTime || 0,
          watchPercentage: watchPercentage || 0,
        },
        $push: { // Add to arrays
          segments: { $each: segments || [] },
          interactions: { $each: interactions || [] }
        },
        $setOnInsert: { // Fields set only when creating a new document
          userId: userId,
          videoId: videoId,
        }
      },
      {
        new: true, // Return the updated document
        upsert: true, // Create if it doesn't exist
        runValidators: true // Ensure schema validation runs on update
      }
    );

    res.status(updatedTracking ? 200 : 201).json({
      message: 'Video tracking data saved/updated successfully',
      tracking: updatedTracking
    });

  } catch (err) {
    console.error('Error saving video tracking data:', err);
    res.status(500).json({
      message: 'Server error during saving video tracking data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// @desc    Get MY video tracking data for a specific video
// @route   GET /api/video-tracking/my-data/:videoId  (Example route)
// @access  Private
export const getVideoTracking = async (req, res) => {
  try {
    const { videoId } = req.params;

    const tracking = await VideoTracking.findOne({
      userId: req.user._id, // Logged-in user's data
      videoId
    });

    if (!tracking) {
      return res.status(404).json({ message: 'No tracking data found for this video for you' });
    }

    res.status(200).json(tracking);
  } catch (err) {
    console.error('Error getting your video tracking data:', err);
    res.status(500).json({
      message: 'Server error during getting your video tracking data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get all MY video tracking data
// @route   GET /api/video-tracking/my-data  (Example route)
// @access  Private
export const getUserVideoTrackings = async (req, res) => {
  try {
    const trackings = await VideoTracking.find({
      userId: req.user._id // Logged-in user's data
    }).sort({ watchDate: -1 });

    res.status(200).json(trackings);
  } catch (err) {
    console.error('Error getting your video trackings:', err);
    res.status(500).json({
      message: 'Server error during getting your video trackings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// @desc    Get video analytics for a specific video (ADMIN overview)
// @route   GET /api/video-tracking/admin-analytics/:videoId (Example route)
// @access  Private/Admin
export const getVideoAnalytics = async (req, res) => {
  // Your existing admin analytics logic seems fine.
  // No changes needed here unless desired.
  try {
    const { videoId } = req.params;

    const trackings = await VideoTracking.find({ videoId }).populate('userId', 'name'); // Populate user name

    if (!trackings || trackings.length === 0) {
      return res.status(404).json({ message: 'No tracking data found for this video' });
    }

    // Calculate analytics (simplified example)
    const analytics = {
      videoId: videoId,
      totalViews: trackings.length,
      viewers: trackings.map(t => ({ userId: t.userId._id, name: t.userId.name, completed: t.completed, watchPercentage: t.watchPercentage })),
      averageWatchTime: trackings.reduce((acc, curr) => acc + (curr.totalWatchTime || 0), 0) / trackings.length,
      completionRate: (trackings.filter(t => t.completed).length / trackings.length) * 100,
      // Add more detailed calculations if needed (heatmap, etc.)
    };

    res.status(200).json(analytics);
  } catch (err) {
    console.error('Error getting video analytics:', err);
    res.status(500).json({
      message: 'Server error during getting video analytics',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// <<<-------------------- NEW CONTROLLER FUNCTION -------------------->>>

// @desc    Get RECEIVER's video tracking analytics for a specific message
// @route   GET /api/video-tracking/receiver/:videoId?messageId=...
// @access  Private (Sender Only)
export const getReceiverVideoAnalytics = async (req, res) => {
  const { videoId } = req.params;
  const { messageId } = req.query;
  const requestingUserId = req.user._id; // ID of the user making the request (sender)

  if (!messageId) {
    return res.status(400).json({ message: 'Missing messageId query parameter.' });
  }
  if (!videoId) {
      return res.status(400).json({ message: 'Missing videoId parameter.' });
  }

  try {
    // 1. Find the message to verify sender and get conversation context
    const message = await Message.findById(messageId);
    if (!message) {
      console.log(`[Analytics Receiver] Message not found: ${messageId}`);
      return res.status(404).json({ message: 'Message context not found.' });
    }

    // 2. Verify the requesting user is the sender of this message
    if (!message.sender.equals(requestingUserId)) {
      console.log(`[Analytics Receiver] Permission Denied. Requester ${requestingUserId} is not sender ${message.sender}`);
      return res.status(403).json({ message: 'You are not authorized to view analytics for this message.' });
    }

    // 3. Find the conversation to identify the receiver(s)
    const conversation = await Conversation.findById(message.conversationId).populate('participants', 'id name'); // Populate participant names
    if (!conversation) {
      console.log(`[Analytics Receiver] Conversation not found for message: ${messageId}`);
      return res.status(404).json({ message: 'Conversation context not found.' });
    }

    // 4. Find the receiver participant(s)
    const receivers = conversation.participants.filter(
      p => !p._id.equals(requestingUserId) // Get all participants who are NOT the sender
    );

    if (receivers.length === 0) {
      // This could happen in a chat with only the sender or group chat error
      console.log(`[Analytics Receiver] No receivers found in conversation ${conversation._id} for sender ${requestingUserId}`);
      return res.status(404).json({ message: 'Could not identify receiver(s) in this conversation.' });
    }

    // --- Handle 1-on-1 vs Group Chat ---
    // For simplicity, let's focus on the FIRST receiver found in a 1-on-1 scenario.
    // If you have group chats, you might need to return an array of analytics or decide which receiver's stats to show.
    const primaryReceiver = receivers[0];
    const receiverId = primaryReceiver._id;

    console.log(`[Analytics Receiver] Querying VideoTracking for videoId: ${videoId}, receiverId: ${receiverId}`);

    // 5. Query for the primary receiver's tracking data for THIS video
    const trackingData = await VideoTracking.findOne({
      videoId: videoId,
      userId: receiverId // Find tracking data specifically for the receiver
    });

    // 6. Respond
    if (trackingData) {
      console.log('[Analytics Receiver] Found tracking data:', trackingData);
      res.status(200).json({
        // Send only the relevant fields needed by the frontend
        totalWatchTime: trackingData.totalWatchTime || 0,
        watchPercentage: trackingData.watchPercentage || 0,
        completed: trackingData.completed || false,
        lastWatchedAt: trackingData.watchDate, // Renamed from watchDate for clarity
        receiverName: primaryReceiver.name, // Send receiver name
        // You could add more fields if needed, e.g., segments viewed
      });
    } else {
      // Receiver hasn't interacted with this video, or data wasn't saved
      console.log('[Analytics Receiver] No tracking data found for receiver.');
      res.status(404).json({
        message: `${primaryReceiver.name || 'Receiver'} hasn't watched this video yet.`,
        receiverName: primaryReceiver.name // Still send name if available
      });
    }

  } catch (error) {
    console.error('[Analytics Receiver] Server error:', error);
    res.status(500).json({
      message: 'Server error fetching receiver analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// <<<-------------------- END NEW CONTROLLER FUNCTION -------------------->>>


// --- Helper functions (getVideoAnalytics uses these) ---
const generateHeatmap = (trackings) => {
    const videoDuration = Math.max(...trackings.map(t => t.totalWatchTime)); // Approximate duration
    if (!videoDuration || videoDuration === 0) return Array(100).fill(0);

    const heatmap = Array(100).fill(0);
    trackings.forEach(tracking => {
        tracking.segments.forEach(segment => {
            const startPercentile = Math.max(0, Math.min(99, Math.floor((segment.start / videoDuration) * 100)));
            const endPercentile = Math.max(0, Math.min(99, Math.floor((segment.end / videoDuration) * 100)));
            for (let i = startPercentile; i <= endPercentile; i++) {
                if (i >= 0 && i < 100) heatmap[i]++;
            }
        });
    });
    return heatmap;
};

const findCommonPausePoints = (trackings) => {
    const pausePoints = {};
    trackings.forEach(tracking => {
        (tracking.interactions || [])
            .filter(interaction => interaction.type === 'pause' && typeof interaction.videoTime === 'number')
            .forEach(pause => {
                const timeKey = Math.floor(pause.videoTime / 5) * 5; // Group by 5s intervals
                pausePoints[timeKey] = (pausePoints[timeKey] || 0) + 1;
            });
    });
    return Object.entries(pausePoints)
        .map(([time, count]) => ({ timeRange: `${time}-${Number(time) + 5}s`, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
};

const findCommonSkipSections = (trackings) => {
    const skipSections = {};
    trackings.forEach(tracking => {
        (tracking.interactions || [])
            .filter(interaction => interaction.type === 'seek' && typeof interaction.from === 'number' && typeof interaction.to === 'number' && interaction.from < interaction.to)
            .forEach(seek => {
                const fromKey = Math.floor(seek.from / 10) * 10; // Group by 10s intervals
                const toKey = Math.floor(seek.to / 10) * 10;
                if (fromKey < toKey) { // Only forward skips
                  const key = `${fromKey}s-${toKey}s`;
                  skipSections[key] = (skipSections[key] || 0) + 1;
                }
            });
    });
    return Object.entries(skipSections)
        .map(([range, count]) => ({ range, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
};

// Make sure to export the new function along with the others
// (This depends on how you structure exports, common JS vs ES modules)
// If using ES Modules like the import statements suggest:
// The 'export const ...' syntax already handles this.