import mongoose from "mongoose";

const UploadHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  originalFileSize: {
    type: Number,
    required: true,
  },
  folderPath: {
    type: String,
    required: true,
  },
  vocalsFilePath: {
    type: String,
    required: true,
  },
  instrumentalFilePath: {
    type: String,
    required: true,
  },
  processingStatus: {
    type: String,
    enum: ["processing", "completed", "failed"],
    default: "processing",
  },
  processingStartTime: {
    type: Date,
    default: Date.now,
  },
  processingEndTime: {
    type: Date,
  },
  processingDuration: {
    type: Number, // in seconds
  },
  errorMessage: {
    type: String,
  },
  fileFormat: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
UploadHistorySchema.index({ userId: 1, createdAt: -1 });
UploadHistorySchema.index({ processingStatus: 1 });

// Update timestamp on save
UploadHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const UploadHistory = mongoose.models.UploadHistory || mongoose.model("UploadHistory", UploadHistorySchema);

export default UploadHistory;