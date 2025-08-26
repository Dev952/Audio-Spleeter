"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser, getCurrentUser } from "@/app/actions/auth";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getCurrentUser();
        if (result.success && result.user) {
          router.push("/home");
          return;
        }
      } catch (error) {
        console.log("No existing auth found");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);

      const result = await registerUser(formData);

      if (!result.success) {
        toast.error(result.error || "Registration failed");
        return;
      }

      toast.success("Account created successfully! Please log in.");

      // Always redirect to login page after signup
      setTimeout(() => {
        router.push("/login");
      }, 1000);

    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full text-white bg-gradient-to-br from-black via-purple-900 to-purple-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-purple-300">Checking authentication...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen w-full text-white bg-gradient-to-br from-black via-purple-900 to-purple-800">
      <div className="bg-[#1F1F1F] rounded-2xl shadow-lg p-8 w-full max-w-md border border-purple-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-purple-300">
          Sign Up
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name" className="text-purple-300 mb-2 block">
              Name
            </Label>
            <Input 
              id="name" 
              type="text" 
              placeholder="Your Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-white placeholder-gray-300"
              required 
            />
          </div>

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

          <div>
            <Label htmlFor="confirmPassword" className="text-purple-300 mb-2 block">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-white placeholder-gray-300"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-300">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}