"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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

// Define TypeScript interface for Course
interface Course {
  id: string;
  subject_code?: string;
  course_details?: string;
  semester?: string;
  credit_hour?: string;
  faculty_assigned?: string;
  section?: string;
}

export default function FacultyData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Course>>({});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const getData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses");
      if (!res.ok) {
        throw new Error("Failed to fetch courses");
      }
      const response = await res.json();
      // Handle both direct array and { data: Course[] } response
      setCourses(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      toast.error(`Failed to fetch courses: ${(error as Error).message}`, {
        position: "top-right",
      });
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (courses.length === 0 && !loading) {
      toast.info("No courses found.", {
        description: "The courses table is empty.",
        position: "top-right",
      });
    }
  }, [courses, loading]);

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      id: course.id,
      subject_code: course.subject_code || "",
      course_details: course.course_details || "",
      semester: course.semester || "",
      credit_hour: course.credit_hour || "",
      faculty_assigned: course.faculty_assigned || "",
      section: course.section || "",
    });
  };

  const handleDelete = (id: string) => {
    setDeletingCourseId(id);
  };

  const confirmDelete = async () => {
    if (deletingCourseId) {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/courses/${deletingCourseId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          let errorMessage = "Something went wrong";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Ignore JSON parsing error if body is empty
          }
          throw new Error(errorMessage);
        }

        toast.success("Course deleted successfully.", {
          position: "top-right",
        });

        setCourses((prev) =>
          prev.filter((course) => course.id !== deletingCourseId)
        );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_code) {
      toast.error("Subject Code is required.", {
        position: "top-right",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/courses/${formData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = "Something went wrong";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Ignore JSON parsing error if body is empty
        }
        throw new Error(errorMessage);
      }

      const { data: updatedCourse } = await response.json();
      setCourses((prev) =>
        prev.map((course) =>
          course.id === formData.id ? { ...course, ...updatedCourse } : course
        )
      );
      toast.success("Course updated successfully.", {
        position: "top-right",
      });
      setEditingCourse(null);
    } catch (error) {
      toast.error(`Failed to update course: ${(error as Error).message}`, {
        position: "top-right",
      });
      console.error("Update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <main>
      {loading ? (
        <div className="text-center text-gray-600 py-10">Loading...</div>
      ) : (
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Courses List
          </h1>
          {courses.length === 0 ? (
            <div className="text-center text-gray-600">
              No courses available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-300 bg-white rounded-lg">
                <thead>
                  <tr className="bg-gray-200">
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-600 border-2 border-gray-300">
                        {course.id}
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
                      <td className="p-3 text-sm text-gray-600 border-2 border-gray-300 flex space-x-2">
                        <button
                          onClick={() => handleEdit(course)}
                          className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors text-sm font-medium"
                          disabled={isUpdating || isDeleting}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
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
            <AlertDialog open={!!editingCourse}>
              <AlertDialogPortal>
                <AlertDialogOverlay
                  className="bg-[#042957]"
                  style={{ backdropFilter: "blur(2px)" }}
                />
                <AlertDialogContent className="bg-[#042957] text-[#9ea8b5]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#9EA8F5]">
                      Edit Course
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9ea8b5] text-sm">
                      Update the course details below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-[#9ea8b5] text-sm">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        name="subject_code"
                        value={formData.subject_code || ""}
                        onChange={handleInputChange}
                        className="mt-1 p-2 w-full border rounded text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label className="text-[#9ea8b5] text-sm">
                        Course Details
                      </label>
                      <input
                        type="text"
                        name="course_details"
                        value={formData.course_details || ""}
                        onChange={handleInputChange}
                        className="mt-1 p-2 w-full border rounded text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label className="text-[#9ea8b5] text-sm">Semester</label>
                      <input
                        type="text"
                        name="semester"
                        value={formData.semester || ""}
                        onChange={handleInputChange}
                        className="mt-1 p-2 w-full border rounded text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label className="text-[#9ea8b5] text-sm">
                        Credit Hour
                      </label>
                      <input
                        type="text"
                        name="credit_hour"
                        value={formData.credit_hour || ""}
                        onChange={handleInputChange}
                        className="mt-1 p-2 w-full border rounded text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label className="text-[#9ea8b5] text-sm">
                        Faculty Assigned
                      </label>
                      <input
                        type="text"
                        name="faculty_assigned"
                        value={formData.faculty_assigned || ""}
                        onChange={handleInputChange}
                        className="mt-1 p-2 w-full border rounded text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label className="text-[#9ea8b5] text-sm">Section</label>
                      <input
                        type="text"
                        name="section"
                        value={formData.section || ""}
                        onChange={handleInputChange}
                        className="mt-1 p-2 w-full border rounded text-black text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isUpdating}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setEditingCourse(null)}
                        className="bg-red-800 hover:bg-red-900 text-white text-sm"
                        disabled={isUpdating}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSubmit}
                        className="bg-blue-900 hover:bg-blue-800 text-white text-sm flex items-center gap-2"
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
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialogPortal>
            </AlertDialog>
          )}

          {/* Delete Course Dialog */}
          {deletingCourseId && (
            <AlertDialog open={!!deletingCourseId}>
              <AlertDialogPortal>
                <AlertDialogOverlay
                  className="bg-[#042957]"
                  style={{ backdropFilter: "blur(2px)" }}
                />
                <AlertDialogContent className="bg-[#042957] text-[#9ea8b5]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#9EA8F5]">
                      Delete Course
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9ea8b5] text-sm">
                      Are you sure you want to delete this course? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setDeletingCourseId(null)}
                      className="bg-red-800 hover:bg-red-900 text-white text-sm"
                      disabled={isDeleting}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmDelete}
                      className="bg-blue-900 hover:bg-blue-800 text-white text-sm flex items-center gap-2"
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
      )}
    </main>
  );
}
