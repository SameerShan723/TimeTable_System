"use client";
import Image from "next/image";
import { useState } from "react";
import SuperadminLogin from "@/app/login/page";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isSuperadmin } = useAuth();

  return (
    <>
      <div className="h-full bg-white flex items-center justify-between pr-4 shadow-md sticky top-0 z-50">
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
          <h1 className="text-blue-900 text-[9px] md:text-2xl font-bold text-center overflow-hidden text-ellipsis whitespace-nowrap">
            Weekly Timetable For The CS Department
          </h1>
        </div>
        <button
          className={`${
            isSuperadmin ? "bg-red-600" : "bg-blue-600"
          } px-4 py-1 mr-3 rounded-lg text-white bg-blue-600  transition-colors duration-200`}
          onClick={() => setIsModalOpen(true)}
        >
          {isSuperadmin ? "Logout" : "Login"}
        </button>
      </div>
      <SuperadminLogin
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
