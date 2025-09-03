"use client";
import { useEffect } from "react";
import { useForm, SubmitHandler, UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import ReactSelect from "@/components/ui/ReactSelect";
import { toast } from "react-toastify";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useCourses } from "@/context/CourseContext";
import { Course } from "@/lib/serverData/CourseDataFetcher";

// form validation
const formSchema = z.object({
  subject_code: z.string().trim().optional().nullable(),
  course_details: z
    .string()
    .trim()
    .min(1, "Course details is required")
    .min(2, "Course details must be at least 2 characters"),
  section: z
    .string()
    .trim()
    .min(1, "Section is required")
    .min(1, "Section must not be empty"),
  // Change semester to number
  semester: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
    .refine(
      (val) => val >= 1 && val <= 9,
      "Semester must be a number from 1 to 9"
    ),
  semester_details: z.string().trim().optional().nullable(),
  credit_hour: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      return typeof val === "string" ? parseInt(val, 10) : val;
    }),
  faculty_assigned: z
    .string()
    .trim()
    .min(1, "Faculty assigned is required")
    .min(2, "Faculty name must be at least 2 characters"),
  is_regular_teacher: z.boolean().default(false),
  domain: z.string().trim().optional().nullable(),
  subject_type: z.string().trim().optional().nullable(),
  theory_classes_week: z
    .union([z.string(), z.number()])
    .transform((val) =>
      typeof val === "string" ? parseInt(val, 10) || 1 : val
    )
    .refine((val) => val >= 1, "Theory classes per week must be at least 1"),
  lab_classes_week: z
    .union([z.string(), z.number()])
    .transform((val) =>
      typeof val === "string" ? parseInt(val, 10) || 0 : val
    )
    .refine((val) => val >= 0, "Lab classes cannot be negative")
    .default(0),
});
// Define form values type
type FormValues = z.infer<typeof formSchema>;

