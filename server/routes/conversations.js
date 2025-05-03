// routes/conversations.js
// (Assuming this file structure exists based on index.js)

import express from 'express';
import {
  findUserByCode,
  getConversation,
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
  initiateVideoCall, // Ensure this is imported
  uploadMedia // Assuming upload is also in this controller, adjust if needed
} from '../controllers/conversationController.js'; // Verify path
import { protect } from '../middleware/authMiddleware.js'; // <-- IMPORTANT: Use your actual auth middleware import and function name

const router = express.Router();

// Your existing conversation routes...
router.get('/find-user/:code', protect, findUserByCode);
router.get('/', protect, getConversations);
router.get('/:conversationId', protect, getConversation);
router.post('/start/:userId', protect, startConversation);
router.get('/:conversationId/messages', protect, getMessages);
router.post('/:conversationId/messages', protect, sendMessage);

// --- ADDITION: Video Call Initiation Route ---
// This links the frontend API call to your existing controller function
router.post('/:conversationId/call/initiate', protect, initiateVideoCall);
// --- END ADDITION ---

// NOTE: You likely don't need separate API routes for signal/response
// as your socket.js handles these directly via socket events.

// Assuming upload route might be here or in uploadRoutes.js as per index.js
// If upload is handled by conversationController.js, keep it here:
// router.post('/upload', protect, uploadMedia); // Example if upload is here

export default router;