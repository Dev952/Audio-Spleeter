import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import LoginHistory from "@/models/LoginHistory";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    await dbConnect();

    const history = await LoginHistory.find({ userId: decoded.userId })
      .sort({ date: -1 })
      .limit(10)
      .select('action date')
      .lean(); // Use lean() for better performance

    // Format the history with proper timestamps
    const formattedHistory = history.map(item => ({
      action: item.action,
      date: item.date,
      timestamp: new Date(item.date).toISOString(), // ISO string for frontend
      formattedDate: new Date(item.date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    }));

    return NextResponse.json({ history: formattedHistory });
  } catch (error: any) {
    console.error("History fetch error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}