import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExtension);
  },
});

const upload = multer({ storage: storage });

// @desc    Find a user by unique code
// @route   GET /api/conversations/find-user/:code
// @access  Private
export const findUserByCode = async (req, res) => {
  try {
    const { code } = req.params;
    console.log("code from req: ", code);

    if (!code || code.trim() === '') {
      return res.status(400).json({ message: 'Code is required' });
    }

    // Remove spaces from the input code
    const formattedCode = code.replace(/\s+/g, '');
    console.log("Formated code ", formattedCode);

    // Find the user by unique code (with hyphens)
    const user = await User.findOne({ uniqueCode: formattedCode })
      .select('_id username name roleDescription uniqueCode');

    if (!user) {
      return res.status(404).json({ message: 'User not found with this code' });
    }

    // Prevent finding yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot start a conversation with yourself' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Error in findUserByCode:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a specific conversation
// @route   GET /api/conversations/:conversationId
// @access  Private
export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Find the conversation and check if user is a participant
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username name uniqueCode');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a participant
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('Error in getConversation:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Start or get a conversation with a user
// @route   POST /api/conversations/start/:userId
// @access  Private
export const startConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if users are connected
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.connections.includes(userId)) {
      // Check if there's a pending connection
      if (currentUser.pendingConnections.includes(userId)) {
        return res.status(400).json({
          message: 'This user has sent you a connection request. Accept it to start a conversation.',
          isPending: true,
          pendingUserId: userId,
        });
      }

      // Check if the other user has a pending connection from current user
      const otherUser = await User.findById(userId);
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (otherUser.pendingConnections.includes(req.user._id)) {
        return res.status(400).json({
          message: 'You have sent a connection request to this user. Wait for them to accept it.',
          isRequested: true,
        });
      }

      // No connection exists, send a connection request
      await User.findByIdAndUpdate(userId, {
        $push: { pendingConnections: req.user._id },
      });

      return res.status(200).json({
        message: 'Connection request sent. You can start a conversation once they accept.',
        isRequested: true,
      });
    }

    // Sort participant IDs to ensure consistent order
    const participantIds = [req.user._id, userId].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );

    // Find existing conversation or create a new one
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
      $or: [
        { 'participants.0': participantIds[0], 'participants.1': participantIds[1] },
        { 'participants.0': participantIds[1], 'participants.1': participantIds[0] },
      ],
    }).populate('participants', 'username name uniqueCode');

    if (!conversation) {
      try {
        // Create a new conversation with sorted participants
        conversation = new Conversation({
          participants: participantIds,
          unreadCount: new Map([
            [participantIds[0].toString(), 0],
            [participantIds[1].toString(), 0],
          ]),
        });

        await conversation.save();

        // Populate participants after saving
        conversation = await Conversation.findById(conversation._id)
          .populate('participants', 'username name uniqueCode');
      } catch (convErr) {
        console.error('Error creating conversation:', convErr);
        // If there was an error creating, check if it's a duplicate key error
        if (convErr.code === 11000) {
          // Try to find the conversation again (it might have been created by another request)
          conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, userId] },
          }).populate('participants', 'username name uniqueCode');

          if (!conversation) {
            throw new Error('Could not find or create conversation');
          }
        } else {
          throw convErr;
        }
      }
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error('Error starting conversation:', err);
    res.status(500).json({ message: 'Failed to start conversation', error: err.message });
  }
};

// @desc    Get all conversations for a user
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username name uniqueCode')
      .sort({ lastMessageTime: -1 });

    res.status(200).json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: req.user._id },
        read: false,
      },
      { read: true }
    );

    // Reset unread count for this user
    const unreadCount = conversation.unreadCount || new Map();
    unreadCount.set(req.user._id.toString(), 0);

    await Conversation.findByIdAndUpdate(conversationId, {
      unreadCount,
    });

    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message in a conversation
