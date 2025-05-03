// --- /models/Message.js ---
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      default: '' //text is no longer required
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document'],
      default: 'text'
    },
    fileUrl: {
      type: String,
      default: undefined // Make fileUrl optional
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', MessageSchema);

export default Message;
