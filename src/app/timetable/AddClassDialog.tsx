"use client";
import React, { useState, useId, useMemo } from "react";
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
import Select from "react-select";
import { toast } from "react-toastify";
import { useCourses } from "@/context/CourseContext";

interface AddClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    subject: string;
    teacher: string;
    section: string;
  }) => void;
  isAddClassLoading: boolean;
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isAddClassLoading,
}) => {
  const { courses } = useCourses();
  const [subject, setSubject] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const subjectId = useId();
  const teacherId = useId();
  const sectionId = useId();

  // Derive select options from courses
  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set(courses.map((course) => course.course_details).filter(Boolean))
      ).map((code) => ({
        value: code!,
        label: code!,
      })),
    [courses]
  );

  const teacherOptions = useMemo(
    () =>
      Array.from(
        new Set(
          courses.map((course) => course.faculty_assigned).filter(Boolean)
        )
      ).map((teacher) => ({
        value: teacher!,
        label: teacher!,
      })),
    [courses]
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(courses.map((course) => course.section).filter(Boolean))
      ).map((section) => ({
        value: section!,
        label: section!,
      })),
    [courses]
  );

  const handleSubmit = () => {
    if (subject && teacher && section) {
      onSubmit({ subject, teacher, section });
      setSubject(null);
      setTeacher(null);
      setSection(null);
    } else {
      toast.error("Please fill all fields");
      onClose(); // Close only if validation fails
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="bg-black bg-opacity-50" />
        <AlertDialogContent className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl max-w-3xl mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-800">
              Add New Class
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 text-sm">
              Select the subject, teacher, and section for the new class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 p-6">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Subject:
              </label>
              <Select
                instanceId={subjectId}
                options={subjectOptions}
                value={subject ? { value: subject, label: subject } : null}
                onChange={(option) => setSubject(option ? option.value : null)}
                placeholder="Select Subject"
                isDisabled={isAddClassLoading}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    width: "100%",
                    backgroundColor: "#f9fafb",
                    border: state.isFocused
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
                    fontSize: "0.875rem",
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
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 50,
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "#3b82f6"
                      : state.isFocused
                      ? "#eff6ff"
                      : "#ffffff",
                    color: state.isSelected ? "#ffffff" : "#374151",
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
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Teacher:
              </label>
              <Select
                instanceId={teacherId}
                options={teacherOptions}
                value={teacher ? { value: teacher, label: teacher } : null}
                onChange={(option) => setTeacher(option ? option.value : null)}
                placeholder="Select Teacher"
                isDisabled={isAddClassLoading}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    width: "100%",
                    backgroundColor: "#f9fafb",
                    border: state.isFocused
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
                    fontSize: "0.875rem",
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
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 50,
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "#3b82f6"
                      : state.isFocused
                      ? "#eff6ff"
                      : "#ffffff",
                    color: state.isSelected ? "#ffffff" : "#374151",
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
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Section:
              </label>
              <Select
                instanceId={sectionId}
                options={sectionOptions}
                value={section ? { value: section, label: section } : null}
                onChange={(option) => setSection(option ? option.value : null)}
                placeholder="Select Section"
                isDisabled={isAddClassLoading}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    width: "100%",
                    backgroundColor: "#f9fafb",
                    border: state.isFocused
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
                    fontSize: "0.875rem",
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
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 50,
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "#3b82f6"
                      : state.isFocused
                      ? "#eff6ff"
                      : "#ffffff",
                    color: state.isSelected ? "#ffffff" : "#374151",
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
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!isAddClassLoading) {
                  onClose();
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none"
              disabled={isAddClassLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="px-4 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
              disabled={isAddClassLoading}
            >
              Add Class
              {isAddClassLoading && (
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
  );
};

export default AddClassDialog;
