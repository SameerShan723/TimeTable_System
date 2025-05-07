import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Correct path to match src/data
const dataDir = path.join(process.cwd(), "public", "data");
const filePath = path.join(dataDir, "timetableData.json");

export async function GET() {
  try {
    // Check if the file exists before trying to read it
    await fs.access(filePath);
    const data = await fs.readFile(filePath, "utf8");
    return NextResponse.json(JSON.parse(data), { status: 200 });
  } catch (error) {
    // Narrow the error type to check for Node.js ErrnoException
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.log(
        "File not found, creating new file with default data at:",
        filePath
      );
      await fs.mkdir(dataDir, { recursive: true }); // ensure directory exists
      await fs.writeFile(filePath, JSON.stringify({}, null, 2), "utf8"); // Default empty object
      return NextResponse.json({}, { status: 200 });
    }
    console.error("Error reading timetable data:", error);
    return NextResponse.json(
      { error: "Failed to read timetable data." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Debug info
    console.log("Writing timetable data to:", filePath);

    // Ensure directory exists
    await fs.mkdir(dataDir, { recursive: true });

    // Write the file with formatted JSON
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    // Verify file was written
    const stats = await fs.stat(filePath);
    console.log(`File saved successfully. Size: ${stats.size} bytes`);

    return NextResponse.json(
      { message: "Timetable updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error writing timetable data:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      if ("stack" in error) console.error("Stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to write timetable data." },
      { status: 500 }
    );
  }
}
