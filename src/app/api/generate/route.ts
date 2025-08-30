/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Days, Rooms } from "@/helpers/page";
import courses from "@/data/courses.json"; // adjust import if path differs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// helper: build course summary from courses.json
function buildCourseSummary() {
  return courses.map((course) => ({
    faculty: course.faculty_assigned,
    subject: course.course_details,
    section: course.section,
    theory: course.theory_classes_week,
    labs: course.lab_classes_week,
    credit: course.credit_hour,
  }));
}

// helper: schema we want to enforce
function buildJsonSchema() {
  return {
    type: "object",
    properties: Days.reduce((acc: any, day: string) => {
      acc[day] = {
        type: "array",
        items: {
          type: "object",
          properties: {
            Room: { type: "string" },
            Schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  Time: { type: "string" },
                  Teacher: { type: "string" },
                  Subject: { type: "string" },
                  Section: { type: "string" },
                  Type: { type: "string", enum: ["Theory", "Lab"] },
                },
                required: ["Time", "Teacher", "Subject", "Section", "Type"],
              },
            },
          },
          required: ["Room", "Schedule"],
        },
      };
      return acc;
    }, {}),
    required: Days,
  };
}

export async function POST(req: Request) {
  try {
    const { 
      prompt, 
      customRules, 
      maxClassesPerTeacherPerDay, 
      maxClassesPerSectionPerDay,
      rooms 
    } = await req.json();

    // If a custom prompt is provided, use it directly
    if (prompt) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const timetable = JSON.parse(response.choices[0].message?.content || "{}");
      return NextResponse.json(timetable);
    }

    // Otherwise, use the enhanced generation logic
    const summary = buildCourseSummary();

    const timetable: Record<string, any> = {};

    for (const day of Days) {
      const dayPrompt = `
You are an AI assistant tasked with generating a university class timetable for **${day} only**.

Scheduling Constraints:
- Maximum classes per teacher per day: ${maxClassesPerTeacherPerDay || 4}
- Maximum classes per section per day: ${maxClassesPerSectionPerDay || 6}

Rules:
- Each subject's total weekly classes must equal theory_classes_week + lab_classes_week.
- Labs must only be scheduled in Lab rooms.
- No teacher can appear in two rooms at the same time.
- No subject can appear in two rooms at the same time.
- Distribute classes evenly across days (avoid overloading).
- University hours: 9:30 AM – 4:30 PM (7 slots).
- Respect the maximum classes per teacher and section per day limits.

Extra preferences:
- Custom Rules: ${customRules?.join(", ") || "None"}.

Courses:
${JSON.stringify(summary, null, 2)}

Rooms:
${JSON.stringify(rooms || Rooms)}

Return strictly in JSON. 
Follow this schema: ${JSON.stringify(buildJsonSchema())}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: dayPrompt }],
        response_format: { type: "json_object" }, // ensures valid JSON
        temperature: 0.3,
      });

      const jsonDay = JSON.parse(response.choices[0].message?.content || "{}");

      timetable[day] = jsonDay[day];
    }

    return NextResponse.json(timetable);
  } catch (err: any) {
    console.error("Timetable generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate timetable" },
      { status: 500 }
    );
  }
}
