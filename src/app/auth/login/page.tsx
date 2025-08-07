"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/supabase";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import ResetPassword from "@/components/reset-password/page";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { closeAuthModal } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
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

      closeAuthModal();
      
      router.push("/");
      router.refresh();
      toast.success("Login successful!");
  
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg("An unexpected error occurred. Please try again.");
        toast.error("An unexpected error occurred.");
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setErrorMsg("");
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setErrorMsg("");
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="  w-full max-w-md">
        {isForgotPassword ? (
          <ResetPassword onBackToLogin={handleBackToLogin} />
        ) : (
          <div className="rounded-2xl shadow-2xl bg-white p-8">
            <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">
              Superadmin Login
            </h2>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                className={`bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition ${
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
                className="text-blue-600 text-sm font-medium hover:text-blue-800 text-center transition"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Forgot Password?
              </button>

              {errorMsg && (
                <p className="text-red-600 text-sm text-center">{errorMsg}</p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}