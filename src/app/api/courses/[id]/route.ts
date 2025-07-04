import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/supabase";

// Define validation schema for course updates
const courseSchema = z.object({
  subject_code: z.string().min(1, "Subject Code is required"),
  course_details: z.string().optional(),
  semester: z.string().optional(),
  credit_hour: z.string().optional(),
  faculty_assigned: z.string().optional(),
  section: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      return NextResponse.json(
        { message: "Invalid course data", errors: parsedData.error.format() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("courses")
      .update(parsedData.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Supabase error code for no rows returned
        return NextResponse.json(
          { message: "Course not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Course not found" },
        { status: 404 }
      );
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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        // Supabase error code for no rows returned
        return NextResponse.json(
          { message: "Course not found" },
          { status: 404 }
        );
      }
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
