"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { z } from "zod";
import { useForm, SubmitHandler, UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Select from "react-select";
import { useCourses } from "@/context/CourseContext";
import { supabaseClient } from "@/lib/supabase/supabase";
import { Course } from "@/lib/serverData/CourseDataFetcher";

// Options for react-select
const teacherTypeOptions = [
  { value: "Permanent", label: "Permanent" },
  { value: "Visiting", label: "Visiting" },
];

// Validation schema
const formSchema = z.object({
  subject_code: z.string().trim().optional(),
  course_details: z
    .string()
    .trim()
    .nonempty({ message: "Course Detail is required" })
    .min(5, { message: "Course details must be at least 5 characters." }),
  section: z
    .string()
    .trim()
    .nonempty({ message: "Section is required" })
    .min(5, { message: "Section must be at least 5 characters." }),
  semester: z
    .string()
    .trim()
    .nonempty({ message: "Semester is required." })
    .regex(/^[1-9]$/, {
      message: "Semester must be a number from 1 to 9.",
    }),
  credit_hour: z
    .string()
    .trim()
    .nonempty({ message: "Credit hour is required." })
    .regex(/^[1-9]$/, {
      message: "Credit hour must be a number from 1 to 9.",
    }),
  faculty_assigned: z
    .string()
    .trim()
    .nonempty({ message: "Faculty Assigned is required." })
    .min(5, { message: "Faculty name must be at least 5 characters." }),
  is_regular_teacher: z.enum(["Permanent", "Visiting"], {
    errorMap: () => ({
      message: "Please select Permanent or Visiting.",
    }),
  }),
  domain: z.string().trim().optional(),
  subject_type: z.string().trim().optional(),
  semester_details: z.string().trim().optional(),
});

// Define form values type
type FormValues = z.infer<typeof formSchema>;

export default function FacultyData() {
  const { courses, setCourses } = useCourses();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

  // Define form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as UseFormProps<FormValues>["resolver"],
    mode: "onTouched",
    defaultValues: {
      subject_code: "",
      course_details: "",
      section: "",
      semester: "",
      credit_hour: "",
      faculty_assigned: "",
      is_regular_teacher: "Permanent",
      domain: "",
      subject_type: "",
      semester_details: "",
    },
  });

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsEditDialogOpen(true);
    form.reset({
      subject_code: course.subject_code || "",
      course_details: course.course_details || "",
      section: course.section || "",
      semester: course.semester?.toString() || "",
      credit_hour: course.credit_hour?.toString() || "",
      faculty_assigned: course.faculty_assigned || "",
      is_regular_teacher: course.is_regular_teacher ? "Permanent" : "Visiting",
      domain: course.domain || "",
      subject_type: course.subject_type || "",
      semester_details: course.semester_details || "",
    });
  };

  const handleDelete = (id: string) => {
    setDeletingCourseId(id);
  };

  const confirmDelete = async () => {
    if (deletingCourseId) {
      setIsDeleting(true);
      try {
        const { error } = await supabaseClient
          .from("courses")
          .delete()
          .eq("id", deletingCourseId);

        if (error) {
          throw new Error(error.message);
        }

        setCourses((prev) =>
          prev.filter((course) => course.id !== deletingCourseId)
        );
        toast.success("Course deleted successfully.", {
          position: "top-right",
        });
      } catch (error) {
        toast.error(`Failed to delete course: ${(error as Error).message}`, {
          position: "top-right",
        });
        console.error("Delete error:", error);
      } finally {
        setIsDeleting(false);
        setDeletingCourseId(null);
      }
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!editingCourse) return;

    setIsUpdating(true);
    try {
      const payload = {
        subject_code: values.subject_code?.trim() || null,
        course_details: values.course_details,
        section: values.section,
        semester: values.semester ? parseInt(values.semester, 10) : null,
        credit_hour: values.credit_hour
          ? parseInt(values.credit_hour, 10)
          : null,
        faculty_assigned: values.faculty_assigned,
        is_regular_teacher: values.is_regular_teacher === "Permanent",
        domain: values.domain?.trim() || null,
        subject_type: values.subject_type?.trim() || null,
        semester_details: values.semester_details?.trim() || null,
      };

      const { data, error } = await supabaseClient
        .from("courses")
        .update(payload)
        .eq("id", editingCourse.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setCourses((prev) =>
        prev.map((course) =>
          course.id === editingCourse.id ? { ...course, ...data } : course
        )
      );
      toast.success("Course updated successfully.", {
        position: "top-right",
      });
      setEditingCourse(null);
      setIsEditDialogOpen(false);
      form.reset({
        subject_code: "",
        course_details: "",
        section: "",
        semester: "",
        credit_hour: "",
        faculty_assigned: "",
        is_regular_teacher: "Permanent",
        domain: "",
        subject_type: "",
        semester_details: "",
      });
    } catch (error) {
      toast.error(`Failed to update course: ${(error as Error).message}`, {
        position: "top-right",
      });
      console.error("Update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <main>
      <div
        className={`max-w-8xl mx-auto p-6 transition-all duration-300 ${
          isEditDialogOpen || deletingCourseId ? "backdrop-blur-sm" : ""
        }`}
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Courses List
        </h1>
        {courses.length === 0 ? (
          <div className="text-center text-gray-600">No courses available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-2 border-gray-300 bg-white rounded-lg shadow-lg">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    ID
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Subject Code
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Course Details
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Semester
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Credit Hour
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Faculty Assigned
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Section
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Domain
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Subject Type
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Semester Details
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Teacher Type
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, index) => (
                  <tr
                    key={course.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {index + 1}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.subject_code || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.course_details || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.semester || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.credit_hour || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.faculty_assigned || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.section || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.domain || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.subject_type || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.semester_details || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.is_regular_teacher ? "Permanent" : "Visiting"}
                    </td>
                    <td className="p-8 text-sm text-gray-600 border-1 border-gray-300 flex space-x-2">
                      <button
                        onClick={() => handleEdit(course)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-[#9ea8b5] rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 hover:scale-105 text-sm font-medium "
                        disabled={isUpdating || isDeleting}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-[#9ea8b5] rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:scale-105 text-sm font-medium "
                        disabled={isUpdating || isDeleting}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Course Dialog */}
        {editingCourse && (
          <AlertDialog open={isEditDialogOpen}>
            <AlertDialogPortal>
              <AlertDialogOverlay className="bg-black bg-opacity-50" />
              <AlertDialogContent className="bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 border border-gray-700 shadow-lg rounded-xl max-w-3xl px-2  min-h-[500px] max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-indigo-300">
                    Edit Course
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400 text-sm">
                    Update the course details below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6"
                  >
                    {form.formState.errors.root && (
                      <div className="col-span-1 md:col-span-2 text-red-400 text-sm font-medium">
                        {form.formState.errors.root.message}
                      </div>
                    )}
                    <FormField
                      control={form.control}
                      name="subject_code"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Subject Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., GIS-302"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.subject_code
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="course_details"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Course Details
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Introduction to Remote Sensing"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.course_details
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="semester"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Semester
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., 4"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.semester
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? e.target.value : ""
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="credit_hour"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Credit Hour
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., 3"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.credit_hour
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? e.target.value : ""
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="faculty_assigned"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Faculty Assigned
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Syed Najam Ul Hassan"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.faculty_assigned
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Section
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., (BS (GIS &RS (2024-2028)) 2nd"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.section
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Domain
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Computer Science"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.domain
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject_type"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Subject Type
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Core"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.subject_type
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="semester_details"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Semester Details
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Fall 2024"
                              className={`mt-1 p-2 w-full bg-gray-700 text-white border border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 ${
                                form.formState.errors.semester_details
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_regular_teacher"
                      render={({ field }) => (
                        <FormItem className="w-full md:col-span-2">
                          <FormLabel className="text-gray-300 text-sm font-medium">
                            Teacher Type
                          </FormLabel>
                          <FormControl>
                            <Select
                              options={teacherTypeOptions}
                              value={teacherTypeOptions.find(
                                (option) => option.value === field.value
                              )}
                              onChange={(selectedOption) =>
                                field.onChange(selectedOption?.value)
                              }
                              isDisabled={isUpdating}
                              placeholder="Select teacher type"
                              menuPlacement="top"
                              styles={{
                                control: (base, state) => ({
                                  ...base,
                                  width: "100%",
                                  backgroundColor: "#374151",
                                  border: form.formState.errors
                                    .is_regular_teacher
                                    ? "2px solid #ef4444"
                                    : state.isFocused
                                    ? "2px solid #818cf8"
                                    : "1px solid #4b5563",
                                  borderRadius: "0.5rem",
                                  padding: "0.5rem",
                                  boxShadow: state.isFocused
                                    ? "0 0 0 2px rgba(129, 140, 248, 0.5)"
                                    : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                  "&:hover": {
                                    borderColor: state.isFocused
                                      ? "#818cf8"
                                      : "#6b7280",
                                  },
                                  color: "#ffffff",
                                  transition: "all 0.2s",
                                }),
                                singleValue: (base) => ({
                                  ...base,
                                  color: "#ffffff",
                                  fontSize: "0.875rem",
                                }),
                                menu: (base) => ({
                                  ...base,
                                  backgroundColor: "#374151",
                                  color: "#ffffff",
                                  fontSize: "0.875rem",
                                  borderRadius: "0.5rem",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                  zIndex: 50,
                                }),
                                option: (base, state) => ({
                                  ...base,
                                  backgroundColor: state.isSelected
                                    ? "#818cf8"
                                    : state.isFocused
                                    ? "#4b5563"
                                    : "#374151",
                                  color: "#ffffff",
                                  "&:hover": {
                                    backgroundColor: "#4b5563",
                                  },
                                  transition: "all 0.2s",
                                }),
                                placeholder: (base) => ({
                                  ...base,
                                  color: "#9ca3af",
                                  fontSize: "0.875rem",
                                }),
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                    <div className="col-span-1 md:col-span-2 flex justify-end space-x-3">
                      <AlertDialogCancel
                        onClick={() => {
                          setEditingCourse(null);
                          setIsEditDialogOpen(false);
                          form.reset({
                            subject_code: "",
                            course_details: "",
                            section: "",
                            semester: "",
                            credit_hour: "",
                            faculty_assigned: "",
                            is_regular_teacher: "Permanent",
                            domain: "",
                            subject_type: "",
                            semester_details: "",
                          });
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none"
                        disabled={isUpdating}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction asChild disabled={isUpdating}>
                        <Button
                          type="submit"
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
                          disabled={isUpdating}
                        >
                          Save Changes
                          {isUpdating && (
                            <svg
                              className="animate-spin h-5 w-5 text-white"
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
                        </Button>
                      </AlertDialogAction>
                    </div>
                  </form>
                </Form>
              </AlertDialogContent>
            </AlertDialogPortal>
          </AlertDialog>
        )}

        {/* Delete Course Dialog */}
        {deletingCourseId && (
          <AlertDialog open={!!deletingCourseId}>
            <AlertDialogPortal>
              <AlertDialogOverlay className="bg-black bg-opacity-50" />
              <AlertDialogContent className="bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 border border-gray-700 shadow-lg rounded-xl max-w-3xl mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-indigo-300">
                    Delete Course
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400 text-sm">
                    Are you sure you want to delete this course? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setDeletingCourseId(null)}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none"
                    disabled={isDeleting}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
                    disabled={isDeleting}
                  >
                    Delete
                    {isDeleting && (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
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
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogPortal>
          </AlertDialog>
        )}
      </div>
    </main>
  );
}
