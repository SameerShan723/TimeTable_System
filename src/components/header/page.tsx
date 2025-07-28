"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProfileModal from "../profile-model/page";

export default function Header() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAvatarClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleLogin = () => {
    setIsProfileModalOpen(false);
    router.push("/auth/login"); // Navigate to login page instead of opening modal
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      window.location.reload();
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      <div className="h-full bg-white flex items-center justify-between pr-1 md:pr-4 shadow-md sticky top-0 z-50">
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="University Logo"
            width={232}
            height={52}
            priority
            className="object-contain w-[115px] md:w-[232px] h-auto"
          />
        </div>

        <div className="flex-1 flex justify-center px-2">
          <h1 className="text-blue-900 text-[9px] md:text-2xl font-bold text-center overflow-hidden text-ellipsis whitespace-nowrap hidden md:block ">
            Weekly Timetable For The CS Department
          </h1>
        </div>

        {/* Avatar Button */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-gray-300 hover:border-blue-500 transition-colors duration-200"
            onClick={handleAvatarClick}
          >
            {user?.avatar_url?.trim() ? (
              <Image
                src={user.avatar_url}
                alt="Profile"
                width={48}
                height={48}
                className="w-full h-full object-cover rounded-full"
              />
            ) : user?.email ? (
              <div className="w-full h-full rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-medium text-lg md:text-xl uppercase">
                {user.email.charAt(0)}
              </div>
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>

          {/* Profile Modal */}
          <ProfileModal 
            isOpen={isProfileModalOpen}             
            setIsProfileModalOpen={setIsProfileModalOpen}
            user={user} // <-- pass user object
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </>
  );
}