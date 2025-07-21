"use client";

import React, { useState } from "react";
import { supabaseClient } from "@/lib/supabase/supabase";
import { toast } from "react-toastify";
import Link from "next/link";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.MouseEvent<HTMLButtonElement>) => {
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
        : "http://localhost:3000/update-password";

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      console.log(redirectUrl, "redirect url");

      if (error) {
        console.error("Reset password error:", error);
        setErrorMsg("Error: " + error.message);
        toast.error(error.message);
      } else {
        setMessage("Reset link sent to your email.");
        toast.success("Reset link sent to your email.");
        setEmail("");
      }
    } catch (err) {
      console.error("Unexpected reset password error:", err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">
          Reset Password
        </h2>
        <div className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <button
            onClick={handleReset}
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
            Send Reset Link
          </button>
          <Link
            href="/login"
            className="text-blue-600 text-sm font-medium hover:text-blue-800 text-center transition"
          >
            Back to Login
          </Link>
          {message && (
            <p
              className={`text-sm text-center ${
                message.includes("Error") ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </p>
          )}
          {errorMsg && (
            <p className="text-red-600 text-sm text-center">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
