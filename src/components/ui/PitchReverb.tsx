"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface PitchReverbProps {
  audioUrl?: string;
  uploadId?: string;
  originalName?: string;
}

export default function PitchReverb({
  audioUrl,
  uploadId,
  originalName,
}: PitchReverbProps) {
  const router = useRouter();

  // Usage tracking state
  const [effectsUsageCount, setEffectsUsageCount] = useState(0);
  const FREE_LIMIT = 5;

  const [pitch, setPitch] = useState(0);
  const [reverb, setReverb] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [detectedKey, setDetectedKey] = useState<string>("Not detected");
  const [originalBpm, setOriginalBpm] = useState<number | null>(null);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(
    null
  );
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processedFileName, setProcessedFileName] = useState<string | null>(
    null
  );
  const [originalDuration, setOriginalDuration] = useState<number | null>(null);
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const originalWaveRef = useRef<HTMLDivElement | null>(null);
  const processedWaveRef = useRef<HTMLDivElement | null>(null);
  const originalWSRef = useRef<WaveSurfer | null>(null);
  const processedWSRef = useRef<WaveSurfer | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveAudioUrl = localAudioUrl || audioUrl || null;
  const effectiveFileName = localFile?.name || originalName || "audio.wav";

  // Load usage count from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCount = localStorage.getItem("effectsUsageCount");
      if (savedCount) {
        setEffectsUsageCount(parseInt(savedCount));
      }
    }
  }, []);

  // Save usage count to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("effectsUsageCount", effectsUsageCount.toString());
    }
  }, [effectsUsageCount]);

  // Auto-analyze audio when it changes
  useEffect(() => {
    if (effectiveAudioUrl) {
      analyzeAudio();
    }
  }, [effectiveAudioUrl]);

  // Build waveform for original preview
  useEffect(() => {
    if (!originalWaveRef.current || !effectiveAudioUrl) return;
    if (originalWSRef.current) {
      originalWSRef.current.destroy();
      originalWSRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: originalWaveRef.current,
      waveColor: "#8b5cf6",
      progressColor: "#c4b5fd",
      cursorColor: "#ffffff",
      height: 70,
      barWidth: 2,
      url: effectiveAudioUrl,
      interact: true,
      hideScrollbar: true,
      normalize: true,
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    ws.on("ready", () => {
      setIsReady(true);
      const d = ws.getDuration();
      if (isFinite(d)) {
        setOriginalDuration(d);
        setCurrentDuration(d / speed);
      }
    });

    originalWSRef.current = ws;
    return () => {
      ws.destroy();
      originalWSRef.current = null;
      setIsReady(false);
    };
  }, [effectiveAudioUrl]);

  useEffect(() => {
    try {
      originalWSRef.current?.setPlaybackRate(speed);
    } catch {}
    if (originalDuration) setCurrentDuration(originalDuration / speed);
  }, [speed, originalDuration]);

  useEffect(() => {
    if (originalBpm) {
      setCurrentBpm(Math.round(originalBpm * speed));
    }
  }, [originalBpm, speed]);

  const analyzeAudio = useCallback(async () => {
    if (!effectiveAudioUrl) return;

    setIsAnalyzing(true);
    try {
      let response: Response;

      if (localFile) {
        const formData = new FormData();
        formData.append("file", localFile);
        formData.append("pitch", String(pitch));
        response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
      } else if (audioUrl) {
        const body = JSON.stringify({
          audioPath: audioUrl.startsWith("/")
            ? audioUrl
            : `/uploads/${audioUrl}`,
          pitch,
        });
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } else {
        return;
      }

      const data = await response.json();
      if (data.success) {
        if (typeof data.bpm === "number") {
          setOriginalBpm(Math.round(data.bpm));
          setCurrentBpm(Math.round(data.bpm * speed));
        }
        if (typeof data.key === "string") {
          setDetectedKey(data.key);
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Analysis Failed", {
        description: "Could not analyze audio properties",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [effectiveAudioUrl, localFile, audioUrl, pitch, speed]);

  const debouncedAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    analysisTimeoutRef.current = setTimeout(() => {
      analyzeAudio();
    }, 500);
  }, [analyzeAudio]);

  useEffect(() => {
    debouncedAnalysis();
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [pitch]);

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setLocalAudioUrl(url);
    setLocalFile(file);
    setProcessedAudioUrl(null);
    setDetectedKey("Not detected");
    setOriginalBpm(null);
    setCurrentBpm(null);
    setOriginalDuration(null);
    setCurrentDuration(null);
    resetEffects(false);

    toast.success("File Uploaded", {
      description: `${file.name} loaded successfully`,
    });
  };

  const togglePlay = () => {
    if (originalWSRef.current) {
      originalWSRef.current.playPause();
    }
  };

  const canApplyEffects = () => {
    return effectsUsageCount < FREE_LIMIT;
  };

  const handleApplyEffects = async () => {
    if (!effectiveAudioUrl) {
      toast.error("No Audio File", {
        description: "Please select an audio file first",
      });
      return;
    }

    if (!canApplyEffects()) {
      toast.error("Free Limit Reached", {
        description: `You've used all ${FREE_LIMIT} free effects. Upgrade to Pro for unlimited access!`,
      });
      setTimeout(() => {
        router.push("/plans");
      }, 2000);
      return;
    }

    setIsProcessing(true);

    toast("Processing...", {
      description: "Applying effects",
      icon: <Loader2 className="h-5 w-5 mr-2 animate-spin" />,
      style: {
        background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
        color: "white",
        border: "1px solid #a855f7",
        borderRadius: "16px",
        padding: "16px",
      },
    });

    try {
      let response: Response;

      if (localFile) {
        const formData = new FormData();
        formData.append("file", localFile);
        formData.append("pitch", String(pitch));
        formData.append("speed", String(speed));
        formData.append("reverb", String(reverb));
        formData.append("uploadId", uploadId || "effects");
        response = await fetch("/api/effects", {
          method: "POST",
          body: formData,
        });
      } else {
        const serverPath = audioUrl?.startsWith("/")
          ? audioUrl.replace("/uploads/", "")
          : audioUrl || "";
        response = await fetch("/api/effects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioPath: serverPath,
            pitch,
            speed,
            reverb,
            uploadId: uploadId || "effects",
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Processing failed");
      }

      // Increment usage count
      setEffectsUsageCount((prev) => prev + 1);

      setProcessedAudioUrl(data.audioUrl);
      setProcessedFileName(
        effectiveFileName.replace(/\.[^.]+$/, "_effects.wav")
      );

      if (data.key) setDetectedKey(data.key);
      if (data.bpm) {
        setOriginalBpm(Math.round(data.bpm));
        setCurrentBpm(Math.round(data.bpm * speed));
      }

      toast.dismiss();
      toast.success("Effects Applied!", {
        description: `Your audio has been processed successfully. ${
          FREE_LIMIT - effectsUsageCount - 1
        } free uses remaining.`,
      });

      if (effectsUsageCount + 1 >= FREE_LIMIT - 1) {
        setTimeout(() => {
          toast.info("Almost at Free Limit", {
            description:
              effectsUsageCount + 1 >= FREE_LIMIT
                ? "You've reached your free limit. Upgrade to Pro for unlimited effects!"
                : "Only 1 free use remaining. Consider upgrading to Pro!",
            duration: 5000,
          });
        }, 3000);
      }
    } catch (error: any) {
      console.error("Error applying effects:", error);
      toast.dismiss();
      toast.error("Processing Failed", {
        description: error.message || "Error applying effects",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyLoFiPreset = () => {
    setSpeed(0.75);
    setPitch(-2);
    setReverb(10);

    toast.info("Lo-Fi Preset Applied", {
      description: "Speed: 0.75x, Pitch: -2 semitones, Reverb: Max",
    });
  };

  const resetEffects = (showToast = true) => {
    setPitch(0);
    setReverb(0);
    setSpeed(1.0);
    setProcessedAudioUrl(null);

    if (showToast) {
      toast.info("Effects Reset", {
        description: "All effects have been reset to default values",
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || !isFinite(seconds)) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getKeyColor = (key: string) => {
    if (key === "Not detected") return "text-gray-400";
    if (key.includes("major")) return "text-green-400";
    if (key.includes("minor")) return "text-blue-400";
    return "text-purple-400";
  };

  const getReverbDescription = (value: number) => {
    if (value === 0) return "Dry";
    if (value <= 3) return "Light";
    if (value <= 6) return "Medium";
    if (value <= 9) return "Heavy";
    return "Maximum";
  };

  const remainingUses = FREE_LIMIT - effectsUsageCount;

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">Audio Effects Studio</h1>

        {/* Usage Counter */}
        <div className="text-right">
          <div className="text-sm text-gray-400 mb-1">
            Usage: {effectsUsageCount}/{FREE_LIMIT}
          </div>
          <div className="w-32 bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                effectsUsageCount >= FREE_LIMIT
                  ? "bg-red-500"
                  : effectsUsageCount >= FREE_LIMIT - 1
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(
                  (effectsUsageCount / FREE_LIMIT) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith("audio/")) {
            handleFileUpload(file);
          }
        }}
        onClick={() => document.getElementById("fileInput")?.click()}
        className="mb-8 p-8 border-2 border-dashed border-purple-500/50 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 transition-all cursor-pointer text-center"
      >
        <Upload className="mx-auto mb-4 h-12 w-12 text-purple-400" />
        {localFile ? (
          <div>
            <p className="text-green-400 font-semibold text-lg">
              {localFile.name}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Click to select a different file
            </p>
          </div>
        ) : (
          <div>
            <p className="text-white text-lg mb-2">
              Drop audio file here or click to select
            </p>
            <p className="text-gray-400 text-sm">
              Supports MP3, WAV, FLAC, and more
            </p>
          </div>
        )}
      </div>

      <input
        id="fileInput"
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
        className="hidden"
      />

      {effectiveAudioUrl && (
        <>
          {/* Audio Player */}
          <div className="mb-8 p-6 bg-gray-800/50 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-400">
                Preview:
              </h3>
              {isAnalyzing && (
                <div className="flex items-center text-purple-400 text-sm">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Analyzing...
                </div>
              )}
            </div>

            <div
              ref={originalWaveRef}
              className="w-full mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            />

            <div className="flex items-center justify-between">
              <Button
                onClick={togglePlay}
                className="cursor-pointer relative px-6 py-2 flex items-center text-purple-400 font-semibold rounded-xl bg-transparent border border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7),0_0_15px_rgba(168,85,247,0.5)] transition duration-300 hover:bg-transparent hover:text-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,1),0_0_30px_rgba(168,85,247,0.9)] active:scale-95 disabled:opacity-50"
                disabled={!isReady}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>

              <div className="flex space-x-4 text-sm">
                <div className="text-purple-300">
                  Duration:{" "}
                  <span className="text-white font-mono">
                    {formatDuration(currentDuration)}
                  </span>
                  {originalDuration && speed !== 1.0 && (
                    <span className="text-gray-400 ml-2">
                      (was {formatDuration(originalDuration)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audio Info Display */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
              <h4 className="text-purple-300 font-semibold mb-2">🎼 Scale</h4>
              <p
                className={`text-xl font-bold text-purple-400 ${getKeyColor(
                  detectedKey
                )}`}
              >
                {detectedKey}
              </p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
              <h4 className="text-purple-300 font-semibold mb-2">🥁 Tempo</h4>
              <p className="text-xl font-bold text-purple-400">
                {currentBpm ? `${currentBpm} BPM` : "Detecting..."}
                {originalBpm && speed !== 1.0 && (
                  <span className="text-gray-400 text-sm ml-2">
                    (was {originalBpm} BPM)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Effects Controls */}
          <div className="space-y-8 mb-8">
            {/* Pitch Control */}
            <div className="p-6 bg-gray-800/30 rounded-xl border border-purple-500/20">
              <div className="flex justify-between items-center mb-4">
                <label className="text-purple-300 font-semibold text-lg">
                  🎵 Pitch Shift
                </label>
                <div className="text-white font-mono text-lg">
                  {pitch > 0 ? "+" : ""}
                  {pitch} semitones
                </div>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={pitch}
                onChange={(e) => setPitch(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>-12 (1 octave down)</span>
                <span>0 (original)</span>
                <span>+12 (1 octave up)</span>
              </div>
            </div>

            {/* Speed Control */}
            <div className="p-6 bg-gray-800/30 rounded-xl border border-purple-500/20">
              <div className="flex justify-between items-center mb-4">
                <label className="text-purple-300 font-semibold text-lg">
                  ⏱️ Speed
                </label>
                <div className="text-white font-mono text-lg">
                  {speed.toFixed(2)}x
                </div>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.01}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>0.5x (half speed)</span>
                <span>1.0x (original)</span>
                <span>2.0x (double speed)</span>
              </div>
            </div>

            {/* Reverb Control */}
            <div className="p-6 bg-gray-800/30 rounded-xl border border-purple-500/20">
              <div className="flex justify-between items-center mb-4">
                <label className="text-purple-300 font-semibold text-lg">
                  🔊 Reverb
                </label>
                <div className="text-white font-mono text-lg">
                  {reverb} - {getReverbDescription(reverb)}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={reverb}
                onChange={(e) => setReverb(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>0 (Dry)</span>
                <span>5 (Medium)</span>
                <span>10 (Maximum)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}

          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Button
              onClick={() => resetEffects(true)}
              variant="outline"
              className="cursor-pointer bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>

            <Button
              onClick={applyLoFiPreset}
              className=" cursor-pointer px-5 py-3 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              disabled={isProcessing}
            >
              Lo-Fi
            </Button>

            <Button
              onClick={handleApplyEffects}
              disabled={isProcessing || !canApplyEffects()}
              className={`cursor-pointer px-8 py-3 text-lg font-semibold ${
                canApplyEffects()
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !canApplyEffects() ? (
                "Upgrade to Continue"
              ) : (
                `Apply Effects (${remainingUses} left)`
              )}
            </Button>

            {!canApplyEffects() && (
              <Button
                onClick={() => router.push("/plans")}
                className="cursor-pointer bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3"
              >
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Processed Audio Result */}
          {processedAudioUrl && (
            <div className="p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-xl border border-green-500/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-green-400 font-semibold text-lg">
                    ✅Processing Complete!
                  </h3>
                  <p className="text-gray-300">{processedFileName}</p>
                </div>
                <a
                  href={processedAudioUrl}
                  download={processedFileName}
                  className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </div>

              <div className="bg-gray-900/50 p-4 rounded-lg">
                <audio controls className="w-full" preload="metadata">
                  <source src={processedAudioUrl} type="audio/wav" />
                  <source src={processedAudioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}
        </>
      )}

      {!effectiveAudioUrl && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 font-bold tracking-widest text-purple-400">
            ၊၊||၊၊
          </div>
          <p className="text-purple-400 text-2xl font-semibold">
            Welcome to Effect Studio
          </p>
          <p className="text-gray-400 text-lg mt-2">
            Upload your audio and explore advanced effects
          </p>
        </div>
      )}

      <style jsx>{`
        .slider {
          background: linear-gradient(90deg, #4c1d95, #7c3aed);
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        .slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
