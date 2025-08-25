import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // always lowercase before checking
    const emailLower = email.toLowerCase();

    await dbConnect(); 

    const user = await User.findOne({ email :  emailLower  });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure password is defined
    const valid = user.password && (await bcrypt.compare(password, user.password));
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await LoginHistory.create({ userId: user._id, action: "Logged in" });

    //  Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in .env.local");
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return NextResponse.json({ message: "Login successful", token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
