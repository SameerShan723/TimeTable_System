"use client";

import { useState, useEffect } from "react";
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
import { Course } from "@/lib/serverData/CourseDataFetcher";
import { useRouter } from "next/navigation";

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
    // .nonempty({ message: "Credit hour is required." })
    // .regex(/^[0-9]$/, {
    //   message: "Credit hour must be a number from 1 to 9.",
    // }),
    .optional(),
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
  theory_classes_week: z.number().min(1, {
    message: "Theory classes per week is required and must be at least 1.",
  }),
  lab_classes_week: z.number().min(0).default(0),
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
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] =
    useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Fix hydration issues with react-select
  useEffect(() => {
    setIsClient(true);
  }, []);

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
      theory_classes_week: 1,
      lab_classes_week: 0,
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
      theory_classes_week: course.theory_classes_week || 1,
      lab_classes_week: course.lab_classes_week || 0,
    });
  };

  const handleDelete = (id: string) => {
    setDeletingCourseId(id);
  };

  const handleDeleteAll = () => {
    setIsDeleteAllDialogOpen(true);
  };

  const confirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch("/api/courses/delete-all", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errMsg =
          (errorBody && (errorBody.message || errorBody.error)) ||
          `Request failed with status ${response.status}`;
        throw new Error(errMsg);
      }

      setCourses([]);
      toast.success("All courses deleted successfully.", {
        position: "top-right",
      });
    } catch (error) {
      toast.error(`Failed to delete all courses: ${(error as Error).message}`, {
        position: "top-right",
      });
      console.error("Delete all error:", error);
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllDialogOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (deletingCourseId) {
      setIsDeleting(true);
      try {
      
        const response = await fetch(`/api/courses/${deletingCourseId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          toast.error("Failed to delete course retry")
        return;
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

  // Get unique teachers and subjects for filter dropdowns
  const uniqueTeachers = Array.from(
    new Set(courses.map((course) => course.faculty_assigned).filter(Boolean))
  );
  const uniqueSubjects = Array.from(
    new Set(courses.map((course) => course.course_details).filter(Boolean))
  );

  // Filter courses based on selected filters
  const filteredCourses = courses.filter((course) => {
    const teacherMatch =
      selectedTeachers.length === 0 ||
      selectedTeachers.includes(course.faculty_assigned || "");
    const subjectMatch =
      selectedSubjects.length === 0 ||
      selectedSubjects.includes(course.course_details || "");
    return teacherMatch && subjectMatch;
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!editingCourse) return;

    try {
    setIsUpdating(true);

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
        theory_classes_week: values.theory_classes_week,
        lab_classes_week: values.lab_classes_week,
      };

      const response = await fetch(`/api/courses/${editingCourse.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errMsg =
          (errorBody && (errorBody.message || errorBody.error)) ||
          `Request failed with status ${response.status}`;
        throw new Error(errMsg);
      }

      const { data } = await response.json();

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
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
            Courses List
          </h1>
        </div>

        {/* Filter and Delete Section */}
        {courses.length > 0 && (
          <div className="mb-6 flex flex-col lg:flex-row gap-4">
            {/* Filter Container */}
            <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200 ">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center ">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Teacher
                  </label>
                  {isClient && (
                    <Select
                      instanceId="courses-filter-teachers"
                      isMulti
                      options={uniqueTeachers.map((teacher) => ({
                        value: teacher || "",
                        label: teacher || "",
                      }))}
                      value={selectedTeachers.map((teacher) => ({
                        value: teacher,
                        label: teacher,
                      }))}
                      onChange={(options) =>
                        setSelectedTeachers(
                          options ? options.map((option) => option.value) : []
                        )
                      }
                      placeholder="Select teachers"
                      isClearable
                      className="w-full"
                      styles={{
                        control: (base) => ({
                          ...base,
                          width: "100%",
                          minWidth: "100%",
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.5rem",
                          padding: "0.5rem",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                          "&:hover": {
                            borderColor: "#9ca3af",
                          },
                          transition: "all 0.2s",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#ffffff",
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          zIndex: 50,
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#3b82f6"
                            : state.isFocused
                            ? "#f3f4f6"
                            : "#ffffff",
                          color: state.isSelected ? "#ffffff" : "#374151",
                          "&:hover": {
                            backgroundColor: "#f3f4f6",
                          },
                          transition: "all 0.2s",
                        }),
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Subject
                  </label>
                  {isClient && (
                    <Select
                      instanceId="courses-filter-subjects"
                      isMulti
                      options={uniqueSubjects.map((subject) => ({
                        value: subject || "",
                        label: subject || "",
                      }))}
                      value={selectedSubjects.map((subject) => ({
                        value: subject,
                        label: subject,
                      }))}
                      onChange={(options) =>
                        setSelectedSubjects(
                          options ? options.map((option) => option.value) : []
                        )
                      }
                      placeholder="Select subjects"
                      isClearable
                      className="w-full"
                      styles={{
                        control: (base) => ({
                          ...base,
                          width: "100%",
                          minWidth: "100%",
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.5rem",
                          padding: "0.5rem",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                          "&:hover": {
                            borderColor: "#9ca3af",
                          },
                          transition: "all 0.2s",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "#ffffff",
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          zIndex: 50,
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#3b82f6"
                            : state.isFocused
                            ? "#f3f4f6"
                            : "#ffffff",
                          color: state.isSelected ? "#ffffff" : "#374151",
                          "&:hover": {
                            backgroundColor: "#f3f4f6",
                          },
                          transition: "all 0.2s",
                        }),
                      }}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 invisible">
                    Clear
                  </label>
                  <Button
                    onClick={() => {
                      setSelectedTeachers([]);
                      setSelectedSubjects([]);
                    }}
                    className="px-4 py-2 transition-all duration-200 hover:scale-105 text-sm font-medium w-full"
                    disabled={
                      selectedTeachers.length === 0 &&
                      selectedSubjects.length === 0
                    }
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
              {(selectedTeachers.length > 0 || selectedSubjects.length > 0) && (
                <div className="mt-3 text-sm text-gray-600">
                  Showing {filteredCourses.length} of {courses.length} courses
                  {/* {selectedTeachers.length > 0 && (
                     <span className="ml-2">
                       • Teachers: {selectedTeachers.join(", ")}
                     </span>
                   )}
                   {selectedSubjects.length > 0 && (
                     <span className="ml-2">
                       • Subjects: {selectedSubjects.join(", ")}
                     </span>
                   )} */}
                </div>
              )}
            </div>

            {/* Delete All Courses Container */}
            <div
              className="flex lg:flex-col
             gap-2 justify-center"
            >
              <Button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase shadow-lg"
                disabled={isUpdating || isDeleting || isDeletingAll}
              >
                Delete All Courses
              </Button>

              <Button
                onClick={() => router.push("/add-new-course")}
                className="px-4 py-2transition-all duration-200 hover:scale-105 text-sm font-medium bg-[#042954]  uppercase shadow-lg"
                disabled={isUpdating || isDeleting || isDeletingAll}
              >
                Add new Course
              </Button>
            </div>
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div className="text-center text-gray-600">
            {courses.length === 0
              ? "No courses available."
              : "No courses match the selected filters."}
          </div>
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
                    Theory Classes/Week
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Lab Classes/Week
                  </th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700 border-2 border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, index) => (
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
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.theory_classes_week || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      {course.lab_classes_week || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                      <div className="flex gap-x-1 items-center h-full">
                        <button
                          onClick={() => handleEdit(course)}
                          className="px-4 py-2 transition-all duration-200 hover:scale-105 text-sm font-medium bg-[#042954] text-white rounded-lg"
                          disabled={isUpdating || isDeleting}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="px-4 py-2 transition-all duration-200 hover:scale-105 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg"
                          disabled={isUpdating || isDeleting}
                        >
                          Delete
                        </button>
                      </div>
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
              <AlertDialogContent
                className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl w-full max-w-5xl lg:min-w-2xl min-h-[500px] max-h-[90vh] overflow-y-auto p-6"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#D1D5DB #F3F4F6",
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-blue-900">
                    Edit Course
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400 text-sm">
                    Update the course details below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"
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
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Subject Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., GIS-302"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.subject_code
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                      name="course_details"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Course Details
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Introduction to Remote Sensing"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.course_details
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-sm text-red-500 mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="semester"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Semester
                          </FormLabel>
                          <FormControl>
                            <Select
                              instanceId="semester-select-edit"
                              options={[
                                { value: "1", label: "1" },
                                { value: "2", label: "2" },
                                { value: "3", label: "3" },
                                { value: "4", label: "4" },
                                { value: "5", label: "5" },
                                { value: "6", label: "6" },
                                { value: "7", label: "7" },
                                { value: "8", label: "8" },
                              ]}
                              value={
                                [
                                  { value: "1", label: "1" },
                                  { value: "2", label: "2" },
                                  { value: "3", label: "3" },
                                  { value: "4", label: "4" },
                                  { value: "5", label: "5" },
                                  { value: "6", label: "6" },
                                  { value: "7", label: "7" },
                                  { value: "8", label: "8" },
                                ].find(
                                  (option) => option.value === field.value
                                ) || null
                              }
                              onChange={(selectedOption) =>
                                field.onChange(selectedOption?.value || "")
                              }
                              placeholder="Select Semester"
                              className="w-full"
                              classNamePrefix="react-select"
                                styles={{
                                control: (base, state) => ({
                                  ...base,
                                  width: "100%",
                                  backgroundColor: "#f9fafb",
                                  border: form.formState.errors
                                    .is_regular_teacher
                                    ? "2px solid #ef4444"
                                    : state.isFocused
                                    ? "2px solid #3b82f6"
                                    : "1px solid #e5e7eb",
                                  borderRadius: "0.5rem",
                                  minHeight: "48px",
                                  boxShadow: state.isFocused
                                    ? "0 0 0 2px rgba(59, 130, 246, 0.1)"
                                    : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                  "&:hover": {
                                    borderColor: "#3b82f6",
                                  },
                                  color: "#111827",
                                  transition: "all 0.2s",
                                }),
                                singleValue: (base) => ({
                                  ...base,
                                  color: "#111827",
                                  fontSize: "0.875rem",
                                }),
                                menu: (base) => ({
                                  ...base,
                                  backgroundColor: "#ffffff",
                                  color: "#111827",
                                  fontSize: "0.875rem",
                                  borderRadius: "0.5rem",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                  zIndex: 50,
                                }),
                                option: (base, state) => ({
                                  ...base,
                                  backgroundColor: state.isSelected
                                    ? "#3b82f6"
                                    : state.isFocused
                                    ? "#eff6ff"
                                    : "#ffffff",
                                  color: state.isSelected
                                    ? "#ffffff"
                                    : "#374151",
                                  "&:hover": {
                                    backgroundColor: "#eff6ff",
                                  },
                                  transition: "all 0.2s",
                                }),
                                placeholder: (base) => ({
                                  ...base,
                                  color: "#6b7280",
                                  fontSize: "0.875rem",
                                }),
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-sm text-red-500 mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="credit_hour"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Credit Hour
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 3"
                              maxLength={1}
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.credit_hour
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/[^1-9]/g, "")
                                  .slice(0, 1);
                                field.onChange(value);
                              }}
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
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Faculty Assigned
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Syed Najam Ul Hassan"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.faculty_assigned
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Section
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., (BS (GIS &RS (2024-2028)) 2nd"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.section
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-sm text-red-500 mt-1" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Domain
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Computer Science"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.domain
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                      name="subject_type"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Subject Type
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Core"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.subject_type
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                      name="semester_details"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Semester Details
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Fall 2024"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.semester_details
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                      name="theory_classes_week"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Theory Classes per Week
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g., 2"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.theory_classes_week
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Lab Classes per Week (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g., 1"
                              className={`h-12 px-4 w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                form.formState.errors.lab_classes_week
                                  ? "border-red-500"
                                  : ""
                              }`}
                              disabled={isUpdating}
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
                    <FormField
                      control={form.control}
                      name="is_regular_teacher"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">
                            Teacher Type
                          </FormLabel>
                          <FormControl>
                            <Select
                              instanceId="courses-teacher-type"
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
                                  backgroundColor: "#f9fafb",
                                  border: form.formState.errors
                                    .is_regular_teacher
                                    ? "2px solid #ef4444"
                                    : state.isFocused
                                    ? "2px solid #3b82f6"
                                    : "1px solid #e5e7eb",
                                  borderRadius: "0.5rem",
                                  minHeight: "48px",
                                  boxShadow: state.isFocused
                                    ? "0 0 0 2px rgba(59, 130, 246, 0.1)"
                                    : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                  "&:hover": {
                                    borderColor: "#3b82f6",
                                  },
                                  color: "#111827",
                                  transition: "all 0.2s",
                                }),
                                singleValue: (base) => ({
                                  ...base,
                                  color: "#111827",
                                  fontSize: "0.875rem",
                                }),
                                menu: (base) => ({
                                  ...base,
                                  backgroundColor: "#ffffff",
                                  color: "#111827",
                                  fontSize: "0.875rem",
                                  borderRadius: "0.5rem",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                  zIndex: 50,
                                }),
                                option: (base, state) => ({
                                  ...base,
                                  backgroundColor: state.isSelected
                                    ? "#3b82f6"
                                    : state.isFocused
                                    ? "#eff6ff"
                                    : "#ffffff",
                                  color: state.isSelected
                                    ? "#ffffff"
                                    : "#374151",
                                  "&:hover": {
                                    backgroundColor: "#eff6ff",
                                  },
                                  transition: "all 0.2s",
                                }),
                                placeholder: (base) => ({
                                  ...base,
                                  color: "#6b7280",
                                  fontSize: "0.875rem",
                                }),
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-sm text-red-500 mt-1" />
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
                            theory_classes_week: 1,
                            lab_classes_week: 0,
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
                          className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
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
              <AlertDialogContent className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl max-w-3xl mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-blue-900">
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
                    className="px-4 py-2 bg-[#042954] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
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

        {/* Delete All Courses Dialog */}
        {isDeleteAllDialogOpen && (
          <AlertDialog open={isDeleteAllDialogOpen}>
            <AlertDialogPortal>
              <AlertDialogOverlay className="bg-black bg-opacity-50" />
              <AlertDialogContent className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl max-w-3xl mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-blue-900">
                    Delete All Courses
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400 text-sm">
                    Are you sure you want to delete all courses? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setIsDeleteAllDialogOpen(false)}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none"
                    disabled={isDeletingAll}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteAll}
                    className="px-4 py-2 bg-[#042954] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
                    disabled={isDeletingAll}
                  >
                    Delete All
                    {isDeletingAll && (
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
