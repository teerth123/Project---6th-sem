import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on initial load
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user && user.token) {
      console.log('Found user in localStorage, setting up auth');
      setCurrentUser(user);
      // Set default auth header for axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
      
      // Verify token is still valid
      const verifyToken = async () => {
        try {
          await axios.get('/api/auth/verify-token');
          console.log('Token verified successfully');
        } catch (err) {
          console.error('Token verification failed:', err.response?.data || err.message);
          // If token is invalid, log the user out
          if (err.response?.status === 401) {
            logout();
          }
        }
      };
      
      verifyToken();
    } else {
      console.log('No user found in localStorage');
    }
    
    setLoading(false);
  }, []);

  // Register user
  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password,
      });
      
      const user = response.data;
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      // Set default auth header for axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  const login = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // Set default auth header for axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
    // Remove auth header
    delete axios.defaults.headers.common['Authorization'];
  };

  // Get user profile
  const getProfile = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      };

      const response = await axios.get('/api/auth/profile', config);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get profile');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        register,
        login,
        logout,
        getProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 