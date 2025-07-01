import { CourseProvider } from "@/context/CourseContext";
import { supabase } from "../supabase/supabase";
export type Course = {
  id: number;
  subject_code: string | null;
  course_details: string | null;
  semester: number | null;
  credit_hour: number | null;
  faculty_assigned: string | null;
  section: string | null;
};

export default async function CourseDataFetcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, subject_code, course_details, semester, credit_hour, faculty_assigned, section"
    );

  if (error) {
    // Log error on server; client will handle toast via context
    console.error("Failed to fetch courses:", error.message);
    return <CourseProvider initialCourses={[]}>{children}</CourseProvider>;
  }

  return (
    <CourseProvider initialCourses={data || []}>{children}</CourseProvider>
  );
}
