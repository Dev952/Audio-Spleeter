"use client";

import React, { useState, useEffect, useRef } from "react";
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
import AudioControl from "@/components/ui/AudioControl";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // ✅ LOGIN CHECK
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn !== "true") {
      router.push("/login");
    }
  }, [router]);

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    folder: string;
    vocals: string;
    instrumental: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [showLyricsCard, setShowLyricsCard] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPos, setHistoryPos] = useState({ x: 100, y: 100 });
  const draggingRef = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const modalStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [lastLoginHistory, setLastLoginHistory] = useState<any[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      if (isLoggedIn !== "true") {
        router.push("/login");
      }

      // Load login history safely
      const history = JSON.parse(localStorage.getItem("loginHistory") || "[]");
      setLastLoginHistory(history);
    }
  }, [router]);

  const handleGenerateLyrics = async () => {
    if (!result) return;
    setLyricsLoading(true);
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: JSON.stringify({ filePath: `${result.folder}/input.wav` }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    const lines = data.lyrics.split(/(?<=[.?!])\s+/);
    setLyrics(lines);
    setCurrentLine(0);
    setShowLyricsCard(true);
    setLyricsLoading(false);
  };

  useEffect(() => {
    if (!showLyricsCard || currentLine >= lyrics.length) return;
    const interval = setInterval(() => {
      setCurrentLine((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showLyricsCard, currentLine, lyrics.length]);

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
      alert("Upload or processing failed.");
    }
    setLoading(false);
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    draggingRef.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    modalStartPos.current = { ...historyPos };
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!draggingRef.current) return;
    const clientX =
      "touches" in e && e.touches.length > 0
        ? e.touches[0].clientX
        : (e as MouseEvent).clientX;
    const clientY =
      "touches" in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as MouseEvent).clientY;
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;
    setHistoryPos({
      x: modalStartPos.current.x + deltaX,
      y: modalStartPos.current.y + deltaY,
    });
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove);
    window.addEventListener("touchend", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, []);
  return (
    <div className="min-h-screen w-full text-white scroll-smooth bg-gradient-to-br from-black via-purple-900 to-purple-800 relative overflow-hidden">
      {/* Navbar */}
      <div className="sticky top-0 z-50 shadow-md rounded-b-[2rem] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-black to-purple-900 opacity-40 blur-sm pointer-events-none" />
        <NavigationMenu className="bg-black/70 px-4 py-6 flex justify-between items-center relative z-10">
          {/* Left: Logo */}
          <div className="text-2xl font-bold">🎶 Audio Splitter</div>
          {/* Right: Only History Button */}
          <NavigationMenuList className="flex space-x-6 items-center">
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
                onClick={() => setShowHistoryModal(true)}
                className="hover:text-purple-300 transition text-lg font-medium bg-transparent border-none cursor-pointer"
              >
                History
              </button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Main Section */}
      <main
        id="home"
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10"
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
              disabled={loading}
              className="relative overflow-hidden rounded-full px-6 py-3 font-bold text-white shadow-lg disabled:opacity-70 bg-purple-600 w-full max-w-xs"
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

        {result && (
          <div className="mt-6 text-center text-white space-y-6 w-full max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#2A2A2A] p-4 rounded-xl shadow-inner">
                <h3 className="text-lg font-bold text-purple-400 mb-2">
                  🎤 Vocals
                </h3>
                <audio controls className="w-full">
                  <source src={result.vocals} type="audio/wav" />
                </audio>
              </div>
              <div className="bg-[#2A2A2A] p-4 rounded-xl shadow-inner">
                <h3 className="text-lg font-bold text-purple-400 mb-2">
                  🎶 Instrumental
                </h3>
                <audio controls className="w-full">
                  <source src={result.instrumental} type="audio/wav" />
                </audio>
              </div>
            </div>
            <button
              onClick={handleGenerateLyrics}
              disabled={lyricsLoading}
              className={`mt-4 px-6 py-2 rounded-full text-white font-bold transition-all ${
                lyricsLoading
                  ? "animate-pulse bg-purple-800 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {lyricsLoading ? "Generating..." : "Show Lyrics"}
            </button>
          </div>
        )}

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
          This AI-powered Vocal Remover App helps you separate vocals and
          instrumentals from your favorite songs in real time. Whether you're a
          karaoke lover, music producer, or remix artist, this tool gives you
          clean tracks for your next creative project — all with a simple
          upload. Powered by machine learning, optimized for ease of use, and
          built for creators like you.
        </p>
      </section>

      {/* Draggable History Modal */}
      {showHistoryModal && (
        <div
          className="fixed z-50 max-w-xs w-[320px] max-h-48 bg-[#2A2A2A] rounded-lg p-4 shadow-lg overflow-y-auto cursor-grab"
          style={{ left: historyPos.x, top: historyPos.y }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <h3 className="text-xl font-bold mb-3 text-purple-400 cursor-move select-none">
            Last Login History
          </h3>
          {lastLoginHistory.length > 0 ? (
            <ul className="list-disc list-inside text-purple-300 space-y-2">
              {lastLoginHistory.map((item: any, idx: number) => (
                <li key={idx}>
                  <strong>{item.date}:</strong> {item.action}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-purple-300">No login history available.</p>
          )}
          <button
            onClick={() => setShowHistoryModal(false)}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white font-semibold"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
