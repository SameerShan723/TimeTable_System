"use client";
import { useFormik } from "formik";
import { timetableSchema } from "@/lib/validation/formValidationSchema";
import React, { useState } from "react";
import FileUploader from "@/components/fileuploader/page";
import { Days } from "@/helpers/page";
// import { useDispatch } from "react-redux";
// import { setData } from "@/state/dataSlice/data_slice";
// import { useRouter } from "next/navigation";

export interface FormValues {
  preferMorningClass: boolean;
  teacherData: Record<string, string>[];
  rulesData: Record<string, string>[];
}

export default function GenerateTimeTable() {
  const [teacherFileName, setTeacherFileName] = useState<string | null>(null);
  const [rulesFileName, setRulesFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // const dispatch = useDispatch();
  // const router = useRouter();
  // const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  // console.log(apiKey, "api key");

  // Debug Formik state changes

  const generateDynamicPrompt = (data: FormValues): string => {
    let prompt = `You are an AI assistant tasked with generating a university-level class timetable in strict JSON format. Follow every rule below carefully. Your response must ONLY be valid JSON.\n\n`;

    prompt += `Constraints:\n`;
    prompt += `- Each class is 1 hour long.\n`;
    prompt += `- University hours: 9:30 AM – 4:30 PM (7 time slots).\n`;
    prompt += `- No teacher can be scheduled for more than one class at the same time across all rooms.\n`;
    prompt += `- A subject cannot be scheduled more than once at the same time across rooms.\n`;
    prompt += `- Prefer morning classes: ${
      data.preferMorningClass ? "Yes" : "No"
    }.\n`;
    prompt += `- Even distribution of classes across weekdays. Avoid Monday overload.\n`;
    prompt += `- Use all rooms every weekday (Mon–Fri).\n`;
    prompt += `- Weekly class frequency based on credit hours:\n`;

    data.teacherData.forEach((teacher) => {
      const faculty = teacher["Faculty Assigned"];
      const subject = teacher["Course Details"];
      const creditHours = parseInt(teacher["Credit Hours"]);
      if (!isNaN(creditHours)) {
        prompt += `  - ${faculty} (${subject}) must teach ${creditHours} time${
          creditHours > 1 ? "s" : ""
        } per week.\n`;
      }
    });

    prompt += `\nCredit Hour Distribution Rules:\n`;
    prompt += `- Each subject's total weekly classes must match its credit hours.\n`;
    prompt += `- For example, a subject with 3 credit hours must be scheduled exactly 3 times across the week (Mon–Fri).\n`;
    prompt += `- These classes must be distributed across different days.\n`;
    prompt += `- Avoid scheduling all 3 on Monday to Wednesday. Prefer spreading classes evenly from Monday to Friday.\n`;
    prompt += `- If a subject has 3 or more classes per week, do not place all of them on consecutive days.\n`;

    prompt += `\nFree Slot Distribution Rules:\n`;
    prompt += `- Distribute free/empty time slots evenly throughout the day for each room.\n`;
    prompt += `- Avoid placing all free slots consecutively at the end of the day.\n`;
    prompt += `- Free slots should appear as gaps between classes where possible.\n`;
    prompt += `- Spread free slots evenly across all weekdays.\n`;

    prompt += `\nTeachers:\n`;
    data.teacherData.forEach((teacher, index) => {
      prompt += `${index + 1}. Faculty: ${
        teacher["Faculty Assigned"]
      }, Subject: ${teacher["Course Details"]}, Section: ${
        teacher["section"]
      }, Credit Hours: ${teacher["Credit Hours"]}\n`;
    });

    const rooms = Array.from(
      new Set(data.rulesData.map((rule) => rule["Key"]))
    ).filter((room) => room && typeof room === "string");

    prompt += `\nAvailable Rooms:\n`;
    rooms.forEach((room, index) => {
      prompt += `${index + 1}. ${room}\n`;
    });

    prompt += `\n---\n`;
    prompt += `Output Format (strict):\n`;
    prompt += `Return JSON like this. DO NOT include code blocks or markdown. Only valid raw JSON:\n\n`;
    prompt += `{\n`;
    prompt += `  "Monday": [\n`;
    rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room}": [\n`;
      prompt += `        {\n`;
      prompt += `          "Room": "${room}",\n`;
      prompt += `          "Time": "9:30-10:30",\n`;
      prompt += `          "Teacher": "Teacher Name",\n`;
      prompt += `          "Subject": "Subject Name",\n`;
      prompt += `          "Section": "Class Section"\n`;
      prompt += `        }\n`;
      prompt += `        // ... more class objects, total 7 per room\n`;
      prompt += `      ]\n`;
      prompt += `    }${index < rooms.length - 1 ? "," : ""}\n`;
    });
    prompt += `  ],\n  "Tuesday": [/* same format */],\n  "Wednesday": [/* same format */],\n  "Thursday": [/* same format */],\n  "Friday": [/* same format */]\n}`;
    prompt += `\n\nImportant Rules:\n`;
    prompt += `- Do NOT assign the same teacher to multiple classes in the same time slot.\n`;
    prompt += `- Do NOT repeat the same subject in multiple rooms at the same time.\n`;
    prompt += `- If no class is scheduled in a slot, return: { "Time": "X"}\n`;
    prompt += `- Return ONLY the JSON object, with no additional comments, explanations, or markdown.\n`;

    return prompt;
  };

  const formik = useFormik<FormValues>({
    initialValues: {
      preferMorningClass: false,
      teacherData: [],
      rulesData: [],
    },
    validationSchema: timetableSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      setError("");
      try {
        const prompt = generateDynamicPrompt(values);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get response reader");
        }

        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
        }

        // Parse the response as JSON
        let parsedTimetable;
        try {
          parsedTimetable = JSON.parse(fullText);
        } catch (parseError) {
          throw new Error(`Failed to parse response as JSON: ${parseError}`);
        }

        const missingDays = Days.filter((day) => !parsedTimetable[day]);
        if (missingDays.length > 0) {
          throw new Error(
            `Incomplete timetable: missing days - ${missingDays.join(", ")}`
          );
        }

        console.log("Full Timetable:", parsedTimetable);
        // setTimetable(parsedTimetable);

        // Reset form only after successful submission
        resetForm();
        setTeacherFileName(null);
        setRulesFileName(null);
      } catch (err) {
        console.error("Error:", err);
        setError(
          "Failed to generate timetable. Please check your files and try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <main className="flex h-[calc(100vh-4rem)] justify-center overflow-hidden">
      <div className="flex justify-center  rounded-2xl border-[#416697]">
        <div className=" lg:w-[500px] md:max-w-[500px]  px-6">
          <h1 className="font-bold text-4xl mb-4 text-[#194c87] pt-8">
            Upload Teacher &<br /> Subject Assignment
          </h1>
          {error && (
            <p className="text-red-500 mb-4 break-words whitespace-normal">
              {error}
            </p>
          )}

          <form onSubmit={formik.handleSubmit}>
            <FileUploader
              label="Upload Teacher File"
              placeholder="Select Teachers CSV/XLSX File"
              onParse={(data) => {
                formik.setFieldValue("teacherData", data);
              }}
              labelName={teacherFileName}
              setFileName={setTeacherFileName}
            />
            {formik.touched.teacherData && formik.errors.teacherData && (
              <p className="text-red-500 text-sm mb-2">
                {Array.isArray(formik.errors.teacherData)
                  ? formik.errors.teacherData.join(", ")
                  : formik.errors.teacherData}
              </p>
            )}

            <FileUploader
              label="Upload Rules File"
              placeholder="Select Rules CSV/XLSX File"
              onParse={(data) => {
                formik.setFieldValue("rulesData", data);
              }}
              labelName={rulesFileName}
              setFileName={setRulesFileName}
            />
            {formik.touched.rulesData && formik.errors.rulesData && (
              <p className="text-red-500 text-sm mb-2">
                {Array.isArray(formik.errors.rulesData)
                  ? formik.errors.rulesData.join(", ")
                  : formik.errors.rulesData}
              </p>
            )}

            <p className="font-medium text-xl px-3 mb-2 text-[#416697]">
              Or manually enter rules
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex gap-9 items-center w-full px-3">
                <p className="text-[22px] text-[#416697]">
                  Prefer morning classes:
                </p>
                <input
                  type="checkbox"
                  name="preferMorningClass"
                  checked={formik.values.preferMorningClass}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="h-5 w-5 accent-[#416697] rounded-full"
                />
              </div>
              <button
                type="submit"
                className={`bg-[#194c87] text-white p-3 mt-4 ${
                  isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#060d16]"
                } rounded-md`}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate TimeTable"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
