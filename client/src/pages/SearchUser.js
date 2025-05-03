import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SearchUser = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [userConnections, setUserConnections] = useState({
    connections: [],
    pendingConnections: []
  });
  const navigate = useNavigate();

  // Fetch user connections when component mounts
  useEffect(() => {
    fetchUserConnections();
  }, []);

  const fetchUserConnections = async () => {
    try {
      const res = await axios.get('/api/users/connections');
      setUserConnections({
        connections: res.data.connections,
        pendingConnections: res.data.pendingConnections
      });
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFoundUser(null);
    setConnectionStatus(null);
    setSearchPerformed(true);

    try {
      // Format code by removing only spaces and keeping hyphens
      const formattedCode = code.replace(/\s/g, '').toUpperCase();
      
      // Find user by code
      const res = await axios.get(`/api/users/find-by-code/${formattedCode}`);
      const user = res.data;
      setFoundUser(user);
      
      // Check if user is already connected or has pending request
      checkConnectionStatus(user._id);
      
      setLoading(false);
    } catch (err) {
      console.error('Search error:', err.response || err);
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to find user with this code');
    }
  };

  const checkConnectionStatus = (userId) => {
    // Check if user is already connected
    const isConnected = userConnections.connections.some(conn => conn._id === userId);
    if (isConnected) {
      setConnectionStatus({
        type: 'connected',
        message: 'You are already connected with this user'
      });
      return;
    }
    
    // Check if there's a pending request from this user
    const hasPendingFromUser = userConnections.pendingConnections.some(conn => conn._id === userId);
    if (hasPendingFromUser) {
      setConnectionStatus({
        type: 'pending',
        message: 'This user has sent you a connection request',
        pendingUserId: userId
      });
      return;
    }
    
    // Check if we've sent a request to this user (need to make API call)
    checkOutgoingRequest(userId);
  };

  const checkOutgoingRequest = async (userId) => {
    try {
      // This is a placeholder - you might need to create this endpoint
      const res = await axios.get(`/api/users/check-request/${userId}`);
      if (res.data.isRequested) {
        setConnectionStatus({
          type: 'requested',
          message: 'You have already sent a connection request to this user'
        });
      }
    } catch (err) {
      // If endpoint doesn't exist or returns error, assume no request sent
      console.log('No outgoing request found');
    }
  };

  const handleStartConversation = async () => {
    if (!foundUser) return;
    
    setLoading(true);
    setError('');

    try {
      // First check if we're connected
      const connectionsRes = await axios.get('/api/users/connections');
      const isConnected = connectionsRes.data.connections.some(conn => conn._id === foundUser._id);
      
      if (!isConnected) {
        setError('You must be connected with this user to start a conversation');
        setLoading(false);
        return;
      }
      
      // Try to start the conversation
      const res = await axios.post(`/api/conversations/start/${foundUser._id}`);
      
      // If we got a conversation, navigate to it
      if (res.data && res.data._id) {
        navigate(`/conversations/${res.data._id}`);
      } else {
        setError('Unable to start conversation. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Conversation error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to start conversation. Please try again.');
      setLoading(false);
    }
  };

  const handleSendConnectionRequest = async () => {
    if (!foundUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      await axios.post('/api/users/connect', { userId: foundUser._id });
      setConnectionStatus({
        type: 'requested',
        message: 'Connection request sent successfully!'
      });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to send connection request');
    }
  };

  const handleAcceptConnection = async () => {
    if (!connectionStatus?.pendingUserId) return;
    
    setLoading(true);
    
    try {
      await axios.put('/api/users/connection-request', { 
        userId: connectionStatus.pendingUserId,
        action: 'accept'
      });
      
      // Update connection status
      setConnectionStatus({
        type: 'connected',
        message: 'You are now connected with this user'
      });
      
      // Refresh user connections
      fetchUserConnections();
      
      // Try to start conversation immediately after accepting
      try {
        const res = await axios.post(`/api/conversations/start/${foundUser._id}`);
        
        // If we got a conversation object back, navigate to it
        if (res.data._id) {
          setLoading(false);
          navigate(`/conversations/${res.data._id}`);
          return;
        }
      } catch (convErr) {
        console.error('Error starting conversation after accepting:', convErr);
        // Continue to show connected status even if conversation fails to start
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Accept connection error:', err.response || err);
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to accept connection');
    }
  };

  // Format code with hyphens as user types
  const handleCodeChange = (e) => {
    const input = e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    
    // Insert hyphens every 4 characters
    let formatted = '';
    for (let i = 0; i < input.length; i++) {
      if (i > 0 && i % 4 === 0 && input[i] !== '-') {
        formatted += '-';
      }
      formatted += input[i];
    }
    
    // Limit to 11 characters (8 chars + 3 hyphens)
    setCode(formatted.slice(0, 11));
  };

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-10 rounded-lg mb-8 text-center">
          <h1 className="text-3xl font-bold mb-3">
            Connect with Others
          </h1>
          <p className="text-indigo-100 text-lg max-w-2xl mx-auto">
            Enter someone's unique code to find their profile and connect with them securely.
          </p>
        </div>
        
        <div className="bg-white shadow-md rounded-lg mb-8">
          <div className="px-6 py-6">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 rounded-full p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Find User by Code
              </h3>
            </div>
            
            <form onSubmit={handleSearch} className="mt-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-grow">
                  <label htmlFor="code" className="form-label flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Unique Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    id="code"
                    className="form-input font-mono"
                    placeholder="Enter code (e.g. ABCD-1234)"
                    value={code}
                    onChange={handleCodeChange}
                    required
                    maxLength={11} // 8 chars + 3 hyphens
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the unique code. Hyphens will be automatically added for readability.
                  </p>
                </div>
                <div className="sm:self-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full sm:w-auto flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Find User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
            
            {error && (
              <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded animate-fadeIn" role="alert">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium">{error}</p>
                    <p className="text-sm mt-1">
                      Make sure you're entering the code exactly as it appears.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {foundUser && (
          <div className="card transform transition-all duration-300 animate-fadeIn">
            {/* User Profile Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row items-center sm:items-start">
                <div className="flex-shrink-0 h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-2xl font-bold mb-4 sm:mb-0 sm:mr-5">
                  {foundUser.name.charAt(0)}
                </div>
                <div className="flex-grow text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {foundUser.name}
                  </h3>
                  <p className="text-gray-600">@{foundUser.username}</p>
                  
                  <div className="mt-2 flex flex-wrap justify-center sm:justify-start">
                    <span className="badge-primary mr-2 mb-2">
                      {foundUser.userType === 'service_provider' ? 'Service Provider' : 'Service Seeker'}
                    </span>
                    {foundUser.typeOfService && (
                      <span className="badge-secondary mr-2 mb-2">
                        {foundUser.typeOfService}
                      </span>
                    )}
                    {foundUser.location && (
                      <span className="badge bg-gray-100 text-gray-800 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {foundUser.location}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                  {connectionStatus?.type === 'connected' ? (
                    <button
                      onClick={handleStartConversation}
                      disabled={loading}
                      className="btn-primary flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {loading ? 'Starting...' : 'Message'}
                    </button>
                  ) : connectionStatus?.type === 'pending' ? (
                    <button
                      onClick={handleAcceptConnection}
                      disabled={loading}
                      className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {loading ? 'Accepting...' : 'Accept'}
                    </button>
                  ) : connectionStatus?.type === 'requested' ? (
                    <div className="flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Request Sent
                    </div>
                  ) : (
                    <button
                      onClick={handleSendConnectionRequest}
                      disabled={loading}
                      className="btn-primary flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      {loading ? 'Sending...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
              
              {connectionStatus && connectionStatus.message && (
                <div className={`mt-3 text-sm font-medium ${
                  connectionStatus.type === 'connected' ? 'text-green-600' : 
                  connectionStatus.type === 'requested' ? 'text-blue-600' : 
                  connectionStatus.type === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  <div className="flex items-center justify-center sm:justify-start">
                    {connectionStatus.type === 'connected' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {connectionStatus.message}
                  </div>
                </div>
              )}
            </div>
            
            {/* User Details */}
            <div className="px-6 py-5">
              {/* Bio Section */}
              {foundUser.shortBio && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">About</h4>
                  <p className="text-sm text-gray-700">{foundUser.shortBio}</p>
                </div>
              )}
              
              {/* Service Provider Details */}
              {foundUser.userType === 'service_provider' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {foundUser.specializedSkills && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {foundUser.specializedSkills.split(',').map((skill, index) => (
                          <span key={index} className="badge-primary">{skill.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {foundUser.yearsOfExperience && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Experience</h4>
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>{foundUser.yearsOfExperience} {foundUser.yearsOfExperience === 1 ? 'year' : 'years'} of experience</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Role Description */}
              {foundUser.roleDescription && (
                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Role Description</h4>
                  <p className="text-sm text-gray-700">{foundUser.roleDescription}</p>
                </div>
              )}
            </div>
            
            {/* User Code */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center mb-2 sm:mb-0">
                  <span className="text-sm text-gray-500 mr-2">Unique Code:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded text-sm border border-gray-200 text-gray-800">
                    {foundUser.uniqueCode}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Member since {new Date(foundUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!foundUser && !error && !loading && searchPerformed && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center animate-fadeIn">
            <svg className="h-16 w-16 text-yellow-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No User Found</h3>
            <p className="text-yellow-700">
              We couldn't find any user with the code <span className="font-mono">{code}</span>.
              <br />Please check the code and try again.
            </p>
          </div>
        )}
        
        {!foundUser && !error && !searchPerformed && (
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <svg className="h-16 w-16 text-indigo-300 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Find a User</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Enter a unique code above to find a user. You can then connect with them to start messaging securely.
            </p>
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg text-sm text-gray-700 max-w-md mx-auto">
              <p className="font-medium text-indigo-700 mb-2">How to find a unique code:</p>
              <ul className="list-disc pl-5 space-y-1 text-left">
                <li>Ask the person you want to connect with to share their unique code</li>
                <li>They can find it in their profile page</li>
                <li>Codes look like: <span className="font-mono">ABCD-1234</span></li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchUser; 