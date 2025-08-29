"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  setSelectedSubject: (subjects: string[] | null) => void;
  versionPendingData: { [version: number]: TimetableData | null };
  handleSaveAction: (
    action: "cancel" | "same" | "new",
    e?: React.MouseEvent<HTMLButtonElement>
  ) => Promise<void>;
}

const Navbar: React.FC<NavbarProps> = ({
  versionId,
  versions = [],
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
  setSelectedSubject,
  versionPendingData,
  handleSaveAction,
}) => {
  const { timetableData, finalizeVersion: contextFinalizeVersion } =
    useTimetableVersion();
  const { isSuperadmin } = useAuth();
  const [finalizeVersion, setFinalizeVersion] = useState(false);
  // Extract unique teachers and subjects from timetableData
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

  const subjectOptions = useMemo(() => {
    const subjects = new Set<string>();
    Days.forEach((day) => {
      const dayData = timetableData[day] || [];
      dayData.forEach((roomSchedule: RoomSchedule) => {
        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName] || [];
        sessions.forEach((session: Session | EmptySlot) => {
          if ("Subject" in session && typeof session.Subject === "string") {
            subjects.add(session.Subject);
          }
        });
      });
    });
    return Array.from(subjects)
      .sort()
      .map((subject) => ({
        value: subject,
        label: subject,
      }));
  }, [timetableData]);

  // Fetch global version and update checkbox state
  const fetchGlobalVersion = useCallback(async () => {
    try {
      const response = await fetch("/api/timetable?type=global_version");
      if (response.ok) {
        const data = await response.json();
        const globalVersionNumber = data.version_number;

        // Check if selected version matches global version
        if (selectedVersion === globalVersionNumber) {
          setFinalizeVersion(true);
        } else {
          setFinalizeVersion(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch global version:", error);
    }
  }, [selectedVersion]);

  // Fetch global version when component mounts or selectedVersion changes
  useEffect(() => {
    if (isSuperadmin && selectedVersion) {
      fetchGlobalVersion();
    }
  }, [fetchGlobalVersion, isSuperadmin, selectedVersion]);

  const handleFinalizeVersion = async () => {
    if (!isSuperadmin || !selectedVersion) return;

    try {
      await contextFinalizeVersion(selectedVersion);
      // Keep checkbox checked to show it's finalized - don't uncheck on success
    } catch {
      // Error is already handled by the context
      setFinalizeVersion(false); // Only uncheck if error occurs
    }
  };

  return (
    <div className="bg-[#042954] w-full flex flex-col md:flex-row items-center px-4 py-3 sticky top-0 justify-between z-40 min-h-[60px] ">
      <div className="flex flex-col md:flex-row items-center w-full md:w-2/3 gap-3 sm:gap-4">
        {isSuperadmin && (
          <div className="w-full md:w-50 lg:w-56 flex flex-col gap-2">
            <div className="flex items-center text-sm min-w-[160px] md:max-w[200px]">
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
                    // The checkbox state will be updated by the useEffect when selectedVersion changes
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
          </div>
        )}
        <div className=" w-full  md:w-60 lg:w-70 lg:max-w-70  flex items-center text-sm ">
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
        <div className=" w-full  md:w-60 lg:w-70 lg:max-w-70 flex items-center text-sm ">
          <label className="text-white mr-2 text-xs sm:text-sm">
            Filter Subjects:
          </label>
          <Select
            instanceId={`subject-filter-${versionId}`}
            options={subjectOptions}
            isMulti
            onChange={(selectedOptions) => {
              const selectedSubjects = selectedOptions
                ? selectedOptions.map((option) => option.value)
                : null;
              setSelectedSubject(selectedSubjects);
            }}
            placeholder="Select Subjects"
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
        <div>
          {isSuperadmin && selectedVersion && (
            <div className="flex items-center  gap-x-2 ">
              <label
                htmlFor="finalize-version"
                className="text-white text-xs sm:text-sm "
              >
                Finalized Version
              </label>
              <Checkbox
                id="finalize-version"
                checked={finalizeVersion}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    setFinalizeVersion(true);
                    await handleFinalizeVersion();
                  }
                }}
                className="w-6 h-6 rounded-2xl border-none bg-white data-[state=checked]:bg-blue-900 text-white"
              />
            </div>
          )}
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
              className="bg-blue-900 hover:brightness-110 text-white px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50 text-sm "
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
              className="bg-blue-900 hover:brightness-110 text-white px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
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
            className="bg-[#042954] hover:brightness-110  text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
