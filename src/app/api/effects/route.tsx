import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import UploadHistory from '@/models/UploadHistory';

interface ProcessingParams {
  pitch: number;
  speed: number;
  reverb: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let tempInputPath: string | null = null;

  try {
    // Get authentication token from cookies (optional for effects)
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = decoded.userId;
      }
    } catch (error) {
      // Continue without authentication for standalone effects
      console.log("No authentication found, proceeding without database logging");
    }

    let fullAudioPath: string = "";
    let pitch: number = 0;
    let speed: number = 1.0;
    let reverb: number = 0; // FFmpeg reverb level 0-10
    let uploadId: string = "effects";
    let originalName: string = "processed_audio.wav";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      pitch = Number(formData.get("pitch") || 0);
      speed = Number(formData.get("speed") || 1.0);
      reverb = Number(formData.get("reverb") || 0); // Get reverb level
      uploadId = (formData.get("uploadId") as string) || "effects";

      if (!file) {
        return NextResponse.json({
          success: false,
          error: "No file uploaded"
        }, { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith("audio/")) {
        return NextResponse.json({
          success: false,
          error: "Invalid file type. Please upload an audio file."
        }, { status: 400 });
      }

      originalName = file.name;

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads",  uploadId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      tempInputPath = path.join(uploadDir, `${uuidv4()}${path.extname(file.name)}`);
      fs.writeFileSync(tempInputPath, buffer);
      fullAudioPath = tempInputPath;

    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      ({
        audioPath: fullAudioPath,
        pitch = 0,
        speed = 1.0,
        reverb = 0, // Get reverb level from JSON
        uploadId = "effects"
      } = body);

      if (!fullAudioPath) {
        return NextResponse.json({
          success: false,
          error: "No audio path provided"
        }, { status: 400 });
      }

      originalName = path.basename(fullAudioPath);

      // Resolve full path
      if (fullAudioPath.startsWith("/uploads/")) {
        fullAudioPath = path.join(process.cwd(), "public", fullAudioPath);
      } else if (fullAudioPath.startsWith("uploads/")) {
        fullAudioPath = path.join(process.cwd(), "public", fullAudioPath);
      } else {
        fullAudioPath = path.join(process.cwd(), "public", "uploads", fullAudioPath);
      }

      if (!fs.existsSync(fullAudioPath)) {
        return NextResponse.json({
          success: false,
          error: `Audio file not found: ${fullAudioPath}`
        }, { status: 404 });
      }

    } else {
      return NextResponse.json({
        success: false,
        error: "Unsupported content type. Use multipart/form-data or application/json."
      }, { status: 400 });
    }
    // After you resolve fullAudioPath (either from uploaded file or JSON input):
const relativeInputPath = "/" + path.relative(
  path.join(process.cwd(), "public"),
  fullAudioPath
).replace(/\\/g, "/");


    // Validate parameters
    if (speed < 0.1 || speed > 5.0) {
      return NextResponse.json({
        success: false,
        error: "Speed must be between 0.1x and 5.0x"
      }, { status: 400 });
    }

    if (pitch < -24 || pitch > 24) {
      return NextResponse.json({
        success: false,
        error: "Pitch must be between -24 and +24 semitones"
      }, { status: 400 });
    }

    if (reverb < 0 || reverb > 10) {
      return NextResponse.json({
        success: false,
        error: "Reverb must be between 0 and 10"
      }, { status: 400 });
    }

    // Prepare output file path
    const outputDir = path.join(process.cwd(), "public", "uploads", uploadId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const base = path.basename(originalName, path.extname(originalName));
    let suffix: string[] = [];
    if (pitch !== 0) suffix.push(`pitch${pitch > 0 ? '+' : ''}${pitch}`);
    if (speed !== 1.0) suffix.push(`speed${speed}x`);
    if (reverb > 0) suffix.push(`reverb${reverb}`);

    const effectsSuffix = suffix.length > 0 ? `_${suffix.join('_')}` : '_effects';
    const outputFileName = `${base}${effectsSuffix}.wav`;
    const outputPath = path.join(outputDir, outputFileName);

    // Create reverb impulse response directory if it doesn't exist
    const reverbDir = path.join(process.cwd(), "public", "reverbs");
    if (!fs.existsSync(reverbDir)) {
      fs.mkdirSync(reverbDir, { recursive: true });
    }

    // Check if hall.wav exists, if not create a simple one or log warning
    const hallIRPath = path.join(reverbDir, "hall.wav");
    if (!fs.existsSync(hallIRPath) && reverb > 0) {
      console.log(`Warning: Reverb IR file not found at ${hallIRPath}`);
      console.log("The Python script will fall back to FFmpeg's built-in echo effect");
    }

    // Check if Python script exists
    const scriptPath = path.join(process.cwd(), "vocal-remover", "scripts", "audio_effects.py");
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({
        success: false,
        error: `Python script not found at ${scriptPath}. Please ensure the audio_effects.py script is in the correct location.`
      }, { status: 500 });
    }

    console.log("Starting FFmpeg audio processing with parameters:", { pitch, speed, reverb });
    console.log("Input file:", fullAudioPath);
    console.log("Output file:", outputPath);

    // Track processing start time
    const processingStartTime = new Date();
    let historyRecord = null;

    // Create database record if user is authenticated
    if (userId) {
      try {
        await dbConnect();

                
historyRecord = new UploadHistory({
  userId,
  originalFileName: originalName,
  originalFileSize: fs.statSync(fullAudioPath).size,
  folderPath: `/uploads/${uploadId}`,
  originalFilePath: relativeInputPath,   // ✅ now correct
  processingType: 'effects',
  processingStatus: 'processing',
  processingStartTime,
  fileFormat: path.extname(originalName).toLowerCase(),
  processedAudioUrl: null,
  effectsApplied: {
    pitch: pitch !== 0 ? `${pitch > 0 ? '+' : ''}${pitch} semitones` : null,
    speed: speed !== 1.0 ? `${speed}x speed` : null,
    reverb: reverb > 0 ? `reverb level ${reverb}` : null
  }
});



        await historyRecord.save();
        console.log("Created effects processing record in database");
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue processing even if database fails
      }
    }

    // Run Python processing script with reverb parameter
    const pythonProcess = spawn("python", [
      scriptPath,
      fullAudioPath,
      JSON.stringify({ pitch, speed, reverb } as ProcessingParams), // Include reverb in parameters
      outputPath,
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout?.on("data", (data) => {
      const text = data.toString();
      stdoutData += text;
      console.log("Python stdout:", text);
    });

    pythonProcess.stderr?.on("data", (data) => {
      const text = data.toString();
      stderrData += text;
      console.log("Python stderr:", text);
    });

    return new Promise<NextResponse>((resolve) => {
      const timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        resolve(NextResponse.json(
          { success: false, error: "Processing timeout after 5 minutes" },
          { status: 408 }
        ));
      }, 300000); // 5 minute timeout

      pythonProcess.on("close", async (code) => {
        clearTimeout(timeoutId);

        // Cleanup temporary input file
        try {
          if (tempInputPath && fs.existsSync(tempInputPath)) {
            fs.unlinkSync(tempInputPath);
          }
        } catch (cleanupError) {
          console.log("Cleanup error:", cleanupError);
        }
        
          
        const processingEndTime = new Date();
        const processingDuration = Math.round((processingEndTime.getTime() - processingStartTime.getTime()) / 1000);

        console.log(`Python process exited with code: ${code}`);
        console.log("Final stdout:", stdoutData);
        console.log("Final stderr:", stderrData);

        if (code !== 0) {
          const errorMsg = stderrData || `Python process exited with code ${code}`;
          
          // Update database record if it exists
          if (historyRecord) {
            try {
              await UploadHistory.findByIdAndUpdate(historyRecord._id, {
                processingStatus: 'failed',
                processingEndTime,
                processingDuration,
                errorMessage: errorMsg
              });
            } catch (dbError) {
              console.error("Database update error:", dbError);
            }
          }

          resolve(NextResponse.json(
            { success: false, error: `FFmpeg processing failed: ${errorMsg}` },
            { status: 500 }
          ));
          return;
        }

        if (!fs.existsSync(outputPath)) {
          // Update database record if it exists
          if (historyRecord) {
            try {
              await UploadHistory.findByIdAndUpdate(historyRecord._id, {
                processingStatus: 'failed',
                processingEndTime,
                processingDuration,
                errorMessage: 'Output file was not created'
              });
            } catch (dbError) {
              console.error("Database update error:", dbError);
            }
          }

          resolve(NextResponse.json(
            { success: false, error: "Output file was not created. Check server logs for details." },
            { status: 500 }
          ));
          return;
        }

        const relativePath = outputPath.replace(path.join(process.cwd(), "public"), "").replace(/\\/g, "/");

        // Parse results from Python script
        let detectedKey: string = "Not detected";
        let detectedBpm: number | null = null;
        let processingInfo: any = {};

        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed && parsed.success) {
            if (typeof parsed.key === "string") {
              detectedKey = parsed.key;
            }
            if (typeof parsed.bpm === "number" && isFinite(parsed.bpm)) {
              detectedBpm = Math.round(parsed.bpm);
            }
            if (parsed.original_duration && parsed.final_duration) {
              processingInfo = {
                originalDuration: parsed.original_duration,
                finalDuration: parsed.final_duration,
                speedFactor: parsed.speed_factor || speed,
                reverbLevel: parsed.reverb_level || reverb
              };
            }
          }
        } catch (parseError) {
          console.log("Could not parse JSON from stdout, trying regex fallback");

          // Fallback: extract from stderr logs
          const keyMatch = stderrData.match(/Detected key:\s*([^\n\r]+)/);
          if (keyMatch && keyMatch[1]) {
            detectedKey = keyMatch[1].trim();
          }

          const bpmMatch = stderrData.match(/Detected BPM:\s*([0-9]+(?:\.[0-9]+)?)/);
          if (bpmMatch && bpmMatch[1]) {
            const bpm = Number(bpmMatch[1]);
            if (isFinite(bpm)) {
              detectedBpm = Math.round(bpm);
            }
          }
        }

        // Get file size for response
        let fileSize = 0;
        try {
          const stats = fs.statSync(outputPath);
          fileSize = stats.size;
        } catch (e) {
          console.log("Could not get file size:", e);
        }

        // Update database record if it exists
        if (historyRecord) {
          try {
            await UploadHistory.findByIdAndUpdate(historyRecord._id, {
              processingStatus: 'completed',
              processingEndTime,
              processingDuration,
              processedAudioUrl: relativePath, // Store the processed audio URL
              audioKey: detectedKey !== "Not detected" ? detectedKey : null,
              audioBpm: detectedBpm,
              processingInfo
            });
            console.log("Updated effects processing record in database");
          } catch (dbError) {
            console.error("Database update error:", dbError);
          }
        }

        const response = {
          success: true,
          audioUrl: relativePath,
          originalName: outputFileName,
          fileSize,
          key: detectedKey,
          bpm: detectedBpm,
          processingInfo,
          effectsApplied: {
            pitch: pitch !== 0 ? `${pitch > 0 ? '+' : ''}${pitch} semitones` : null,
            speed: speed !== 1.0 ? `${speed}x speed` : null,
            reverb: reverb > 0 ? `FFmpeg reverb level ${reverb}` : null
          },
          processingMethod: "FFmpeg + librosa",
          processingTime: `${processingDuration}s`,
          metadata: {
            inputFile: originalName,
            outputFormat: "WAV",
            sampleRate: "Original",
            channels: "Original",
            reverbMethod: reverb > 0 ? (fs.existsSync(hallIRPath) ? "Convolution (hall.wav)" : "Built-in Echo") : "None"
          }
        };

        console.log("FFmpeg processing complete:", response);
        resolve(NextResponse.json(response));
      });

      pythonProcess.on("error", async (error: Error) => {
        clearTimeout(timeoutId);
        console.error("Python process error:", error);

        // Update database record if it exists
        if (historyRecord) {
          try {
            const processingEndTime = new Date();
            const processingDuration = Math.round((processingEndTime.getTime() - processingStartTime.getTime()) / 1000);
            
            await UploadHistory.findByIdAndUpdate(historyRecord._id, {
              processingStatus: 'failed',
              processingEndTime,
              processingDuration,
              errorMessage: error.message
            });
          } catch (dbError) {
            console.error("Database update error:", dbError);
          }
        }

        // Cleanup on error
        try {
          if (tempInputPath && fs.existsSync(tempInputPath)) {
            fs.unlinkSync(tempInputPath);
          }
        } catch (cleanupError) {
          console.log("Cleanup error:", cleanupError);
        }

        resolve(NextResponse.json(
          { success: false, error: `Failed to start FFmpeg processing: ${error.message}` },
          { status: 500 }
        ));
      });
    });

  } catch (err: any) {
    // Cleanup on exception
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
    } catch (cleanupError) {
      console.log("Cleanup error:", cleanupError);
    }

    console.error("FFmpeg Effects API error:", err);
    return NextResponse.json({
      success: false,
      error: `Server error: ${err.message}`
    }, { status: 500 });
  }
}