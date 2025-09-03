import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase/supabase";
import { z } from "zod";

// Bulk upload validation schema
const bulkCourseSchema = z.array(
  z.object({
    subject_code: z.string().trim().optional().nullable(),
    course_details: z
      .string()
      .trim()
      .min(1, "Course details is required")
      .min(2, "Course details must be at least 2 characters"),
    section: z
      .string()
      .trim()
      .min(1, "Section is required")
      .min(1, "Section must not be empty"),
    semester: z
      .number()
      .int("Semester must be an integer")
      .min(1, "Semester must be at least 1")
      .max(9, "Semester must be at most 9"),
    credit_hour: z
      .number()
      .int("Credit hour must be an integer")
      .min(0, "Credit hour cannot be negative")
      .max(9, "Credit hour must be at most 9")
      .optional()
      .nullable(),
    faculty_assigned: z
      .string()
      .trim()
      .min(1, "Faculty assigned is required")
      .min(2, "Faculty name must be at least 2 characters"),
    is_regular_teacher: z.boolean({
      required_error: "Teacher type is required",
      invalid_type_error: "Teacher type must be a boolean",
    }),
    domain: z.string().trim().optional().nullable(),
    subject_type: z.string().trim().optional().nullable(),
    semester_details: z.string().trim().optional().nullable(),
    theory_classes_week: z
      .number()
      .int("Theory classes must be an integer")
      .min(1, "Theory classes per week must be at least 1"),
    lab_classes_week: z
      .number()
      .int("Lab classes must be an integer")
      .min(0, "Lab classes cannot be negative")
      .default(0),
  })
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = bulkCourseSchema.parse(body);

    // Insert into Supabase
    const { data, error } = await supabaseClient
      .from("courses")
      .insert(validatedData)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: `${validatedData.length} courses created successfully`,
        data,
        createdCount: data?.length || 0,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid data",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Bulk course creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
