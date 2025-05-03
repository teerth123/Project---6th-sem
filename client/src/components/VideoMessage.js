// src/components/VideoMessage.js

import React, { useState, useContext, useCallback } from 'react';
import axios from 'axios'; // Make sure axios is imported
import TrackedVideoPlayer from './TrackedVideoPlayer'; // Assuming this exists and works
import { AuthContext } from '../context/AuthContext';

const VideoMessage = ({ message, isMyMessage }) => {
  const { currentUser } = useContext(AuthContext);
  const [showReceiverAnalytics, setShowReceiverAnalytics] = useState(false);
  const [receiverAnalytics, setReceiverAnalytics] = useState(null); // To store fetched data
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  // Use a consistent videoId - Ensure this logic matches how videoId is saved in VideoTracking
  const videoId = message.fileUrl?.split('/').pop().split('.')[0] || `video-${message._id}`;

  // --- Function to fetch receiver analytics ---
  const fetchReceiverAnalytics = useCallback(async () => {
    // Guard clauses: Only sender can fetch, and IDs must exist
    if (!isMyMessage || !videoId || !message._id) {
        console.warn("Analytics fetch blocked: Not sender or missing IDs.");
        return;
    }

    setIsLoadingAnalytics(true);
    setAnalyticsError('');
    setReceiverAnalytics(null); // Clear previous data before fetch

    try {
      // ***** THE CORRECTED API URL IS HERE *****
      const apiUrl = `/api/video-tracking/receiver/${videoId}?messageId=${message._id}`;
      console.log("Fetching receiver analytics from:", apiUrl); // Log the URL being called
      const response = await axios.get(apiUrl);
      // ***** END OF CORRECTION *****

      // If backend sends 200 OK with data:
      // Assumes successful response has the data directly in `response.data`
      // and does NOT contain a `message` field alongside the data.
      setReceiverAnalytics(response.data);

    } catch (err) {
      console.error("Error fetching receiver analytics:", err.response || err); // Log the full error response

      // Handle specific error statuses based on backend implementation
      if (err.response?.status === 404) {
        // Use message from backend 404 response if available
        const errorMessage = err.response?.data?.message || "Receiver hasn't watched this video yet or analytics not found.";
        setReceiverAnalytics({ message: errorMessage }); // Set the specific message object
      } else if (err.response?.status === 403) {
        // Permission denied by backend (shouldn't happen if button is hidden correctly)
        setAnalyticsError("You are not authorized to view these analytics.");
        setReceiverAnalytics(null); // Clear any potential stale data
      } else {
        // Handle other errors (network, server 500, etc.)
        setAnalyticsError("Could not load receiver analytics due to a server or network issue.");
        setReceiverAnalytics(null); // Clear any potential stale data
      }
    } finally {
      setIsLoadingAnalytics(false); // Always stop loading indicator
    }
  }, [videoId, message._id, isMyMessage]); // Dependencies for useCallback

  // --- Toggle Analytics Display ---
  const handleToggleAnalytics = () => {
    // If analytics are currently shown, hide them and clear state
    if (showReceiverAnalytics) {
      setShowReceiverAnalytics(false);
      setReceiverAnalytics(null); // Clear data when hiding
      setAnalyticsError('');    // Clear error when hiding
    } else {
      // If analytics are hidden, fetch them *then* show the section
      // The fetch function handles setting receiverAnalytics or analyticsError
      fetchReceiverAnalytics().finally(() => {
         // Show the section regardless of fetch success/failure
         // The content inside will display data, message, or error based on state
         setShowReceiverAnalytics(true);
      });
    }
  };

  // --- Helper to format time ---
  const formattedTime = (seconds) => {
    if (isNaN(seconds) || seconds === null || seconds === undefined) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Helper to format percentage ---
  const formattedPercentage = (percentage) => {
    if (isNaN(percentage) || percentage === null || percentage === undefined) return '0%';
    // Ensure percentage is clamped between 0 and 100 if necessary
    const cleanPercentage = Math.max(0, Math.min(100, percentage));
    return `${Math.round(cleanPercentage)}%`;
  };

  return (
    // Styling/positioning is handled by the parent Conversation component
    <div className={`rounded-lg p-2 ${isMyMessage ? 'bg-indigo-100' : 'bg-white border border-gray-200'}`}>
      {/* Container for the video and potential analytics */}
      <div className="w-64 sm:w-80 md:w-96 max-w-full"> {/* Responsive width */}
        <TrackedVideoPlayer
          // Pass necessary props for tracking
          src={message.fileUrl}
          videoId={videoId}
          messageId={message._id} // Pass message context if needed by player/tracking
          userId={currentUser._id} // The current viewer's ID for *their* tracking
          controls={true}
          className="rounded-md w-full block" // Ensure video displays correctly
        />

        {/* --- Analytics Button and Display Area (Only for Sender) --- */}
        {isMyMessage && (
          <div className="mt-2 text-xs">
            {/* Button to toggle analytics */}
            <button
              onClick={handleToggleAnalytics}
              disabled={isLoadingAnalytics} // Disable while loading
              className="text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-live="polite" // For screen readers
              aria-controls={`analytics-details-${message._id}`} // Link button to details area
              aria-expanded={showReceiverAnalytics} // Indicate state for screen readers
            >
              {isLoadingAnalytics
                ? 'Loading Analytics...'
                : showReceiverAnalytics
                ? 'Hide Receiver Analytics'
                : 'View Receiver Analytics'}
            </button>

            {/* Analytics Details Area - Shown conditionally */}
            {showReceiverAnalytics && (
              <div
                id={`analytics-details-${message._id}`} // ID for aria-controls
                className="mt-1 p-2 bg-gray-50 rounded border border-gray-200"
              >
                {/* Display Loading State */}
                {isLoadingAnalytics ? (
                  <p className="text-gray-500 italic">Loading...</p>
                ) : /* Display Error State */
                analyticsError ? (
                  <p className="text-red-600 font-medium">{analyticsError}</p>
                ) : /* Display Data State (check for data vs. 'not watched' message) */
                receiverAnalytics ? (
                  // Check if it's the specific "not watched" message object
                  receiverAnalytics.message ? (
                    <p className="text-gray-600 italic">{receiverAnalytics.message}</p>
                  ) : (
                    // Otherwise, display the actual stats
                    <>
                      <h4 className="font-semibold text-gray-700 mb-1">
                        {/* Use receiver name from data if available */}
                        {receiverAnalytics.receiverName ? `${receiverAnalytics.receiverName}'s Stats:` : 'Receiver Stats:'}
                      </h4>
                      {/* Display formatted stats */}
                      <p className='text-gray-600'>Watch Time: {formattedTime(receiverAnalytics.totalWatchTime)}</p>
                      <p className='text-gray-600'>Percentage Watched: {formattedPercentage(receiverAnalytics.watchPercentage)}</p>
                      <p className='text-gray-600'>Completed: {receiverAnalytics.completed ? 'Yes' : 'No'}</p>
                      {receiverAnalytics.lastWatchedAt && (
                        <p className="text-gray-500 text-[10px] mt-1">
                          Last watched: {new Date(receiverAnalytics.lastWatchedAt).toLocaleString()}
                        </p>
                      )}
                    </>
                  )
                ) : (
                  // Fallback if receiverAnalytics is null and no error/loading
                  <p className="text-gray-500 italic">Analytics data unavailable.</p>
                )}
              </div>
            )}
          </div>
        )}
        {/* --- End Analytics Button and Display Area --- */}

      </div>
      {/* Timestamp rendering is handled in Conversation.js */}
    </div>
  );
};

export default VideoMessage;