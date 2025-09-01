'use server'

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";
import PasswordReset from "@/models/PasswordReset"; 
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import nodemailer from 'nodemailer';

// Types for better type safety
interface LoginResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

interface RegisterResult {
  success: boolean;
  message: string;
  user?: any;
  error?: string;
}

interface UserResult {
  success: boolean;
  user?: any;
  error?: string;
}

interface HistoryResult {
  success: boolean;
  history?: any[];
  error?: string;
}

interface ForgotPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

interface ResetPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

interface VerifyCodeResult {
  success: boolean;
  message: string;
  error?: string;
}

// Email configuration - Alternative services
const createTransporter = () => {
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,  
    },
  });

 
};

// Generate 6-digit verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Login Action
export async function loginUser(formData: FormData): Promise<LoginResult> {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { success: false, error: "Email and password are required", message: "" };
    }

    const emailLower = email.toLowerCase();
    await dbConnect();

    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return { success: false, error: "User not found", message: "" };
    }

    const valid = user.password && (await bcrypt.compare(password, user.password));
    if (!valid) {
      return { success: false, error: "Invalid password", message: "" };
    }

    // Save login history
    await LoginHistory.create({
      userId: user._id,
      action: "login"
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in .env.local");
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set httpOnly cookie - AWAIT cookies()
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 1 day
    });

    // Serialize user data properly - convert ObjectId to string
    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    return {
      success: true,
      message: "Login successful",
      user: userResponse
    };

  } catch (err: any) {
    console.error("Login error:", err);
    return { success: false, error: err.message, message: "" };
  }
}

// 2. Register Action
export async function registerUser(formData: FormData): Promise<RegisterResult> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Input validation
    if (!name || !email || !password) {
      return {
        success: false,
        error: "Name, email, and password are required",
        message: ""
      };
    }

    // Password strength validation
    if (password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long",
        message: ""
      };
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Please enter a valid email address",
        message: ""
      };
    }

    const emailLower = email.toLowerCase().trim();

    await dbConnect();

    // Check if user already exists
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return {
        success: false,
        error: "User already exists",
        message: ""
      };
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
    });

    // Save login history
    await LoginHistory.create({
      userId: user._id,
      action: "register",
    });

    // Serialize user data properly - convert to plain object
    const userWithoutPassword = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    };

    return {
      success: true,
      message: "User created successfully",
      user: userWithoutPassword
    };

  } catch (err: any) {
    console.error("Registration error:", err);

    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return {
        success: false,
        error: "User already exists",
        message: ""
      };
    }

    return {
      success: false,
      error: "Internal server error",
      message: ""
    };
  }
}

// 3. Get Current User (from token in cookies)
export async function getCurrentUser(): Promise<UserResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return {
        success: false,
        error: "No token provided"
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    await dbConnect();

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return {
        success: false,
        error: "User not found"
      };
    }

    // Serialize user data properly
    const serializedUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    };

    return {
      success: true,
      user: serializedUser
    };

  } catch (err: any) {
    console.error("Get current user error:", err);
    return {
      success: false,
      error: "Invalid token"
    };
  }
}

// 4. Get User by Email
export async function getUserByEmail(formData: FormData): Promise<UserResult> {
  try {
    await dbConnect();

    const email = formData.get('email') as string;

    if (!email) {
      return {
        success: false,
        error: "Email is required"
      };
    }

    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower }).select("-password");

    if (!user) {
      return {
        success: false,
        error: "User not found"
      };
    }

    // Serialize user data properly
    const serializedUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    };

    return {
      success: true,
      user: serializedUser
    };

  } catch (err: any) {
    console.error("Get user error:", err);
    return {
      success: false,
      error: "Internal server error"
    };
  }
}

// 5. Get Login History
export async function getLoginHistory(): Promise<HistoryResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return {
        success: false,
        error: "No token provided"
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    await dbConnect();

    const history = await LoginHistory.find({ userId: decoded.userId })
      .sort({ date: -1 })
      .limit(10)
      .select('action date')
      .lean();

    // Format the history with proper timestamps and serialize properly
    const formattedHistory = history.map(item => ({
      action: item.action,
      date: item.date ? new Date(item.date).toISOString() : null,
      timestamp: item.date ? new Date(item.date).toISOString() : null,
      formattedDate: item.date ? new Date(item.date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) : null
    }));

    return {
      success: true,
      history: formattedHistory
    };

  } catch (error: any) {
    console.error("History fetch error:", error);
    return {
      success: false,
      error: "Invalid token"
    };
  }
}

