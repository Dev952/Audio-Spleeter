"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export default function AudioControl() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.5; // Optional volume
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked — stays paused until user clicks
        setIsPlaying(false);
      });
    }
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/Avicii.wav" 
        loop
        preload="auto"
      />

      <button
        onClick={togglePlay}
        className="fixed bottom-4 right-4 z-50 rounded-full p-3 bg-black text-white shadow-lg hover:bg-gray-800 transition-all"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
    </>
  );
} 
