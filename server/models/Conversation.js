// --- /models/Conversation.js ---
import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageTime: {
      type: Date,
      default: Date.now
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

// Ensure we only have one conversation between the same pair of participants
// But allow a participant to be in multiple conversations with different users
// Remove the previous unique index
ConversationSchema.index({ participants: 1 });

// Add a custom compound index
ConversationSchema.index({ "participants.0": 1, "participants.1": 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', ConversationSchema);

export default Conversation;
