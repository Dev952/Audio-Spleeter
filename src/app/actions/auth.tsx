'use server'

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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