"use client";
import { useFormik } from "formik";
import { timetableSchema } from "@/lib/validation/formValidationSchema";
import React, { useState } from "react";
import FileUploader from "@/Components/FileUploder/page";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useDispatch } from "react-redux";
import { setData } from "@/state/dataSlice/data_slice";
import { useRouter } from "next/navigation";

export interface FormValues {
  maxClasses: string;
  classBreakTime: string;
  preferMorningClass: boolean;
  teacherData: Record<string, string>[];
  rulesData: Record<string, string>[];
}

export default function Home() {
  const [teacherFileName, setTeacherFileName] = useState<string | null>("");
  const [rulesFileName, setRulesFileName] = useState<string | null>("");
  const dispatch = useDispatch();
  const router = useRouter();

  const generateDynamicPrompt = (data: FormValues): string => {
    let prompt = `You are an AI assistant responsible for generating a university-level timetable using the provided teacher and room data. The timetable must follow these strict rules and return structured JSON data.\n\n`;

    // Constraints
    prompt += `Constraints:\n`;
    prompt += `- Each class duration: 1 hour.\n`;
    prompt += `- Minimum break between two classes in the same room: ${data.classBreakTime} minutes.\n`;
    prompt += `- University working hours: 9:30 AM to 4:30 PM (7 one-hour slots).\n`;
    prompt += `- Prefer morning classes: ${
      data.preferMorningClass ? "Yes" : "No"
    }.\n`;
    prompt += `- Distribute classes evenly across weekdays. Do not overload Monday.\n`;
    prompt += `- No room or teacher should have overlapping classes.\n`;
    prompt += `- All rooms listed below must be utilized **every weekday (Monday to Friday)**.\n`;
    prompt += `- Every room must have classes scheduled in **at least 4 different time slots daily** (out of 7).\n`;
    prompt += `- Every subject must be scheduled at least once **every day** to ensure regular class flow.\n`;
    prompt += `- Distribute all classes **evenly across Monday to Friday**. Avoid clustering classes only on Monday.\n`;

    // Credit Hours Constraint
    prompt += `- Class frequency based on credit hours:\n`;
    data.teacherData.forEach((teacher) => {
      const faculty = teacher["Faculty Assigned"];
      const subject = teacher["Course Details"];
      const creditHours = parseInt(teacher["Credit Hours"]);
      if (!isNaN(creditHours)) {
        prompt += `  - ${faculty} (${subject}) must have ${creditHours} class${
          creditHours > 1 ? "es" : ""
        } per week.\n`;
      }
    });

    // Teacher Data
    prompt += `Teacher List:\n`;
    data.teacherData.forEach((teacher, index) => {
      prompt += `${index + 1}. Faculty: ${
        teacher["Faculty Assigned"]
      }, Subject: ${teacher["Course Details"]}, Subject Code: ${
        teacher["Subject Code"]
      }, Subject TYPE: ${teacher["Subject TYPE"]}, Sem: ${
        teacher["Sem"]
      }, Section: ${teacher["section"]}, Semester Details: ${
        teacher["Semester Details"]
      }, Credit Hours: ${teacher["Credit Hours"]}, Domain: ${
        teacher["Domain"]
      }, Pre-Req: ${teacher["Pre-Req"]}\n`;
    });

    // Room Data
    const rooms = Array.from(
      new Set(data.rulesData.map((rule) => rule["Key"]))
    ).filter((room) => room && typeof room === "string");

    if (rooms.length === 0) {
      prompt += `No rooms available.\n`;
    } else {
      prompt += `\nAvailable Rooms:\n`;
      rooms.forEach((room, index) => {
        prompt += `${index + 1}. Room: ${room}\n`;
      });
    }

    // Format Instruction
    prompt += `\n---\n`;
    prompt += `Generate only a valid JSON object in the following format. Do not include markdown, code blocks, or any text outside the object.\n\n`;

    prompt += `{\n`;

    // AI should generate a weekly schedule for all rooms, ensuring each room is used every day.
    prompt += `  "Monday": [\n`;
    rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room}": [ /* class objects */ ]${
        index < rooms.length - 1 ? "," : ""
      }\n`;
      prompt += `    }\n`;
    });
    prompt += `  ],\n`;

    prompt += `  "Tuesday": [\n`;
    rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room}": [ /* class objects */ ]${
        index < rooms.length - 1 ? "," : ""
      }\n`;
      prompt += `    }\n`;
    });
    prompt += `  ],\n`;

    prompt += `  "Wednesday": [\n`;
    rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room}": [ /* class objects */ ]${
        index < rooms.length - 1 ? "," : ""
      }\n`;
      prompt += `    }\n`;
    });
    prompt += `  ],\n`;

    prompt += `  "Thursday": [\n`;
    rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room}": [ /* class objects */ ]${
        index < rooms.length - 1 ? "," : ""
      }\n`;
      prompt += `    }\n`;
    });
    prompt += `  ],\n`;

    prompt += `  "Friday": [\n`;
    rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room}": [ /* class objects */ ]${
        index < rooms.length - 1 ? "," : ""
      }\n`;
      prompt += `    }\n`;
    });
    prompt += `  ]\n`;
    prompt += `}\n\n`;

    // Notes
    prompt += `Notes:\n`;
    prompt += `- Each day's array contains a single object.\n`;
    prompt += `- Each key in the object is a room name, and its value is a list of class objects.\n`;
    prompt += `- Each class object must include: Room, Time, Faculty Assigned, Course Details, Subject Code, Subject TYPE, Domain, Pre-Req, Sem, Section, Semester Details.\n`;
    prompt += `- Time slots must be non-overlapping per room.\n`;
    prompt += `- Use every room every day.\n`;
    prompt += `- Ensure all subjects have at least one class each day.\n`;
    prompt += `- Return only valid raw JSON. No extra text or formatting.\n`;
    prompt += `- Do not leave any weekday (e.g. Friday) empty. Every weekday must have a full schedule.\n`;

    return prompt;
  };

  const formik = useFormik<FormValues>({
    initialValues: {
      maxClasses: "",
      classBreakTime: "",
      preferMorningClass: false,
      teacherData: [],
      rulesData: [],
    },
    validationSchema: timetableSchema,
    onSubmit: async (values, { resetForm }) => {
      const prompt = generateDynamicPrompt(values);

      const genAI = new GoogleGenerativeAI(
        "AIzaSyAivK1xtsLV9P5QQEezUk8RrDG_CQZcWv4"
      );
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;

      const rawData = await response.text();
      console.log(rawData, "raw data");
      // dispatch(setData(rawData));

      const jsonData = rawData.replace(/```json|```/g, "").trim();

      try {
        const parsedData = JSON.parse(jsonData);
        dispatch(setData(parsedData.timetable));
        console.log("Parsed Timetable Data:", parsedData);
      } catch (e) {
        console.error("Error parsing JSON:", e);
      }

      resetForm();
      setTeacherFileName(null);
      setRulesFileName(null);
      router.push("/timetable");
    },
  });

  return (
    <main className="h-screen flex justify-center items-center">
      <div className="flex justify-center items-center border-2 rounded-2xl p-20 shadow-2xl border-gray-400">
        <div>
          <h1 className="font-semibold text-3xl mb-4">
            Upload Teacher &<br /> Subject Assignment
          </h1>

          <form onSubmit={formik.handleSubmit}>
            <FileUploader
              label="Upload Teacher CSV"
              placeholder="Select Teachers CSV File"
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
              label="Upload Rules CSV File"
              placeholder="Select Rules CSV File"
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

            <p className="font-medium text-xl mb-2">Or manually enter rules</p>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-[19px]">Max classes per day:</p>
                <input
                  type="text"
                  name="maxClasses"
                  value={formik.values.maxClasses}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="border-2 border-gray-400 w-20 rounded-lg focus:ring-0 outline-none"
                />
              </div>
              {formik.touched.maxClasses && formik.errors.maxClasses && (
                <p className="text-red-500 text-sm">
                  {formik.errors.maxClasses}
                </p>
              )}

              <div className="flex items-center gap-2">
                <p className="text-[19px]">Classes break time:</p>
                <input
                  type="text"
                  name="classBreakTime"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.classBreakTime}
                  className="border-2 border-gray-400 w-20 rounded-lg focus:ring-0 outline-none ml-2"
                />
              </div>
              {formik.touched.classBreakTime &&
                formik.errors.classBreakTime && (
                  <p className="text-red-500 text-sm">
                    {formik.errors.classBreakTime}
                  </p>
                )}

              <div className="flex gap-3 items-center">
                <p className="text-[19px]">Prefer morning classes:</p>
                <input
                  type="checkbox"
                  name="preferMorningClass"
                  checked={formik.values.preferMorningClass}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="h-5 w-5 accent-black rounded-full"
                />
              </div>
              <button
                type="submit"
                className="bg-black text-white rounded-full p-3 mt-4"
              >
                Generate TimeTable
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
