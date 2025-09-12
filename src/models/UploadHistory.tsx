import { Schema, model, models } from 'mongoose';

const UploadHistorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  originalFileSize: {
    type: Number,
    required: true
  },
  folderPath: {
    type: String,
    required: true
  },
  vocalsFilePath: {
    type: String,
    required: false // Not required for effects processing
  },
  instrumentalFilePath: {
    type: String,
    required: false // Not required for effects processing
  },
  processedAudioUrl: {
    type: String,
    required: false // For effects processing results
  },
  processingType: {
    type: String,
    enum: ['separation', 'effects'],
    default: 'separation'
  },
  processingStatus: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    index: true
  },
  processingStartTime: {
    type: Date,
    default: Date.now
  },
  processingEndTime: {
    type: Date
  },
  processingDuration: {
    type: Number // Duration in seconds
  },
  errorMessage: {
    type: String
  },
  fileFormat: {
    type: String,
    required: true
  },
  // Audio analysis results
  audioKey: {
    type: String // Detected musical key (e.g., "C major", "A minor")
  },
  audioBpm: {
    type: Number // Detected BPM
  },
  // Effects applied (for effects processing)
  effectsApplied: {
    pitch: {
      type: String // e.g., "+5 semitones", "-2 semitones"
    },
    speed: {
      type: String // e.g., "1.2x speed", "0.8x speed"
    },
    reverb: {
      type: String // e.g., "FFmpeg reverb level 5"
    }
  },
  // Additional processing info
  processingInfo: {
    originalDuration: Number,
    finalDuration: Number,
    speedFactor: Number,
    reverbLevel: Number
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Add compound indexes for better query performance
UploadHistorySchema.index({ userId: 1, createdAt: -1 });
UploadHistorySchema.index({ userId: 1, processingStatus: 1 });
UploadHistorySchema.index({ userId: 1, processingType: 1 });

// Export the model
export default models.UploadHistory || model('UploadHistory', UploadHistorySchema);