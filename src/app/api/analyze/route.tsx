import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;
  
  try {
    const contentType = request.headers.get("content-type") || "";
    let fullAudioPath = "";
    let pitch = 0;

    // Handle file upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const pitchParam = formData.get("pitch");
      
      if (pitchParam !== null) {
        pitch = Number(pitchParam) || 0;
      }

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

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads", "analyze-temp");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      tempInputPath = path.join(uploadDir, `${uuidv4()}${path.extname(file.name)}`);
      fs.writeFileSync(tempInputPath, buffer);
      fullAudioPath = tempInputPath;

    } else if (contentType.includes("application/json")) {
      // Handle JSON input
      const body = await request.json();
      fullAudioPath = body.audioPath as string;
      
      if (typeof body.pitch === "number") {
        pitch = body.pitch;
      }

      if (!fullAudioPath) {
        return NextResponse.json({ 
          success: false, 
          error: "No audio path provided" 
        }, { status: 400 });
      }

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

    // Validate pitch parameter
    if (pitch < -24 || pitch > 24) {
      return NextResponse.json({ 
        success: false, 
        error: "Pitch must be between -24 and +24 semitones" 
      }, { status: 400 });
    }

    // Prepare output path for analysis (temporary)
    const outDir = path.join(process.cwd(), "public", "uploads", "analyze-temp");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outputPath = path.join(outDir, `${uuidv4()}_analysis.wav`);

    // Check if Python script exists
    const scriptPath = path.join(process.cwd(), "vocal-remover", "scripts", "audio_effects.py");
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ 
        success: false, 
        error: `Analysis script not found at ${scriptPath}. Please ensure the audio_effects.py script is in the correct location.` 
      }, { status: 500 });
    }

    console.log("Starting audio analysis with parameters:", { pitch });
    console.log("Input file:", fullAudioPath);
    console.log("Output file:", outputPath);

    // Run Python analysis script
    const pythonProcess = spawn("python", [
      scriptPath,
      fullAudioPath,
      JSON.stringify({ pitch, speed: 1.0 }), // Only analyze, don't apply effectsb
      outputPath,
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      const text = data.toString();
      stdoutData += text;
      console.log("Analysis stdout:", text);
    });

    pythonProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderrData += text;
      console.log("Analysis stderr:", text);
    });

    return new Promise((resolve) => {
      // Set timeout for analysis
      const timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        resolve(NextResponse.json({ 
          success: false, 
          error: "Analysis timeout after 2 minutes" 
        }, { status: 408 }));
      }, 120000); // 2 minute timeout

      pythonProcess.on("close", (code) => {
        clearTimeout(timeoutId);
        
        // Cleanup temporary files
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (cleanupError) {
          console.log("Cleanup error:", cleanupError);
        }

        try {
          if (tempInputPath && fs.existsSync(tempInputPath)) {
            fs.unlinkSync(tempInputPath);
          }
        } catch (cleanupError) {
          console.log("Cleanup error:", cleanupError);
        }

        console.log(`Analysis process exited with code: ${code}`);

        if (code !== 0) {
          const errorMsg = stderrData || `Analysis process exited with code ${code}`;
          resolve(NextResponse.json({ 
            success: false, 
            error: `Analysis failed: ${errorMsg}` 
          }, { status: 500 }));
          return;
        }

        let key: string | null = null;
        let bpm: number | null = null;
        let duration: number | null = null;
        let additionalInfo: any = {};

        // Parse JSON from stdout first
        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed && parsed.success) {
            if (typeof parsed.key === "string") {
              key = parsed.key;
            }
            if (typeof parsed.bpm === "number" && isFinite(parsed.bpm)) {
              bpm = Math.round(parsed.bpm);
            }
            if (typeof parsed.original_duration === "number") {
              duration = parsed.original_duration;
            }
            if (typeof parsed.final_duration === "number") {
              additionalInfo.processedDuration = parsed.final_duration;
            }
          }
        } catch (parseError) {
          console.log("Could not parse JSON from stdout, trying regex fallback");
        }

        // Fallback: extract from stderr logs using regex
        if (!key) {
          const keyMatch = stderrData.match(/Detected key:\s*([^\n\r]+)/);
          if (keyMatch && keyMatch[1]) {
            key = keyMatch[1].trim();
          }
        }

        if (!bpm) {
          const bpmMatch = stderrData.match(/Detected BPM:\s*([0-9]+(?:\.[0-9]+)?)/);
          if (bpmMatch && bpmMatch[1]) {
            const detectedBpm = Number(bpmMatch[1]);
            if (isFinite(detectedBpm)) {
              bpm = Math.round(detectedBpm);
            }
          }
        }

        if (!duration) {
          const durationMatch = stderrData.match(/Original duration:\s*([0-9]+(?:\.[0-9]+)?)/);
          if (durationMatch && durationMatch[1]) {
            const detectedDuration = Number(durationMatch[1]);
            if (isFinite(detectedDuration)) {
              duration = detectedDuration;
            }
          }
        }

        // Set defaults if nothing was detected
        if (!key) key = "Not detected";
        
        const response = {
          success: true,
          key,
          bpm,
          duration,
          pitchShift: pitch,
          analysisDetails: {
            keyDetected: key !== "Not detected",
            bpmDetected: bpm !== null,
            durationDetected: duration !== null,
            pitchAdjusted: pitch !== 0
          },
          ...additionalInfo
        };

        console.log("Analysis complete:", response);
        resolve(NextResponse.json(response));
      });

      pythonProcess.on("error", (error) => {
        clearTimeout(timeoutId);
        console.error("Analysis process error:", error);
        
        // Cleanup on error
        try {
          if (tempInputPath && fs.existsSync(tempInputPath)) {
            fs.unlinkSync(tempInputPath);
          }
        } catch (cleanupError) {
          console.log("Cleanup error:", cleanupError);
        }

        resolve(NextResponse.json({ 
          success: false, 
          error: `Failed to start analysis: ${error.message}` 
        }, { status: 500 }));
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

    console.error("Analysis API error:", err);
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${err.message}` 
    }, { status: 500 });
  }
}