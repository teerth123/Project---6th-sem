import React, { useState, useEffect, useContext } from 'react';
import TrackedVideoPlayer from './TrackedVideoPlayer';
import { useVideoTracking } from '../context/VideoTrackingContext';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const VideoMessage = ({ message, isMyMessage }) => {
  const [showStats, setShowStats] = useState(false);
  const { videoStats } = useVideoTracking();
  const { currentUser } = useContext(AuthContext);
  
  // Extract video ID from the URL
  const videoId = message.fileUrl?.split('/').pop().split('.')[0] || `video-${message._id}`;
  
  // Get stats for this specific video
  const stats = videoStats[videoId] || {};
  
  const formattedTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`flex flex-col max-w-[80%] ${isMyMessage ? 'ml-auto' : ''}`}>
      <div className={`rounded-lg p-2 ${isMyMessage ? 'bg-indigo-100' : 'bg-white border'}`}>
        <div className="w-64 sm:w-80 md:w-96">
          <TrackedVideoPlayer
            src={message.fileUrl}
            videoId={videoId}
            controls={true}
            className="rounded-md"
          />
          
          {showStats && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <h4 className="font-semibold text-gray-700">Your Viewing Stats:</h4>
              <p>Watch time: {formattedTime(stats.totalWatchTime || 0)}</p>
              <p>Played: {stats.pauses?.filter(p => p.action === 'play').length || 0} times</p>
              <p>Paused: {stats.pauses?.filter(p => p.action === 'pause').length || 0} times</p>
              <p>Seeks: {stats.seeks?.length || 0}</p>
              <p>Completed: {stats.completed ? 'Yes' : 'No'}</p>
            </div>
          )}
          
          <div className="flex gap-2 mt-1">
            <button 
              onClick={() => setShowStats(prev => !prev)}
              className="text-xs text-gray-500 hover:text-indigo-600"
            >
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            
            {currentUser?.isAdmin && (
              <Link 
                to={`/video-analytics/${videoId}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                View Analytics
              </Link>
            )}
          </div>
        </div>
      </div>
      <span className={`text-xs text-gray-500 mt-1 ${isMyMessage ? 'text-right' : ''}`}>
        {new Date(message.createdAt).toLocaleTimeString()}
      </span>
    </div>
  );
};

export default VideoMessage; 