// @route   POST /api/conversations/:conversationId/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, type, fileUrl } = req.body;  // Changed to accept type and fileUrl

    if (!text && !fileUrl) {
      return res.status(400).json({ message: 'Message text or file is required' });
    }

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Create new message
    const newMessage = new Message({
      conversationId,
      sender: req.user._id,
      text: text || '', // text can be empty for media messages
      type: type || 'text', // default to text
      fileUrl: fileUrl || undefined, // store fileUrl, set to undefined if not provided
    });

    const savedMessage = await newMessage.save();

    // Update conversation with last message
    const otherParticipant = conversation.participants.find(
      p => p.toString() !== req.user._id.toString()
    );

    // Update unread count for other participant
    const unreadCount = conversation.unreadCount || new Map();
    const currentCount = unreadCount.get(otherParticipant.toString()) || 0;
    unreadCount.set(otherParticipant.toString(), currentCount + 1);

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: type === 'text' ? text : `Sent ${type}`, //show last message
      lastMessageTime: new Date(),
      unreadCount,
    });

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Message data to emit
    const messageData = {
      _id: savedMessage._id,
      conversationId,
      sender: req.user._id,
      senderName: req.user.name,
      text: savedMessage.text,
      type: savedMessage.type,
      fileUrl: savedMessage.fileUrl,
      createdAt: savedMessage.createdAt,
      read: false,
    };

    // Emit messages to all participants
    if (io) {
      console.log('Emitting real-time updates for new message');
      
      try {
        // Emit to conversation room (for users who are currently in the chat)
        console.log(`Broadcasting to conversation room: ${conversationId}`);
        io.to(conversationId).emit('newMessage', messageData);
        
        // Broadcast directly to all sockets
        console.log('Broadcasting message to all connected sockets');
        io.emit('newMessage', {
          ...messageData,
          broadcastTimestamp: new Date()
        });

        // Emit to sender's personal room (to ensure they get it even if not in conversation room)
        console.log(`Emitting to sender's personal room: ${req.user._id.toString()}`);
        io.to(req.user._id.toString()).emit('newMessage', messageData);

        // Emit to other participant's personal room (notification for when they're not in the conversation)
        console.log(`Emitting notification to recipient: ${otherParticipant.toString()}`);
        io.to(otherParticipant.toString()).emit('messageNotification', {
          conversationId,
          message: messageData,
        });

        // Also broadcast to all connected clients so they can update their lists
        console.log('Broadcasting messageUpdate to all clients');
        io.emit('messageUpdate', {
          conversationId,
          lastMessage: type === 'text' ? text : `Sent ${type}`,
          lastMessageTime: new Date(),
        });
        
        // Log connected clients for debug
        const sockets = await io.fetchSockets();
        console.log(`Number of connected sockets: ${sockets.length}`);
        console.log('Connected socket IDs:', sockets.map(s => s.id).join(', '));
      } catch (err) {
        console.error('Error broadcasting message:', err);
      }
    } else {
      console.log('Socket.IO instance not available, cannot emit real-time updates');
    }

    res.status(201).json(savedMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Initiate a video call to a user
// @route   POST /api/conversations/:conversationId/call/initiate
// @access  Private
export const initiateVideoCall = async (req, res) => {
  try {
    console.log('Video call initiation requested for conversation:', req.params.conversationId);
    const { conversationId } = req.params;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username name uniqueCode');

    if (!conversation) {
      console.error('Conversation not found for ID:', conversationId);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      console.error('User is not a participant in this conversation');
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    // Find the other participant
    const recipient = conversation.participants.find(p => p._id.toString() !== req.user._id.toString());

    if (!recipient) {
      console.error('Unable to find call recipient in conversation');
      return res.status(400).json({ message: 'Unable to find call recipient' });
    }

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Generate a unique call ID
    const callId = `${conversationId}-${Date.now()}`;
    console.log('Generated call ID:', callId);

    // Emit call initiation to recipient
    if (io) {
      console.log('Emitting incomingCall event to recipient:', recipient._id.toString());
      io.to(recipient._id.toString()).emit('incomingCall', {
        callId,
        caller: {
          _id: req.user._id,
          name: req.user.name,
          username: req.user.username,
        },
        conversationId,
      });
      console.log('incomingCall event emitted successfully');
    } else {
      console.error('Socket.io instance not available');
      return res.status(500).json({ message: 'Video call service is currently unavailable' });
    }

    console.log('Sending call initiation response');
    res.status(200).json({
      callId,
      recipient: {
        _id: recipient._id,
        name: recipient.name,
        username: recipient.username,
      },
    });
  } catch (err) {
    console.error('Error initiating video call:', err);
    res.status(500).json({ message: 'Failed to initiate call', error: err.message });
  }
};

// @desc    Forward WebRTC signaling data
// @route   POST /api/conversations/call/signal
// @access  Private
export const signalCall = async (req, res) => {
  try {
    console.log('Received call signal from user:', req.user._id);
    const { recipientId, signal, callId } = req.body;

    if (!recipientId || !signal || !callId) {
      console.error('Missing required fields:', {
        hasRecipientId: !!recipientId,
        hasSignal: !!signal,
        hasCallId: !!callId,
      });
      return res.status(400).json({ message: 'Recipient ID, signal data, and call ID are required' });
    }

    console.log('Signal for call:', callId, 'to recipient:', recipientId);

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Forward the signal to the recipient
    if (io) {
      console.log('Forwarding signal via socket.io');
      io.to(recipientId).emit('callSignal', {
        signal,
        callId,
        from: {
          _id: req.user._id,
          name: req.user.name,
          username: req.user.username,
        },
      });
      console.log('Signal forwarded successfully');
      res.status(200).json({ success: true });
    } else {
      console.error('Socket.io instance not available for signal forwarding');
      res.status(500).json({ message: 'Video call service is currently unavailable' });
    }
  } catch (err) {
    console.error('Error in call signaling:', err);
    res.status(500).json({ message: 'Failed to forward signal', error: err.message });
  }
};

// @desc    Handle call response (accept/decline)
// @route   POST /api/conversations/call/response
// @access  Private
export const respondToCall = async (req, res) => {
  try {
    console.log('Call response received from user:', req.user._id);
    const { callId, callerId, accepted } = req.body;

    if (!callId || !callerId) {
      console.error('Missing required fields:', {
        hasCallId: !!callId,
        hasCallerId: !!callerId,
        responseType: accepted ? 'accept' : 'decline',
      });
      return res.status(400).json({ message: 'Call ID and caller ID are required' });
    }

    console.log(`User ${req.user.username} ${accepted ? 'accepted' : 'declined'} call ${callId} from caller ${callerId}`);

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Forward the response to the caller
    if (io) {
      console.log('Forwarding call response via socket.io');
      io.to(callerId).emit('callResponse', {
        callId,
        accepted,
        from: {
          _id: req.user._id,
          name: req.user.name,
          username: req.user.username,
        },
      });
      console.log('Call response forwarded successfully');
      res.status(200).json({ success: true });
    } else {
      console.error('Socket.io instance not available for call response');
      res.status(500).json({ message: 'Video call service is currently unavailable' });
    }
  } catch (err) {
    console.error('Error in call response:', err);
    res.status(500).json({ message: 'Failed to respond to call', error: err.message });
  }
};

// @desc    Upload media file
// @route   POST /api/upload
// @access  Private
export const uploadMedia = async (req, res) => {
  try {
    console.log('uploadMedia controller hit');
    // Use the upload middleware defined above
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(500).json({ message: 'File upload failed', error: err.message });
      }

      // Check if file was uploaded
      if (!req.file) {
        console.error('No file provided');
        return res.status(400).json({ message: 'No file provided' });
      }
      console.log('File uploaded successfully:', req.file);


      try {
        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto', // Auto-detect the type of file
          folder: 'chat_app_media', // Optional folder in Cloudinary
        });

        console.log('Cloudinary result:', result);
        // Return the Cloudinary URL
        res.status(200).json({
          url: result.secure_url,
          type: result.resource_type, // Return the type (image, video, raw)
        });
      } catch (cloudinaryErr) {
        console.error('Cloudinary error:', cloudinaryErr);
        return res.status(500).json({ message: 'Failed to upload to Cloudinary', error: cloudinaryErr.message });
      }
    });
  } catch (err) {
    console.error('Error in uploadMedia:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

