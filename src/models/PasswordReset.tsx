import mongoose from "mongoose";

const PasswordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    length: 6, // 6-digit code
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // Auto-delete expired documents
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
PasswordResetSchema.index({ email: 1, code: 1 });
PasswordResetSchema.index({ userId: 1 });

const PasswordReset = mongoose.models.PasswordReset || mongoose.model("PasswordReset", PasswordResetSchema);

export default PasswordReset;