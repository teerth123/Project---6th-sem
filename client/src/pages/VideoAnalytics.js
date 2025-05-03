import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import TrackedVideoPlayer from '../components/TrackedVideoPlayer';

const VideoAnalytics = () => {
  const { videoId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/video-tracking/analytics/${videoId}`);
        setAnalytics(response.data);
        
        // Assuming we have an API to get video details
        try {
          const videoResponse = await axios.get(`/api/videos/${videoId}`);
          setVideoUrl(videoResponse.data.fileUrl);
        } catch (videoErr) {
          console.error('Error fetching video details:', videoErr);
        }
        
      } catch (err) {
        console.error('Error fetching video analytics:', err);
        setError(err.response?.data?.message || 'Failed to fetch video analytics');
      } finally {
        setLoading(false);
      }
    };
    
    if (videoId) {
      fetchAnalytics();
    }
  }, [videoId]);
  
  // Function to render the heatmap
  const renderHeatmap = (heatmap) => {
    if (!heatmap || !heatmap.length) return null;
    
    return (
      <div className="my-4">
        <h3 className="text-lg font-semibold mb-2">Viewing Density</h3>
        <div className="flex h-8 w-full rounded overflow-hidden">
          {heatmap.map((count, index) => {
            // Calculate color intensity based on view count
            const maxCount = Math.max(...heatmap);
            const intensity = maxCount ? Math.min(0.2 + (count / maxCount) * 0.8, 1) : 0.2;
            
            return (
              <div 
                key={index}
                className="h-full"
                style={{ 
                  backgroundColor: `rgba(79, 70, 229, ${intensity})`,
                  width: `${100 / heatmap.length}%`
                }}
                title={`${Math.round(index)}%: ${count} views`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-2 text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Video Analytics</h1>
      
      {videoUrl && (
        <div className="mb-6">
          <TrackedVideoPlayer
            src={videoUrl}
            videoId={videoId}
            controls={true}
            className="w-full max-w-lg mx-auto rounded-lg shadow-md"
          />
        </div>
      )}
      
      {analytics ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-indigo-800 text-sm font-medium">Total Views</h3>
              <p className="text-3xl font-bold">{analytics.totalViews}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-green-800 text-sm font-medium">Completion Rate</h3>
              <p className="text-3xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-blue-800 text-sm font-medium">Avg. Watch Time</h3>
              <p className="text-3xl font-bold">
                {Math.floor(analytics.averageWatchTime / 60)}m {Math.floor(analytics.averageWatchTime % 60)}s
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-purple-800 text-sm font-medium">Avg. Watch Percentage</h3>
              <p className="text-3xl font-bold">{analytics.averageWatchPercentage.toFixed(1)}%</p>
            </div>
          </div>
          
          {renderHeatmap(analytics.segmentHeatmap)}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Common Pause Points</h3>
              {analytics.commonPausePoints?.length > 0 ? (
                <ul className="space-y-2">
                  {analytics.commonPausePoints.map((point, index) => (
                    <li key={index} className="flex justify-between border-b pb-1">
                      <span className="text-gray-700">{point.timeRange}</span>
                      <span className="font-medium">{point.count} pauses</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No pause data available</p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Common Skip Sections</h3>
              {analytics.commonSkipSections?.length > 0 ? (
                <ul className="space-y-2">
                  {analytics.commonSkipSections.map((section, index) => (
                    <li key={index} className="flex justify-between border-b pb-1">
                      <span className="text-gray-700">{section.range}s</span>
                      <span className="font-medium">{section.count} skips</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No skip data available</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          No analytics data available for this video.
        </div>
      )}
    </div>
  );
};

export default VideoAnalytics; 