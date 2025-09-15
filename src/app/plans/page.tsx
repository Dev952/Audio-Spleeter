"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCurrentUser } from "@/app/actions/auth";

export default function PlansPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleFreePlan = () => {
    // Navigate to effects page - free access with 5 file limit
    router.push("/effects");
    toast.success("Welcome to Audio Effects! You have 5 free uses to explore.");
  };

  const handleProPlan = () => {
    // Pro plan button - no redirect, just show coming soon message
    toast.info("Pro features coming soon! Stay tuned for advanced features.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-purple-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white flex flex-col items-center py-20 px-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 text-purple-300 hover:text-white transition-colors cursor-pointer bg-transparent border-none text-lg"
      >
        ← Back
      </button>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-purple-400 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-purple-200 max-w-2xl text-center">
          Start with our free plan and try 5 audio effects! Upgrade to Pro for unlimited access and advanced features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Free Plan */}
        <div className="bg-[#1F1F1F] p-8 rounded-3xl border border-purple-500 shadow-lg flex flex-col items-center text-center transition hover:scale-105">
          <h2 className="text-2xl font-bold text-purple-300 mb-2">Free Plan</h2>
          <p className="text-gray-400 mb-4">Try our audio effects</p>
          <p className="text-3xl font-extrabold text-white mb-6">$0</p>
          <ul className="text-left text-gray-300 mb-6 space-y-2">
            <li>✔ Unlimited audio separation</li>
            <li>✔ 5 free audio effects</li>
            <li>✔ Pitch adjustment</li>
            <li>✔ Speed control</li>
            <li>✔ Basic reverb effects</li>
            <li>✔ Safe & easy to use</li>
          </ul>
          <button 
            onClick={handleFreePlan}
            className="cursor-pointer bg-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-purple-600 transition transform hover:scale-105"
          >
            Get Started Free
          </button>
        </div>

        {/* Pro Plan - Coming Soon */}
        <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-8 rounded-3xl border border-yellow-400 shadow-2xl flex flex-col items-center text-center transition hover:scale-105 opacity-75">
          <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold mb-3">
            COMING SOON
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pro Plan</h2>
          <p className="text-purple-100 mb-4">Advanced features & unlimited access</p>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="text-white font-bold text-3xl">$9.99</div>
            <div className="text-white text-lg">/ month</div>
          </div>

          <ul className="text-left text-white mb-6 space-y-2">
            <li>✔ Everything in Free</li>
            <li>✔ Unlimited audio effects</li>
            <li>✔ High-quality reverb enhancement</li>
            <li>✔ Professional EQ controls</li>
            <li>✔ Batch processing</li>
            <li>✔ Priority support</li>
            <li>✔ Export in multiple formats</li>
          </ul>

          <button
            onClick={handleProPlan}
            className="cursor-pointer bg-yellow-400 text-black px-8 py-3 rounded-full font-bold shadow-lg hover:bg-yellow-300 transition transform hover:scale-105"
          >
            Notify Me When Available
          </button>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-400 text-sm max-w-2xl">
          Start with our free plan and try 5 audio effects processing sessions. 
          Pro plan will include unlimited usage, enhanced reverb quality, professional EQ controls, and priority support.
        </p>
      </div>
    </div>
  );
}