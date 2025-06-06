"use client";
import React, { useState } from "react";
import Link from "next/link";
import { IoMdHome } from "react-icons/io";
import { FaCalendarDay } from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";

import { LuSlidersHorizontal } from "react-icons/lu";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="h-full bg-[#042954]">
      <div className="flex flex-col items-center  w-full text-[#9ea8b5] font-serif">
        {/* Home Link */}
        <Link href="/" className="w-full  border-b-1">
          <button className="flex px-3 py-6 w-full gap-3 hover:bg-[#051f3e] hover:text-white">
            <IoMdHome size={19} className="text-[#c49f69]" />
            <span className="font-serif">Home</span>
          </button>
        </Link>

        <Link href="/generateTimeTable" className="w-full border-b-1">
          <button className="flex px-3 py-6  w-full gap-3 hover:bg-[#051f3e] hover:text-white">
            <FaCalendarDay size={19} className="text-[#c49f69]" />
            <span className="font-serif">Generate Timetable</span>
          </button>
        </Link>
        <div className="flex flex-col border-b w-full">
          <div
            className="flex px-3 py-6 justify-between items-center hover:bg-[#051f3e] hover:text-white cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2">
              <LuSlidersHorizontal size={19} className="text-[#c49f69]" />

              <span>Advance Filters</span>
            </div>
            {isOpen ? (
              <IoIosArrowDown size={19} />
            ) : (
              <IoIosArrowForward size={19} />
            )}
          </div>

          {/* Animated Collapsible Content */}
          <div
            className={`
      overflow-hidden transition-all duration-300 ease-in-out
      ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}

    `}
          >
            <Link href="/advanceFilters/students" className="w-full">
              <div className="flex items-center pl-8 hover:bg-[#051f3e] hover:text-white text-[14px] pb-2.5 pt-2 gap-1">
                <LuSlidersHorizontal />
                <span>For students</span>
              </div>
            </Link>
            <Link
              href="/advanceFilters/checkTeachersTimetable"
              className="w-full"
            >
              <div className="flex items-center pl-8 hover:bg-[#051f3e] hover:text-white text-[14px] py-2.5 gap-1">
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
