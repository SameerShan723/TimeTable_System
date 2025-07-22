"use client";
import React, { useState } from "react";
import {
  Home,
  Calendar,
  Plus,
  Users,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  ChevronRight as ChevronRightSmall,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isSidebarOpen: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  openSidebar: () => void;
}

export default function Sidebar({
  isSidebarOpen,
  isMobileSidebarOpen,
  toggleSidebar,
  toggleMobileSidebar,
  openSidebar,
}: SidebarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { isSuperadmin } = useAuth();

  const handleNavigation = () => {
    if (isMobileSidebarOpen) {
      toggleMobileSidebar();
    }
    if (!isSidebarOpen) {
      openSidebar();
    }
  };
  const baseNavigationItems = [{ icon: Home, label: "Home", href: "/" }];
  const superadminNavigationItems = [
    { icon: Plus, label: "Add New Course", href: "/add-new-course" },
    { icon: Users, label: "Courses", href: "/courses" },
    {
      icon: Calendar,
      label: "Generate Timetable",
      href: "/generate-timetable",
    },
    { icon: ShieldCheck, label: "Super Admin", href: "/super-admin" },
  ];
  const navigationItems = [
    ...baseNavigationItems,
    ...(isSuperadmin ? superadminNavigationItems : []),
  ];

  return (
    <div
      className={`relative bg-[#042954] text-[#9ea8b5] font-serif transition-all duration-300 ease-in-out ${
        isSidebarOpen ? "md:w-60" : "md:w-16"
      } w-full ${
        isMobileSidebarOpen ? "h-auto" : "h-16"
      } md:h-[calc(100vh-4rem)] overflow-hidden shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[#051f3e] h-16">
        <span
          className={`text-[#9ea8b5] font-serif text-lg transition-all duration-300 ${
            isSidebarOpen
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4"
          } ${isSidebarOpen ? "block" : "hidden"}`}
        >
          Menu
        </span>

        <div className="flex items-center gap-2">
          {/* Desktop Toggle */}
          <div className="relative group hidden md:block">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-[#051f3e] transition-all duration-200 hover:scale-105"
            >
              {isSidebarOpen ? (
                <ChevronLeft
                  size={20}
                  className="text-[#9ea8b5] hover:text-white transition-colors"
                />
              ) : (
                <ChevronRight
                  size={20}
                  className="text-[#9ea8b5] hover:text-white transition-colors"
                />
              )}
            </button>
          </div>
          {/* Mobile Toggle */}
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-[#051f3e] transition-all duration-200"
          >
            {isMobileSidebarOpen ? (
              <X size={20} className="text-[#9ea8b5]" />
            ) : (
              <Menu size={20} className="text-[#9ea8b5]" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex flex-col items-start w-full transition-all duration-300 ${
          isMobileSidebarOpen
            ? "opacity-100 h-auto"
            : "opacity-0 h-0 md:opacity-100 md:h-auto"
        } max-h-[calc(100vh-8rem)] overflow-y-auto md:overflow-y-visible`}
      >
        {/* Navigation Items */}
        {navigationItems.map((item, index) => (
          <Link href={item.href} key={index} className="w-full">
            <button
              className={`flex px-3 py-4 w-full gap-3 hover:bg-[#051f3e] hover:text-white border-b border-[#051f3e]/30 items-center transition-all duration-200 group ${
                !isSidebarOpen && !isMobileSidebarOpen ? "justify-center" : ""
              }`}
              title={item.label}
              onClick={handleNavigation}
            >
              <item.icon
                size={isSidebarOpen || isMobileSidebarOpen ? 20 : 24}
                className="text-[#c49f69] group-hover:text-[#d4b47a] transition-colors flex-shrink-0"
              />
              <span
                className={`transition-all duration-300 ${
                  isSidebarOpen || isMobileSidebarOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-4 md:hidden"
                }`}
              >
                {item.label}
              </span>
            </button>
          </Link>
        ))}

        {/* Advance Filters */}
        <div className="flex flex-col border-b border-[#051f3e]/30 w-full">
          <button
            className={`flex px-3 py-4 justify-between items-center hover:bg-[#051f3e] hover:text-white cursor-pointer w-full transition-all duration-200 group ${
              !isSidebarOpen && !isMobileSidebarOpen ? "justify-center" : ""
            }`}
            onClick={() => {
              setIsFiltersOpen(!isFiltersOpen);
              if (!isSidebarOpen && !isMobileSidebarOpen) {
                openSidebar();
              }
            }}
            title="Advance Filters"
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal
                size={isSidebarOpen || isMobileSidebarOpen ? 20 : 24}
                className="text-[#c49f69] group-hover:text-[#d4b47a] transition-colors flex-shrink-0"
              />
              <span
                className={`transition-all duration-300 ${
                  isSidebarOpen || isMobileSidebarOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-4 md:hidden"
                }`}
              >
                Advance Filters
              </span>
            </div>
            {(isSidebarOpen || isMobileSidebarOpen) && (
              <div className="transition-transform duration-200">
                {isFiltersOpen ? (
                  <ChevronDown
                    size={16}
                    className="transition-transform duration-200"
                  />
                ) : (
                  <ChevronRightSmall
                    size={16}
                    className="transition-transform duration-200"
                  />
                )}
              </div>
            )}
          </button>

          {/* Collapsible Content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isFiltersOpen && (isSidebarOpen || isMobileSidebarOpen)
                ? "max-h-32 opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <Link href="/advance-filters/students">
              <button
                className="flex items-center pl-8 hover:bg-[#051f3e] hover:text-white text-sm py-2 gap-2 w-full text-left transition-all duration-200 group"
                onClick={handleNavigation}
              >
                <SlidersHorizontal
                  size={14}
                  className="text-[#c49f69] group-hover:text-[#d4b47a] transition-colors"
                />
                For Students
              </button>
            </Link>
            <Link href="/advance-filters/check-teachers-timetable">
              <button
                className="flex items-center pl-8 hover:bg-[#051f3e] hover:text-white text-sm py-2 gap-2 w-full text-left transition-all duration-200 group"
                onClick={handleNavigation}
              >
                <SlidersHorizontal
                  size={14}
                  className="text-[#c49f69] group-hover:text-[#d4b47a] transition-colors"
                />
                <span>For teachers</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
