import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const UserProfile = () => {
  const { userId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestStatus, setRequestStatus] = useState('none'); // none, pending, connected
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    const fetchUserAndConnectionStatus = async () => {
      try {
        setLoading(true);
        
        // If viewing own profile, redirect to profile page
        if (userId === currentUser._id) {
          navigate('/profile');
          return;
        }
        
        // Fetch user profile
        const userRes = await axios.get(`/api/users/${userId}`);
        setUser(userRes.data);
        
        // Check connection status
        const connectionsRes = await axios.get('/api/users/connections');
        
        const isConnected = connectionsRes.data.connections.some(
          connection => connection._id === userId
        );
        
        const isPending = connectionsRes.data.pendingConnections.some(
          connection => connection._id === userId
        );
        
        if (isConnected) {
          setRequestStatus('connected');
        } else if (isPending) {
          setRequestStatus('pending');
        } else {
          setRequestStatus('none');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err.response?.data?.message || 'Failed to load user profile');
        setLoading(false);
      }
    };

    fetchUserAndConnectionStatus();
  }, [userId, currentUser._id, navigate]);

  const sendConnectionRequest = async () => {
    try {
      setSendingRequest(true);
      await axios.post('/api/users/connect', { userId });
      setRequestStatus('pending');
      setSendingRequest(false);
    } catch (err) {
      console.error('Error sending connection request:', err);
      setError(err.response?.data?.message || 'Failed to send connection request');
      setSendingRequest(false);
    }
  };

  const startConversation = () => {
    navigate(`/conversations?user=${userId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
            <p className="mt-2">
              <Link to="/connection-requests" className="font-medium underline">
                View your connections
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">User not found</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Profile Header with Avatar */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 sm:px-6 relative">
            <div className="absolute top-4 right-4">
              <Link to="/connection-requests" className="text-indigo-100 hover:text-white text-sm font-medium flex items-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Connections
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center">
              <div className="h-24 w-24 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-4xl font-bold mb-4 sm:mb-0 sm:mr-6 border-4 border-white shadow-lg">
                {user.name.charAt(0)}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <p className="text-indigo-100 text-lg">@{user.username}</p>
                <div className="mt-2 flex flex-wrap justify-center sm:justify-start">
                  <span className="badge bg-white text-indigo-700 font-medium mt-1 mr-1">
                    {user.userType === 'service_provider' ? 'Service Provider' : 'Service Seeker'}
                  </span>
                  {user.typeOfService && (
                    <span className="badge bg-indigo-100 text-indigo-800 font-medium mt-1 mr-1">
                      {user.typeOfService}
                    </span>
                  )}
                  {user.location && (
                    <span className="badge bg-purple-100 text-purple-800 font-medium mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {user.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center sm:justify-start">
              {requestStatus === 'connected' ? (
                <button
                  onClick={startConversation}
                  className="btn-primary flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>
              ) : requestStatus === 'pending' ? (
                <span className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Request Pending
                </span>
              ) : (
                <button
                  onClick={sendConnectionRequest}
                  disabled={sendingRequest}
                  className="btn-primary flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {sendingRequest ? 'Sending...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
          
          {/* User code card */}
          <div className="px-4 py-4 border-b border-gray-200 sm:px-6 bg-indigo-50">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="mb-2 sm:mb-0">
                <span className="text-sm font-medium text-gray-500">Unique Code:</span>
                <span className="ml-2 font-mono bg-white px-2 py-1 rounded text-sm border border-gray-200 text-gray-800">{user.uniqueCode}</span>
              </div>
              <div className="text-sm text-gray-500">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="border-t border-gray-200">
            <dl>
              {user.userType === 'service_provider' && (
                <>
                  {user.typeOfService && (
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <span className="badge-primary">{user.typeOfService}</span>
                      </dd>
                    </div>
                  )}
                  
                  {user.yearsOfExperience && (
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Years of Experience</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <div className="flex items-center">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <span>{user.yearsOfExperience} {user.yearsOfExperience === 1 ? 'year' : 'years'} of experience</span>
                        </div>
                      </dd>
                    </div>
                  )}
                  
                  {user.specializedSkills && (
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Specialized Skills</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <div className="flex flex-wrap gap-2">
                          {user.specializedSkills.split(',').map((skill, index) => (
                            <span key={index} className="badge-primary">{skill.trim()}</span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                  
                  {user.workExperience && (
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Work Experience</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <div className="prose prose-sm max-w-none">
                          {user.workExperience}
                        </div>
                      </dd>
                    </div>
                  )}
                </>
              )}
              
              {user.shortBio && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Short Bio</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="prose prose-sm max-w-none">
                      {user.shortBio}
                    </div>
                  </dd>
                </div>
              )}
              
              {user.roleDescription && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Role Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.roleDescription}</dd>
                </div>
              )}
            </dl>
          </div>
          
          {/* Action Footer */}
          <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <Link to="/services" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                ← Back to Services
              </Link>
              
              {requestStatus === 'connected' ? (
                <button
                  onClick={startConversation}
                  className="btn-primary flex items-center text-sm py-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Start Conversation
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 