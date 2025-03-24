import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Welcome to TrustBuild
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
          A private messaging application that ensures privacy by using unique codes instead of phone numbers or emails
        </p>
        
        <div className="mt-6 max-w-2xl mx-auto text-lg text-gray-500">
          <p>Connect with friends without sharing personal contact information.</p>
          <p className="mt-2">Each user receives a unique code that others can use to start a conversation.</p>
        </div>
        
        <div className="mt-8 flex justify-center">
          {currentUser ? (
            <div className="space-x-4">
              <Link
                to="/profile"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                View Profile
              </Link>
              <Link
                to="/connect"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Connect with Code
              </Link>
            </div>
          ) : (
            <div className="space-x-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 