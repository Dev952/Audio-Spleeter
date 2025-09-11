"use client";

import React from "react";

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white flex flex-col items-center py-20 px-6">
      <h1 className="text-4xl font-extrabold text-purple-400 mb-4">Choose Your Plan</h1>
      <p className="text-lg text-purple-200 max-w-2xl text-center mb-12">
        Unlock all features and get unlimited access to audio separation and effects. Free plan gives you unlimited separation without effects. Pro plan gives you everything!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Free Plan */}
        <div className="bg-[#1F1F1F] p-8 rounded-3xl border border-purple-500 shadow-lg flex flex-col items-center text-center transition hover:scale-105">
          <h2 className="text-2xl font-bold text-purple-300 mb-2">Free Plan</h2>
          <p className="text-gray-400 mb-4">Unlimited audio separation without effects</p>
          <p className="text-3xl font-extrabold text-white mb-6">$0</p>
          <ul className="text-left text-gray-300 mb-6 space-y-2">
            <li>✔ Unlimited audio separation</li>
            <li>✖ Audio effects disabled</li>
            <li>✔ Safe & easy to use</li>
          </ul>
          <button className="cursor-pointer bg-purple-500 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-purple-600 transition">
            Start Free
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-8 rounded-3xl border border-yellow-400 shadow-2xl flex flex-col items-center text-center transition hover:scale-105">
          <h2 className="text-2xl font-bold text-white mb-2">Pro Plan</h2>
          <p className="text-purple-100 mb-4">Unlimited separation + effects</p>
          
          {/* Pricing toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-white font-bold text-xl">$9.99</div>
            <div className="text-white text-sm">/ month</div>
            <span className="text-white text-lg">•</span>
            <div className="text-white font-bold text-xl">$99.99</div>
            <div className="text-white text-sm">/ year</div>
          </div>

          <ul className="text-left text-white mb-6 space-y-2">
            <li>✔ Unlimited audio separation</li>
            <li>✔ Audio effects enabled</li>
            <li>✔ Fast processing</li>
            <li>✔ Premium support</li>
          </ul>
          <button className="cursor-pointer bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-lg hover:bg-yellow-300 transition">
            Upgrade to Pro
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-sm mt-12 max-w-2xl text-center">
        You can switch plans anytime. Free plan always available.
      </p>
    </div>
  );
}
