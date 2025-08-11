import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const { filePath } = await req.json();
    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
    }

    const absPath = path.resolve("public", filePath);
    if (!fs.existsSync(absPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new Promise((resolve) => {
      const pythonPath = path.resolve(".venv", "Scripts", "python.exe"); // relative to project
      const process = spawn(pythonPath, ["vocal-remover/transcribe.py", absPath]);

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          console.error("Python process failed:", errorOutput);
          resolve(NextResponse.json(
            { error: "Transcription failed", details: errorOutput.trim() },
            { status: 500 }
          ));
        } else {
          resolve(NextResponse.json({ lyrics: output.trim() }));
        }
      });
    });
  } catch (err) {
    console.error("Transcription API Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
