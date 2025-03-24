import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthContextProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Connect from './pages/Connect';
import SearchUser from './pages/SearchUser';
import Conversations from './pages/Conversations';
import Conversation from './pages/Conversation';
import ConnectionRequests from './pages/ConnectionRequests';
import UserProfile from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';

// Navigation component with connection request notifications
const Navigation = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch pending connections if user is logged in
    if (currentUser) {
      fetchPendingConnections();
    }
  }, [currentUser]);

  const fetchPendingConnections = async () => {
    try {
      const res = await axios.get('/api/users/connections');
      setPendingCount(res.data.pendingConnections.length);
    } catch (err) {
      console.error('Error fetching pending connections:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                TrustBuild
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Home
              </Link>
              {currentUser && (
                <>
                  <Link
                    to="/conversations"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Messages
                  </Link>
                  <Link
                    to="/search-user"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Find Users
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex space-x-4">
                {currentUser ? (
                  <>
                    <Link
                      to="/connection-requests"
                      className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium relative"
                    >
                      Connections
                      {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/profile"
                      className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthContextProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Navigation />

            <div className="py-4">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/user/:userId" 
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/connect" 
                  element={
                    <ProtectedRoute>
                      <Connect />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/search-user" 
                  element={
                    <ProtectedRoute>
                      <SearchUser />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/connection-requests" 
                  element={
                    <ProtectedRoute>
                      <ConnectionRequests />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/conversations" 
                  element={
                    <ProtectedRoute>
                      <Conversations />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/conversations/:conversationId" 
                  element={
                    <ProtectedRoute>
                      <Conversation />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </div>
          </div>
        </Router>
      </SocketProvider>
    </AuthContextProvider>
  );
}

export default App; 