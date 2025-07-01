"use client";
import React, { useState } from "react";
import Sidebar from "./page";
export default function SidebarWrapper() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    setIsMobileSidebarOpen(false);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div
      className={`w-full ${isSidebarOpen ? "md:w-60" : "md:w-16"} flex-shrink-0 
       transition-all duration-300 `}
    >
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleSidebar={toggleSidebar}
        toggleMobileSidebar={toggleMobileSidebar}
        openSidebar={openSidebar}
      />
    </div>
  );
}
