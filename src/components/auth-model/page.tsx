"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/supabase";
import { Eye, EyeOff, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/supabase/actions";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { isAuthenticated, isSuperadmin, closeAuthModal } = useAuth();
  const router = useRouter();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setErrorMsg("");
    setMessage("");
    setShowPassword(false);
    setIsLoading(false);
    setIsForgotPassword(false);
  };

  useEffect(() => {
    if (!isAuthenticated || !isSuperadmin) {
      resetForm();
    }
  }, [isAuthenticated, isSuperadmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");
    setIsLoading(true);

    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrorMsg("Please enter a valid email address.");
        toast.error("Please enter a valid email address.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        setErrorMsg(error.message);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      const { data: roleData, error: roleError } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("id", data.user.id)
        .eq("role", "superadmin")
        .maybeSingle();

      if (roleError || !roleData) {
        console.error("Role error:", roleError);
        setErrorMsg("You are not authorized as a superadmin.");
        toast.error("You are not authorized as a superadmin.");
        await supabaseClient.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Close modal immediately after successful login
      resetForm();
      onClose(); // Close the modal first
      closeAuthModal(); // Then update auth context

      // Show success message after modal is closed
      toast.success("Login successful!");

      // Refresh after a small delay to ensure modal is closed
      setTimeout(() => {
        router.refresh();
      }, 300);
    } catch (err) {
      console.error("Unexpected login error:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");
      setIsLoading(false);
    }
  };
  const handleLogout = async () => {
    setErrorMsg("");
    setMessage("");
    setIsLoading(true);

    try {
      const { error } = await signOut();
      if (error) {
        console.error("Logout error:", error);
        setErrorMsg(error);
        toast.error(error);
        setIsLoading(false);
        return;
      }

      // Trigger onAuthStateChange by signing out client-side
      await supabaseClient.auth.signOut();

      toast.success("Logged out successfully!");
      resetForm();
      closeAuthModal(); // Update AuthContext state
      onClose(); // Update parent component state
      router.refresh();
    } catch (err) {
      console.error("Unexpected logout error:", err);
      setErrorMsg("An unexpected error occurred during logout.");
      toast.error("An unexpected error occurred during logout.");
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");
    setIsLoading(true);

    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrorMsg("Please enter a valid email address.");
        toast.error("Please enter a valid email address.");
        setIsLoading(false);
        return;
      }

      const redirectUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/update-password`
      : `${window.location.origin || "https://time-table-system-three.vercel.app"}/update-password`;
    console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL);
    console.log("window.location.origin:", window.location.origin);
    console.log("Constructed redirectUrl:", redirectUrl);
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    console.log("Supabase reset response:", { error, redirectUrl });
      if (error) {
        console.error("Reset password error:", error);
        setErrorMsg("Error: " + error.message);
        toast.error(error.message);
      } else {
        setMessage(
          "Reset link sent to your email. Please check your inbox and spam folder."
        );
        toast.success("Reset link sent to your email.");
        setEmail(""); // Clear email after successful request
      }
    } catch (err) {
      console.error("Unexpected reset password error:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setErrorMsg("");
    setMessage("");
    setEmail(""); // Clear email when going back to login
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setErrorMsg("");
    setMessage("");
    setPassword(""); // Clear password when switching to forgot password
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 px-2 md:px-0 lg:px-0"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative transform transition-all duration-300 scale-100">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={() => {
            resetForm();
            closeAuthModal(); // Update AuthContext state
            onClose(); // Update parent component state
          }}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">
          {isAuthenticated && isSuperadmin
            ? "Logout"
            : isForgotPassword
            ? "Reset Password"
            : "Superadmin Login"}
        </h2>

        {isAuthenticated && isSuperadmin ? (
          <div className="flex flex-col gap-4">
            <p className="text-center text-gray-700">
              You are logged in as a superadmin.
            </p>
            <button
              type="button"
              className={`bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isLoading ? "Logging Out..." : "Log Out"}
            </button>
          </div>
        ) : isForgotPassword ? (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <button
              type="submit"
              className={`bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              className="text-blue-600 text-sm underline hover:text-blue-800 text-center"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              Back to Login
            </button>

            {message && (
              <p className="text-green-600 text-sm text-center mt-2">
                {message}
              </p>
            )}
            {errorMsg && (
              <p className="text-red-600 text-sm text-center">{errorMsg}</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              className={`bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isLoading ? "Signing In..." : "Sign In"}
            </button>

            <button
              type="button"
              className="text-blue-600 text-sm underline hover:text-blue-800 text-center"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot Password?
            </button>

            {errorMsg && (
              <p className="text-red-600 text-sm text-center">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
