"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const storedEmail = localStorage.getItem("userEmail");
    const storedPassword = localStorage.getItem("userPassword");

    if (email === storedEmail && password === storedPassword) {
      toast.success("Logged in successfully!");

      // ✅ Mark user as logged in
      localStorage.setItem("isLoggedIn", "true");

      // ✅ Add login event to history
      const history = JSON.parse(localStorage.getItem("loginHistory") || "[]");
      history.push({
        date: new Date().toLocaleString(),
        action: "Logged in",
      });
      localStorage.setItem("loginHistory", JSON.stringify(history));

      router.push("/home");
    } else {
      toast.error("Invalid email or password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full text-white bg-gradient-to-br from-black via-purple-900 to-purple-800">
      <div className="bg-[#1F1F1F] rounded-2xl shadow-lg p-8 w-full max-w-md border border-purple-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-purple-300">
          Log In
        </h1>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <Label htmlFor="email" className="text-purple-300 mb-2 block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-white placeholder-gray-300"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-purple-300 mb-2 block">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-white placeholder-gray-300"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold"
          >
            Log In
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-300">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-purple-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
