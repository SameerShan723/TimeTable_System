"use client";

import { useCourses } from "@/context/CourseContext";
import { useEffect } from "react";
import { toast } from "sonner";

export default function CoursesTableWithBorders() {
  const { courses } = useCourses();

  useEffect(() => {
    if (courses.length === 0) {
      toast.info("No courses found.", {
        description: "The courses table is empty.",
      });
    }
  }, [courses]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Courses List
      </h1>
      {courses.length === 0 ? (
        <div className="text-center text-gray-600">No courses available.</div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
