import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    // Input validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    
    // Debug: Check connection string (remove after testing)
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('MONGODB_URI first 50 chars:', process.env.MONGODB_URI?.substring(0, 50));
    
    await dbConnect();

    // Check if user already exists
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
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

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    // Success response WITHOUT token (forces user to login)
    return NextResponse.json({
      message: "User created successfully",
      user: userWithoutPassword
    }, { status: 201 });

  } catch (err: any) {
    console.error("Registration error:", err);
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}