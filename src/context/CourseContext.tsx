"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Course } from "@/lib/serverData/CourseDataFetcher";
import { useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/supabase";

// Define the shape of the context
interface CourseContextType {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

// Create the context
const CourseContext = createContext<CourseContextType | undefined>(undefined);

// Custom hook to use the context
export const useCourses = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourses must be used within a CourseProvider");
  }
  return context;
};

// Context Provider component
export const CourseProvider: React.FC<{
  children: ReactNode;
  initialCourses: Course[];
}> = ({ children, initialCourses }) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);

  // Realtime sync with Supabase courses table so timetable reflects updated faculty
  useEffect(() => {
    const channel = supabaseClient
      .channel("courses_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "courses" },
        (payload) => {
          const newCourse = payload.new as Course;
          setCourses((prev) => {
            const exists = prev.some((c) => String(c.id) === String(newCourse.id));
            return exists ? prev : [...prev, newCourse];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "courses" },
        (payload) => {
          const updated = payload.new as Course;
          setCourses((prev) =>
            prev.map((c) => (String(c.id) === String(updated.id) ? { ...c, ...updated } : c))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "courses" },
        (payload) => {
          const removed = payload.old as { id: string | number };
          setCourses((prev) => prev.filter((c) => String(c.id) !== String(removed.id)));
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  return (
    <CourseContext.Provider value={{ courses, setCourses }}>
      {children}
    </CourseContext.Provider>
  );
};
