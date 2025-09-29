"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PitchReverb from "@/components/ui/PitchReverb";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Wand2, Radio ,Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions/auth";

export default function EffectsPage() {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Authentication check using server actions - same as home page
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
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000); // Same 5 seconds as home page

    return () => clearTimeout(timer);
  }, []);

  // Show loading while authenticating - same as home page
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
              {user && showWelcome && (
                <div className="absolute left-1/2 transform -translate-x-1/2 mt-1 text-center">
                  <span className="text-lg font-medium text-purple-300">
                    Welcome to Audio Effect Studio {user.name}! ✨
                  </span>
                </div>
              )}
            </div>
            <NavigationMenuList className="flex space-x-6 items-center">
              <NavigationMenuItem>
                <Button
                  onClick={() => router.push("/home")}
                  className="cursor-pointer backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-400/50 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 group"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                  Back to Home
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <main className="w-full flex flex-col items-center justify-center px-4 py-8">
          <Card className="bg-[#1F1F1F] text-white shadow-2xl border border-neutral-800 rounded-2xl w-full max-w-3xl">
            <CardContent className="px-8 pb-8">
              <PitchReverb />
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full max-w-5xl">
            {[
              {
                title: "Pitch Enhancement",
                description: "Fine-tune audio pitch with precision controls. Shift frequencies up or down to achieve the perfect tone for your audio tracks.",
                icon: TrendingUp ,
                color: " to-cyan-500"
              },
              {
                title: "Reverb & Tempo Control",
                description: "Add depth with professional reverb effects and adjust playback speed. Control tempo without affecting pitch quality.",
                icon: Radio,
                color: " to-pink-500"
              },
              {
                title: "Lo-Fi Slow Reverb",
                description: "One-click lo-fi magic button that creates dreamy, slowed-down tracks with vintage reverb for that perfect chill vibe.",
                icon: Sparkles,
                color: "to-emerald-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-[#1F1F1F] text-white shadow-2xl border border-neutral-800 rounded-2xl w-full max-w-3xl">
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-r ${feature.color} p-3 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-purple-200 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-gray-400">
          <p>Professional audio effects processing powered by AI</p>
        </footer>
      </div>
    </>
  );
}