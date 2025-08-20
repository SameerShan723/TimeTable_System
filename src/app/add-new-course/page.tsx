"use client";

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
import Select from "react-select";
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useCourses } from "@/context/CourseContext";
import { Course } from "@/lib/serverData/CourseDataFetcher";

// Validation schema
const formSchema = z.object({
  courseDetails: z
    .string()
    .trim()
    .min(3, { message: "Course details must be at least 3 characters." }),
  section: z
    .string()
    .trim()
    .min(3, { message: "Section must be at least 3 characters." }),
  semester: z
    .string()
    .trim()
    .nonempty({ message: "Semester is required." }),
  semesterDetails: z.string().trim().optional(),
  creditHour: z
    .string()
    .trim()
    .nonempty({ message: "Credit hour is required." })
    .regex(/^[1-9]$/, {
      message: "Credit hour must be a number from 1 to 9.",
    }),
  facultyAssigned: z
    .string()
    .trim()
    .min(3, { message: "Faculty name must be at least 3 characters." }),
  isRegularTeacher: z.boolean().default(false),
  domain: z.string().optional(),
  subjectCode: z.string().optional(),
  subjectType: z.string().optional(),
  theoryClassesWeek: z.number().min(1, { message: "Theory classes per week is required and must be at least 1." }),
  labClassesWeek: z.number().min(0).default(0),
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
      courseDetails: "",
      section: "",
      semester: "",
      semesterDetails: "",
      creditHour: "",
      facultyAssigned: "",
      isRegularTeacher: false,
      domain: "",
      subjectCode: "",
      subjectType: "",
             theoryClassesWeek: 1,
       labClassesWeek: 0,
    },
  });

  type CourseInsert = {
    subject_code: string | null;
    course_details: string;
    section: string;
    semester: number;
    credit_hour: number;
    faculty_assigned: string;
    is_regular_teacher: boolean;
    domain: string | null;
    subject_type: string | null;
    semester_details: string | null;
    theory_classes_week: number;
    lab_classes_week: number;
  };

  const templateHeaders = useMemo(
    () => [
      "Subject Code",
      "Course Details",
      "Section",
      "Semester",
      "Credit Hour",
      "Faculty Assigned",
      "Teacher Type",
      "Domain",
      "Subject Type",
      "Semester Details",
      "Theory Classes/Week",
      "Lab Classes/Week",
    ],
    []
  );

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
    row: Record<string, unknown>,
  ): { errors: string[]; insertable?: CourseInsert } => {
    // Remove validation: always try to map and provide sensible defaults
    const subject_code = String(
      normalize(
        getCell(row, "subject_code", "Subject Code")
      )
    ) || null;

    const course_details = String(
      normalize(
        getCell(row, "course_details", "Course Details")
      )
    );

    const section = String(
      normalize(
        getCell(row, "section", "Section")
      )
    );

    const semesterRaw = toInt(
      normalize(
        getCell(row, "semester", "Semester")
      )
    ) as number;
    const creditHourRaw = toInt(
      normalize(
        getCell(row, "credit_hour", "Credit Hour")
      )
    ) as number;

    const faculty_assigned = String(
      normalize(
        getCell(row, "faculty_assigned", "Faculty Assigned")
      )
    );

    const is_regular_teacher = parseTeacherType(
      normalize(
        getCell(row, "is_regular_teacher", "Teacher Type")
      )
    );

    const domainRaw = String(
      normalize(
        getCell(row, "domain", "Domain")
      )
    ) as string;

    const subject_typeRaw = String(
      normalize(
        getCell(row, "subject_type", "Subject Type")
      )
    ) as string;

    const semester_detailsRaw = String(
      normalize(
        getCell(row, "semester_details", "Semester Details")
      )
    ) as string;

    const theoryClassesRaw = toInt(
      normalize(
        getCell(row, "theory_classes_week", "Theory Classes/Week")
      )
    ) as number;
    const labClassesRaw = toInt(
      normalize(
        getCell(row, "lab_classes_week", "Lab Classes/Week")
      )
    ) as number;

    const semester = Number.isFinite(semesterRaw) && semesterRaw >= 1 ? semesterRaw : 1;
    const credit_hour = Number.isFinite(creditHourRaw) && creditHourRaw >= 1 ? creditHourRaw : 1;
    const theory_classes_week = Number.isFinite(theoryClassesRaw) && theoryClassesRaw >= 1 ? theoryClassesRaw : 1;
    const lab_classes_week = Number.isFinite(labClassesRaw) && labClassesRaw >= 0 ? labClassesRaw : 0;

    return {
      errors: [],
      insertable: {
        subject_code: subject_code || null,
        course_details,
        section,
        semester,
        credit_hour,
        faculty_assigned,
        is_regular_teacher,
        domain: domainRaw ? domainRaw : null,
        subject_type: subject_typeRaw ? subject_typeRaw : null,
        semester_details: semester_detailsRaw ? semester_detailsRaw : null,
        theory_classes_week,
        lab_classes_week,
      },
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
        const mapped = validateAndMap(r,);
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
      const { data, error } = await supabaseClient
        .from("courses")
        .insert(validRows)
        .select();
      if (error) throw error;
      if (data && data.length) {
        setCourses([...courses, ...(data as Course[])]);
        toast.success(`Inserted ${data.length} course(s)`);
        setBulkPreview([]);
        setUploadedFileName("");
      }
    } catch (err) {
      console.error("Bulk insert error:", err);
      toast.error("Bulk insert failed");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Submit handler with explicit type
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
             // Insert the new course into Supabase and select the inserted row
       const { data, error } = await supabaseClient
         .from("courses")
         .insert([
           {
             course_details: values.courseDetails,
             section: values.section,
             semester: parseInt(values.semester),
             semester_details: values.semesterDetails || null,
             credit_hour: parseInt(values.creditHour),
             faculty_assigned: values.facultyAssigned,
             is_regular_teacher: values.isRegularTeacher,
             domain: values.domain || null,
             subject_code: values.subjectCode || null,
             subject_type: values.subjectType || null,
             theory_classes_week: values.theoryClassesWeek,
             lab_classes_week: values.labClassesWeek,
           },
         ])
         .select()
         .single();

      if (error) {
        throw error;
      }

      // Update the CourseContext with the new course
      if (data) {
        setCourses([...courses, data as Course]);
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
            <p className="text-lg font-semibold text-gray-900">Upload Excel File</p>
            <p className="text-sm text-gray-600">Upload .xlsx/.xls using the official template.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={downloadTemplate}>
              Download Template
            </Button>
            {bulkPreview.length > 0 && (
              <Button type="button" variant="secondary" onClick={() => setIsPreviewOpen((s) => !s)}>
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
            isDragOver ? "border-blue-400 bg-blue-50/50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">⬆</div>
            <div className="text-sm text-gray-700">
              <span className="font-medium text-blue-900">Click to upload</span> or drag & drop
            </div>
            <div className="text-xs text-gray-500">Only .xlsx or .xls from the template</div>
            {uploadedFileName && (
              <div className="text-xs text-gray-600 mt-1">Selected: {uploadedFileName}</div>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 mr-2">Total: {bulkPreview.length}</span>
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 mr-2">
                Valid: {bulkPreview.filter((p) => p.errors.length === 0).length}
              </span>
              <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                Invalid: {bulkPreview.filter((p) => p.errors.length > 0).length}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={isBulkSaving || bulkPreview.every((p) => p.errors.length > 0)}
                onClick={handleBulkInsert}
              >
                {isBulkSaving ? "Saving..." : "Insert valid rows"}
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
        )}

        {bulkPreview.length > 0 && isPreviewOpen && (
          <div className="max-h-60 overflow-auto border rounded-md">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Course Details</th>
                  <th className="px-3 py-2">Faculty</th>
                  <th className="px-3 py-2">Semester</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreview.slice(0, 100).map((p) => (
                  <tr key={p.rowNumber} className="border-t">
                    <td className="px-3 py-2">{p.rowNumber}</td>
                    <td className="px-3 py-2">{String(p.data["Course Details"] ?? "")}</td>
                    <td className="px-3 py-2">{String(p.data["Faculty Assigned"] ?? "")}</td>
                    <td className="px-3 py-2">{String(p.data["Semester"] ?? "")}</td>
                    <td className="px-3 py-2 text-red-600">{p.errors.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      )}

      {activeTab === "manual" && (
        <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100  overflow-y-auto"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="courseDetails"
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
                        <Select
                        instanceId="semester-select"
                        inputId="semester-select-input"
                       options={semesterOptions}
                       value={semesterOptions.find(option => option.value === field.value) || null}
                       onChange={(selectedOption) => field.onChange(selectedOption?.value || "")}
                       placeholder="Select Semester"
                       className="w-full"
                       classNamePrefix="react-select"
                       styles={{
                         control: (provided) => ({
                           ...provided,
                           height: '48px',
                           backgroundColor: '#f9fafb',
                           border: '1px solid #e5e7eb',
                           borderRadius: '8px',
                           '&:hover': {
                             borderColor: '#3b82f6'
                           },
                           '&:focus-within': {
                             borderColor: '#3b82f6',
                             boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
                           }
                         }),
                         option: (provided, state) => ({
                           ...provided,
                           backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                           color: state.isSelected ? 'white' : '#374151'
                         })
                       }}
                     />
                   </FormControl>
                   <FormMessage className="text-sm text-red-500 mt-1" />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="semesterDetails"
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
               name="creditHour"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-sm font-semibold text-gray-700">
                     Credit Hour
                   </FormLabel>
                   <FormControl>
                     <Input
                       placeholder="e.g., 3"
                       type="number"
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
               name="facultyAssigned"
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
                name="theoryClassesWeek"
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
                           <FormField
                control={form.control}
                name="labClassesWeek"
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subjectCode"
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
              name="subjectType"
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
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRegularTeacher"
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

      {/* Toast Container for this page only */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
    </div>
  );
}
