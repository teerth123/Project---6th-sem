import VideoTracking from '../models/VideoTracking.js';

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
      interactions 
    } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    // Check if there's an existing tracking record for this user and video
    let tracking = await VideoTracking.findOne({
      userId: req.user._id,
      videoId
    });

    if (tracking) {
      // Update existing record
      tracking.totalWatchTime = Math.max(tracking.totalWatchTime, totalWatchTime || 0);
      tracking.watchPercentage = Math.max(tracking.watchPercentage, watchPercentage || 0);
      tracking.completed = tracking.completed || completed || false;
      
      // Add new segments if provided
      if (segments && segments.length) {
        tracking.segments.push(...segments);
      }
      
      // Add new interactions if provided
      if (interactions && interactions.length) {
        tracking.interactions.push(...interactions);
      }
      
      tracking.watchDate = new Date(); // Update the watch date
      
      await tracking.save();
      
      res.status(200).json({ 
        message: 'Video tracking data updated successfully', 
        tracking 
      });
    } else {
      // Create new record
      tracking = new VideoTracking({
        videoId,
        userId: req.user._id,
        totalWatchTime: totalWatchTime || 0,
        watchPercentage: watchPercentage || 0,
        completed: completed || false,
        segments: segments || [],
        interactions: interactions || [],
      });
      
      await tracking.save();
      
      res.status(201).json({ 
        message: 'Video tracking data saved successfully', 
        tracking 
      });
    }
  } catch (err) {
    console.error('Error saving video tracking data:', err);
    res.status(500).json({ 
      message: 'Server error during saving video tracking data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get video tracking data for a specific video
// @route   GET /api/video-tracking/:videoId
// @access  Private
export const getVideoTracking = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const tracking = await VideoTracking.findOne({
      userId: req.user._id,
      videoId
    });
    
    if (!tracking) {
      return res.status(404).json({ message: 'No tracking data found for this video' });
    }
    
    res.status(200).json(tracking);
  } catch (err) {
    console.error('Error getting video tracking data:', err);
    res.status(500).json({ 
      message: 'Server error during getting video tracking data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get all video tracking data for a user
// @route   GET /api/video-tracking
// @access  Private
export const getUserVideoTrackings = async (req, res) => {
  try {
    const trackings = await VideoTracking.find({
      userId: req.user._id
    }).sort({ watchDate: -1 });
    
    res.status(200).json(trackings);
  } catch (err) {
    console.error('Error getting user video trackings:', err);
    res.status(500).json({ 
      message: 'Server error during getting user video trackings',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get video analytics (admin only)
// @route   GET /api/video-tracking/analytics/:videoId
// @access  Private/Admin
export const getVideoAnalytics = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const trackings = await VideoTracking.find({ videoId });
    
    if (!trackings.length) {
      return res.status(404).json({ message: 'No tracking data found for this video' });
    }
    
    // Calculate analytics
    const analytics = {
      totalViews: trackings.length,
      averageWatchTime: trackings.reduce((acc, curr) => acc + curr.totalWatchTime, 0) / trackings.length,
      completionRate: (trackings.filter(t => t.completed).length / trackings.length) * 100,
      averageWatchPercentage: trackings.reduce((acc, curr) => acc + curr.watchPercentage, 0) / trackings.length,
      // Create a heatmap of video segments
      segmentHeatmap: generateHeatmap(trackings),
      // Most common pause points
      commonPausePoints: findCommonPausePoints(trackings),
      // Most common skip sections
      commonSkipSections: findCommonSkipSections(trackings)
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

// Helper function to generate heatmap from tracking data
const generateHeatmap = (trackings) => {
  // Divide video into 100 segments (percentiles)
  const heatmap = Array(100).fill(0);
  
  trackings.forEach(tracking => {
    tracking.segments.forEach(segment => {
      // Convert time ranges to percentiles and increment those sections
      const startPercentile = Math.floor(segment.start * 100);
      const endPercentile = Math.floor(segment.end * 100);
      
      for (let i = startPercentile; i <= endPercentile && i < 100; i++) {
        heatmap[i]++;
      }
    });
  });
  
  return heatmap;
};

// Helper function to find common pause points
const findCommonPausePoints = (trackings) => {
  // Group pauses by time ranges (every 5 seconds)
  const pausePoints = {};
  
  trackings.forEach(tracking => {
    tracking.interactions
      .filter(interaction => interaction.type === 'pause')
      .forEach(pause => {
        const timeKey = Math.floor(pause.videoTime / 5) * 5;
        if (!pausePoints[timeKey]) {
          pausePoints[timeKey] = 0;
        }
        pausePoints[timeKey]++;
      });
  });
  
  // Convert to array and sort by frequency
  return Object.entries(pausePoints)
    .map(([time, count]) => ({ 
      timeRange: `${time}-${Number(time) + 5}s`, 
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 most common
};

// Helper function to find common skip sections
const findCommonSkipSections = (trackings) => {
  // Group seeks by from-to ranges
  const skipSections = {};
  
  trackings.forEach(tracking => {
    tracking.interactions
      .filter(interaction => interaction.type === 'seek' && interaction.from < interaction.to)
      .forEach(seek => {
        const fromKey = Math.floor(seek.from / 10) * 10;
        const toKey = Math.floor(seek.to / 10) * 10;
        
        const key = `${fromKey}-${toKey}`;
        if (!skipSections[key]) {
          skipSections[key] = 0;
        }
        skipSections[key]++;
      });
  });
  
  // Convert to array and sort by frequency
  return Object.entries(skipSections)
    .map(([range, count]) => ({
      range,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 most common
}; 