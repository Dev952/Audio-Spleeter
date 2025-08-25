import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Always lowercase before checking
    const emailLower = email.toLowerCase();

    await dbConnect(); 

    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure password is defined
    const valid = user.password && (await bcrypt.compare(password, user.password));
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Use the correct enum value - try one of these common options:
    await LoginHistory.create({ 
      userId: user._id, 
      action: "login" // Changed from "Logged in" to "login"
    });

    // Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in .env.local");
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return user info (without sensitive data) for frontend use
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name, // Adjust based on your User model fields
    };

    return NextResponse.json({ 
      message: "Login successful", 
      token,
      user: userResponse 
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}