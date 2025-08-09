"use client";
import React, { useState } from "react";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

export default function OtpVerification() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // First verify the OTP
      const { error } = await supabaseClient.auth.verifyOtp({
        email,
        token: otp,
        type: "recovery",
      });

      if (error) {
        setErrorMsg("Invalid OTP. Please try again.");
        toast.error("Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }

      // Verify session exists after OTP verification
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        setErrorMsg("Failed to create session. Please try again.");
        toast.error("Failed to create session. Please try again.");
        setLoading(false);
        return;
      }

      // Now check if the user is a superadmin
      const { data: userData, error: userError } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("id", session.user.id)
        .eq("role", "superadmin")
        .single();

      if (userError || !userData) {
        setErrorMsg("This email is not registered as a superadmin account.");
        toast.error("This email is not registered as a superadmin account.");
        // Sign out the user since they're not authorized
        await supabaseClient.auth.signOut();
        setLoading(false);
        return;
      }

      toast.success("OTP verified successfully!");
      router.push("/auth/update-password");
    } catch (err) {
      if(err instanceof Error) {
        setErrorMsg("An unexpected error occurred. Please try again.");
        toast.error("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabaseClient.auth.signOut(); // Invalidate session
    router.push("/auth/login");
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">
          Verify OTP
        </h2>
        <p className="mb-4 text-center text-gray-600">
          Enter the OTP sent to {email}
        </p>
        <form onSubmit={handleOtpVerification} className="flex flex-col gap-5">
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className={`bg-[#042954] text-white py-3 rounded-lg font-semibold hover:brightness-110 flex items-center justify-center gap-2 transition ${
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
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
          <button
            type="button"
            className="text-[#042954] text-sm font-medium hover:brightness-110 text-center transition"
            onClick={handleBackToLogin}
            disabled={loading}
          >
            Back to Login
          </button>
          {errorMsg && (
            <p className="text-red-600 text-sm text-center">{errorMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}