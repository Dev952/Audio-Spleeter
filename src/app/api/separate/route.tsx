import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import UploadHistory from "@/models/UploadHistory";

export async function POST(req: NextRequest): Promise<Response> {
  let uploadRecord: any = null;
  
  try {
    // Authentication check
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return new Response("Authentication required", { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return new Response("Invalid token", { status: 401 });
    }

    const userId = decoded.userId;

    // Get uploaded file from form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    // Generate UUID folder name
    const uuid = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract original filename without extension
    const originalName = file.name;
    const nameWithoutExt = path.parse(originalName).name;
    const fileExtension = path.parse(originalName).ext || '.wav';

    // Create upload directory
    const baseDir = path.join(process.cwd(), "public", "uploads", uuid);
    await mkdir(baseDir, { recursive: true });

    // Save uploaded file with original name (but ensure .wav extension for processing)
    const inputFileName = `${nameWithoutExt}.wav`;
    const inputPath = path.join(baseDir, inputFileName);
    await writeFile(inputPath, buffer);

    // Connect to database and create upload history record
    await dbConnect();
    
    uploadRecord = await UploadHistory.create({
      userId: userId,
      originalFileName: originalName,
      originalFileSize: file.size,
      folderPath: `uploads/${uuid}`,
      vocalsFilePath: `/uploads/${uuid}/${nameWithoutExt}_Vocals.wav`,
      instrumentalFilePath: `/uploads/${uuid}/${nameWithoutExt}_Instruments.wav`,
      processingStatus: "processing",
      processingStartTime: new Date(),
      fileFormat: fileExtension,
    });

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
        const processingStartTime = Date.now();

        // Listen for stdout from Python
        python.stdout.on("data", (data) => {
          const text = data.toString();

          // Match progress from PROGRESS:xx
          const match = text.match(/PROGRESS:(\d+)/);
          if (match) {
            controller.enqueue(new TextEncoder().encode(`PROGRESS:${match[1]}\n`)); // Send to frontend
          }
        });

        // Optional: print Python errors
        python.stderr.on("data", (data) => {
          console.error("Python error:", data.toString());
        });

        // When Python process finishes
        python.on("close", async (code) => {
          const processingEndTime = Date.now();
          const processingDuration = Math.round((processingEndTime - processingStartTime) / 1000);

          try {
            if (code === 0) {
              // Update upload record as completed
              await UploadHistory.findByIdAndUpdate(uploadRecord._id, {
                processingStatus: "completed",
                processingEndTime: new Date(),
                processingDuration: processingDuration,
              });

              // Send final 100% just in case
              controller.enqueue(new TextEncoder().encode(`PROGRESS:100\n`));

              // Send result paths to frontend as JSON with original filename
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({
                    type: "result",
                    folder: `uploads/${uuid}`,
                    originalName: originalName,
                    vocals: `/uploads/${uuid}/${nameWithoutExt}_Vocals.wav`,
                    instrumental: `/uploads/${uuid}/${nameWithoutExt}_Instruments.wav`,
                  }) + "\n"
                )
              );
            } else {
              // Update upload record as failed
              await UploadHistory.findByIdAndUpdate(uploadRecord._id, {
                processingStatus: "failed",
                processingEndTime: new Date(),
                processingDuration: processingDuration,
                errorMessage: `Processing failed with code ${code}`,
              });

              controller.error(new Error("Python process failed"));
            }
          } catch (dbError) {
            console.error("Database update error:", dbError);
            // Continue with the response even if DB update fails
            if (code === 0) {
              controller.enqueue(new TextEncoder().encode(`PROGRESS:100\n`));
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({
                    type: "result",
                    folder: `uploads/${uuid}`,
                    originalName: originalName,
                    vocals: `/uploads/${uuid}/${nameWithoutExt}_Vocals.wav`,
                    instrumental: `/uploads/${uuid}/${nameWithoutExt}_Instruments.wav`,
                  }) + "\n"
                )
              );
            } else {
              controller.error(new Error("Python process failed"));
            }
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
    
    // Update upload record as failed if it was created
    if (uploadRecord) {
      try {
        await UploadHistory.findByIdAndUpdate(uploadRecord._id, {
          processingStatus: "failed",
          processingEndTime: new Date(),
          errorMessage: err.message || "Server error",
        });
      } catch (dbError) {
        console.error("Failed to update upload record:", dbError);
      }
    }

    return new Response(err.message || "Internal Server Error", {
      status: 500,
    });
  }
}