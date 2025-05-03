import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const ConnectionRequests = () => {
  const [pendingConnections, setPendingConnections] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.get('/api/users/connections');
      setPendingConnections(res.data.pendingConnections);
      setConnections(res.data.connections);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to load connection data. Please try again later.');
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      setLoading(true);
      setError('');
      
      // First accept the connection request
      await axios.put(`/api/users/accept/${userId}`);
      setSuccessMessage('Connection request accepted successfully!');
      
      // Refresh connections list immediately
      await fetchConnections();
      
      // Then try to start a conversation
      try {
        const res = await axios.post(`/api/conversations/start/${userId}`);
        
        // If we got a conversation object back, navigate to it
        if (res.data && res.data._id) {
          navigate(`/conversations/${res.data._id}`);
        } else {
          // If no conversation was created, show a message and refresh
          setSuccessMessage('Connection accepted! You can now start a conversation from your connections list.');
          setTimeout(() => {
            navigate('/conversations');
          }, 2000);
        }
      } catch (convErr) {
        console.error('Error starting conversation:', convErr);
        // Even if conversation creation fails, the connection is still accepted
        setSuccessMessage('Connection accepted! You can now start a conversation from your connections list.');
        setTimeout(() => {
          navigate('/conversations');
        }, 2000);
      }
      
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error accepting connection:', err);
      setError(err.response?.data?.message || 'Failed to accept connection request. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Connections & Requests
        </h1>
        
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}
        
        {/* Pending Connection Requests */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pending Connection Requests
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              People who want to connect with you
            </p>
          </div>
          
          {loading ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <p className="text-gray-500">Loading connection requests...</p>
            </div>
          ) : pendingConnections.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <p className="text-gray-500">No pending connection requests</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {pendingConnections.map((user) => (
                <li key={user._id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                        {user.roleDescription && (
                          <p className="text-sm text-gray-500 mt-1">{user.roleDescription}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(user._id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Accept Request
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Current Connections */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Your Connections
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              People you are connected with
            </p>
          </div>
          
          {loading ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <p className="text-gray-500">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <p className="text-gray-500">You don't have any connections yet</p>
              <Link 
                to="/search-user" 
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Find People to Connect
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {connections.map((user) => (
                <li key={user._id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <Link to={`/user/${user._id}`} className="flex items-center flex-1 hover:bg-gray-50 p-2 rounded">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-800 font-medium text-sm">
                          {user.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                        {user.roleDescription && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.roleDescription}</p>
                        )}
                      </div>
                    </Link>
                    <div className="ml-4 flex space-x-2">
                      <Link
                        to={`/user/${user._id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => {
                          navigate(`/conversations/${user._id}`);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionRequests; 