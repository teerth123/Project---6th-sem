import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import axios from 'axios';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [notifications, setNotifications] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  
  // Initialize socket connection when user logs in
  useEffect(() => {
    let newSocket;

    if (currentUser && currentUser.token) {
      console.log('Initializing socket connection with user token');
      
      // Connect to socket server
      newSocket = io('/', {
        auth: {
          token: currentUser.token
        }
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected successfully with ID:', newSocket.id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        console.error('Socket connection error details:', err);
      });

      // Handle user status updates
      newSocket.on('userStatus', ({ userId, isOnline }) => {
        console.log('User status update received:', { userId, isOnline });
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, isOnline);
          return newMap;
        });
      });

      // Handle message notifications
      newSocket.on('messageNotification', (data) => {
        console.log('Message notification received:', data);
        setNotifications(prev => [...prev, data]);
      });
      
      // Handle incoming video calls
      newSocket.on('incomingCall', (data) => {
        console.log('Incoming call event received:', data);
        setIncomingCall(data);
      });
      
      // Handle call ended notification
      newSocket.on('callEnded', ({ callId }) => {
        console.log('Call ended event received for call ID:', callId);
        // If this was our current incoming call, clear it
        setIncomingCall(prev => 
          prev && prev.callId === callId ? null : prev
        );
      });

      // Save socket instance
      setSocket(newSocket);
      console.log('Socket instance saved to state');
    } else {
      console.log('Not initializing socket - user or token missing', { 
        hasUser: !!currentUser, 
        hasToken: !!(currentUser?.token) 
      });
    }

    // Cleanup on unmount or when user logs out
    return () => {
      if (newSocket) {
        console.log('Disconnecting socket on cleanup');
        newSocket.disconnect();
      }
    };
  }, [currentUser]);

  // Join a conversation room
  const joinConversation = (conversationId) => {
    if (socket && conversationId) {
      socket.emit('joinConversation', conversationId);
    }
  };

  // Leave a conversation room
  const leaveConversation = (conversationId) => {
    if (socket && conversationId) {
      socket.emit('leaveConversation', conversationId);
    }
  };

  // Send a message
  const sendMessage = (conversationId, text) => {
    if (socket && conversationId && text) {
      socket.emit('sendMessage', { conversationId, text });
    }
  };

  // Send typing status
  const sendTypingStatus = (conversationId, isTyping) => {
    if (socket && conversationId !== undefined) {
      socket.emit('typing', { conversationId, isTyping });
    }
  };

  // Remove a notification
  const removeNotification = (conversationId) => {
    setNotifications(prev => 
      prev.filter(notification => notification.conversationId !== conversationId)
    );
  };

  // Check if a user is online
  const isUserOnline = (userId) => {
    return onlineUsers.get(userId) || false;
  };
  
  // Initiate a video call
  const initiateVideoCall = async (conversationId, recipientId) => {
    if (!socket || !conversationId || !recipientId) {
      console.error('Cannot initiate call: Missing required parameters', { 
        hasSocket: !!socket, conversationId, recipientId 
      });
      return null;
    }
    
    try {
      console.log('Making API call to initiate video call:', {
        url: `/api/conversations/${conversationId}/call/initiate`,
        conversationId, recipientId
      });
      
      // Use axios instead of fetch for consistency with the rest of the app
      const response = await axios.post(`/api/conversations/${conversationId}/call/initiate`);
      console.log('Video call initiated response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error initiating call:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server response error data:', error.response.data);
        console.error('Server response status:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
      }
      return null;
    }
  };
  
  // Send call signal directly via socket
  const sendCallSignal = (callId, recipientId, signal) => {
    if (!socket) {
      console.error('Cannot send call signal: Socket not connected');
      return false;
    }
    
    console.log('Sending call signal via socket:', { callId, recipientId });
    socket.emit('callSignal', { callId, recipientId, signal });
    return true;
  };
  
  // Send call response directly via socket
  const sendCallResponse = (callId, callerId, accepted) => {
    if (!socket) {
      console.error('Cannot send call response: Socket not connected');
      return false;
    }
    
    console.log('Sending call response via socket:', { callId, callerId, accepted });
    socket.emit('callResponse', { callId, callerId, accepted });
    return true;
  };
  
  // End call directly via socket
  const endCall = (callId, recipientId) => {
    if (!socket) {
      console.error('Cannot end call: Socket not connected');
      return false;
    }
    
    console.log('Sending end call via socket:', { callId, recipientId });
    socket.emit('endCall', { callId, recipientId });
    return true;
  };
  
  // Clear the current incoming call
  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        notifications,
        incomingCall,
        joinConversation,
        leaveConversation,
        sendMessage,
        sendTypingStatus,
        removeNotification,
        isUserOnline,
        initiateVideoCall,
        sendCallSignal,
        sendCallResponse,
        endCall,
        clearIncomingCall
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}; 