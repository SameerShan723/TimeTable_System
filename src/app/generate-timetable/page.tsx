"use client";
import React, { useState, useEffect, useRef } from "react";
import { Days } from "@/helpers/page";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormValues,
  timetableSchema,
} from "@/lib/generate-timetable-schema/page";
import { useCourses } from "@/context/CourseContext";
import { Rooms } from "@/helpers/page";

// Default rules that will be included directly in the prompt
const defaultRules = [
  "Each class is 1 hour long",
  "University hours: 9:30 AM – 4:30 PM (7 time slots)",
  "No teacher can be scheduled for more than one class at the same time across all rooms",
  "A subject cannot be scheduled more than once at the same time across rooms",
  "Even distribution of classes across weekdays. Avoid Monday overload",
  "Use all rooms every weekday (Mon–Fri)",
  "Weekly class frequency based on credit hours",
  "Each subject's total weekly classes must match its credit hours",
  "For example, a subject with 3 credit hours must be scheduled exactly 3 times across the week (Mon–Fri)",
  "These classes must be distributed across different days",
  "Avoid scheduling all 3 on Monday to Wednesday. Prefer spreading classes evenly from Monday to Friday",
  "If a subject has 3 or more classes per week, do not place all of them on consecutive days",
  "Distribute free/empty time slots evenly throughout the day for each room",
  "Avoid placing all free slots consecutively at the end of the day",
  "Free slots should appear as gaps between classes where possible",
  "Spread free slots evenly across all weekdays",
  "Do NOT assign the same teacher to multiple classes in the same time slot",
  "Do NOT repeat the same subject in multiple rooms at the same time",
  "If no class is scheduled in a slot, return: { \"Time\": \"X\"}",
];

// Custom rules that will be available in the autocomplete (1-3 rules)
const customRules = [
  "Prefer morning classes for Computer Science subjects",
  "Lab classes should only be scheduled in Lab rooms",
  "No classes on Friday afternoons",
];

