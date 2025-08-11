"use client";
import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Eye, EyeOff } from "lucide-react";

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push("At least 6 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("One number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("One special character");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

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
  const [passwordStrength, setPasswordStrength] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) setSessionValid(true);
      else setError("Session expired — restart reset flow.");
      setLoadingSession(false);
    };
    check();
  }, []);

  const handlePasswordChange = (password: string) => {
    const validation = validatePassword(password);
    setValidationErrors(validation.errors);
    
    if (validation.isValid) {
      setPasswordStrength("Strong");
    } else if (validation.errors.length <= 2) {
      setPasswordStrength("Medium");
    } else {
      setPasswordStrength("Weak");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const validation = validatePassword(newPwd);
    if (!validation.isValid) {
      setError("Please meet all password requirements");
      return;
    }
    
    if (newPwd !== confirmPwd) {
      setError("Passwords do not match");
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New password"
                className="w-full p-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={newPwd}
                onChange={(e) => {
                  setNewPwd(e.target.value);
                  handlePasswordChange(e.target.value);
                }}
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
            
            {/* Password Strength Indicator */}
            {newPwd && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Strength:</span>
                  <span className={`text-sm font-medium ${
                    passwordStrength === "Strong" ? "text-green-600" :
                    passwordStrength === "Medium" ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {passwordStrength}
                  </span>
                </div>
                
                {/* Password Requirements */}
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { label: "6+ characters", met: newPwd.length >= 8 },
                    { label: "Uppercase", met: /[A-Z]/.test(newPwd) },
                    { label: "Lowercase", met: /[a-z]/.test(newPwd) },
                    { label: "Number", met: /\d/.test(newPwd) },
                    { label: "Special char", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPwd) }
                  ].map((req, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        req.met ? "bg-green-500" : "bg-gray-300"
                      }`} />
                      <span className={req.met ? "text-green-600" : "text-gray-500"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
      
      {/* Toast Container for this page only */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
    </div>
  );
}