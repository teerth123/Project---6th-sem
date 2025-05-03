import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { generateUniqueCode } from '../utils/codeGenerator.js';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { 
      username, 
      password, 
      name, 
      roleDescription, 
      email,
      userType,
      location,
      typeOfService,
      workExperience,
      yearsOfExperience,
      specializedSkills,
      shortBio
    } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email exists and is already in use
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Generate a unique code for the user
    const uniqueCode = await generateUniqueCode();

    // Create new user with additional fields
    const newUser = new User({
      username,
      password,
      name,
      roleDescription,
      uniqueCode,
      userType: userType || 'service_seeker', // Default to service seeker if not specified
      ...(email && { email }), // Only add email if it exists
      ...(location && { location }),
      ...(typeOfService && { typeOfService }),
      ...(workExperience && { workExperience }),
      ...(yearsOfExperience && { yearsOfExperience }),
      ...(specializedSkills && { specializedSkills }),
      ...(shortBio && { shortBio })
    });

    // Save user to database
    const savedUser = await newUser.save();
    
    res.status(201).json({
      _id: savedUser._id,
      username: savedUser.username,
      name: savedUser.name,
      uniqueCode: savedUser.uniqueCode,
      userType: savedUser.userType,
      message: 'User registered successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      name: user.name,
      uniqueCode: user.uniqueCode,
      userType: user.userType,
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        uniqueCode: user.uniqueCode,
        email: user.email,
        userType: user.userType,
        location: user.location,
        typeOfService: user.typeOfService,
        workExperience: user.workExperience,
        yearsOfExperience: user.yearsOfExperience,
        specializedSkills: user.specializedSkills,
        shortBio: user.shortBio,
        roleDescription: user.roleDescription
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}; 