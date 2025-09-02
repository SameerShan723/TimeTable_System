"use client";
import React, { useState, useId, useMemo, useEffect } from "react";
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
    courseId?: string | number;
    type?: "Theory" | "Lab";
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

  // Clear form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSubject(null);
      setTeacher(null);
      setSection(null);
    }
  }, [isOpen]);

  // Clear teacher and section when subject changes
  useEffect(() => {
    if (subject) {
      setTeacher(null);
      setSection(null);
    }
  }, [subject]);

  // Clear section when teacher changes (since it affects section options)
  useEffect(() => {
    if (teacher) {
      setSection(null);
    }
  }, [teacher]);

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

  // Filter teachers based on selected subject and section
  const teacherOptions = useMemo(
    () => {
      if (!subject) return [];
      
      let filteredCourses = courses.filter((course) => course.course_details === subject);
      
      // If section is also selected, filter by both subject and section
      if (section) {
        filteredCourses = filteredCourses.filter((course) => course.section === section);
      }
      
      const teachersForSubject = filteredCourses
        .map((course) => course.faculty_assigned)
        .filter(Boolean);

      return Array.from(new Set(teachersForSubject)).map((teacher) => ({
        value: teacher!,
        label: teacher!,
      }));
    },
    [courses, subject, section]
  );

  // Filter sections based on selected subject and teacher
  const sectionOptions = useMemo(
    () => {
      if (!subject) return [];
      
      let filteredCourses = courses.filter((course) => course.course_details === subject);
      
      // If teacher is also selected, filter by both subject and teacher
      if (teacher) {
        filteredCourses = filteredCourses.filter((course) => course.faculty_assigned === teacher);
      }
      
      const sectionsForSubject = filteredCourses
        .map((course) => course.section)
        .filter(Boolean);

      return Array.from(new Set(sectionsForSubject)).map((section) => ({
        value: section!,
        label: section!,
      }));
    },
    [courses, subject, teacher]
  );

  // Resolve CourseId and type from selection
  const resolvedCourse = useMemo(() => {
    if (!subject || !teacher || !section) return null;
    return (
      courses.find(
        (c) =>
          c.course_details === subject &&
          c.faculty_assigned === teacher &&
          c.section === section
      ) || null
    );
  }, [courses, subject, teacher, section]);

  const handleSubmit = () => {
    if (subject && teacher && section) {
      const inferredType: "Theory" | "Lab" | undefined =
        resolvedCourse?.subject_type && resolvedCourse.subject_type.toLowerCase().includes("lab")
          ? "Lab"
          : resolvedCourse?.subject_type
          ? "Theory"
          : undefined;
      onSubmit({
        subject,
        teacher,
        section,
        courseId: resolvedCourse?.id,
        type: inferredType,
      });
      // Don't clear values here - let the parent component handle closing
      // The useEffect will clear them when the dialog actually closes
    } else {
      toast.error("Please fill all fields");
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="bg-black bg-opacity-50" />
        <AlertDialogContent className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl max-w-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-blue-900">
              Add New Class
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 text-sm">
              Select the subject, teacher, and section for the new class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
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
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Teacher:
              </label>
              <Select
                instanceId={teacherId}
                options={teacherOptions}
                value={teacher ? { value: teacher, label: teacher } : null}
                onChange={(option) => setTeacher(option ? option.value : null)}
                placeholder="Select Teacher"
                isDisabled={isAddClassLoading || !subject || teacherOptions.length === 0}
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
                    cursor: (!subject || teacherOptions.length === 0) ? "not-allowed" : "pointer",
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
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Section:
              </label>
              <Select
                instanceId={sectionId}
                options={sectionOptions}
                value={section ? { value: section, label: section } : null}
                onChange={(option) => setSection(option ? option.value : null)}
                placeholder="Select Section"
                isDisabled={isAddClassLoading || !subject || sectionOptions.length === 0}
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
                    cursor: (!subject || sectionOptions.length === 0) ? "not-allowed" : "pointer",
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
              className="px-4 py-2 bg-[#042954] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
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
