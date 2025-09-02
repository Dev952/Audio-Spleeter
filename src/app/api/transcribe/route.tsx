import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const { folder, originalName } = await req.json(); // Get both folder and originalName from frontend
    if (!folder) {
      return NextResponse.json({ error: "folder is required" }, { status: 400 });
    }

    // If originalName is provided, use it to construct the vocals filename
    let vocalsFileName = "vocals.wav"; // generic fallback
    if (originalName) {
      const nameWithoutExt = path.parse(originalName).name;
      vocalsFileName = `${nameWithoutExt}_Vocals.wav`;
    }

    // Build the absolute path to the vocals file inside the given UUID folder
    const absPath = path.resolve("public", folder, vocalsFileName);

    // Check if file exists
    if (!fs.existsSync(absPath)) {
      return NextResponse.json(
        { error: `${vocalsFileName} not found in given folder` },
        { status: 404 }
      );
    }

    return new Promise((resolve) => {
      const pythonPath = path.resolve(".venv", "Scripts", "python.exe"); // adjust for your OS if needed
      const process = spawn(pythonPath, [
        "vocal-remover/transcribe.py",
        absPath
      ]);

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
          resolve(
            NextResponse.json(
              { error: "Transcription failed", details: errorOutput.trim() },
              { status: 500 }
            )
          );
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
