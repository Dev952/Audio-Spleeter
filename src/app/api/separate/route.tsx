import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

// POST request handler
export async function POST(req: NextRequest) {
  try {
    // Get uploaded file from form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    // Generate UUID folder name
    const uuid = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create upload directory
    const baseDir = path.join(process.cwd(), "public", "uploads", uuid);
    await mkdir(baseDir, { recursive: true });

    // Save uploaded file as input.wav
    const inputPath = path.join(baseDir, "input.wav");
    await writeFile(inputPath, buffer);

    // Prepare Python command
    const pythonArgs = [
      "vocal-remover/inference.py", // Your script path
      "--input",
      inputPath,
      "--output_dir",
      baseDir,
      "--pretrained_model",
      "vocal-remover/models/baseline.pth",
    ];

    const python = spawn("python", pythonArgs);

    // Create stream to send live updates to frontend
    const stream = new ReadableStream({
      start(controller) {
        // Listen for stdout from Python
        python.stdout.on("data", (data) => {
          const text = data.toString();

          // Match progress from PROGRESS:xx
          const match = text.match(/PROGRESS:(\d+)/);
          if (match) {
            controller.enqueue(`PROGRESS:${match[1]}\n`); // Send to frontend
          }
        });

        // Optional: print Python errors
        python.stderr.on("data", (data) => {
          console.error("Python error:", data.toString());
        });

        // When Python process finishes
        python.on("close", (code) => {
          if (code === 0) {
            // Send final 100% just in case
            controller.enqueue(`PROGRESS:100\n`);

            // Send result paths to frontend as JSON
            controller.enqueue(
              JSON.stringify({
                type: "result",
                folder: `uploads/${uuid}`,
                vocals: `/uploads/${uuid}/input_Vocals.wav`,
                instrumental: `/uploads/${uuid}/input_Instruments.wav`,
              }) + "\n"
            );
          } else {
            controller.error("Python process failed");
          }
          controller.close(); // End stream
        });
      },
    });

    // Return streaming response to frontend
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("Server error:", err);
    return new Response(err.message || "Internal Server Error", {
      status: 500,
    });
  }
}
