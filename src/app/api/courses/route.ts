import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("id", { ascending: true }); // 👈 Sort by id

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
