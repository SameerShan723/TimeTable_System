"use client";

import { FaRegTrashAlt, FaDownload } from "react-icons/fa";
import Select from "react-select";

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
  exportDropdownRef: React.RefObject<HTMLDivElement>;
  exportToPDF: () => void;
  exportToXLSX: () => void;
  setSelectedTeacher: (teacher: string | null) => void;
  TeacherFilter: React.FC<{
    onFilterChange: (teacher: string | null) => void;
  }>;
}

const Navbar: React.FC<NavbarProps> = ({
  versionId,
  versions,
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
  TeacherFilter,
}) => {
  return (
    <div className="bg-[#042954] w-full flex flex-col md:flex-row items-center px-4 py-3 sm:py-4 sticky top-0 justify-between z-40 min-h-[60px]">
      {/* Left Section: Version Selector and Teacher Filter */}
      <div className="flex flex-col md:flex-row items-center w-full md:w-2/3 gap-3 sm:gap-4">
        {/* Version Selector */}
        <div className="w-full sm:w-3/4 md:w-48 lg:w-56 flex items-center text-sm min-w-[160px]">
          {/* ^^^ This line controls the width of the Version Selector select component (minimized/maximized across screen sizes) */}
          <label className="text-white mr-2 text-xs sm:text-sm">
            Select Version:
          </label>
          <Select
            instanceId={versionId}
            options={versions.map((version) => ({
              value: version,
              label: `Version ${version}`,
            }))}
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
            isDisabled={isSaving !== "none" || isDeleting}
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
                width: "100%", // Full width of the container
                maxWidth: "100%", // Prevent overflow
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 50,
                width: "100%", // Match menu width to control
                maxWidth: "100%", // Prevent menu overflow
              }),
              option: (provided) => ({
                ...provided,
                padding: "8px",
              }),
            }}
          />
        </div>
        {/* Teacher Filter */}
        <TeacherFilter onFilterChange={setSelectedTeacher} />
      </div>

      {/* Right Section: Export Dropdown */}
      <div className="flex items-center gap-2 mt-3 md:mt-0">
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setShowExportDropdown(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-2 text-xs sm:text-sm"
            disabled={isVersionLoading}
          >
            <FaDownload className="text-base sm:text-lg" />
            Download
          </button>
          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-40 sm:w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <button
                onClick={() => {
                  setShowExportDropdown(false);
                  exportToPDF();
                }}
                className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                disabled={isVersionLoading}
              >
                Download as PDF
              </button>
              <button
                onClick={() => {
                  setShowExportDropdown(false);
                  exportToXLSX();
                }}
                className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 border-t"
                disabled={isVersionLoading}
              >
                Download as Excel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
