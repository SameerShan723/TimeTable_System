"use client";
import React, { useState } from "react";
import { supabaseClient } from "@/lib/supabase/supabase";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function ResetPassword({ onBackToLogin }: { onBackToLogin?: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      // First, verify if the email belongs to a superadmin using our API
      const verifyResponse = await fetch("/api/auth/verify-superadmin-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setErrorMsg(verifyData.error || "Failed to verify email");
        toast.error(verifyData.error || "Failed to verify email");
        setLoading(false);
        return;
      }

      // If email is verified, send OTP
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        toast.success("OTP sent to your email. Check inbox/spam.");
        router.push(`/auth/otp?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");
    }

    setLoading(false);
  };

  const handleBack = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">
        Reset Password
      </h2>
      <form onSubmit={handleReset} className="flex flex-col gap-5">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading && (
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
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
        <button
          type="button"
          className="text-blue-600 text-sm font-medium hover:text-blue-800 text-center transition"
          onClick={handleBack}
          disabled={loading}
        >
          Back to Login
        </button>
        {errorMsg && (
          <p className="text-red-600 text-sm text-center">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}