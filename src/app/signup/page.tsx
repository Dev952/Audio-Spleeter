"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // Save user data for login
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userPassword", password);

    // Optional: store complete user
    localStorage.setItem("user", JSON.stringify({ name, email, password }));

    // ✅ Add signup event to login history
    const history = JSON.parse(localStorage.getItem("loginHistory") || "[]");
    history.push({
      date: new Date().toLocaleString(),
      action: "Account created",
    });
    localStorage.setItem("loginHistory", JSON.stringify(history));

    toast.success("Account created successfully!", {
      description: "You can now log in.",
    });

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full text-white bg-gradient-to-br from-black via-purple-900 to-purple-800">
      <div className="bg-[#1F1F1F] rounded-2xl shadow-lg p-8 w-full max-w-md border border-purple-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-purple-300">Sign Up</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name" className="text-purple-300 mb-2 block">Name</Label>
            <Input id="name" name="name" type="text" placeholder="Your Name" required />
          </div>
          <div>
            <Label htmlFor="email" className="text-purple-300 mb-2 block">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div>
            <Label htmlFor="birthdate" className="text-purple-300 mb-2 block">Birthdate</Label>
            <Input id="birthdate" type="date" required />
          </div>
          <div>
            <Label htmlFor="password" className="text-purple-300 mb-2 block">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="text-purple-300 mb-2 block">Re-enter Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold">Sign Up</Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-300">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
