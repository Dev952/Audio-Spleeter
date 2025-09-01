import mongoose from "mongoose";

const LoginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "login", 
      "register", 
      "logout", 
      "password_reset",          
      "forgot_password_request", 
      "password_reset_attempt"  
    ],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    required: false, // Optional field for tracking IP
  },
  userAgent: {
    type: String,
    required: false, // Optional field for tracking browser/device
  },
});

// Index for faster queries
LoginHistorySchema.index({ userId: 1, date: -1 });
  
const LoginHistory = mongoose.models.LoginHistory || mongoose.model("LoginHistory", LoginHistorySchema);

export default LoginHistory;