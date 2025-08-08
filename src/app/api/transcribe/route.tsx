import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

// POST /api/transcribe
export async function POST(req: Request) {
  try {
    const { filePath } = await req.json(); // Example: "output_folder/<uuid>/input.wav"
    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
    }

    const absPath = path.resolve("public", filePath); // Full path to input.wav

    if (!fs.existsSync(absPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new Promise((resolve) => {
      const pythonPath = "E:\\MERN Learn\\Second Project\\audio\\.venv\\Scripts\\python.exe";

      const process = spawn(pythonPath, ["vocal-remover/transcribe.py", absPath]);

      let output = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        console.error("Whisper Error:", data.toString());
      });

      process.on("close", () => {
        resolve(NextResponse.json({ lyrics: output.trim() }));
      });
    });
  } catch (err) {
    console.error("Transcription API Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
