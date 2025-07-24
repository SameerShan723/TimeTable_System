"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/supabase";
import { Eye, EyeOff, X } from "lucide-react";
import { toast } from "react-toastify";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  useEffect(() => {
    // Check for error-related words in search parameters
    const params = new URLSearchParams(searchParams.toString().toLowerCase());
    const hasErrorWords = ["error", "denied", "expired"].some((word) =>
      Array.from(params.keys()).some((key) => key.includes(word)) ||
      Array.from(params.values()).some((value) => value.includes(word))
    );

    if (hasErrorWords) {
      
      setError("OTP expired, please regenerate link.");
      setIsValidLink(false);
    } else {
      setIsValidLink(true);
    }
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        setError("Please fill in both password fields.");
        toast.error("Please fill in both password fields.");
        setIsLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        toast.error("Password must be at least 6 characters long.");
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        toast.error("Passwords do not match.");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError("OTP expired, please regenerate link.");
        toast.error("OTP expired, please regenerate link.");
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");

      await supabaseClient.auth.signOut();
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      if(err instanceof Error) {
      setError("OTP expired, please regenerate link.");
      toast.error("OTP expired, please regenerate link.");
      setIsLoading(false);
    }}
  };

  const handleClose = async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      if(error instanceof Error) {
      toast.error("OTP expired, please regenerate link.");
    }}
    router.push("/");
  };

  if (!isValidLink) {
    const regenerateLink = async()=>{
await supabaseClient.auth.signOut();
router.push("/reset-password")
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            onClick={handleClose}
            aria-label="Close and return to home"
          >
            <X size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => regenerateLink()}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Regenerate Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative transform transition-all duration-300 scale-100">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={handleClose}
          aria-label="Close and return to home"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">
          Set a New Password
        </h2>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password (min 6 characters)"
              className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
            {isLoading ? "Updating Password..." : "Update Password"}
          </button>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
}