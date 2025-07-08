import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/supabase";

// Validation schema
const courseSchema = z.object({
  subject_code: z.string().trim().nullable().optional(),
  course_details: z
    .string()
    .trim()
    .nonempty({ message: "Course Detail is required" })
    .min(5, { message: "Course details must be at least 5 characters." }),
  section: z
    .string()
    .trim()
    .nonempty({ message: "Section is required" })
    .min(5, { message: "Section must be at least 5 characters." }),
  semester: z
    .string()
    .trim()
    .nonempty({ message: "Semester is required." })
    .regex(/^[1-9]$/, {
      message: "Semester must be a number from 1 to 9.",
    }),
  credit_hour: z
    .string()
    .trim()
    .nonempty({ message: "Credit hour is required." })
    .regex(/^[1-9]$/, {
      message: "Credit hour must be a number from 1 to 9.",
    }),
  faculty_assigned: z
    .string()
    .trim()
    .nonempty({ message: "Faculty Assigned is required." })
    .min(5, { message: "Faculty name must be at least 5 characters." }),
  is_regular_teacher: z.boolean({
    invalid_type_error: "Teacher type must be a boolean.",
  }),
});

// Define the handler function type
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params; // Resolve the Promise
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Course ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsedData = courseSchema.safeParse(body);

    if (!parsedData.success) {
      console.error("Validation errors:", parsedData.error.format());
      return NextResponse.json(
        { message: "Invalid course data", errors: parsedData.error.format() },
        { status: 400 }
      );
    }

    const updateData = {
      ...parsedData.data,
      subject_code: parsedData.data.subject_code?.trim() || null,
      credit_hour: parseInt(parsedData.data.credit_hour),
      semester: parseInt(parsedData.data.semester),
    };

    const { data, error } = await supabase
      .from("courses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Course not found" },
          { status: 404 }
        );
      }
      console.error("Supabase error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Course updated successfully",
      data,
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { message: "Server error while updating course" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params; // Resolve the Promise
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Course ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("courses")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Course not found" },
          { status: 404 }
        );
      }
      console.error("Supabase error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Course deleted successfully",
      data,
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { message: "Server error while deleting course" },
      { status: 500 }
    );
  }
}
