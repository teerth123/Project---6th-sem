import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SearchUser = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
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

    try {
      // Format code by removing only spaces and keeping hyphens
      const formattedCode = code.replace(/\s/g, '').toUpperCase();
      
      console.log('Searching for code:', formattedCode); // Debug log
      
      // Find user by code
      const res = await axios.get(`/api/conversations/find-user/${formattedCode}`);
      console.log('Found user:', res.data); // Debug log
      
      const user = res.data;
      setFoundUser(user);
      
      // Check if user is already connected or has pending request
      checkConnectionStatus(user._id);
      
      setLoading(false);
    } catch (err) {
      console.error('Search error:', err.response || err); // Enhanced error logging
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
      console.log('Starting conversation with user ID:', foundUser._id);
      
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
      console.log('Conversation response:', res.data);
      
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
      await axios.post(`/api/users/connect/${foundUser._id}`);
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
      await axios.put(`/api/users/accept/${connectionStatus.pendingUserId}`);
      
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

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Find Users by Code
        </h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Enter someone's unique code to find them
            </h3>
            
            <form onSubmit={handleSearch} className="mt-5 sm:flex sm:items-center">
              <div className="w-full sm:max-w-xs">
                <label htmlFor="code" className="sr-only">Unique Code</label>
                <input
                  type="text"
                  name="code"
                  id="code"
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter code (e.g. ABCD-1234)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
                <p className="mt-2 text-sm">
                  Make sure you're entering the code exactly as it appears, including any hyphens.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {foundUser && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">User Found</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">User details and conversation options</p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{foundUser.name}</dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Username</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{foundUser.username}</dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Unique Code</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{foundUser.uniqueCode}</dd>
                </div>
                {foundUser.roleDescription && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Role description</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{foundUser.roleDescription}</dd>
                  </div>
                )}
                <div className="bg-white px-4 py-5 sm:px-6">
                  {connectionStatus && (
                    <div className={`mt-4 p-4 rounded-md ${
                      connectionStatus.type === 'connected' 
                        ? 'bg-green-100 border border-green-400 text-green-700' 
                        : connectionStatus.type === 'requested'
                          ? 'bg-blue-100 border border-blue-400 text-blue-700'
                          : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
                    }`}>
                      <p className="mb-2">{connectionStatus.message}</p>
                      
                      {connectionStatus.type === 'pending' && connectionStatus.pendingUserId && (
                        <button
                          onClick={handleAcceptConnection}
                          disabled={loading}
                          className="mt-1 inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {loading ? 'Processing...' : 'Accept Connection Request'}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons section */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {/* If no connection status, show the Send Connection Request button */}
                    {!connectionStatus && (
                      <button
                        onClick={handleSendConnectionRequest}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        {loading ? 'Sending...' : 'Send Connection Request'}
                      </button>
                    )}
                    
                    {/* If users are connected, show the Start Conversation button */}
                    {connectionStatus && connectionStatus.type === 'connected' && (
                      <button
                        onClick={handleStartConversation}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {loading ? 'Starting...' : 'Start Conversation'}
                      </button>
                    )}
                  </div>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchUser; 