export default function CourseForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [bulkPreview, setBulkPreview] = useState<
    Array<{
      rowNumber: number;
      data: Record<string, unknown>;
      errors: string[];
      insertable?: CourseInsert;
    }>
  >([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { courses, setCourses } = useCourses(); // Access CourseContext
  const [activeTab, setActiveTab] = useState<"manual" | "excel">("manual");
  const [filteredPreview, setFilteredPreview] = useState<
    Array<{
      rowNumber: number;
      data: Record<string, unknown>;
      errors: string[];
      insertable?: CourseInsert;
    }>
  >([]);

  // Initialize filteredPreview when bulkPreview changes
  useEffect(() => {
    setFilteredPreview(bulkPreview);
  }, [bulkPreview]);

  // Semester options for react-select
  const semesterOptions = [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },

    { value: "4", label: " 4" },
    { value: "5", label: "5" },
    { value: "6", label: "6" },
    { value: "7", label: " 7" },
    { value: "8", label: " 8" },
  ];

  // Define form with explicit typing
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as UseFormProps<FormValues>["resolver"],
    mode: "onTouched",
    defaultValues: {
      course_details: "",
      section: "",
      semester: 1,
      semester_details: "",
      credit_hour: 0,
      faculty_assigned: "",
      is_regular_teacher: false,
      domain: "",
      subject_code: "",
      subject_type: "",
      theory_classes_week: 1,
      lab_classes_week: 0,
    },
  });

  type CourseInsert = {
    subject_code: string | null;
    course_details: string;
    section: string;
    semester: number;
    credit_hour: number | null;
    faculty_assigned: string;
    is_regular_teacher: boolean;
    domain: string | null;
    subject_type: string | null;
    semester_details: string | null;
    theory_classes_week: number;
    lab_classes_week: number;
  };

  const templateHeaders = [
    "subject_code",
    "course_details",
    "section",
    "semester",
    "credit_hour",
    "faculty_assigned",
    "is_regular_teacher",
    "domain",
    "subject_type",
    "semester_details",
    "theory_classes_week",
    "lab_classes_week",
  ];

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      templateHeaders,
      [
        "GIS-302",
        "Introduction to Remote Sensing",
        "(BS (GIS &RS (2024-2028)) 2nd",
        4,
        3,
        "Syed Najam Ul Hassan",
        "Permanent",
        "CS",
        "RS-Core",
        "Spring 2025",
        2,
        1,
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Courses");
    XLSX.writeFile(wb, "courses-template.xlsx");
  };

  const normalize = (v: unknown) =>
    typeof v === "string" ? v.trim() : v === undefined ? "" : v;

  const getCell = (
    row: Record<string, unknown>,
    ...aliases: Array<string>
  ): unknown => {
    for (const key of aliases) {
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    }
    return undefined;
  };

  const parseTeacherType = (v: unknown): boolean => {
    const s = String(v ?? "").toLowerCase();
    if (["permanent", "regular", "yes", "true", "1"].includes(s)) return true;
    if (["visiting", "no", "false", "0"].includes(s)) return false;
    return true; // default to permanent
  };

  const toInt = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  };

  const validateAndMap = (
    row: Record<string, unknown>
  ): { errors: string[]; insertable?: CourseInsert } => {
    const errors: string[] = [];

    // Extract and validate each field according to backend schema
    const subject_code =
      String(normalize(getCell(row, "subject_code", "Subject Code"))) || null;

    const course_details = String(
      normalize(getCell(row, "course_details", "Course Details"))
    );
    if (!course_details || course_details.length < 2) {
      errors.push("Course details must be at least 2 characters");
    }

    const section = String(normalize(getCell(row, "section", "Section")));
    if (!section) {
      errors.push("Section is required");
    }

    // Validate semester - already handled by zod in form
    const semesterRaw = normalize(getCell(row, "semester", "Semester"));
    let semester: number;
    if (typeof semesterRaw === "string" && semesterRaw.trim() === "") {
      errors.push("Semester is required");
      semester = 1;
    } else {
      const semesterNum = toInt(semesterRaw);
      if (!Number.isFinite(semesterNum) || semesterNum < 1 || semesterNum > 9) {
        errors.push("Semester must be a number between 1 and 9");
        semester = 1;
      } else {
        semester = semesterNum;
      }
    }

    // Validate credit_hour with backend constraints
    const credit_hourRaw = toInt(
      normalize(getCell(row, "credit_hour", "Credit Hour"))
    );
    let credit_hour: number | null = null;
    if (Number.isFinite(credit_hourRaw)) {
      if (credit_hourRaw < 0 || credit_hourRaw > 9) {
        errors.push("Credit hour must be between 0 and 9");
      } else {
        credit_hour = credit_hourRaw;
      }
    }

    const faculty_assigned = String(
      normalize(getCell(row, "faculty_assigned", "Faculty Assigned"))
    );
    if (!faculty_assigned || faculty_assigned.length < 2) {
      errors.push("Faculty name must be at least 2 characters");
    }

    const is_regular_teacher = parseTeacherType(
      normalize(getCell(row, "is_regular_teacher", "Teacher Type"))
    );

    const domain = String(normalize(getCell(row, "domain", "Domain"))) || null;
    const subject_type =
      String(normalize(getCell(row, "subject_type", "Subject Type"))) || null;
    const semester_details =
      String(normalize(getCell(row, "semester_details", "Semester Details"))) ||
      null;

    // Validate theory_classes_week
    const theoryClassesRaw = normalize(
      getCell(row, "theory_classes_week", "Theory Classes/Week")
    );
    let theory_classes_week: number;
    if (
      typeof theoryClassesRaw === "string" &&
      theoryClassesRaw.trim() === ""
    ) {
      errors.push("Theory classes per week is required");
      theory_classes_week = 1;
    } else {
      const theoryNum = toInt(theoryClassesRaw);
      if (!Number.isFinite(theoryNum) || theoryNum < 1) {
        errors.push("Theory classes per week must be at least 1");
        theory_classes_week = 1;
      } else {
        theory_classes_week = theoryNum;
      }
    }

    // Validate lab_classes_week
    const labClassesRaw = toInt(
      normalize(getCell(row, "lab_classes_week", "Lab Classes/Week"))
    );
    const lab_classes_week =
      Number.isFinite(labClassesRaw) && labClassesRaw >= 0 ? labClassesRaw : 0;
    if (Number.isFinite(labClassesRaw) && labClassesRaw < 0) {
      errors.push("Lab classes per week cannot be negative");
    }

    // Only return insertable if there are no validation errors
    const insertable =
      errors.length === 0
        ? {
            subject_code,
            course_details,
            section,
            semester,
            credit_hour,
            faculty_assigned,
            is_regular_teacher,
            domain,
            subject_type,
            semester_details,
            theory_classes_week,
            lab_classes_week,
          }
        : undefined;

    return {
      errors,
      insertable,
    };
  };

  const handleExcelFile = async (file: File) => {
    setUploadedFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });

      const previews = rows.map((r, i) => {
        const mapped = validateAndMap(r);
        return {
          rowNumber: i + 2,
          data: r,
          errors: mapped.errors,
          insertable: mapped.insertable,
        };
      });
      setBulkPreview(previews);
      setIsPreviewOpen(true);
      if (previews.length === 0) {
        toast.warn("No data rows found in sheet");
      } else {
        toast.success("File parsed successfully");
      }
    } catch (e) {
      console.error("Excel parsing error:", e);
      toast.error("Failed to parse Excel file");
      setBulkPreview([]);
    }
  };

  const handleBulkInsert = async () => {
    const validRows = bulkPreview
      .map((p) => p.insertable)
      .filter((v): v is CourseInsert => Boolean(v));
    if (validRows.length === 0) {
      toast.error("No valid rows to insert");
      return;
    }
    setIsBulkSaving(true);
    try {
      const response = await fetch("/api/add-new-course/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRows),
      });
      if (response.ok) {
        toast.success("courses added successfully");
      }
      const result = await response.json();
      if (result && result.length) {
        setCourses([...courses, ...(result as Course[])]);
        toast.success(`Inserted ${result.length} course(s)`);
        setBulkPreview([]);
        setUploadedFileName("");
        setIsPreviewOpen(false);
      }
    } catch (err) {
      console.error("Bulk insert error:", err);
      toast.error("failed to insert courses");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      // Prepare data for API
      const courseData = {
        subject_code: values.subject_code || null,
        course_details: values.course_details,
        section: values.section,
        semester: values.semester,
        credit_hour: values.credit_hour || null,
        faculty_assigned: values.faculty_assigned,
        is_regular_teacher: values.is_regular_teacher,
        domain: values.domain || null,
        subject_type: values.subject_type || null,
        semester_details: values.semester_details || null,
        theory_classes_week: values.theory_classes_week,
        lab_classes_week: values.lab_classes_week,
      };

      // Call the API route
      const response = await fetch("/api/add-new-course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save course data");
      }

      // Update the CourseContext with the new course
      if (result) {
        setCourses([...courses, result as Course]);
      }

      toast.success("Course data saved successfully!");
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Failed to save course data.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="flex items-center justify-center text-4xl font-bold pb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-600">
        Add New Course
      </h1>
      {/* Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-lg bg-gray-100 py-1 px-1">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "manual"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Manual Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === "excel"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Upload Excel file
          </button>
        </div>
      </div>

      {activeTab === "excel" && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-gray-900">
                Upload Excel File
              </p>
              <p className="text-sm text-gray-600">
                Upload .xlsx/.xls using the official template.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={downloadTemplate}>
                Download Template
              </Button>
              {bulkPreview.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPreviewOpen((s) => !s)}
                >
                  {isPreviewOpen ? "Hide Preview" : "Review Parsed Rows"}
                </Button>
              )}
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleExcelFile(f);
            }}
            className={`w-full rounded-xl border-2 border-dashed p-6 cursor-pointer transition ${
              isDragOver
                ? "border-blue-400 bg-blue-50/50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                ⬆
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium text-blue-900">
                  Click to upload
                </span>{" "}
                or drag & drop
              </div>
              <div className="text-xs text-gray-500">
                Only .xlsx or .xls from the template
              </div>
              {uploadedFileName && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: {uploadedFileName}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleExcelFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>

          {bulkPreview.length > 0 && (
            <div className="space-y-4">
              {/* Summary Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  File Analysis Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {bulkPreview.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {bulkPreview.filter((p) => p.errors.length === 0).length}
                    </div>
                    <div className="text-sm text-green-600">Valid Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {bulkPreview.filter((p) => p.errors.length > 0).length}
                    </div>
                    <div className="text-sm text-red-600">Invalid Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {bulkPreview.length > 0
                        ? Math.round(
                            (bulkPreview.filter((p) => p.errors.length === 0)
                              .length /
                              bulkPreview.length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-blue-600">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 mr-2">
                    Total: {bulkPreview.length}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 mr-2">
                    Valid:{" "}
                    {bulkPreview.filter((p) => p.errors.length === 0).length}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                    Invalid:{" "}
                    {bulkPreview.filter((p) => p.errors.length > 0).length}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={
                      isBulkSaving ||
                      bulkPreview.every((p) => p.errors.length > 0)
                    }
                    onClick={handleBulkInsert}
                    className="bg-[#042954] hover:bg-[#042954]/90"
                  >
                    {isBulkSaving ? "Saving..." : "Insert Valid Rows"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setBulkPreview([]);
                      setUploadedFileName("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

          {bulkPreview.length > 0 && isPreviewOpen && (
            <div className="space-y-4">
              {/* Filter Options */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Filter:
                </label>
                <ReactSelect
                  instanceId="filter-select"
                  options={[
                    { value: "all", label: "All Rows" },
                    { value: "valid", label: "Valid Rows Only" },
                    { value: "invalid", label: "Invalid Rows Only" },
                  ]}
                  defaultValue={{ value: "all", label: "All Rows" }}
                  onChange={(option) => {
                    const filterValue = option?.value || "all";
                    const filteredPreview =
                      filterValue === "all"
                        ? bulkPreview
                        : bulkPreview.filter((p) =>
                            filterValue === "valid"
                              ? p.errors.length === 0
                              : p.errors.length > 0
                          );
                    setFilteredPreview(filteredPreview);
                  }}
                  className="w-48"
                  classNamePrefix="react-select"
                  variant="compact"
                  size="sm"
                />
              </div>

              <div className="max-h-96 overflow-auto border rounded-md">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Subject Code</th>
                      <th className="px-3 py-2">Course Details</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Semester</th>
                      <th className="px-3 py-2">Credit Hour</th>
                      <th className="px-3 py-2">Faculty</th>
                      <th className="px-3 py-2">Theory/Week</th>
                      <th className="px-3 py-2">Lab/Week</th>
                      <th className="px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.slice(0, 100).map((p) => (
                      <tr
                        key={p.rowNumber}
                        className={`border-t ${
                          p.errors.length === 0 ? "bg-green-50" : "bg-red-50"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{p.rowNumber}</td>
                        <td className="px-3 py-2">
                          {p.errors.length === 0 ? (
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                              ✓ Valid
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
                              ✗ Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {String(p.data["Subject Code"] ?? "")}
                        </td>
                        <td
                          className="px-3 py-2 max-w-32 truncate"
                          title={String(p.data["Course Details"] ?? "")}
                        >
                          {String(p.data["Course Details"] ?? "")}
                        </td>
                        <td
                          className="px-3 py-2 max-w-32 truncate"
                          title={String(p.data["Section"] ?? "")}
                        >
                          {String(p.data["Section"] ?? "")}
                        </td>
                        <td className="px-3 py-2">
                          {String(p.data["Semester"] ?? "")}
                        </td>
                        <td className="px-3 py-2">
                          {String(p.data["Credit Hour"] ?? "")}
                        </td>
                        <td
                          className="px-3 py-2 max-w-24 truncate"
                          title={String(p.data["Faculty Assigned"] ?? "")}
                        >
                          {String(p.data["Faculty Assigned"] ?? "")}
                        </td>
                        <td className="px-3 py-2">
                          {String(p.data["Theory Classes/Week"] ?? "")}
                        </td>
                        <td className="px-3 py-2">
                          {String(p.data["Lab Classes/Week"] ?? "")}
                        </td>
                        <td className="px-3 py-2 text-red-600 max-w-48">
                          {p.errors.length > 0 ? (
                            <div className="space-y-1">
                              {p.errors.map((error, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs bg-red-100 p-1 rounded"
                                >
                                  {error}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs">
                              No errors
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredPreview.length > 100 && (
                      <tr className="bg-gray-50">
                        <td
                          colSpan={11}
                          className="px-3 py-2 text-center text-gray-500 text-xs"
                        >
                          Showing first 100 rows. Total rows:{" "}
                          {filteredPreview.length}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "manual" && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 overflow-y-auto"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="course_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Course Details
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Introduction to Remote Sensing"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Section
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., (BS (GIS &RS (2024-2028)) 2nd"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Semester
                    </FormLabel>
                    <FormControl>
                      <ReactSelect
                        instanceId="semester-select"
                        inputId="semester-select-input"
                        options={semesterOptions}
                        value={
                          semesterOptions.find(
                            (option) =>
                              parseInt(option.value, 10) === field.value
                          ) || null
                        }
                        onChange={(selectedOption) =>
                          field.onChange(
                            selectedOption
                              ? parseInt(selectedOption.value, 10)
                              : 1
                          )
                        }
                        placeholder="Select Semester"
                        className="w-full"
                        classNamePrefix="react-select"
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Semester Details (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Spring 2025"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="credit_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Credit Hour
                    </FormLabel>
                    <FormControl>
                      <Input
                        maxLength={10}
                        placeholder="e.g., 3"
                        type="number"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : parseInt(e.target.value, 10)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="faculty_assigned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Faculty Assigned
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Syed Najam Ul Hassan"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="theory_classes_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Theory Classes per Week
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2"
                        type="number"
                        min="1"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lab_classes_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Lab Classes per Week (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1"
                        type="number"
                        min="0"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Domain (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., CS"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Subject Code (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., GIS-302"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="subject_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Subject Type (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., RS-Core"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_regular_teacher"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 pt-4">
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Regular Teacher
                    </FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="h-5 w-5"
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-white rounded-lg font-semibold text-lg"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
