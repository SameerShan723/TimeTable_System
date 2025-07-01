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
import { toast } from "sonner";
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
        <AlertDialogOverlay
          className="bg-[#042957]"
          style={{ backdropFilter: "blur(2px)" }}
        />
        <AlertDialogContent className="bg-[#042957] text-[#9ea8b5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#9EA8F5]">
              Add New Class
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#9ea8b5] text-sm">
              Select the subject, teacher, and section for the new class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[#9ea8b5] text-sm">Subject:</label>
              <Select
                instanceId={subjectId}
                options={subjectOptions}
                value={subject ? { value: subject, label: subject } : null}
                onChange={(option) => setSubject(option ? option.value : null)}
                placeholder="Select Subject"
                className="text-black"
                isDisabled={isAddClassLoading}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    fontSize: "0.875rem",
                    minHeight: "32px",
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 50,
                  }),
                }}
              />
            </div>
            <div>
              <label className="text-[#9ea8b5] text-sm">Teacher:</label>
              <Select
                instanceId={teacherId}
                options={teacherOptions}
                value={teacher ? { value: teacher, label: teacher } : null}
                onChange={(option) => setTeacher(option ? option.value : null)}
                placeholder="Select Teacher"
                className="text-black"
                isDisabled={isAddClassLoading}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    fontSize: "0.875rem",
                    minHeight: "32px",
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 50,
                  }),
                }}
              />
            </div>
            <div>
              <label className="text-[#9ea8b5] text-sm">Section:</label>
              <Select
                instanceId={sectionId}
                options={sectionOptions}
                value={section ? { value: section, label: section } : null}
                onChange={(option) => setSection(option ? option.value : null)}
                placeholder="Select Section"
                className="text-black"
                isDisabled={isAddClassLoading}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    fontSize: "0.875rem",
                    minHeight: "32px",
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 50,
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
              className="bg-red-800 hover:bg-red-900 text-white text-sm"
              disabled={isAddClassLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="bg-blue-900 hover:bg-blue-800 text-white text-sm flex items-center gap-2"
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
