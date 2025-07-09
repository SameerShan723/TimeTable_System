"use client";
import React, { useState } from "react";
import Sidebar from "./page";

export default function SidebarWrapper() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <>
      {/* Mobile: No wrapper needed as sidebar is fixed positioned */}
      <div className="md:hidden">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          isMobileSidebarOpen={isMobileSidebarOpen}
          toggleSidebar={toggleSidebar}
          toggleMobileSidebar={toggleMobileSidebar}
          openSidebar={openSidebar}
        />
      </div>

      {/* Desktop: Wrapper with smooth width transitions */}
      <div
        className={`hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-60" : "w-16"
        }`}
      >
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          isMobileSidebarOpen={isMobileSidebarOpen}
          toggleSidebar={toggleSidebar}
          toggleMobileSidebar={toggleMobileSidebar}
          openSidebar={openSidebar}
        />
      </div>
    </>
  );
}
