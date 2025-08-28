"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable, { Styles, RowInput, CellInput } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { timeSlots } from "@/helpers/page";
import { Days } from "@/helpers/page";

export interface EnhancedClassItem {
  Subject: string;
  Teacher: string;
  Section: string;
  Time: string;
  Day: string;
  Room: string;
}

interface ExportTimetableProps {
  results: EnhancedClassItem[];
  selectedSection: string;
  selectedDays: string[];
  selectedVersion?: number | null;
  isLoading?: boolean;
  setError?: (error: string | null) => void;
  identifier: "Teacher" | "string" | "Section";
}

const LoaderOverlay = ({ isVisible }: { isVisible: boolean }) =>
  isVisible ? (
    <div
      className="absolute inset-0 bg-white/50 flex items-center justify-center z-50 min-h-full"
      style={{ backdropFilter: "blur(2px)" }}
    >
      <svg
        className="animate-spin h-12 w-12 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 24 24"
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
      <span className="ml-4 text-lg text-gray-700">Exporting...</span>
    </div>
  ) : null;

export default function ExportTimetable({
  results,
  selectedSection,
  selectedDays,
  selectedVersion,
  isLoading = false,
  setError,
  identifier,
}: ExportTimetableProps) {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportToPDF = useCallback(() => {
    setIsExporting(true);
    setError?.(null);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Title and metadata
      doc.setFontSize(16);
      doc.text(`Timetable for ${identifier} ${selectedSection}`, 148, 15, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text(`Version: ${selectedVersion ?? "Current"}`, 148, 22, {
        align: "center",
      });
      doc.text(
        `Generated: ${new Date().toLocaleString("en-US", {
          timeZone: "Asia/Karachi",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })} PKT, ${new Date().toLocaleDateString("en-US", {
          timeZone: "Asia/Karachi",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`,
        148,
        27,
        {
          align: "center",
        }
      );

      // Prepare table data: One row per day, one column per time slot
      const tableHeaders: CellInput[] = ["Day", ...timeSlots];
      const tableData: RowInput[] = Days.map((day) => {
        const row: CellInput[] = [day];
        timeSlots.forEach((time) => {
          const course = results.find(
            (item) => item.Day === day && item.Time === time
          );
          if (course) {
            row.push(
              `${course.Subject || "Unknown Course"}\n${
                course.Teacher || "No Faculty"
              }\n${course.Section || ""}\n${course.Room || "Unknown Room"}`
            );
          } else {
            row.push("");
          }
        });
        return row as RowInput;
      });

      // Render the table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 35,
        margin: { top: 35, left: 10, right: 10 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
          halign: "center",
          valign: "middle",
          minCellHeight: 20,
        } as Styles,
        headStyles: {
          fillColor: [41, 41, 84],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        } as Styles,
        bodyStyles: {
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        } as Styles,
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        } as Styles,
        columnStyles: {
          0: { cellWidth: 20 }, // "Day" column
        },
      });

      const fileName = `timetable-${identifier.toLowerCase()}-${selectedSection}${
        selectedVersion ? `-v${selectedVersion}` : ""
      }.pdf`;
      doc.save(fileName);

      toast.success("PDF Exported Successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to export PDF";
      setError?.(message);
      toast.error(`PDF Export Failed" ${message}`);
    } finally {
      setIsExporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    results,
    selectedSection,
    selectedDays,
    selectedVersion,
    setError,
    identifier,
  ]);

  const exportToExcel = useCallback(() => {
    setIsExporting(true);
    setError?.(null);
    try {
      const sheetData: (string | undefined)[][] = [
        ["Day", "Time", "Subject", "Teacher", "Section", "Room"],
      ];

      selectedDays.forEach((day) => {
        timeSlots.forEach((time) => {
          const course = results.find(
            (item) => item.Day === day && item.Time === time
          );
          if (course) {
            sheetData.push([
              day,
              time,
              course.Subject || "Unknown Course",
              course.Teacher || "No Faculty",
              course.Section || "",
              course.Room || "Unknown Room",
            ]);
          }
        });
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");

      const fileName = `timetable-${identifier.toLowerCase()}-${selectedSection}${
        selectedVersion ? `-v${selectedVersion}` : ""
      }.xlsx`;

      XLSX.writeFile(workbook, fileName, { bookType: "xlsx", type: "array" });

      toast.success("Excel Exported Successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to export Excel";
      setError?.(message);
      toast.error(`Excel Export Failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  }, [
    results,
    selectedSection,
    selectedDays,
    selectedVersion,
    setError,
    identifier,
  ]);

  return (
    <div className="relative" ref={dropdownRef}>
      <LoaderOverlay isVisible={isExporting} />
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-[#042954] py-2.5 px-14 md:py-2 w-full cursor-pointer text-white hover:brightness-110  transition-colors rounded-md flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-lg"
        disabled={isLoading || isExporting}
        aria-label="Export Timetable"
      >
        <FaDownload />
        Download
      </button>
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => {
              setShowDropdown(false);
              exportToPDF();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || isExporting}
          >
            <FaFilePdf className="text-red-500 text-lg" />
            Download as PDF
          </button>
          <button
            onClick={() => {
              setShowDropdown(false);
              exportToExcel();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 border-t border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || isExporting}
          >
            <FaFileExcel className="text-green-500 text-lg" />
            Download as Excel
          </button>
        </div>
      )}
    </div>
  );
}
