"use client";
import Papa from "papaparse";
import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

interface FileUploaderProps {
  label: string;
  onParse: (data: Record<string, string>[]) => void;
  placeholder: string;
  setFileName: (name: string) => void;
  labelName: string | null;
}

export default function FileUploader({
  label,
  onParse,
  placeholder,
  labelName,
  setFileName,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleClickBox = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    setFileName(file.name);

    if (fileExtension === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onParse(results.data);
        },
        error: (err) => {
          console.error(`${label} CSV parsing error:`, err.message);
          setFileName("");
          alert(`Failed to parse ${label} CSV file.`);
        },
      });
    } else if (fileExtension === "xls" || fileExtension === "xlsx") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target?.result;
        try {
          const workbook = XLSX.read(fileData, {
            type: fileExtension === "xls" ? "binary" : "array",
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData: Record<string, string>[] = XLSX.utils.sheet_to_json(
            worksheet,
            { defval: "" }
          );

          const expectedKeys = Object.keys(rawData[0] || {});
          const threshold = Math.ceil(expectedKeys.length * 0.6);

          const cleanedData = [];
          let currentSection = "";

          for (const row of rawData) {
            const values = Object.values(row);
            const nonEmptyCount = values.filter(
              (v) => String(v).trim() !== ""
            ).length;

            const joinedRowText = values.join(" ").toLowerCase();
            const isSectionRow = joinedRowText.includes(
              "sample scheme of study"
            );

            if (isSectionRow) {
              const sectionText = values.find((v) =>
                String(v).toLowerCase().includes("sample scheme of study")
              );
              if (sectionText) {
                currentSection = sectionText
                  .replace(/sample scheme of study\s*/i, "")
                  .replace(/^[\(\[]|[\)\]]$/g, "")
                  .trim();
              }
              continue;
            }

            const isAnalysisRow = values.some((val) =>
              String(val)
                .toLowerCase()
                .match(/analysis|summary|total|average|chart|stat/i)
            );

            if (nonEmptyCount < threshold || isAnalysisRow) continue;

            cleanedData.push({
              ...row,
              section: currentSection,
            });
          }

          onParse(cleanedData);
        } catch (error) {
          console.error(`${label} Excel parsing error:`, error);
          alert(`Failed to parse ${label} Excel file.`);
        }
      };

      reader.onerror = () => {
        alert(`Failed to read ${label} Excel file.`);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert(
        "File format not supported. Please upload .csv, .xls, or .xlsx files."
      );
      setFileName("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFile(files[0]);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    setDragOver(false);
  };

  return (
    <div className="mb-4">
      <label className="block mb-1 text-[20px] text-[#416697]">{label}</label>
      <div
        className={`cursor-pointer border-2 border-dashed p-4 rounded-md text-center transition w-full h-[80px] overflow-hidden whitespace-nowrap text-ellipsis ${
          dragOver ? "bg-blue-50 border-blue-400" : "border-[#416697]"
        } text-[#416697]`}
        onClick={handleClickBox}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {labelName || placeholder}
        <p className="text-sm text-gray-400 mt-1">(Click or drag file here)</p>
      </div>
      <input
        type="file"
        accept=".csv,.xls,.xlsx"
        ref={fileInputRef}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
