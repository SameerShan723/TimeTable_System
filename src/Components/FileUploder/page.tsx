"use client";
import Papa from "papaparse";
import React, { useRef } from "react";
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

  const handleClickBox = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onParse(results.data);
        },
        error: (err) => {
          console.error("CSV parsing error:", err.message);
          alert("Failed to parse CSV file.");
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
            {
              defval: "",
            }
          );

          const expectedKeys = Object.keys(rawData[0]);
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
              String(val) // Extract section name, clean it
                .toLowerCase()
                .match(/analysis|summary|total|average|chart|stat/i)
            );

            if (nonEmptyCount < threshold || isAnalysisRow) {
              continue;
            }

            cleanedData.push({
              ...row,
              section: currentSection,
            });
          }

          console.log(cleanedData);
          onParse(cleanedData);
        } catch (error) {
          console.error("Excel parsing error:", error);
          alert("Failed to parse Excel file.");
        }
      };

      reader.onerror = () => {
        console.error("Excel reading error");
        alert("Failed to read Excel file.");
      };

      if (fileExtension === "xls") {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } else {
      alert(
        "File format not supported. Please upload .csv, .xls, or .xlsx files."
      );
    }
  };

  return (
    <div className="mb-4">
      <label className="block mb-1 text-[20px]">{label}</label>
      <div
        className="cursor-pointer border p-4 rounded-md text-center text-gray-600 hover:bg-gray-50 transition w-[250px] h-[60px] overflow-hidden whitespace-nowrap text-ellipsis"
        onClick={handleClickBox}
      >
        {labelName || placeholder}
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
