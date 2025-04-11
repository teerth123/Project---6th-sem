import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [makeAdminLoading, setMakeAdminLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Fetching user profile...');
        const res = await axios.get('/api/auth/profile');
        console.log('Profile data received:', res.data);
        setProfile(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message
        });
        setError(`Failed to load profile data. ${err.response?.data?.message || err.message}`);
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const copyCodeToClipboard = () => {
    // First try to use the profile data from API
    if (profile?.uniqueCode) {
      navigator.clipboard.writeText(profile.uniqueCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } 
    // Fallback to using currentUser from context
    else if (currentUser?.uniqueCode) {
      navigator.clipboard.writeText(currentUser.uniqueCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Quick function to toggle admin status (for testing only)
  const toggleAdminStatus = async () => {
    try {
      setMakeAdminLoading(true);
      
      // Get the current user with updated fields
      const updatedUser = {
        ...profile,
        isAdmin: !profile.isAdmin
      };
      
      // Store in localStorage to update the client-side state
      localStorage.setItem('user', JSON.stringify({
        ...JSON.parse(localStorage.getItem('user')),
        isAdmin: !profile.isAdmin
      }));
      
      // Update profile state
      setProfile(updatedUser);
      setMakeAdminLoading(false);
      
      // Since we don't have an API endpoint for this in the demo, just show a success message
      alert(`You are now ${updatedUser.isAdmin ? 'an admin' : 'a regular user'}! (Frontend change only for demo)`);
      
      // Reload page to reflect changes from localStorage
      window.location.reload();
      
    } catch (error) {
      console.error('Error toggling admin status:', error);
      setError('Failed to update admin status');
      setMakeAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If we couldn't load the profile from API, use the currentUser data from context
  const userData = profile || currentUser;

  if (!userData) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Unable to load user data. Please try logging in again.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{error}</span>
          <p className="mt-2">Using locally stored user data instead.</p>
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and connection information</p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData.name}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Username</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData.username}</dd>
            </div>
            {userData.email && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData.email}</dd>
              </div>
            )}
            {userData.roleDescription && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Role description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData.roleDescription}</dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Your unique code</dt>
              <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <span className="font-mono bg-gray-100 px-3 py-1 rounded-md text-lg">{userData.uniqueCode}</span>
                  <button
                    onClick={copyCodeToClipboard}
                    className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Share this code with friends so they can connect with you. Keep it private from people you don't want to chat with.
                </p>
              </dd>
            </div>
            
            {/* Admin status toggle (for testing only) */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Admin Status</dt>
              <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-md ${userData.isAdmin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {userData.isAdmin ? 'Admin' : 'Regular User'}
                  </span>
                  <button
                    onClick={toggleAdminStatus}
                    disabled={makeAdminLoading}
                    className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {makeAdminLoading ? 'Updating...' : `Make ${userData.isAdmin ? 'Regular User' : 'Admin'}`}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  This is for demo purposes only - toggle admin status to access video analytics features
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Profile; 