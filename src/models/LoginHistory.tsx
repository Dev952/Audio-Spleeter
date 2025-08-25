import mongoose, { Schema, Document } from "mongoose";

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  date: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoginHistorySchema = new Schema<ILoginHistory>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { 
    type: String, 
    required: true,
    enum: ['register', 'login', 'logout', 'failed_login', 'password_change']
  },
  date: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Add index for better query performance
LoginHistorySchema.index({ userId: 1, date: -1 });

export default mongoose.models.LoginHistory ||
  mongoose.model<ILoginHistory>("LoginHistory", LoginHistorySchema);