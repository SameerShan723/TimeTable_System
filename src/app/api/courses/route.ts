import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function GET() {
  const { data, error } = await supabase.from("courses").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// export async function DELETE(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const id = searchParams.get("id");

//   if (!id) {
//     return NextResponse.json({ message: "Missing course ID" }, { status: 400 });
//   }

//   const { error } = await supabase.from("courses").delete().eq("id", id);

//   if (error) {
//     return NextResponse.json({ message: error.message }, { status: 500 });
//   }

//   return NextResponse.json(
//     { message: "Course deleted successfully" },
//     { status: 200 }
//   );
// }
