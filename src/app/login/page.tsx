"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser, getCurrentUser, forgotPassword, verifyResetCode, resetPassword } from "@/app/actions/auth";

type Step = 'login' | 'forgot-email' | 'verify-code' | 'reset-password';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>('login');
    
  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const result = await loginUser(formData);

      if (!result.success) {
        toast.error(result.error || "Login failed");
        return;
      }

    toast.success("Logged in successfully!");
      router.push("/home");

    } catch (error) {
      toast.error("Connection error. Please try again.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', forgotEmail);

      const result = await forgotPassword(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to send verification code");
        return;
      }

      toast.success("Verification code sent to your email!");
      setCurrentStep('verify-code');

    } catch (error) {
      toast.error("Connection error. Please try again.");
      console.error("Forgot password error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', forgotEmail);
      formData.append('code', verificationCode);

      const result = await verifyResetCode(formData);

      if (!result.success) {
        toast.error(result.error || "Invalid verification code");
        return;
      }

      toast.success("Code verified successfully!");
      setCurrentStep('reset-password');

    } catch (error) {
      toast.error("Connection error. Please try again.");
      console.error("Verify code error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', forgotEmail);
      formData.append('code', verificationCode);
      formData.append('newPassword', newPassword);

      const result = await resetPassword(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully! You can now login.");
      
      // Reset states and go back to login
      setCurrentStep('login');
      setForgotEmail("");
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (error) {
      toast.error("Connection error. Please try again.");
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setCurrentStep('login');
    setForgotEmail("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
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
        
        {/* LOGIN FORM */}
        {currentStep === 'login' && (
          <>
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
                disabled={loading}
                className="cursor-pointer w-full bg-purple-700 hover:bg-purple-800 text-white font-bold disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setCurrentStep('forgot-email')}
                className="cursor-pointer text-sm text-purple-400 hover:underline hover:text-purple-300 transition-colors"
              >
                Forgot your password?
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-300">
              Don't have an account?{" "}
              <Link href="/signup" className="text-purple-400 hover:underline">
                Sign up
              </Link>
            </p>
          </>
        )}

        {/* FORGOT PASSWORD - EMAIL STEP */}
        {currentStep === 'forgot-email' && (
          <>
            <div className="flex items-center mb-6">
              <button
                onClick={resetToLogin}
                className="cursor-pointer text-purple-400 hover:text-purple-300 mr-3 text-xl transition-colors"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-purple-300">
                Forgot Password
              </h1>
            </div>

            <p className="text-sm text-gray-300 mb-6">
              Enter your email address and we'll send you a verification code to reset your password.
            </p>

            <form className="space-y-4" onSubmit={handleForgotPassword}>
              <div>
                <Label htmlFor="forgot-email" className="text-purple-300 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="text-white placeholder-gray-300"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="cursor-pointer w-full bg-purple-700 hover:bg-purple-800 text-white font-bold disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          </>
        )}

        {/* VERIFY CODE STEP */}
        {currentStep === 'verify-code' && (
          <>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('forgot-email')}
                className="cursor-pointer text-purple-400 hover:text-purple-300 mr-3 text-xl transition-colors"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-purple-300">
                Verify Code
              </h1>
            </div>

            <p className="text-sm text-gray-300 mb-6">
              Enter the 6-digit verification code sent to{" "}
              <span className="text-white font-medium">{forgotEmail}</span>
            </p>

            <form className="space-y-4" onSubmit={handleVerifyCode}>
              <div>
                <Label htmlFor="verification-code" className="text-purple-300 mb-2 block">
                  Verification Code
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-white placeholder-gray-300 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="cursor-pointer w-full bg-purple-700 hover:bg-purple-800 text-white font-bold disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="cursor-pointer text-sm text-purple-400 hover:underline disabled:opacity-50 transition-colors"
              >
                Resend Code
              </button>
            </div>
          </>
        )}

        {/* RESET PASSWORD STEP */}
        {currentStep === 'reset-password' && (
          <>
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('verify-code')}
                className="cursor-pointer text-purple-400 hover:text-purple-300 mr-3 text-xl transition-colors"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-purple-300">
                Reset Password
              </h1>
            </div>

            <p className="text-sm text-gray-300 mb-6">
              Enter your new password below.
            </p>

            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <Label htmlFor="new-password" className="text-purple-300 mb-2 block">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-white placeholder-gray-300"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-purple-300 mb-2 block">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-white placeholder-gray-300"
                  required
                  minLength={6}
                />
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-sm mt-1">Passwords don't match</p>
              )}

              <Button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="cursor-pointer w-full bg-purple-700 hover:bg-purple-800 text-white font-bold disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}