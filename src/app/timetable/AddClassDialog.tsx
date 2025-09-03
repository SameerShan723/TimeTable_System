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
import ReactSelect from "@/components/ui/ReactSelect";
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
  const [classType, setClassType] = useState<"Theory" | "Lab">("Theory");
  const subjectId = useId();
  const teacherId = useId();
  const sectionId = useId();
  const typeId = useId();

  // Clear form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSubject(null);
      setTeacher(null);
      setSection(null);
      setClassType("Theory");
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
      onSubmit({
        subject,
        teacher,
        section,
        courseId: resolvedCourse?.id,
        type: classType,
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
              <ReactSelect
                instanceId={subjectId}
                options={subjectOptions}
                value={subject ? { value: subject, label: subject } : null}
                onChange={(option) => setSubject(option ? option.value : null)}
                placeholder="Select Subject"
                isDisabled={isAddClassLoading}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Teacher:
              </label>
              <ReactSelect
                instanceId={teacherId}
                options={teacherOptions}
                value={teacher ? { value: teacher, label: teacher } : null}
                onChange={(option) => setTeacher(option ? option.value : null)}
                placeholder="Select Teacher"
                isDisabled={isAddClassLoading || !subject || teacherOptions.length === 0}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Section:
              </label>
              <ReactSelect
                instanceId={sectionId}
                options={sectionOptions}
                value={section ? { value: section, label: section } : null}
                onChange={(option) => setSection(option ? option.value : null)}
                placeholder="Select Section"
                isDisabled={isAddClassLoading || !subject || sectionOptions.length === 0}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Class Type:
              </label>
              <ReactSelect
                instanceId={typeId}
                options={[
                  { value: "Theory", label: "Theory" },
                  { value: "Lab", label: "Lab" },
                ]}
                value={{ value: classType, label: classType }}
                onChange={(option) =>
                  setClassType(option ? (option.value as "Theory" | "Lab") : "Theory")
                }
                placeholder="Select Class Type"
                isDisabled={isAddClassLoading}
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
