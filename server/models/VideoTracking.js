import mongoose from 'mongoose';

const VideoTrackingSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    totalWatchTime: {
      type: Number,
      default: 0
    },
    watchPercentage: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    segments: [{
      start: Number,
      end: Number
    }],
    interactions: [{
      type: {
        type: String,
        enum: ['play', 'pause', 'seek']
      },
      videoTime: Number,
      from: Number,
      to: Number,
      timestamp: Date
    }],
    watchDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Create a compound index for videoId and userId
VideoTrackingSchema.index({ videoId: 1, userId: 1 });

const VideoTracking = mongoose.model('VideoTracking', VideoTrackingSchema);

export default VideoTracking; 