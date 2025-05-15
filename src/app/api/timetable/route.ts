// src/app/api/timetable/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// This tells Next.js to always run this route dynamically
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "src", "data", "timetableData.json");

export async function GET() {
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error reading timetableData.json:", err);
    return NextResponse.json(
      { error: "Could not load data." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf8");
    // console.log("✅ timetableData.json saved:", body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error writing timetableData.json:", err);
    return NextResponse.json(
      { error: "Could not save data." },
      { status: 500 }
    );
  }
}
