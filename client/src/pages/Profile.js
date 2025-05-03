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
        {/* Profile Header with Avatar */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="h-24 w-24 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-4xl font-bold mb-4 sm:mb-0 sm:mr-6 border-4 border-white shadow-lg">
              {userData.name.charAt(0)}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white">{userData.name}</h2>
              <p className="text-indigo-100 text-lg">@{userData.username}</p>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start">
                <span className="badge bg-white text-indigo-700 font-medium mt-1 mr-1">
                  {userData.userType === 'service_provider' ? 'Service Provider' : 'Service Seeker'}
                </span>
                {userData.typeOfService && (
                  <span className="badge bg-indigo-100 text-indigo-800 font-medium mt-1 mr-1">
                    {userData.typeOfService}
                  </span>
                )}
                {userData.location && (
                  <span className="badge bg-purple-100 text-purple-800 font-medium mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {userData.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Code Share Card */}
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-indigo-50">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Your Unique Code</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Share this code with others to connect</p>
            </div>
            <div className="flex items-center">
              <span className="font-mono bg-white px-4 py-2 rounded-l-md text-lg border border-r-0 border-gray-300 text-gray-800">{userData.uniqueCode}</span>
              <button
                onClick={copyCodeToClipboard}
                className={`px-4 py-2 rounded-r-md border border-indigo-600 font-medium transition-colors ${
                  copied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Information */}
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
            
            {userData.userType === 'service_provider' && (
              <>
                {userData.typeOfService && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <span className="badge-primary">{userData.typeOfService}</span>
                    </dd>
                  </div>
                )}
                
                {userData.yearsOfExperience && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Years of Experience</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="flex items-center">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>{userData.yearsOfExperience} years of experience</span>
                      </div>
                    </dd>
                  </div>
                )}
                
                {userData.specializedSkills && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Specialized Skills</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="flex flex-wrap gap-2">
                        {userData.specializedSkills.split(',').map((skill, index) => (
                          <span key={index} className="badge-primary">{skill.trim()}</span>
                        ))}
                      </div>
                    </dd>
                  </div>
                )}
                
                {userData.workExperience && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Work Experience</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="prose prose-sm max-w-none">
                        {userData.workExperience}
                      </div>
                    </dd>
                  </div>
                )}
              </>
            )}
            
            {userData.shortBio && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Short Bio</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="prose prose-sm max-w-none">
                    {userData.shortBio}
                  </div>
                </dd>
              </div>
            )}
            
            {userData.roleDescription && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Role Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData.roleDescription}</dd>
              </div>
            )}
            
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
                    className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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