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

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // If viewing own profile, redirect to profile page
        if (userId === currentUser._id) {
          navigate('/profile');
          return;
        }
        
        const res = await axios.get(`/api/users/profile/${userId}`);
        setUser(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err.response?.data?.message || 'Failed to load user profile');
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, currentUser._id, navigate]);

  const handleStartConversation = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`/api/conversations/start/${userId}`);
      
      // If we got a conversation object back, navigate to it
      if (res.data && res.data._id) {
        navigate(`/conversations/${res.data._id}`);
      } else if (res.data && (res.data.isRequested || res.data.isPending)) {
        setError(res.data.message || 'Cannot start conversation. Connection issue.');
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Error starting conversation:', err);
      setError(err.response?.data?.message || 'Failed to start conversation');
    }
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
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and information</p>
            </div>
            <Link to="/connection-requests" className="text-indigo-600 hover:text-indigo-900">
              Back to Connections
            </Link>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">@{user.username}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Unique Code</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.uniqueCode}</dd>
              </div>
              {user.roleDescription && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Role Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.roleDescription}</dd>
                </div>
              )}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(user.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:px-6">
                <button
                  onClick={handleStartConversation}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Start Conversation
                </button>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 