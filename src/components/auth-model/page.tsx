"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/supabase";
import { Eye, EyeOff, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

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
  const { closeAuthModal } = useAuth(); // Only used for login success
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
        setErrorMsg("You are not authorized as a superadmin.");
        toast.error("You are not authorized as a superadmin.");
        await supabaseClient.auth.signOut();
        setIsLoading(false);
        return;
      }

      resetForm();
      onClose();
      closeAuthModal();
      toast.success("Login successful!");
      setTimeout(() => {
        router.refresh();
      }, 300);
    } catch (err) {
      if(err instanceof Error) {
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");
      setIsLoading(false);}
    }
  };

  const getRedirectUrl = () => {
    return process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/update-password`
      : "https://time-table-system-three.vercel.app/update-password";
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

      const redirectUrl = getRedirectUrl();
console.log(redirectUrl,"redirect url")
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMsg("Error: " + error.message);
        toast.error(error.message);
      } else {
        setMessage(
          "Reset link sent to your email. Please check your inbox and spam folder."
        );
        toast.success("Reset link sent to your email.");
        setEmail("");
      }
    } catch (err) {
      if(err instanceof Error) {
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");}
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setErrorMsg("");
    setMessage("");
    setEmail("");
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setErrorMsg("");
    setMessage("");
    setPassword("");
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
            onClose();
          }}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">
          {isForgotPassword ? "Reset Password" : "Superadmin Login"}
        </h2>

        {isForgotPassword ? (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 rounded-lg border border-gray-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <button
              type="submit"
              className={`bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              className="text-blue-600 text-sm underline text-center"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              Back to Login
            </button>

            {message && <p className="text-green-600 text-sm">{message}</p>}
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-lg border border-gray-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full p-3 rounded-lg border border-gray-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              className={`bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>

            <button
              type="button"
              className="text-blue-600 text-sm underline text-center"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot Password?
            </button>

            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