// Custom Multi-Select Component
const RulesAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Enter or select rules...",
  className = ""
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [savedRules, setSavedRules] = useState<string[]>(customRules);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter rules based on input
  const filteredRules = savedRules.filter(rule =>
    rule.toLowerCase().includes(inputValue.toLowerCase()) &&
    !value.includes(rule)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value,"changes");
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelectRule = (rule: string) => {
    if (!value.includes(rule)) {
      onChange([...value, rule]);
    }
    setInputValue("");
    setIsOpen(false);
  };

  const handleAddCustomRule = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      const newRule = inputValue.trim();
      onChange([...value, newRule]);
      
      // Add to saved rules if it's a new rule
      if (!savedRules.includes(newRule)) {
        const updatedRules = [...savedRules, newRule];
        setSavedRules(updatedRules);
      }
      
      setInputValue("");
      setIsOpen(false);
    }
  };

  const handleRemoveRule = (ruleToRemove: string) => {
    onChange(value.filter(rule => rule !== ruleToRemove));
    // Also remove from saved rules
    setSavedRules(savedRules.filter(rule => rule !== ruleToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomRule();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last item on backspace when input is empty
      handleRemoveRule(value[value.length - 1]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 min-h-[50px] px-4 py-3 border-2 border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:border-gray-400">
          {/* Selected items as tags inside the input */}
          {value.map((rule, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium border border-blue-200 hover:bg-blue-200 transition-colors duration-200"
            >
              {rule}
              <button
                type="button"
                onClick={() => handleRemoveRule(rule)}
                className="ml-1 text-[#042954] hover:brightness-110 text-xs font-bold hover:scale-110 transition-transform duration-200"
              >
                ×
              </button>
            </span>
          ))}
          
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={value.length === 0 ? placeholder : "Type to add more rules..."}
            className="flex-1 min-w-[150px] outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
          
          {/* Dropdown arrow */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Dropdown menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
          >
            {inputValue && (
              <div
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition-colors duration-200"
                onClick={handleAddCustomRule}
              >
                <span className="text-gray-600 text-sm">Add: </span>
                <span className="font-medium text-blue-700">{inputValue}</span>
              </div>
            )}
            
            {filteredRules.map((rule, index) => (
              <div
                key={index}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-200 text-gray-700"
                onClick={() => handleSelectRule(rule)}
              >
                {rule}
              </div>
            ))}
            
            {filteredRules.length === 0 && !inputValue && (
              <div className="px-4 py-3 text-gray-500 text-center">
                No matching rules found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// export interface FormValues {
//   preferMorningClass: boolean;
//   teacherData: [Record<string, string>, ...Record<string, string>[]]; // Updated to match Zod's non-empty array
//   rulesData: [Record<string, string>, ...Record<string, string>[]]; // Updated to match Zod's non-empty array
// }

// export const timetableSchema = z.object({
//   teacherData: z
//     .array(z.record(z.string()))
//     .min(1, "Teacher data is required")
//     .nonempty("Teacher data is required"),
//   rulesData: z
//     .array(z.record(z.string()))
//     .min(1, "Rules data is required")
//     .nonempty("Rules data is required"),
//   preferMorningClass: z.boolean(),
// });

export default function GenerateTimeTable() {
  const { courses } = useCourses();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomRules, setSelectedCustomRules] = useState<string[]>(customRules);
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      preferMorningClass: false,
    },
  });


  const generateDynamicPrompt = (data: FormValues): string => {
    let prompt = `You are an AI assistant tasked with generating a university-level class timetable in strict JSON format. Follow every rule below carefully. Your response must ONLY be valid JSON.\n\n`;

    prompt += `Default Rules:\n`;
    // Include all default rules directly in the prompt
    defaultRules.forEach((rule, index) => {
      prompt += `${index + 1}. ${rule}\n`;
    });

    prompt += `\nPrefer morning classes: ${
      data.preferMorningClass ? "Yes" : "No"
    }.\n`;

    prompt += `\nWeekly class frequency based on credit hours:\n`;

    // Use courses from context instead of uploaded data
    courses.forEach((course) => {
      const faculty = course.faculty_assigned;
      const subject = course.course_details;
      const creditHours = course.credit_hour;
      if (faculty && subject && creditHours) {
        prompt += `  - ${faculty} (${subject}) must teach ${creditHours} time${
          creditHours > 1 ? "s" : ""
        } per week.\n`;
      }
    });

    // Add custom rules to the prompt
    if (data.selectedCustomRules && data.selectedCustomRules.length > 0) {
      prompt += `\nCustom Rules:\n`;
      data.selectedCustomRules.forEach((rule, index) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }

    prompt += `\nTeachers:\n`;
    courses.forEach((course, index) => {
      prompt += `${index + 1}. Faculty: ${
        course.faculty_assigned || "N/A"
      }, Subject: ${course.course_details || "N/A"}, Section: ${
        course.section || "N/A"
      }, Credit Hours: ${course.credit_hour || "N/A"}\n`;
    });

  

    prompt += `\nAvailable Rooms:\n`;
    Rooms.forEach((room, index) => {
      prompt += `${index + 1}. ${room}\n`;
    });

    prompt += `\n---\n`;
    prompt += `Output Format (strict):\n`;
    prompt += `Return JSON like this. DO NOT include code blocks or markdown. Only valid raw JSON:\n\n`;
    prompt += `{\n`;
    prompt += `  "Monday": [\n`;
    Rooms.forEach((room, index) => {
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
      prompt += `    }${index < Rooms.length - 1 ? "," : ""}\n`;
    });
    prompt += `  ],\n  "Tuesday": [/* same format */],\n  "Wednesday": [/* same format */],\n  "Thursday": [/* same format */],\n  "Friday": [/* same format */]\n}`;
    prompt += `\n\nImportant Rules:\n`;
    prompt += `- Do NOT assign the same teacher to multiple classes in the same time slot.\n`;
    prompt += `- Do NOT repeat the same subject in multiple rooms at the same time.\n`;
    prompt += `- If no class is scheduled in a slot, return: { "Time": "X"}\n`;
    prompt += `- Return ONLY the JSON object, with no additional comments, explanations, or markdown.\n`;

    return prompt;
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (courses.length === 0) {
      setError("Please add some courses first before generating timetable.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      // Create a complete data object that includes both form values and custom rules
      const completeData = {
        ...values,
        selectedCustomRules,
      };
      const prompt = generateDynamicPrompt(completeData);
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

      // setTimetable(parsedTimetable);

      // Reset form only after successful submission
      reset();
      // Don't reset custom rules - keep them for next use
    } catch (err) {
      console.error("Error:", err);
      setError(
        "Failed to generate timetable. Please check your courses and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-[calc(100vh-4rem)] justify-center overflow-y-auto mb-10">
      <div className="flex justify-center rounded-2xl border-[#416697]">
        <div className="lg:w-[800px] md:max-w-[800px] px-6">
          <h1 className="font-bold text-4xl mb-4 text-[#194c87] pt-8">
            Generate Timetable from Courses
          </h1>
          {error && (
            <p className="text-red-500 mb-4 break-words whitespace-normal">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {courses.length === 0 ? (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  No courses found. Please add some courses in the Courses page first.
                </p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  Found {courses.length} course{courses.length > 1 ? 's' : ''} from the database.
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Timetable Rules (Optional)
              </label>
              <RulesAutocomplete
                value={selectedCustomRules}
                onChange={setSelectedCustomRules}
                placeholder="Type to add custom rules or select from existing ones..."
                className="w-full"
              />
        
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-9 items-center w-full px-3">
                <p className="text-[22px] text-[#416697]">
                  Prefer morning classes:
                </p>
                <input
                  type="checkbox"
                  {...register("preferMorningClass")}
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
