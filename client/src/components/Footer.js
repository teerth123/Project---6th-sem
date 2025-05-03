import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-lg font-bold text-indigo-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.233V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.767l-1.254.635a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 10-2 0v3H5v-3a1 1 0 10-2 0z" clipRule="evenodd" />
                </svg>
                TrustBuild
              </Link>
            </div>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/services" className="text-gray-500 hover:text-indigo-600 transition-colors">
              Find Services
            </Link>
            <Link to="/search-user" className="text-gray-500 hover:text-indigo-600 transition-colors">
              Connect
            </Link>
            <Link to="/profile" className="text-gray-500 hover:text-indigo-600 transition-colors">
              My Profile
            </Link>
          </div>
          
          <div className="mt-4 md:mt-0">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} TrustBuild. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 