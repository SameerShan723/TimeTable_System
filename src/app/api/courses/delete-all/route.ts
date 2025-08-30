import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("courses")
      .delete()
      .not("course_details", "is", null);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "All courses deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting all courses:", error);
    return NextResponse.json(
      { message: "Server error while deleting all courses" },
      { status: 500 }
    );
  }
}


