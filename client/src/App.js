import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthContextProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { VideoTrackingProvider } from './context/VideoTrackingContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Connect from './pages/Connect';
import SearchUser from './pages/SearchUser';
import Conversations from './pages/Conversations';
import ConversationPage from './pages/Conversation';
import ConnectionRequests from './pages/ConnectionRequests';
import UserProfile from './pages/UserProfile';
import VideoAnalytics from './pages/VideoAnalytics';
import Services from './pages/Services';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';

// Navigation with notification badge for connection requests
const Navigation = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const [pendingCount, setPendingCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchPendingConnections();
    }
  }, [currentUser]);

  const fetchPendingConnections = async () => {
    try {
      const res = await axios.get('/api/users/connections');
      setPendingCount(res.data?.pendingConnections?.length || 0);
    } catch (err) {
      console.error('Error fetching pending connections:', err.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.233V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.767l-1.254.635a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 10-2 0v3H5v-3a1 1 0 10-2 0z" clipRule="evenodd" />
                </svg>
                TrustBuild
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/" className="text-gray-500 hover:text-gray-700 hover:border-indigo-500 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium transition-colors">
                Home
              </Link>
              <Link to="/services" className="text-gray-500 hover:text-gray-700 hover:border-indigo-500 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium transition-colors">
                Services
              </Link>
              {currentUser && (
                <>
                  <Link to="/conversations" className="text-gray-500 hover:text-gray-700 hover:border-indigo-500 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium transition-colors">
                    Messages
                  </Link>
                  <Link to="/search-user" className="text-gray-500 hover:text-gray-700 hover:border-indigo-500 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium transition-colors">
                    Find Users
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {currentUser ? (
              <>
                <Link
                  to="/connection-requests"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium relative"
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Connections
                  </span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 11.586V6z" clipRule="evenodd" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link to="/register" className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link to="/" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 block px-3 py-2 rounded-md text-base font-medium">
              Home
            </Link>
            <Link to="/services" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 block px-3 py-2 rounded-md text-base font-medium">
              Services
            </Link>
            {currentUser && (
              <>
                <Link to="/conversations" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 block px-3 py-2 rounded-md text-base font-medium">
                  Messages
                </Link>
                <Link to="/search-user" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 block px-3 py-2 rounded-md text-base font-medium">
                  Find Users
                </Link>
              </>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {currentUser ? (
              <div className="space-y-1">
                <Link to="/connection-requests" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 flex px-3 py-2 rounded-md text-base font-medium items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  Connections
                  {pendingCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 flex px-3 py-2 rounded-md text-base font-medium items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 flex w-full px-3 py-2 rounded-md text-base font-medium items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 11.586V6z" clipRule="evenodd" />
                  </svg>
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <Link to="/login" className="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 block px-3 py-2 rounded-md text-base font-medium">
                  Login
                </Link>
                <Link to="/register" className="block px-3 py-2 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

// Layout component to wrap authenticated pages
const AppLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// Auth layout for non-authenticated pages
const AuthLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthContextProvider>
        <SocketProvider>
          <VideoTrackingProvider>
            <Routes>
              <Route path="/" element={<AuthLayout><Home /></AuthLayout>} />
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
              <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/search-user" element={
                <ProtectedRoute>
                  <AppLayout>
                    <SearchUser />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/services" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Services />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/user/:userId" element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserProfile />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/conversations" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Conversations />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/conversations/:conversationId" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConversationPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/connection-requests" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConnectionRequests />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/video-analytics/:videoId" element={
                <ProtectedRoute>
                  <AppLayout>
                    <VideoAnalytics />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/connect" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Connect />
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </VideoTrackingProvider>
        </SocketProvider>
      </AuthContextProvider>
    </Router>
  );
}

export default App;
