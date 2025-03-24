import express from 'express';
import { registerUser, loginUser, getUserProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/verify-token', protect, (req, res) => res.status(200).json({ valid: true }));

export default router; 