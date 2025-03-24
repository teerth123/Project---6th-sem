import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    min: 3,
    max: 20
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: true,
    min: 6
  },
  name: {
    type: String,
    required: true,
    max: 50
  },
  roleDescription: {
    type: String,
    max: 500
  },
  uniqueCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  connections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingConnections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  if (this.isModified('uniqueCode')) {
    this.uniqueCode = this.uniqueCode.replace(/[\s-]/g, '').toUpperCase();
  }
  next();
});

// Method to check if password matches
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add an index for faster lookups
UserSchema.index({ uniqueCode: 1 });

const User = mongoose.model('User', UserSchema);

export default User; 