"use client";

import { useMemo } from "react";
import {
  FaRegTrashAlt,
  FaDownload,
  FaFileExcel,
  FaFilePdf,
} from "react-icons/fa";
import Select from "react-select";
import { TimetableData, Session, EmptySlot, RoomSchedule } from "./types";
import { Days } from "@/helpers/page";
import { useTimetableVersion } from "@/context/TimetableContext";
import { useAuth } from "@/context/AuthContext";
interface NavbarProps {
  versionId: string;
  versions: number[];
  selectedVersion: number | null;
  setSelectedVersion: (version: number) => Promise<void>;
  isSaving: "none" | "same" | "new";
  isDeleting: boolean;
  setVersionToDelete: (version: number | null) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  isVersionLoading: boolean;
  setShowExportDropdown: (show: boolean) => void;
  showExportDropdown: boolean;
  exportDropdownRef: React.RefObject<HTMLDivElement | null>;
  exportToPDF: () => void;
  exportToXLSX: () => void;
  setSelectedTeacher: (teachers: string[] | null) => void;
  versionPendingData: { [version: number]: TimetableData | null };
  handleSaveAction: (
    action: "cancel" | "same" | "new",
    e?: React.MouseEvent<HTMLButtonElement>
  ) => Promise<void>;
}

const Navbar: React.FC<NavbarProps> = ({
  versionId,
  versions = [], // Default to empty array to prevent undefined
  selectedVersion,
  setSelectedVersion,
  isSaving,
  isDeleting,
  setVersionToDelete,
  setIsDeleteDialogOpen,
  isVersionLoading,
  setShowExportDropdown,
  showExportDropdown,
  exportDropdownRef,
  exportToPDF,
  exportToXLSX,
  setSelectedTeacher,
  versionPendingData,
  handleSaveAction,
}) => {
  const { timetableData } = useTimetableVersion();
  const { isSuperadmin } = useAuth();
  // Extract unique teachers from timetableData
  const teacherOptions = useMemo(() => {
    const teachers = new Set<string>();
    Days.forEach((day) => {
      const dayData = timetableData[day] || [];
      dayData.forEach((roomSchedule: RoomSchedule) => {
        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName] || [];
        sessions.forEach((session: Session | EmptySlot) => {
          if ("Teacher" in session && typeof session.Teacher === "string") {
            teachers.add(session.Teacher);
          }
        });
      });
    });
    return Array.from(teachers)
      .sort()
      .map((teacher) => ({
        value: teacher,
        label: teacher,
      }));
  }, [timetableData]);

  return (
    <div className="bg-[#042954] w-full flex flex-col md:flex-row items-center px-4 py-3 sticky top-0 justify-between z-40 min-h-[60px] ">
      <div className="flex flex-col md:flex-row items-center w-full md:w-2/3 gap-3 sm:gap-4">
        <div className="w-full  md:w-50 lg:w-56 flex items-center text-sm min-w-[160px] md:max-w[200px] ">
          <label className="text-white mr-2 text-xs sm:text-sm">
            Select Version:
          </label>
          <Select
            instanceId={versionId}
            options={
              versions.length > 0
                ? versions.map((version) => ({
                    value: version,
                    label: `Version ${version}`,
                  }))
                : []
            }
            value={
              selectedVersion !== null
                ? {
                    value: selectedVersion,
                    label: `Version ${selectedVersion}`,
                  }
                : null
            }
            onChange={async (selectedOption) => {
              const newVersion = selectedOption?.value;
              if (newVersion !== undefined) {
                await setSelectedVersion(newVersion);
              }
            }}
            placeholder="Select Version"
            isDisabled={isSaving !== "none" || isDeleting || !isSuperadmin}
            components={{
              Option: ({ innerRef, innerProps, data, isSelected }) => (
                <div
                  ref={innerRef}
                  {...innerProps}
                  className={`flex justify-between items-center p-2 text-xs sm:text-sm hover:bg-blue-300 hover:text-white ${
                    isSelected ? "bg-blue-900 text-white" : ""
                  }`}
                >
                  <span className="cursor-pointer">{data.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVersionToDelete(data.value);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaRegTrashAlt className="text-sm sm:text-base" />
                  </button>
                </div>
              ),
            }}
            className="text-black w-full"
            styles={{
              control: (provided, state) => ({
                ...provided,
                border: state.isFocused ? "0px" : provided.border,
                outline: state.isFocused ? "none" : provided.outline,
                boxShadow: state.isFocused ? "none" : provided.boxShadow,
                fontSize: "0.875rem",
                minHeight: "32px",
                width: "100%",
                maxWidth: "100%",
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 50,
                width: "100%",
                maxWidth: "100%",
              }),
              option: (provided) => ({
                ...provided,
                padding: "8px",
              }),
            }}
          />
        </div>
        <div className=" w-full  md:w-60 lg:w-90 lg:max-w-90  flex items-center text-sm ">
          <label className="text-white mr-2 text-xs sm:text-sm">
            Filter Teachers:
          </label>
          <Select
            instanceId={`teacher-filter-${versionId}`}
            options={teacherOptions}
            isMulti
            onChange={(selectedOptions) => {
              const selectedTeachers = selectedOptions
                ? selectedOptions.map((option) => option.value)
                : null;
              setSelectedTeacher(selectedTeachers);
            }}
            placeholder="Select Teachers"
            isDisabled={isSaving !== "none" || isDeleting}
            className="text-black w-full"
            styles={{
              control: (provided, state) => ({
                ...provided,
                border: state.isFocused ? "0px" : provided.border,
                outline: "none",
                boxShadow: "none",
                fontSize: "0.875rem",
                minHeight: "32px",
                width: "100%",
                maxWidth: "100%",
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 50,
                width: "100%",
                maxWidth: "100%",
              }),
              multiValue: (provided) => ({
                ...provided,
                maxWidth: "100%",
                // flexWrap: "wrap",
              }),
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 md:mt-0">
        {selectedVersion !== null && versionPendingData[selectedVersion] && (
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => handleSaveAction("cancel")}
              className="bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded disabled:opacity-50 text-sm"
              disabled={isSaving !== "none"}
            >
              Cancel
            </button>
            <button
              onClick={(e) => handleSaveAction("same", e)}
              className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50 text-sm "
              disabled={isSaving !== "none"}
            >
              Save in Same Version
              {isSaving === "same" && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
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
            </button>
            <button
              onClick={(e) => handleSaveAction("new", e)}
              className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
              disabled={isSaving !== "none"}
            >
              Save in New Version
              {isSaving === "new" && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
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
            </button>
          </div>
        )}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setShowExportDropdown(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isVersionLoading}
          >
            <FaDownload className="text-lg" />
            Download
          </button>
          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => {
                  setShowExportDropdown(false);
                  exportToPDF();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isVersionLoading}
              >
                <FaFilePdf className="text-red-500 text-lg" />
                Download as PDF
              </button>
              <button
                onClick={() => {
                  setShowExportDropdown(false);
                  exportToXLSX();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 border-t border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isVersionLoading}
              >
                <FaFileExcel className="text-green-500 text-lg" />
                Download as Xlsx
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
