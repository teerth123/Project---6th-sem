import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const VideoTrackingContext = createContext();

export const VideoTrackingProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [videoStats, setVideoStats] = useState({});

  // Initialize tracking for a video
  const initVideoTracking = (videoId) => {
    if (!videoStats[videoId]) {
      setVideoStats(prev => ({
        ...prev,
        [videoId]: {
          totalWatchTime: 0,
          segments: [],
          pauses: [],
          seeks: [],
          completed: false,
          startTime: Date.now(),
          lastUpdate: Date.now(),
          isPlaying: false,
        }
      }));
    }
    return videoId;
  };

  // Track when video starts playing
  const trackPlay = (videoId, currentTime) => {
    if (!videoStats[videoId]) return;
    
    setVideoStats(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        isPlaying: true,
        lastUpdate: Date.now(),
        pauses: [...prev[videoId].pauses, {
          action: 'play',
          time: currentTime,
          timestamp: Date.now()
        }]
      }
    }));
  };

  // Track when video is paused
  const trackPause = (videoId, currentTime) => {
    if (!videoStats[videoId]) return;
    
    const now = Date.now();
    const elapsed = prev => prev[videoId].isPlaying ? 
      (now - prev[videoId].lastUpdate) / 1000 : 0;
    
    setVideoStats(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        isPlaying: false,
        lastUpdate: now,
        totalWatchTime: prev[videoId].totalWatchTime + elapsed(prev),
        pauses: [...prev[videoId].pauses, {
          action: 'pause',
          time: currentTime,
          timestamp: now
        }]
      }
    }));
  };

  // Track seeking in video
  const trackSeek = (videoId, previousTime, newTime) => {
    if (!videoStats[videoId]) return;
    
    setVideoStats(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        seeks: [...prev[videoId].seeks, {
          from: previousTime,
          to: newTime,
          timestamp: Date.now()
        }]
      }
    }));
  };

  // Track segment watched
  const trackSegmentWatch = (videoId, start, end) => {
    if (!videoStats[videoId]) return;
    
    setVideoStats(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        segments: [...prev[videoId].segments, { start, end }]
      }
    }));
  };

  // Track video completion
  const trackCompletion = (videoId, duration) => {
    if (!videoStats[videoId]) return;
    
    setVideoStats(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        completed: true,
        totalWatchTime: prev[videoId].totalWatchTime + 
          (prev[videoId].isPlaying ? 
            (Date.now() - prev[videoId].lastUpdate) / 1000 : 0)
      }
    }));
    
    // Save stats on completion
    saveVideoStats(videoId, duration);
  };

  // Update tracking on time update
  const updateTracking = (videoId, currentTime) => {
    if (!videoStats[videoId] || !videoStats[videoId].isPlaying) return;
    
    const now = Date.now();
    const elapsed = (now - videoStats[videoId].lastUpdate) / 1000;
    
    if (elapsed > 0.5) { // Update every half second
      setVideoStats(prev => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          lastUpdate: now,
          totalWatchTime: prev[videoId].totalWatchTime + elapsed
        }
      }));
    }
  };

  // Save video stats to the server
  const saveVideoStats = async (videoId, duration) => {
    if (!currentUser || !videoStats[videoId]) return;
    
    try {
      const stats = videoStats[videoId];
      const processedStats = {
        videoId,
        userId: currentUser._id,
        totalWatchTime: stats.totalWatchTime,
        watchPercentage: Math.min((stats.totalWatchTime / duration) * 100, 100),
        completed: stats.completed,
        segments: stats.segments,
        interactions: [
          ...stats.pauses.map(p => ({ type: p.action, videoTime: p.time, timestamp: p.timestamp })),
          ...stats.seeks.map(s => ({ type: 'seek', from: s.from, to: s.to, timestamp: s.timestamp }))
        ],
        watchDate: new Date(stats.startTime)
      };
      
      await axios.post('/api/video-tracking', processedStats);
      console.log('Video stats saved successfully');
    } catch (error) {
      console.error('Error saving video stats:', error);
    }
  };

  return (
    <VideoTrackingContext.Provider value={{
      initVideoTracking,
      trackPlay,
      trackPause,
      trackSeek,
      trackSegmentWatch,
      trackCompletion,
      updateTracking,
      videoStats
    }}>
      {children}
    </VideoTrackingContext.Provider>
  );
};

export const useVideoTracking = () => useContext(VideoTrackingContext); 