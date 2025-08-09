"use client";
import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [sessionValid, setSessionValid] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) setSessionValid(true);
      else setError("Session expired — restart reset flow.");
      setLoadingSession(false);
    };
    check();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPwd.length < 6 || newPwd !== confirmPwd) {
      setError("Passwords must match and be ≥6 characters.");
      return;
    }
    setUpdating(true);
    const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
    if (error) {
      setError(error.message);
      toast.error(error.message);
    } else {
      toast.success("Password updated; redirecting...");
      await supabaseClient.auth.signOut();
      setTimeout(() => router.push("/auth/login"), 2000);
    }
    setUpdating(false);
  };

  const handleBackToLogin = () => {
    router.push("/auth/login");
  };

  if (loadingSession) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <p className="text-center text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <p className="text-red-600 text-sm text-center">{error}</p>
          <button
            type="button"
            className="text-[#042954] text-sm font-medium hover:brightness-110 text-center w-full mt-4 transition"
            onClick={handleBackToLogin}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">
          Set New Password
        </h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              disabled={updating}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={updating}
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              disabled={updating}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={updating}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={updating}
            className={`bg-[#042954] text-white py-3 rounded-lg font-semibold hover:brightness-110 flex items-center justify-center gap-2 transition ${
              updating ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {updating && (
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
            {updating ? "Updating..." : "Update Password"}
          </button>
          <button
            type="button"
            className="text-[#042954] text-sm font-medium hover:brightness-110 text-center transition"
            onClick={handleBackToLogin}
            disabled={updating}
          >
            Back to Login
          </button>
          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}