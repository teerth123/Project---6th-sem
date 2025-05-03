// context/SocketContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client'; // <--- ADDITION: Import socket.io-client
import axios from 'axios'; // Make sure axios is imported if used here
import { AuthContext } from './AuthContext'; // <--- ADDITION: Import AuthContext

const SocketContext = createContext();

// --- ADDITION: SocketProvider component ---
const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [notifications, setNotifications] = useState([]);
  // Add state for online users if you implement that feature based on 'userStatus'
  // const [onlineUsers, setOnlineUsers] = useState({});

  // Get token from AuthContext to authenticate socket connection
  const { currentUser, token } = useContext(AuthContext);

  // Effect to handle socket connection/disconnection
  useEffect(() => {
    // Only attempt connection if we have a token and are not already connected
    if (token && !socket && !isConnected) {
      console.log('[SocketContext] Token found, attempting to connect...');

      // Connect to backend socket server - Use your actual backend URL
      // Try using the full URL without assuming port 5000
      const socketURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : window.location.origin;
      
      console.log('[SocketContext] Connecting to socket server at:', socketURL);
      
      const newSocket = io(socketURL, { // <--- DYNAMIC URL
        // Send token for authentication based on your backend io.use() middleware
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('[SocketContext] Connected successfully! Socket ID:', newSocket.id);
        setSocket(newSocket);
        setIsConnected(true);
        // If you have logic to fetch initial online users, do it here
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[SocketContext] Disconnected. Reason:', reason);
        setSocket(null);
        setIsConnected(false);
        setIncomingCall(null); // Clear incoming call on disconnect
        // Clear online users state if implemented
        // setOnlineUsers({});
      });

      newSocket.on('connect_error', (err) => {
        console.error('[SocketContext] Connection Error:', err.message);
        // Handle authentication errors specifically
        if (err.message.includes('Authentication error')) {
          console.error("Socket Authentication Failed. Token might be invalid or expired.");
          // Optionally trigger logout or token refresh here
        }
        // Prevent potential infinite loops by not setting socket/isConnected
        setSocket(null);
        setIsConnected(false);
      });

      // --- Central Listener for Incoming Calls ---
      // Listen for the 'incomingCall' event emitted by the backend API
      newSocket.on('incomingCall', (data) => {
        console.log('[SocketContext] Incoming call received:', data);
        // TODO: Potentially add logic here to check if user is already in a call
        setIncomingCall(data);
      });

      // --- Message Notification Listener ---
      newSocket.on('messageNotification', (data) => {
        console.log('[SocketContext] Message notification received:', data);
        // Add notification to state
        setNotifications(prev => {
          console.log('[SocketContext] Adding notification to state:', data);
          return [...prev, data];
        });
      });

      // --- Message Update Listener ---
      newSocket.on('messageUpdate', (data) => {
        console.log('[SocketContext] Message update received:', data);
        // This is for updating conversation lists in real-time
      });

      // --- New Message Listener (global) ---
      newSocket.on('newMessage', (data) => {
        console.log('[SocketContext] New message received globally:', data);
        // This handles general message reception in all components that subscribe to socket events
      });

      // --- Direct Message Listener ---
      newSocket.on('directMessage', (data) => {
        console.log('[SocketContext] Direct message received:', data);
      });

      // --- Direct New Message Listener ---
      newSocket.on('directNewMessage', (data) => {
        console.log('[SocketContext] Direct broadcast message received:', data);
      });

      // Debug events
      newSocket.onAny((event, ...args) => {
        console.log(`[SocketContext] Event '${event}' received:`, args);
      });

      // Debug response listener
      newSocket.on('debugResponse', (data) => {
        console.log('[SocketContext] Received debug response from server:', data);
      });

      // Handle server ping
      newSocket.on('serverPing', (data) => {
        console.log('[SocketContext] Received server ping:', data);
        // Respond with pong
        if (newSocket.connected) {
          newSocket.emit('clientPong', { 
            received: true, 
            clientTimestamp: new Date(),
            serverTimestamp: data.timestamp 
          });
        }
      });

      // --- Optional: Listener for User Status Updates ---
      // Based on your backend emitUserStatus function
      // newSocket.on('userStatus', ({ userId, isOnline }) => {
      //   console.log(`[SocketContext] User status update: ${userId} is ${isOnline ? 'online' : 'offline'}`);
      //   setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
      // });

      // Note: Other listeners like 'callSignal', 'callResponse', 'callEnded', 'newMessage'
      // can be attached here OR directly within the components that need them (like VideoCall.js)
      // Your current structure where VideoCall.js listens for call-related events is fine.

    } else if (!token && socket) {
      // If token is removed (user logs out), disconnect the socket
      console.log('[SocketContext] Token removed, disconnecting socket.');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }

    // Cleanup function: Disconnect socket when component unmounts or token changes
    return () => {
      if (socket) {
        console.log('[SocketContext] Cleaning up: disconnecting socket.');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  // Rerun effect if the token changes (e.g., login/logout)
  }, [token, socket, isConnected]); // Added socket & isConnected to deps to prevent reconnect attempts if already connected

  // --- Functions Provided by Context (Your Existing Functions) ---

  const initiateVideoCall = async (conversationId, recipientId) => {
    // This uses axios to hit the backend API endpoint - THIS IS CORRECT
    // No changes needed here as it triggers the backend API -> socket emit flow
    if (!conversationId || !recipientId) {
      console.error('Cannot initiate call: Missing required parameters', {
        conversationId, recipientId
      });
      return null;
    }

    try {
      console.log('Making API call to initiate video call:', {
        url: `/api/conversations/${conversationId}/call/initiate`,
        conversationId, recipientId
      });
      // Assuming axios is globally configured or imported and setup with auth headers
      const response = await axios.post(`/api/conversations/${conversationId}/call/initiate`);
      console.log('Video call initiated API response:', response.data);
      // Backend already emits 'incomingCall', API response gives initiator the callId
      return response.data; // Should contain { callId, recipient }
    } catch (error) {
      console.error('Error initiating call API:', error);
      if (error.response) {
        console.error('Server response error data:', error.response.data);
        console.error('Server response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }
      return null;
    }
  };

  const sendCallSignal = (callId, recipientId, signal) => {
    // This uses socket.emit - THIS IS CORRECT
    if (!socket || !isConnected) { // Check connection status
      console.error('Cannot send call signal: Socket not connected/ready');
      return false;
    }
    console.log('Sending call signal via socket:', { callId, recipientId });
    // Match backend event name 'callSignal'
    socket.emit('callSignal', { callId, recipientId, signal });
    return true;
  };

  const sendCallResponse = (callId, callerId, accepted) => {
    // This uses socket.emit - THIS IS CORRECT
    if (!socket || !isConnected) { // Check connection status
      console.error('Cannot send call response: Socket not connected/ready');
      return false;
    }
    console.log('Sending call response via socket:', { callId, callerId, accepted });
    // Match backend event name 'callResponse'
    socket.emit('callResponse', { callId, callerId, accepted });
    return true;
  };

  const endCall = (callId, recipientId) => {
    // This uses socket.emit - THIS IS CORRECT
    if (!socket || !isConnected) { // Check connection status
      console.error('Cannot end call: Socket not connected/ready');
      return false;
    }
    console.log('Sending end call via socket:', { callId, recipientId });
    // Match backend event name 'endCall'
    // Ensure recipientId is the ID of the OTHER user in the call
    socket.emit('endCall', { callId, recipientId });
    return true;
  };

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  // --- Add other context functions if needed ---
  const joinConversation = (conversationId) => {
    if (socket && isConnected && conversationId) {
        console.log(`[SocketContext] Joining conversation room: ${conversationId}`);
        socket.emit('joinConversation', conversationId);
        return true;
    }
    console.warn(`[SocketContext] Failed to join conversation: Socket not connected`);
    return false;
  };

  const leaveConversation = (conversationId) => {
      if (socket && isConnected && conversationId) {
          console.log(`[SocketContext] Leaving conversation room: ${conversationId}`);
          socket.emit('leaveConversation', conversationId);
          return true;
      }
      return false;
  };

  const sendMessage = (conversationId, text, fileUrl, type) => {
    // Your backend API POST /messages already handles emitting the 'newMessage'
    // But we also emit from the client for redundancy
    if (socket && isConnected) {
      console.log('[SocketContext] Emitting message via socket:', { 
        conversationId, 
        text, 
        fileUrl: fileUrl ? `[${fileUrl.substring(0, 20)}...]` : undefined, 
        type 
      });
      
      socket.emit('sendMessage', { conversationId, text, fileUrl, type });
      
      // Emit a debug event to verify socket is working
      socket.emit('debugEvent', { message: 'Testing socket connection' });
      
      return true;
    }
    
    console.warn('[SocketContext] Cannot send message: Socket not connected');
    return false;
  };

  const sendTypingStatus = (conversationId, isTyping) => {
    if (socket && isConnected) {
        // Match backend event name 'typing'
        console.log(`[SocketContext] Sending typing status: ${isTyping} for conversation: ${conversationId}`);
        socket.emit('typing', { conversationId, isTyping });
        return true;
    }
    return false;
  };

  // Function to remove a notification from the list
  const removeNotification = (conversationId) => {
    console.log(`[SocketContext] Removing notifications for conversation: ${conversationId}`);
    setNotifications(prev => prev.filter(note => note.conversationId !== conversationId));
  };

  // Example: Needs 'userStatus' listener enabled above and backend emitting it
  const isUserOnline = (userId) => {
      // return !!onlineUsers[userId];
      console.warn("isUserOnline function requires userStatus listener and state management");
      return false; // Placeholder
  };

  // --- Context Value ---
  const value = {
    socket, // Provide socket instance if needed by components directly (usually not)
    isConnected,
    incomingCall,
    clearIncomingCall,
    initiateVideoCall, // API call
    sendCallSignal,     // Socket emit
    sendCallResponse,   // Socket emit
    endCall,            // Socket emit
    // Other functions
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTypingStatus,
    isUserOnline,
    notifications,
    removeNotification
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
// --- END ADDITION ---

// Export the context and provider
export { SocketContext, SocketProvider }; // <-- MODIFIED EXPORT