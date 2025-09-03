// src/app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server"; // Updated import



export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: "Course ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();


    const updateData = {
      ...body,
    };

    console.log(updateData,"updated data")

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
    const supabase = createSupabaseServerClient(); // Create server client
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
