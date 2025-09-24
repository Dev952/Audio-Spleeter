"use client";

import React, { useState, useEffect, useRef } from "react";
import path from "path";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import AudioControl from "@/components/ui/AudioControl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCurrentUser, logoutUser } from "@/app/actions/auth";

export default function Home() {
  const router = useRouter();

  // Authentication state
  const [user, setUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // App state
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    folder: string;
    originalName: string;
    vocals: string;
    instrumental: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  // Recent uploads drawer state
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Effects removed on home page

  // Lyrics state
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [showLyricsCard, setShowLyricsCard] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Welcome banner state
  const [showWelcome, setShowWelcome] = useState(true);

  // Add this useEffect to hide welcome message after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Authentication check using server actions
  useEffect(() => {
    const checkAuth = async () => {
      setIsAuthenticating(true);
      try {
        const result = await getCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          // No valid auth, redirect to login
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
        return;
      } finally {
        setIsAuthenticating(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch(`/api/history?limit=100`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.uploads)) {
          // Filter out 'effects' uploads
          const filtered = data.uploads.filter(
            (u: any) => u.processingType !== "effects"
          );
          setRecentUploads(filtered);
        }
      } catch (e) {
        console.log("Failed to fetch recent uploads:", e);
      }
    };
    fetchRecent();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser(); // This will automatically redirect to login
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback: redirect manually if server action fails
      router.push("/login");
    }
  };

  // Helper function to get relative time
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  // Generate Lyrics
  const handleGenerateLyrics = async () => {
    if (!result) return;
    setLyricsLoading(true);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: JSON.stringify({
          folder: result.folder,
          originalName: result.originalName,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setLyricsLoading(false);
        return;
      }

      const lines = data.lyrics.split(/(?<=[.?!])\s+/);
      setLyrics(lines);
      setCurrentLine(0);
      setShowLyricsCard(true);
    } catch (error) {
      toast.error("Failed to generate lyrics");
    } finally {
      setLyricsLoading(false);
    }
  };

  // Auto-Show Lyrics
  useEffect(() => {
    if (!showLyricsCard || currentLine >= lyrics.length) return;
    const interval = setInterval(() => {
      setCurrentLine((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showLyricsCard, currentLine, lyrics.length]);

  // Upload + Process File
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/separate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("PROGRESS:")) {
            const progressValue = parseInt(line.split(":")[1]);
            if (!isNaN(progressValue)) setProgress(progressValue);
          } else {
            try {
              const json = JSON.parse(line);
              if (json.type === "progress") setProgress(json.value);
              else if (json.type === "result") setResult(json);
            } catch {
              console.warn("Non-JSON line:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload or processing failed.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while authenticating
  if (isAuthenticating) {
    return (
      <div className="min-h-screen w-full text-white flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-purple-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-purple-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-white scroll-smooth bg-gradient-to-br from-black via-purple-900 to-purple-800 relative overflow-hidden">
      {/* Navbar */}
      <div className="sticky top-0 z-50 shadow-md rounded-b-[2rem] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-black to-purple-900 opacity-40 blur-sm pointer-events-none" />
        <NavigationMenu className="bg-black/70 px-4 py-6 flex justify-between items-center relative z-10">
          <div className="text-2xl font-bold">|၊||၊၊ YOURWAV ၊၊||၊|</div>

          {user && showWelcome && (
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <span className="text-lg font-medium text-purple-300">
                Welcome {user.name} ! 👋
              </span>
            </div>
          )}

          <NavigationMenuList className="flex space-x-6 items-center">
            <NavigationMenuItem>
              <button
                onClick={() => router.push("/effects")}
                className="cursor-pointer 
      px-6 py-2 text-lg font-semibold
      rounded-xl text-purple-300
      border border-purple-400
      shadow-[0_0_10px_rgba(168,85,247,0.8)]
      hover:shadow-[0_0_20px_rgba(168,85,247,1)]
      hover:text-white hover:bg-purple-500/20
      transition duration-300
    "
              >
                Audio Effects
              </button>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="#home"
                className="hover:text-purple-300 transition text-lg font-medium"
              >
                Home
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="#about"
                className="hover:text-purple-300 transition text-lg font-medium"
              >
                About
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <button
                onClick={() => router.push("/history")}
                className="hover:text-purple-300 transition text-lg font-medium bg-transparent border-none cursor-pointer"
              >
                History
              </button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <button
                onClick={handleLogout}
                className="hover:text-red-300 transition text-lg font-medium bg-transparent border-none cursor-pointer"
              >
                Logout
              </button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Main Section */}
      <main
        id="home"
        className=" min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10"
      >
        <Card className="bg-[#1F1F1F] text-white shadow-2xl border border-neutral-800 rounded-2xl w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-center text-3xl font-extrabold text-purple-500">
              Music Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) setFile(droppedFile);
              }}
              onClick={() => document.getElementById("fileInput")?.click()}
              className="w-full cursor-pointer border-2 border-dashed border-purple-500 p-6 text-center rounded-lg hover:bg-white/5 transition"
            >
              {file ? (
                <p className="text-green-400 font-semibold">{file.name}</p>
              ) : (
                <p className="text-gray-400">
                  Drop a file here or click to select
                </p>
              )}
            </div>
            <input
              id="fileInput"
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </CardContent>
          <CardFooter className="pt-4 flex flex-col items-center gap-4">
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="cursor-pointer relative overflow-hidden rounded-full px-6 py-3 font-bold text-white shadow-lg disabled:opacity-70 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-800 transition-colors duration-300 w-full max-w-xs"
            >
              <span className="relative z-10">
                {loading ? `Processing ${progress}%` : "Upload"}
              </span>
              {loading && (
                <span className="absolute inset-0 bg-gradient-to-b from-purple-500 to-purple-700 animate-pulse opacity-30 blur-md" />
              )}
            </button>

            {loading && (
              <div className="w-full max-w-xs mt-2 bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-400 h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Previous Uploads Drawer - attached (no gap) */}
        <div className="w-full max-w-3xl mt-0">
          <div className="bg-[#1F1F1F] border border-neutral-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className="cursor-pointer w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/5 transition"
            >
              <span className="text-purple-300 font-semibold">
                Previous uploaded
              </span>
              <span className="text-sm text-gray-400">
                {drawerOpen ? "Hide" : "Show"}
              </span>
            </button>
            {drawerOpen && (
              <div className="px-5 pb-5 space-y-3 max-h-64 overflow-y-auto">
                {recentUploads.length === 0 && (
                  <p className="text-gray-400">No recent uploads found.</p>
                )}
                {recentUploads.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-lg bg-[#1A1A1A] border border-neutral-800 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-white font-medium">
                          {u.originalFileName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {u.formattedDate || u.timeAgo}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {u.vocalsFilePath && (
                        <a
                          href={u.vocalsFilePath}
                          download
                          className="text-sm text-purple-300 hover:text-purple-200 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Vocals
                        </a>
                      )}
                      {u.instrumentalFilePath && (
                        <a
                          href={u.instrumentalFilePath}
                          download
                          className="text-sm text-purple-300 hover:text-purple-200 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Instrumental
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-6 text-center text-white space-y-6 w-full max-w-4xl">
            {/* Show original filename */}
            <div className="text-lg font-medium text-purple-300 mb-4">
              Processed:{" "}
              <span className="text-white font-bold">
                {result.originalName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#2A2A2A] p-4 rounded-xl shadow-inner">
                <h3 className="text-lg font-bold text-purple-400 mb-2">
                  🎤 Vocals
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  {path.parse(result.originalName).name}_Vocals.wav
                </p>
                <audio controls className="w-full">
                  <source src={result.vocals} type="audio/wav" />
                </audio>
              </div>
              <div className="bg-[#2A2A2A] p-4 rounded-xl shadow-inner">
                <h3 className="text-lg font-bold text-purple-400 mb-2">
                  🎶 Instrumental
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  {path.parse(result.originalName).name}_Instruments.wav
                </p>
                <audio controls className="w-full">
                  <source src={result.instrumental} type="audio/wav" />
                </audio>
              </div>
            </div>

            {/* Effects buttons removed */}

            {/* Lyrics Button */}
            <button
              onClick={handleGenerateLyrics}
              disabled={lyricsLoading}
              className={`cursor-pointer mt-4 px-6 py-2 rounded-full text-white font-bold transition-all ${
                lyricsLoading
                  ? "animate-pulse bg-purple-800 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {lyricsLoading ? "Generating..." : "Show Lyrics"}
            </button>
          </div>
        )}

        {/* Pitch & Reverb section removed from home */}

        {showLyricsCard && (
          <Card className="mt-4 w-full max-w-3xl bg-[#2A2A2A] text-white shadow-lg border border-purple-500">
            <CardHeader>
              <CardTitle>🎤 Live Lyrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-lg font-medium">
              {lyrics.slice(0, currentLine).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </CardContent>
          </Card>
        )}

        <AudioControl />
      </main>

      {/* About Section */}
      <section
        id="about"
        className="w-full bg-purple-950 text-white py-20 px-6 text-center relative z-10"
      >
        <h2 className="text-3xl font-bold mb-6">About This App</h2>
        <p className="max-w-3xl mx-auto text-lg text-purple-200 leading-relaxed">
          This AI-powered Audio Processing Studio helps you separate vocals and
          instrumentals from your favorite songs in real time, apply
          professional audio effects like pitch shifting and reverb, and
          generate live lyrics with synchronized playback. Whether you're a
          karaoke lover, music producer, remix artist, or content creator, this
          comprehensive tool gives you clean tracks, enhanced audio, and
          real-time lyric transcription for your next creative project — all
          with a simple upload. Powered by machine learning, advanced audio
          processing, and speech recognition technology, optimized for ease of
          use, and built for creators like you.
        </p>
      </section>
    </div>
  );
}
