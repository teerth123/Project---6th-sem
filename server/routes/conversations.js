import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  findUserByCode,
  getConversation,
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
  initiateVideoCall,
  signalCall,
  respondToCall
} from '../controllers/conversationController.js';

const router = express.Router();

// Find user by unique code
router.get('/find-user/:code', protect, findUserByCode);

// Get a specific conversation
router.get('/:conversationId', protect, getConversation);

// Start or get a conversation with a user
router.post('/start/:userId', protect, startConversation);

// Get all conversations for a user
router.get('/', protect, getConversations);

// Get messages for a conversation
router.get('/:conversationId/messages', protect, getMessages);

// Send a message in a conversation
router.post('/:conversationId/messages', protect, sendMessage);

// Video call routes
router.post('/:conversationId/call/initiate', protect, initiateVideoCall);
router.post('/call/signal', protect, signalCall);
router.post('/call/response', protect, respondToCall);

export default router; 