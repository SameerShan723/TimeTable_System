import React from "react";
import Link from "next/link";
import { IoMdHome } from "react-icons/io";
import { FaCalendarDay } from "react-icons/fa";

import { FaSearch } from "react-icons/fa";

export default function Sidebar() {
  return (
    <div>
      <div className=" max-h-full h-screen bg-black ">
        <div className="flex flex-col items-center gap-4 pt-8 w-full">
          <Link href="/" className="w-full">
            <button className="border-2 border-amber-500 p-2 flex  gap-1 cursor-pointer w-full  hover:bg-white hover:text-black">
              <IoMdHome size={19} />
              <span>Home</span>
            </button>
          </Link>
          <Link href="/checkTeachersTimetable" className="w-full">
            <button className="flex items-center gap-1 cursor-pointer border-2  border-amber-500 w-full p-2 hover:bg-white hover:text-black">
              <FaSearch />
              <span>Search by teacher</span>
            </button>
          </Link>
          <Link href="/generateTimeTable" className="w-full">
            <button className="flex items-center gap-1 cursor-pointer w-full border-2   border-amber-500 p-2  hover:bg-white hover:text-black">
              <FaCalendarDay />
              <span className="">Generate Timetable</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