// 6. Logout Action
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  redirect('/login'); // Redirect to login page after logout
}

// 7. Forgot Password - Send Verification Code
export async function forgotPassword(formData: FormData): Promise<ForgotPasswordResult> {
  try {
    const email = formData.get('email') as string;

    if (!email) {
      return {
        success: false,
        error: "Email is required",
        message: ""
      };
    }

    const emailLower = email.toLowerCase().trim();
    await dbConnect();

    // Check if user exists
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return {
        success: false,
        error: "User not found with this email",
        message: ""
      };
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing password reset tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    // Create new password reset token
    await PasswordReset.create({
      userId: user._id,
      email: emailLower,
      code: verificationCode,
      expiresAt: expiresAt
    });

    // Send email with verification code
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailLower,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>${user.name}</strong>,</p>
            
            <p style="font-size: 16px; color: #666; line-height: 1.5; margin-bottom: 30px;">
              You requested to reset your password. Please use the verification code below to proceed:
            </p>
            
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); padding: 25px; text-align: center; border-radius: 10px; margin: 30px 0;">
              <p style="color: white; font-size: 14px; margin-bottom: 10px; opacity: 0.9;">Your Verification Code:</p>
              <h1 style="color: white; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${verificationCode}</h1>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ⏰ This code will expire in <strong>15 minutes</strong>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #999; line-height: 1.5; margin-top: 30px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #999; margin: 0;">
              Best regards,<br>
              <strong style="color: #8B5CF6;">Your App Team</strong>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Verification code sent to your email"
    };

  } catch (err: any) {
    console.error("Forgot password error:", err);
    return {
      success: false,
      error: "Failed to send verification code. Please try again.",
      message: ""
    };
  }
}

// 8. Verify Reset Code
export async function verifyResetCode(formData: FormData): Promise<VerifyCodeResult> {
  try {
    const email = formData.get('email') as string;
    const code = formData.get('code') as string;

    if (!email || !code) {
      return {
        success: false,
        error: "Email and verification code are required",
        message: ""
      };
    }

    const emailLower = email.toLowerCase().trim();
    await dbConnect();

    // Check if the code is valid and not expired
    const passwordReset = await PasswordReset.findOne({
      email: emailLower,
      code: code,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return {
        success: false,
        error: "Invalid or expired verification code",
        message: ""
      };
    }

    return {
      success: true,
      message: "Verification code is valid"
    };

  } catch (err: any) {
    console.error("Verify code error:", err);
    return {
      success: false,
      error: "Failed to verify code",
      message: ""
    };
  }
}

// 9. Reset Password with Verification Code
export async function resetPassword(formData: FormData): Promise<ResetPasswordResult> {
  try {
    const email = formData.get('email') as string;
    const code = formData.get('code') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!email || !code || !newPassword) {
      return {
        success: false,
        error: "Email, verification code, and new password are required",
        message: ""
      };
    }

    // Password validation
    if (newPassword.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long",
        message: ""
      };
    }

    const emailLower = email.toLowerCase().trim();
    await dbConnect();

    // Find valid password reset token
    const passwordReset = await PasswordReset.findOne({
      email: emailLower,
      code: code,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return {
        success: false,
        error: "Invalid or expired verification code",
        message: ""
      };
    }

    // Find the user
    const user = await User.findById(passwordReset.userId);
    if (!user) {
      return {
        success: false,
        error: "User not found",
        message: ""
      };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      updatedAt: new Date()
    });

    // Delete the used password reset token
    await PasswordReset.deleteOne({ _id: passwordReset._id });

    return {
      success: true,
      message: "Password reset successfully"
    };

  } catch (err: any) {
    console.error("Reset password error:", err);
    return {
      success: false,
      error: "Failed to reset password",
      message: ""
    };
  }
}