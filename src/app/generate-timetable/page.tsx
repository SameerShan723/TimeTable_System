"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { useForm, SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormValues,
  timetableSchema,
  Room,
} from "@/lib/generate-timetable-schema/page";
import { useCourses } from "@/context/CourseContext";
import { RegularRooms, LabRooms } from "@/helpers/page";
import { RoomManagement } from "@/components/room-management";
import { FormSection } from "@/components/ui/form-section";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { computeConflicts, computeStats } from "@/lib/scheduler/analyze";
import { Days, timeSlots } from "@/helpers/page";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTimetableVersion } from "@/context/TimetableContext";


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
  'If no class is scheduled in a slot, return: { "Time": "X"}',
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
  className = "",
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
  const filteredRules = savedRules.filter(
    (rule) =>
      rule.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(rule)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value, "changes");
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
    onChange(value.filter((rule) => rule !== ruleToRemove));
    // Also remove from saved rules
    setSavedRules(savedRules.filter((rule) => rule !== ruleToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomRule();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      // Remove last item on backspace when input is empty
      handleRemoveRule(value[value.length - 1]);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
            placeholder={
              value.length === 0 ? placeholder : "Type to add more rules..."
            }
            className="flex-1 min-w-[150px] outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />

          {/* Dropdown arrow */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
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



export default function GenerateTimeTable() {
  const { courses } = useCourses();
  const router = useRouter();
  const { fetchVersions, fetchGlobalVersion } = useTimetableVersion();
  useEffect(() => {
    router.prefetch("/");
  }, [router]);
  const teacherOptions = useMemo(() => {
    const names = (courses || [])
      .map((c) => (typeof c.faculty_assigned === "string" ? c.faculty_assigned.trim() : ""))
      .filter((n) => n && n.length > 0);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [courses]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomRules, setSelectedCustomRules] = useState<string[]>(customRules);
  const [progress, setProgress] = useState<number>(0);
  const [resultStats, setResultStats] = useState<
    | null
    | {
        totalSlots: number;
        scheduled: number;
        free: number;
        roomsPerDay: Record<string, number>;
        scheduledUnits?: number;
        unscheduledUnits?: number;
      }
  >(null);
  const [resultConflicts, setResultConflicts] = useState<string[]>([]);
  const [unscheduled, setUnscheduled] = useState<
    { teacher: string; subject: string; section: string; type: "Theory" | "Lab" }[]
  >([]);
  
  const { register, handleSubmit, reset, control, watch } = useForm<FormValues>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      useCustomPrompt: false,
      customPrompt: "",
      maxClassesPerTeacherPerDay: 4,
      maxClassesPerSectionPerDay: 6,
      engine: "algorithmic",
      visitingEarliestTime: "11:30-12:30",
      rooms: [
        ...RegularRooms.map((roomName, index) => ({
          id: `regular-${index}`,
          name: roomName,
          type: "Regular" as const,
          capacity: 40,
          isNew: false,
        })),
        ...LabRooms.map((roomName, index) => ({
          id: `lab-${index}`,
          name: roomName,
          type: "Lab" as const,
          capacity: 40,
          isNew: false,
        })),
      ],
      teacherAvailabilities: [],
    },
  });

  const { fields: roomFields, update: updateRoom, append: appendRoom, remove: removeRoom } = useFieldArray({
    control,
    name: "rooms",
  });
  const { fields: availabilityFields, append: appendAvailability, remove: removeAvailability } = useFieldArray({
    control,
    name: "teacherAvailabilities",
  });

  const useCustomPrompt = watch("useCustomPrompt");

  const handleRoomEdit = (roomId: string, field: keyof Room, value: string | number) => {
    const roomIndex = roomFields.findIndex(room => room.id === roomId);
    if (roomIndex >= 0) {
      updateRoom(roomIndex, { ...roomFields[roomIndex], [field]: value });
    }
  };

  const handleAddRoom = (room: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...room,
      id: `new-${Date.now()}`,
    };
    appendRoom(newRoom);
  };

  const handleRemoveRoom = (roomId: string) => {
    const roomIndex = roomFields.findIndex(room => room.id === roomId);
    if (roomIndex >= 0) {
      removeRoom(roomIndex);
    }
  };

  const generateDynamicPrompt = (data: FormValues): string => {
    // If using custom prompt, return it directly
    if (data.useCustomPrompt && data.customPrompt) {
      return data.customPrompt;
    }

    let prompt = `You are an AI assistant tasked with generating a university-level class timetable in strict JSON format. Follow every rule below carefully. Your response must ONLY be valid JSON.\n\n`;

    prompt += `Scheduling Constraints:\n`;
    prompt += `- Maximum classes per teacher per day: ${data.maxClassesPerTeacherPerDay}\n`;
    prompt += `- Maximum classes per section per day: ${data.maxClassesPerSectionPerDay}\n\n`;

    prompt += `Default Rules:\n`;
    defaultRules.forEach((rule, index) => {
      prompt += `${index + 1}. ${rule}\n`;
    });



    prompt += `\nWeekly class frequency based on credit hours:\n`;
    courses.forEach((course) => {
      const faculty = course.faculty_assigned;
      const subject = course.course_details;
      const section = course.section;
      const creditHours = course.credit_hour;
      const theoryClasses = course.theory_classes_week ?? creditHours;
      const labClasses = course.lab_classes_week ?? 0;
      
      if (faculty && subject && creditHours) {
        if (theoryClasses && theoryClasses > 0) {
          prompt += `  - ${faculty} (${subject} - ${section}) Theory classes: ${theoryClasses} times per week\n`;
        }
        if (labClasses && labClasses > 0) {
          prompt += `  - ${faculty} (${subject} - ${section}) Lab classes: ${labClasses} times per week\n`;
        }
      }
    });

    // Add custom rules to the prompt
    if (data.selectedCustomRules && data.selectedCustomRules.length > 0) {
      prompt += `\nCustom Rules:\n`;
      data.selectedCustomRules.forEach((rule, index) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }

    prompt += `\nTeachers and Courses:\n`;
    courses.forEach((course, index) => {
      const theoryClasses = course.theory_classes_week ?? course.credit_hour ?? 3;
      const labClasses = course.lab_classes_week ?? 0;
      const subjectType = course.subject_type ?? "Theory";
      
      prompt += `${index + 1}. Faculty: ${course.faculty_assigned || "N/A"}, Subject: ${course.course_details || "N/A"}, Section: ${course.section || "N/A"}, Type: ${subjectType}, Theory/Week: ${theoryClasses}, Lab/Week: ${labClasses}\n`;
    });

    prompt += `\nAvailable Rooms:\n`;
    data.rooms.forEach((room, index) => {
      prompt += `${index + 1}. ${room.name} (${room.type}${room.capacity ? `, Capacity: ${room.capacity}` : ''})\n`;
    });

    prompt += `\n---\n`;
    prompt += `Output Format (strict):\n`;
    prompt += `Return JSON like this. DO NOT include code blocks or markdown. Only valid raw JSON:\n\n`;
    prompt += `{\n`;
    prompt += `  "Monday": [\n`;
    data.rooms.forEach((room, index) => {
      prompt += `    {\n`;
      prompt += `      "${room.name}": [\n`;
      prompt += `        {\n`;
      prompt += `          "Room": "${room.name}",\n`;
      prompt += `          "Time": "9:30-10:30",\n`;
      prompt += `          "Teacher": "Teacher Name",\n`;
      prompt += `          "Subject": "Subject Name",\n`;
      prompt += `          "Section": "Class Section",\n`;
      prompt += `          "Type": "Theory/Lab"\n`;
      prompt += `        }\n`;
      prompt += `        // ... more class objects, total 7 per room\n`;
      prompt += `      ]\n`;
      prompt += `    }${index < data.rooms.length - 1 ? "," : ""}\n`;
    });
    prompt += `  ],\n  "Tuesday": [/* same format */],\n  "Wednesday": [/* same format */],\n  "Thursday": [/* same format */],\n  "Friday": [/* same format */]\n}`;
    prompt += `\n\nImportant Rules:\n`;
    prompt += `- Do NOT assign the same teacher to multiple classes in the same time slot.\n`;
    prompt += `- Do NOT repeat the same subject in multiple rooms at the same time.\n`;
    prompt += `- If no class is scheduled in a slot, return: { "Time": "X"}\n`;
    prompt += `- Respect the maximum classes per teacher and section per day limits.\n`;
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
    setProgress(5);
    setResultStats(null);
    setResultConflicts([]);
    setUnscheduled([]);
  
    try {
      // Create complete data object with custom rules
      const completeData = {
        ...values,
        selectedCustomRules,
      };
      
      const prompt = generateDynamicPrompt(completeData);
      
      setProgress(15);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          customRules: selectedCustomRules,
          maxClassesPerTeacherPerDay: values.maxClassesPerTeacherPerDay,
          maxClassesPerSectionPerDay: values.maxClassesPerSectionPerDay,
          rooms: values.rooms,
          engine: values.engine || "algorithmic",
          courses, // send full course set for algorithmic engine
          visitingEarliestTime: values.visitingEarliestTime,
          teacherAvailability: (values.teacherAvailabilities || []).reduce((acc, cur) => {
            if (!cur.teacher) return acc;
            acc[cur.teacher] = {
              days: cur.days,
              earliestTime: cur.earliestTime || undefined,
              latestTime: cur.latestTime || undefined,
            };
            return acc;
          }, {} as Record<string, { days?: string[]; earliestTime?: string; latestTime?: string }>),
        }),
      });
  
      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`);
      }
  
      setProgress(50);
      const payload = await res.json();

      // Auto-save timetable when using algorithmic engine
      if (values.engine !== "llm" && payload && payload.timetable) {
        const saveRes = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.timetable),
        });
        if (!saveRes.ok) {
          throw new Error("Failed to save timetable");
        }
        // Refetch versions/global before redirecting
        try {
          await Promise.all([fetchVersions(), fetchGlobalVersion()]);
        } catch {}
        toast.success("Timetable generated and saved. Redirecting to Timetable...");
        setTimeout(() => {
          router.push("/");
        }, 900);
      }

      // Compute stats/conflicts for UI
      if (payload?.timetable) {
        const stats = computeStats(payload.timetable);
        const conflicts = computeConflicts(payload.timetable);
        setResultStats({
          ...stats,
          scheduledUnits: payload?.stats?.scheduled,
          unscheduledUnits: payload?.stats?.unscheduled,
        });
        setResultConflicts(conflicts.map((c) => `${c.day} ${c.time}: ${c.message}`));
        setUnscheduled(Array.isArray(payload.unscheduled) ? payload.unscheduled : []);
      }
      setProgress(100);
      console.log("Generated Timetable:", payload);
  
      reset();
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to generate timetable.");
    } finally {
      setIsLoading(false);
      // soft-finish progress bar
      setTimeout(() => setProgress(0), 600);
    }
  };
  return (
    <main className="flex h-[calc(100vh-4rem)] justify-center overflow-y-auto mb-10">
      <div className="flex justify-center rounded-2xl border-[#416697]">
        <div className="lg:w-[1000px] md:max-w-[1000px] px-6">
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
                  Found {courses.length} course{courses.length > 1 ? "s" : ""} from the database.
                </p>
              </div>
            )}

            {/* Room Management */}
            <RoomManagement
              rooms={roomFields}
              onRoomEdit={handleRoomEdit}
              onAddRoom={handleAddRoom}
              onRemoveRoom={handleRemoveRoom}
            />

            {/* Scheduling Constraints */}
            <FormSection
              title="Scheduling Constraints"
              description="Configure daily limits for teachers and student sections to ensure balanced workloads."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Classes Per Teacher Per Day
                  </label>
                  <select
                    {...register("maxClassesPerTeacherPerDay")}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <option key={num} value={num}>{num} classes</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Classes Per Section Per Day
                  </label>
                  <select
                    {...register("maxClassesPerSectionPerDay")}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <option key={num} value={num}>{num} classes</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Earliest Time for Visiting Teachers
                  </label>
                  <select
                    {...register("visitingEarliestTime")}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {["9:30-10:30","10:30-11:30","11:30-12:30","12:30-1:30","1:30-2:30","2:30-3:30","3:30-4:30"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* Generation Engine */}
            <FormSection
              title="Generation Engine"
              description="Choose how to generate the timetable. Algorithmic is recommended for large datasets."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Engine
                  </label>
                  <select
                    {...register("engine")}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="algorithmic">Algorithmic (deterministic, fast)</option>
                    <option value="llm">LLM (AI model, slower)</option>
                    <option value="hybrid">Hybrid (algorithmic + AI) - beta</option>
                  </select>
                </div>
              </div>
            </FormSection>

            {/* Custom Rules */}
            <FormSection
              title="Custom Timetable Rules"
              description="Add custom rules to fine-tune your timetable generation. You can type new rules or select from predefined suggestions."
            >
              <RulesAutocomplete
                value={selectedCustomRules}
                onChange={setSelectedCustomRules}
                placeholder="Type to add custom rules or select from existing ones..."
                className="w-full"
              />
            </FormSection>

            {/* Prompt Configuration */}
            <FormSection
              title="Prompt Configuration"
              description="Advanced users can override the default AI prompt with their own custom instructions."
            >
              <div className="mb-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("useCustomPrompt")}
                    className="h-5 w-5 accent-[#416697] rounded"
                  />
                  <span className="text-lg text-[#416697] font-medium">Use Custom Prompt</span>
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Enable this to override the default prompt generation with your own custom prompt.
                </p>
              </div>
              
              {useCustomPrompt && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Prompt
                  </label>
                  <Controller
                    name="customPrompt"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={8}
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="Enter your custom prompt here..."
                      />
                    )}
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Your custom prompt will be sent directly to the AI model. Make sure to include all necessary instructions for timetable generation.
                  </p>
                </div>
              )}
            </FormSection>

            {/* Teacher Availability (optional) */}
            <FormSection
              title="Teacher Availability (optional)"
              description="Limit specific teachers to certain days and times. Leave empty to allow any time."
            >
              <div className="space-y-4">
                {availabilityFields.map((field, idx) => (
                  <div key={field.id} className="p-4 border rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
                      <div className="relative">
                        <select
                          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          {...register(`teacherAvailabilities.${idx}.teacher` as const)}
                        >
                          <option value="">Select teacher</option>
                          {teacherOptions.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Options populated from Courses</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                      <div className="flex flex-wrap gap-2">
                        {Days.map((d) => (
                          <label key={d} className="inline-flex items-center gap-2 text-sm px-2 py-1 border rounded-md bg-white">
                            <input
                              type="checkbox"
                              value={d}
                              className="accent-[#416697]"
                              {...register(`teacherAvailabilities.${idx}.days` as const)}
                            />
                            <span className="text-gray-700">{d}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Earliest</label>
                      <select
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        {...register(`teacherAvailabilities.${idx}.earliestTime` as const)}
                      >
                        <option value="">Any</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <label className="block text-sm font-medium text-gray-700 mb-2 mt-2">Latest</label>
                      <select
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        {...register(`teacherAvailabilities.${idx}.latestTime` as const)}
                      >
                        <option value="">Any</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4 flex justify-between">
                      <button
                        type="button"
                        onClick={() => removeAvailability(idx)}
                        className="text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendAvailability({ teacher: "", days: [] })}
                  className="px-4 py-2 bg-[#042954] text-white rounded-lg text-sm"
                >
                  Add Teacher Availability
                </button>
              </div>
            </FormSection>


            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full max-w-md px-8 py-4 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate TimeTable
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {(isLoading || progress > 0) && (
              <div className="mt-6 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-600 transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Results: Stats and Conflicts */}
            {(resultStats || resultConflicts.length > 0 || unscheduled.length > 0) && (
              <div className="mt-8 grid grid-cols-1 gap-6">
                {resultStats && (
                  <div className="p-4 bg-white border rounded-xl">
                    <h3 className="text-lg font-semibold text-[#416697] mb-2">Generation Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500">Total Slots</div>
                        <div className="text-gray-900 font-semibold">{resultStats.totalSlots}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500">Scheduled</div>
                        <div className="text-gray-900 font-semibold">{resultStats.scheduled}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-gray-500">Free</div>
                        <div className="text-gray-900 font-semibold">{resultStats.free}</div>
                      </div>
                      {typeof resultStats.scheduledUnits === "number" && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-gray-500">Class Units Scheduled</div>
                          <div className="text-gray-900 font-semibold">{resultStats.scheduledUnits}</div>
                        </div>
                      )}
                      {typeof resultStats.unscheduledUnits === "number" && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-gray-500">Unscheduled Units</div>
                          <div className="text-gray-900 font-semibold">{resultStats.unscheduledUnits}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {resultConflicts.length > 0 && (
                  <div className="p-4 bg-white border rounded-xl">
                    <h3 className="text-lg font-semibold text-[#416697] mb-2">Conflicts Detected</h3>
                    <ul className="list-disc ml-5 text-sm text-red-600">
                      {resultConflicts.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {unscheduled.length > 0 && (
                  <div className="p-4 bg-white border rounded-xl">
                    <h3 className="text-lg font-semibold text-[#416697] mb-2">Unscheduled Classes</h3>
                    <ul className="list-disc ml-5 text-sm text-gray-800">
                      {unscheduled.map((u, idx) => (
                        <li key={idx}>{`${u.type}: ${u.subject} - ${u.teacher}${u.section ? ` (${u.section})` : ""}`}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
