"use client";
import React, { useState } from "react";
import Link from "next/link";
import { IoMdHome } from "react-icons/io";
import {
  FaCalendarDay,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaChalkboardTeacher,
} from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { LuSlidersHorizontal } from "react-icons/lu";
import { FaPlusSquare } from "react-icons/fa";

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

  const handleNavigation = () => {
    if (isMobileSidebarOpen) {
      toggleMobileSidebar();
    }
    if (!isSidebarOpen) {
      openSidebar();
    }
  };

  return (
    <div
      className={`relative bg-[#042954] text-[#9ea8b5] font-serif transition-all duration-200 ${
        isSidebarOpen ? "md:w-60" : "md:w-16"
      } w-full ${
        isMobileSidebarOpen ? "h-auto" : "h-16"
      } md:h-[calc(100vh-4rem)] overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[#051f3e] h-16">
        <span
          className={`text-[#9ea8b5] font-serif text-lg ${
            isSidebarOpen ? "block" : "hidden"
          }`}
        >
          Menu
        </span>

        <div className="flex items-center gap-2">
          {/* Desktop Toggle */}
          <div className="relative group hidden md:block">
            <button onClick={toggleSidebar}>
              {isSidebarOpen ? (
                <FaChevronLeft
                  size={24}
                  className="text-[#9ea8b5] hover:bg-[#051f3e] transition-colors   rounded-2xl w-full h-full p-1 cursor-pointer"
                  title="close"
                />
              ) : (
                <FaChevronRight
                  size={24}
                  className="text-[#9ea8b5] hover:bg-[#051f3e] rounded-2xl w-full h-full p-1 cursor-pointer"
                  title="open"
                />
              )}
            </button>
          </div>
          {/* Mobile Toggle */}
          <button onClick={toggleMobileSidebar} className="md:hidden">
            {isMobileSidebarOpen ? (
              <FaTimes size={24} className="text-[#9ea8b5]" />
            ) : (
              <FaBars size={24} className="text-[#9ea8b5]" />
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
        {/* Home Link */}
        <Link href="/" className="w-full" onClick={handleNavigation}>
          <button
            className={`flex px-3 py-4 w-full gap-3 hover:bg-[#051f3e] hover:text-white border-b items-center ${
              !isSidebarOpen && !isMobileSidebarOpen ? "justify-center" : ""
            }`}
            title="Home"
          >
            <IoMdHome
              size={isSidebarOpen || isMobileSidebarOpen ? 25 : 30}
              className="text-[#c49f69]"
            />
            <span
              className={`${
                isSidebarOpen || isMobileSidebarOpen ? "block" : "hidden"
              }`}
            >
              Home
            </span>
          </button>
        </Link>

        {/* Generate Timetable Link */}
        <Link
          href="/generateTimeTable"
          className="w-full"
          onClick={handleNavigation}
        >
          <button
            className={`flex px-3 py-4 w-full gap-3 hover:bg-[#051f3e] hover:text-white border-b items-center ${
              !isSidebarOpen && !isMobileSidebarOpen ? "justify-center" : ""
            }`}
            title="Generate Timetable"
          >
            <FaCalendarDay
              size={isSidebarOpen || isMobileSidebarOpen ? 20 : 23}
              className="text-[#c49f69]"
            />
            <span
              className={`${
                isSidebarOpen || isMobileSidebarOpen ? "block" : "hidden"
              }`}
            >
              Generate Timetable
            </span>
          </button>
        </Link>
        {/* AddNewCourse */}
        <Link
          href="/AddNewCourse
        "
          className="w-full"
          onClick={handleNavigation}
        >
          <button
            className={`flex px-3 py-4 w-full gap-3 hover:bg-[#051f3e] hover:text-white border-b items-center ${
              !isSidebarOpen && !isMobileSidebarOpen ? "justify-center" : ""
            }`}
            title="form"
          >
            <FaPlusSquare
              size={isSidebarOpen || isMobileSidebarOpen ? 20 : 23}
              className="text-[#c49f69]"
            />

            <span
              className={`${
                isSidebarOpen || isMobileSidebarOpen ? "block" : "hidden"
              }`}
            >
              Add New Course
            </span>
          </button>
        </Link>
        {/* Faculty Data */}
        <Link
          href="/FacultyData
        "
          className="w-full"
          onClick={handleNavigation}
        >
          <button
            className={`flex px-3 py-4 w-full gap-3 hover:bg-[#051f3e] hover:text-white border-b items-center ${
              !isSidebarOpen && !isMobileSidebarOpen ? "justify-center" : ""
            }`}
            title="form"
          >
            <FaChalkboardTeacher
              size={isSidebarOpen || isMobileSidebarOpen ? 20 : 23}
              className="text-[#c49f69]"
            />

            <span
              className={`${
                isSidebarOpen || isMobileSidebarOpen ? "block" : "hidden"
              }`}
            >
              Faculty Data
            </span>
          </button>
        </Link>
        {/* Advance Filters */}
        <div className="flex flex-col border-b w-full">
          <button
            className={`flex px-3 py-4 justify-between items-center hover:bg-[#051f3e] hover:text-white cursor-pointer w-full ${
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
            <div className="flex items-center gap-2">
              <LuSlidersHorizontal
                size={isSidebarOpen || isMobileSidebarOpen ? 20 : 24}
                className="text-[#c49f69]"
              />
              <span
                className={`${
                  isSidebarOpen || isMobileSidebarOpen ? "block" : "hidden"
                }`}
              >
                Advance Filters
              </span>
            </div>
            {(isSidebarOpen || isMobileSidebarOpen) && (
              <>
                {isFiltersOpen ? (
                  <IoIosArrowDown size={19} />
                ) : (
                  <IoIosArrowForward size={19} />
                )}
              </>
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
            <Link
              href="/advanceFilters/students"
              className="w-full"
              onClick={handleNavigation}
            >
              <div className="flex items-center pl-8 hover:bg-[#051f3e] hover:text-white text-[14px] pb-2 pt-2 gap-1">
                <LuSlidersHorizontal />
                <span>For students</span>
              </div>
            </Link>
            <Link
              href="/advanceFilters/checkTeachersTimetable"
              className="w-full"
              onClick={handleNavigation}
            >
              <div className="flex items-center pl-8 hover:bg-[#051f3e] hover:text-white text-[14px] py-2 gap-1">
                <LuSlidersHorizontal />
                <span>For teachers</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
