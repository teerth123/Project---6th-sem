import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

// Map to store active users: { userId: socketId }
const activeUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // In production, restrict this to your frontend URL
      methods: ['GET', 'POST']
    }
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user._id})`);
    
    // Add user to active users map
    activeUsers.set(socket.user._id.toString(), socket.id);
    
    // Emit online status to user's connections
    emitUserStatus(socket.user._id, true);
    
    // Join personal room for direct messages
    socket.join(socket.user._id.toString());
    
    // Handle new message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, text, fileUrl, type } = data;
        
        if (!conversationId) {
          return socket.emit('error', { message: 'Conversation ID is required' });
        }
        
        // Create message object with full details
        const messageData = {
          _id: new Date().getTime().toString(), // Temporary ID until saved in DB
          conversationId,
          sender: socket.user._id,
          senderName: socket.user.name,
          text: text || '',
          type: type || 'text',
          fileUrl: fileUrl || undefined,
          createdAt: new Date(),
          read: false
        };
        
        console.log(`Received message from ${socket.user.username} in conversation ${conversationId}`);
        
        // Broadcast the message to all clients directly
        console.log(`Directly broadcasting new message to ALL clients`);
        io.emit('directNewMessage', {
          ...messageData,
          source: 'socket.js direct broadcast'
        });
        
        // Emit message to everyone in the conversation room (including sender for consistency)
        console.log(`Broadcasting message to conversation room ${conversationId}`);
        io.to(conversationId).emit('newMessage', messageData);
        
        // Get all sockets in the conversation room
        const socketsInRoom = await io.in(conversationId).fetchSockets();
        console.log(`Number of sockets in conversation room ${conversationId}: ${socketsInRoom.length}`);
        
        // Broadcast message update to all clients for real-time conversation list updates
        console.log(`Broadcasting messageUpdate to all connected clients`);
        io.emit('messageUpdate', {
          conversationId,
          lastMessage: text || `Sent ${type || 'file'}`,
          lastMessageTime: new Date()
        });
        
        // Also find all participants of the conversation in the DB to send direct notifications
        try {
          // Find conversation participants from DB
          const conversation = await import('./models/Conversation.js');
          const Conversation = conversation.default;
          
          const foundConversation = await Conversation.findById(conversationId);
          if (foundConversation && foundConversation.participants) {
            console.log(`Found conversation with ID ${conversationId}`);
            
            // Send direct notifications to all participants
            foundConversation.participants.forEach(participantId => {
              const participantSocketId = activeUsers.get(participantId.toString());
              if (participantSocketId) {
                console.log(`Sending direct notification to participant ${participantId}`);
                io.to(participantSocketId).emit('directMessage', {
                  ...messageData,
                  source: 'socket.js direct message'
                });
              }
            });
          }
        } catch (dbErr) {
          console.error('Error finding conversation in DB:', dbErr);
        }
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing status
    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data;
      
      socket.to(conversationId).emit('userTyping', {
        userId: socket.user._id,
        username: socket.user.username,
        isTyping
      });
    });
    
    // Handle joining a conversation
    socket.on('joinConversation', (conversationId) => {
      if (conversationId) {
        socket.join(conversationId);
        console.log(`User ${socket.user.username} joined conversation ${conversationId}`);
      }
    });
    
    // Handle leaving a conversation
    socket.on('leaveConversation', (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId);
        console.log(`User ${socket.user.username} left conversation ${conversationId}`);
      }
    });
    
    // Handle video call signaling
    socket.on('callSignal', (data) => {
      const { recipientId, signal, callId } = data;
      
      if (!recipientId || !signal || !callId) {
        console.error('Invalid call signal data received:', data);
        return socket.emit('error', { 
          message: 'Recipient ID, signal data, and call ID are required for call signaling' 
        });
      }
      
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        console.log(`Forwarding call signal from ${socket.user.username} to recipient ${recipientId} for call ${callId}`);
        io.to(recipientSocketId).emit('callSignal', {
          signal,
          callId,
          from: {
            _id: socket.user._id,
            name: socket.user.name,
            username: socket.user.username
          }
        });
      } else {
        console.error(`Cannot forward call signal: Recipient ${recipientId} is not online or not found`);
        socket.emit('error', { message: 'Recipient is offline or not available' });
      }
    });
    
    // Handle call acceptance/decline response
    socket.on('callResponse', (data) => {
      const { callId, callerId, accepted } = data;
      
      if (!callerId || !callId) {
        console.error('Invalid call response data:', data);
        return socket.emit('error', { message: 'Caller ID and call ID are required' });
      }
      
      const callerSocketId = activeUsers.get(callerId);
      
      if (callerSocketId) {
        console.log(`Forwarding call response (${accepted ? 'accepted' : 'declined'}) from ${socket.user.username} to caller ${callerId} for call ${callId}`);
        io.to(callerSocketId).emit('callResponse', {
          callId,
          accepted,
          from: {
            _id: socket.user._id,
            name: socket.user.name,
            username: socket.user.username
          }
        });
      } else {
        console.error(`Cannot forward call response: Caller ${callerId} is not online or not found`);
        socket.emit('error', { message: 'Caller is offline or not available' });
      }
    });
    
    // Handle ending a call
    socket.on('endCall', (data) => {
      const { callId, recipientId } = data;
      
      if (!callId || !recipientId) {
        console.error('Invalid end call data:', data);
        return socket.emit('error', { message: 'Call ID and recipient ID are required' });
      }
      
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        console.log(`Sending call end notification from ${socket.user.username} to recipient ${recipientId} for call ${callId}`);
        io.to(recipientSocketId).emit('callEnded', { 
          callId,
          userId: socket.user._id
        });
      } else {
        console.error(`Cannot send call end notification: Recipient ${recipientId} is not online or not found`);
      }
      
      // Also emit to the caller to ensure both sides clean up
      console.log(`Confirming call end to caller for call ${callId}`);
      socket.emit('callEnded', { callId });
    });
    
    // Handle debug event
    socket.on('debugEvent', (data) => {
      console.log(`Debug event from user ${socket.user.username}:`, data);
      // Echo back to confirm receipt
      socket.emit('debugResponse', { 
        received: true,
        timestamp: new Date(),
        message: 'Debug event received by server'
      });
    });
    
    // Handle any errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.username}:`, error);
    });
    
    // Set up a ping/pong to verify connection
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        console.log(`Sending ping to ${socket.user.username}`);
        socket.emit('serverPing', { timestamp: new Date() });
      }
    }, 30000); // Every 30 seconds

    socket.on('clientPong', (data) => {
      console.log(`Received pong from ${socket.user.username}:`, data);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
      clearInterval(pingInterval);
      
      // Remove user from active users map
      activeUsers.delete(socket.user._id.toString());
      
      // Emit offline status to user's connections
      emitUserStatus(socket.user._id, false);
    });
  });

  // Function to emit user status to connections
  const emitUserStatus = async (userId, isOnline) => {
    try {
      // Get user's connections
      const user = await User.findById(userId).select('connections');
      
      if (user && user.connections.length > 0) {
        // Emit status to each connected user
        user.connections.forEach(connectionId => {
          const socketId = activeUsers.get(connectionId.toString());
          
          if (socketId) {
            io.to(socketId).emit('userStatus', {
              userId: userId.toString(),
              isOnline
            });
          }
        });
      }
    } catch (err) {
      console.error('Error emitting user status:', err);
    }
  };

  return io;
};

export default initializeSocket; 