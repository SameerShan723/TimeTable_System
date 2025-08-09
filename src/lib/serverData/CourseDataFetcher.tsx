import { CourseProvider } from "@/context/CourseContext";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Course = {
  id: string;
  subject_code: string | null;
  course_details: string | null;
  semester: number | null;
  credit_hour: number | null;
  faculty_assigned: string | null;
  section: string | null;
  domain: string | null;
  subject_type: string | null;
  semester_details: string | null;
  is_regular_teacher: boolean;
  theory_classes_week: number | null;
  lab_classes_week: number | null;
};

export default async function CourseDataFetcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("courses").select("*");

  if (error) {
    console.error("Failed to fetch courses:", error.message);
    return <CourseProvider initialCourses={[]}>{children}</CourseProvider>;
  }

  return (
    <CourseProvider initialCourses={data || []}>{children}</CourseProvider>
  );
}
