"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Eye, EyeOff } from "lucide-react";

interface SuperadminDetailsProps {
  initialUserDetails: {
    id: string;
    email: string;
    role: string;
    profile_picture?: string;
    username: string;
  };
  initialError: string | null;
}

const SuperadminDetails: React.FC<SuperadminDetailsProps> = ({
  initialUserDetails,
  initialError,
}) => {
  const { isAuthenticated, isSuperadmin, refreshUserData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFromReset = searchParams.get('reset') === 'true';
  
  const [userDetails, setUserDetails] = useState<{
    id: string;
    email: string;
    role: string;
    profile_picture?: string;
  } | null>(initialUserDetails);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError || "");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("email");

  // Check if user came from password reset link and show success message
  useEffect(() => {
    if (isFromReset && isAuthenticated && isSuperadmin) {
      toast.success("Successfully logged in! Now you can change your password.");
      // Remove the reset parameter from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('reset');
      window.history.replaceState({}, '', url.toString());
      // Auto-switch to password tab
      setActiveTab("password");
    }
  }, [isFromReset, isAuthenticated, isSuperadmin]);

  // Redirect if not authenticated or not superadmin
  useEffect(() => {
    if (!isAuthenticated || !isSuperadmin) {
      if (!isFromReset) { // Don't show error if coming from reset link
        toast.error("You are not authorized to access this page.");
        router.push("/");
      }
    }
  }, [isAuthenticated, isSuperadmin, router, isFromReset]);

  // Validate current password (only for email updates)
  const validateCurrentPassword = async () => {
    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      toast.error("Please enter your current password.");
      return false;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: userDetails?.email || "",
      password: currentPassword,
    });

    if (error) {
      console.error("Current password validation error:", error);
      setErrorMsg("Incorrect current password.");
      toast.error("Incorrect current password.");
      return false;
    }

    return true;
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw new Error("Please enter a valid email address.");
      }

      if (!currentPassword) {
        throw new Error("Please enter your current password.");
      }

      const response = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail,
          currentPassword,
          userId: userDetails?.id,
          currentEmail: userDetails?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update email");
      }

      toast.success("Email updated successfully!");

      // Update local user details
      setUserDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          email: newEmail,
        };
      });

      setNewEmail("");
      setCurrentPassword("");
      refreshUserData(); // Refresh user data in context
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
        toast.error(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      // For password reset flow, skip current password validation
      if (!isFromReset && currentPassword) {
        const isPasswordValid = await validateCurrentPassword();
        if (!isPasswordValid) {
          setIsLoading(false);
          return;
        }
      }

      if (newPassword.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        toast.error("Password must be at least 6 characters long.");
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        toast.error("Passwords do not match.");
        setIsLoading(false);
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error:", error);
        setErrorMsg(error.message);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      setSuccessMsg("Password updated successfully!");
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Unexpected password update error:", err);
      setErrorMsg("An unexpected error occurred.");
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get first letter of email for default profile picture
  const getInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  if (!isAuthenticated || !isSuperadmin) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">
          Superadmin Details
        </h2>

        {userDetails ? (
          <>
            {/* Profile Picture and User Details */}
            <div className="flex flex-col items-center mb-8">
              {userDetails.profile_picture ? (
                <Image
                  src={userDetails.profile_picture}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="rounded-full object-cover mb-2"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-user.png";
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#042954] text-white flex items-center justify-center text-4xl font-bold mb-2">
                  {getInitial(userDetails.email)}
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Your Details
              </h3>
              <p className="text-gray-600">
                <strong>Email:</strong> {userDetails.email}
              </p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`flex-1 py-2 text-center font-semibold ${
                  activeTab === "email"
                    ? "border-b-2 border-[#042954] text-[#042954]"
                    : "text-gray-500 hover:text-[#042954]"
                }`}
                onClick={() => setActiveTab("email")}
              >
                Update Email
              </button>
              <button
                className={`flex-1 py-2 text-center font-semibold ${
                  activeTab === "password"
                    ? "border-b-2 border-[#042954] text-[#042954]"
                    : "text-gray-500 hover:text-[#042954]"
                }`}
                onClick={() => setActiveTab("password")}
              >
                Update Password
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "email" ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Update Email
                </h3>
                <form
                  onSubmit={handleEmailUpdate}
                  className="flex flex-col gap-4"
                >
                  <input
                    type="email"
                    placeholder="New email"
                    className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Current password"
                      className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#042954]"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      aria-label={
                        showCurrentPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  <button
                    type="submit"
                  className={`bg-[#042954] text-white py-2 rounded-lg font-semibold hover:brightness-110 flex items-center justify-center gap-2 ${
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
                    Update Email
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Update Password
                </h3>
                <form
                  onSubmit={handlePasswordUpdate}
                  className="flex flex-col gap-4"
                >
                  {/* Only show current password field if NOT coming from reset link */}
                  {!isFromReset && (
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Current password"
                        className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#042954]"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        aria-label={
                          showCurrentPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  )}
                  
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="New password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#042954]"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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
                      disabled={isLoading}
                      autoComplete="Confirm password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#042954]"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  <button
                    type="submit"
                  className={`bg-[#042954] text-white py-2 rounded-lg font-semibold hover:brightness-110 flex items-center justify-center gap-2 ${
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
                    Update Password
                  </button>
                </form>
              </div>
            )}

            {successMsg && (
              <p className="text-green-600 text-sm text-center mt-4">
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-red-600 text-sm text-center mt-4">
                {errorMsg}
              </p>
            )}
          </>
        ) : (
          <p className="text-red-600 text-center">
            Failed to load user details.
          </p>
        )}
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
};

export default SuperadminDetails;