import React, { useRef, useEffect, useState } from 'react';
import { useVideoTracking } from '../context/VideoTrackingContext';

const TrackedVideoPlayer = ({ 
  src, 
  videoId, 
  poster = null, 
  controls = true,
  autoPlay = false,
  className = '',
  onEnded = () => {},
}) => {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previousTime, setPreviousTime] = useState(0);
  
  const { 
    initVideoTracking,
    trackPlay,
    trackPause,
    trackSeek,
    trackCompletion,
    updateTracking
  } = useVideoTracking();
  
  // Initialize tracking when component mounts
  useEffect(() => {
    const uniqueId = videoId || src.split('/').pop().split('.')[0];
    initVideoTracking(uniqueId);
  }, [videoId, src, initVideoTracking]);
  
  // Setup video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const uniqueId = videoId || src.split('/').pop().split('.')[0];
    
    const handlePlay = () => {
      trackPlay(uniqueId, video.currentTime);
    };
    
    const handlePause = () => {
      trackPause(uniqueId, video.currentTime);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      updateTracking(uniqueId, video.currentTime);
    };
    
    const handleSeeking = () => {
      if (Math.abs(video.currentTime - previousTime) > 1) {
        trackSeek(uniqueId, previousTime, video.currentTime);
      }
      setPreviousTime(video.currentTime);
    };
    
    const handleEnded = () => {
      trackCompletion(uniqueId, video.duration);
      onEnded();
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Store initial time
    setPreviousTime(video.currentTime);
    
    // Cleanup
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, src, videoId, trackPlay, trackPause, updateTracking, trackSeek, trackCompletion, onEnded, previousTime]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={controls}
        autoPlay={autoPlay}
        className={`w-full rounded-md ${className}`}
      />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
        <div 
          className="h-full bg-indigo-600" 
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default TrackedVideoPlayer; 