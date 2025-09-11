"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PitchReverb from "@/components/ui/PitchReverb";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Wand2 } from "lucide-react";


import { useEffect, useState} from "react";

export default function EffectsPage() {
  const router = useRouter();

const [showWelcome, setShowWelcome] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setShowWelcome(false);
  }, 5000);
  return () => clearTimeout(timer);
}, []);


  return (
    <>
    
      <div className="min-h-screen w-full text-white bg-gradient-to-br from-black via-purple-900 to-purple-800">
        <div className="sticky top-0 z-50 shadow-md rounded-b-[2rem] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-black to-purple-900 opacity-40 blur-sm pointer-events-none" />
          <NavigationMenu className="bg-black/70 px-4 py-6 flex justify-between items-center relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Wand2 className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Audio Effects Studio
              </div>
                 {/* Welcome Message */}
    {showWelcome && (
      <div className="absolute left-1/2 transform -translate-x-1/2 mt-1 text-center">
        <span className="text-lg font-medium text-purple-300  ">
          Welcome Premium Unlocked ✨
        </span>
      </div>
    )}
            </div>
            <NavigationMenuList className="flex space-x-6 items-center">
              <NavigationMenuItem>
                <Button
                  onClick={() => router.push("/")}
                  className="cursor-pointer backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400/50 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 group"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                  Back to Home
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <main className="w-full flex items-center justify-center px-4 py-8">
          <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm text-white shadow-2xl border border-purple-500/20 rounded-2xl w-full max-w-5xl">
           
            <CardContent className="px-8 pb-8">
              <PitchReverb />
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-gray-400">
          <p>Professional audio effects processing powered by AI</p>
        </footer>
      </div>
    </>
  );
}