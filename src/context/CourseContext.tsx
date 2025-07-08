"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Course } from "@/lib/serverData/CourseDataFetcher";

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

  return (
    <CourseContext.Provider value={{ courses, setCourses }}>
      {children}
    </CourseContext.Provider>
  );
};
