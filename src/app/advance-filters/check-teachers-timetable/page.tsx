"use client";

import { useState, useId, useCallback, useEffect, useMemo, JSX } from "react";
import Select, { MultiValue } from "react-select";
import { Days } from "@/helpers/page";
import { timeSlots } from "@/helpers/page";
import ExportTimetable from "@/lib/download-timetable/ExportTimetable";
import { useTimetableVersion } from "@/context/TimetableContext";
import { Session } from "@/app/timetable/types";

type DayType = (typeof Days)[number];
type TimeSlotType = (typeof timeSlots)[number];

interface ClassItem {
  Subject: string;
  Teacher: string;
  Section: string;
  Time: string;
}

interface EnhancedClassItem extends ClassItem {
  Room: string;
  Day: string;
}

interface SelectOption {
  value: string;
  label: string;
}

export default function TeacherTimetable(): JSX.Element {
  const {
    selectedVersion,
    timetableData,
    loading,
    error: hookError,
  } = useTimetableVersion();

  const [selectedTeacher, setSelectedTeacher] = useState<string|null>("");
  const [selectedDay, setSelectedDay] = useState<DayType[]>(Days);
  const [results, setResults] = useState<EnhancedClassItem[]>([]);
  const [error, setError] = useState<string>("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const teacherSelectedId: string = useId();
  const daySelectedId: string = useId();
  // Set portalTarget to document.body only in the browser
  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalTarget(document.body);
    }
  }, []);

  // Extract unique teachers from timetable data
  const teachers = useMemo(() => {
    const teacherSet = new Set<string>();
    Days.forEach((day: DayType) => {
      const dayData = timetableData[day] || [];
      dayData.forEach((roomObj) => {
        const roomName = Object.keys(roomObj)[0];
        const classes = roomObj[roomName] as ClassItem[];
        classes.forEach((cls) => {
          if (cls.Teacher && cls.Teacher.trim()) {
            teacherSet.add(cls.Teacher.trim());
          }
        });
      });
    });
    return Array.from(teacherSet).sort();
  }, [timetableData]);

  // Day options for multi-select
  const dayOptions: SelectOption[] = useMemo(
    () => Days.map((day) => ({ value: day, label: day })),
    []
  );

  // "Select All" option for days
  const allOption: SelectOption = useMemo(
    () => ({ value: "all", label: "Select All Days" }),
    []
  );

  // Handle day selection changes
  const handleDaySelection = useCallback(
    (selected: MultiValue<SelectOption>) => {
      if (!selected) {
        setSelectedDay([]);
        return;
      }

      const isAllSelected = selected.some((opt) => opt.value === "all");
      if (isAllSelected) {
        setSelectedDay([...Days]);
      } else {
        setSelectedDay(selected.map((opt) => opt.value as DayType));
      }
    },
    []
  );

  // Handle teacher selection changes
  const handleTeacherSelection = useCallback(
    (selected:SelectOption|null) => {
      if (!selected) {
        setSelectedTeacher(null);
        return;
      }
      setSelectedTeacher(selected.value);
},
[]
  );

  // Search for classes for selected teachers
const handleSearch = useCallback(() => {
  setError("");
  if (!selectedTeacher) {
    setError("Please select a teacher!");
    setResults([]);
    return;
  }

  const foundClasses: EnhancedClassItem[] = [];

  selectedDay.forEach((day) => {
    const dayData = timetableData[day] || [];
    dayData.forEach((roomObj) => {
      const roomName = Object.keys(roomObj)[0];
      const classes = roomObj[roomName] as ClassItem[];

      classes.forEach((cls) => {
        if (cls.Teacher === selectedTeacher) {
          const normalizedTime =
            timeSlots.find((time) => cls.Time.includes(time.split("-")[0])) ||
            cls.Time;
          foundClasses.push({
            ...cls,
            Subject: `${cls.Subject || ""}${(cls as Session).Type === "Lab" ? " (Lab)" : ""}`,
            Room: roomName,
            Day: day,
            Time: normalizedTime,
          });
        }
      });
    });
  });

  if (foundClasses.length === 0) {
    setError("No classes found for the selected teacher on selected days.");
  }

  setResults(foundClasses);
}, [selectedTeacher, selectedDay, timetableData]);

  // Create class lookup for efficient rendering
  const classLookup = useMemo(() => {
    const lookup: Record<string, Record<string, EnhancedClassItem>> = {};
    results.forEach((cls) => {
      if (!lookup[cls.Day]) lookup[cls.Day] = {};
      lookup[cls.Day][cls.Time] = cls;
    });
    return lookup;
  }, [results]);

  // Reset search when version changes
  useEffect(() => {
    setResults([]);
    setError("");
    setSelectedTeacher("");
    setSelectedDay(Days);
  }, [selectedVersion]);

  // Check if all days are selected
  const isAllSelected = selectedDay.length === Days.length;
  const daySelectOptions = isAllSelected
    ? dayOptions
    : [allOption, ...dayOptions];

  if (hookError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">Error: {hookError}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-full px-4 overflow-x-hidden">
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-3xl mt-6 mb-6">
          Check Teachers Timetable
        </h1>
       <div className="mb-4 flex flex-col w-full max-w-md">
  <label className="text-xl mb-2">Teacher:</label>
  <Select<SelectOption, false>   
    instanceId={teacherSelectedId}
    inputId={`${teacherSelectedId}-input`}
    options={teachers.map((teacher) => ({
      value: teacher,
      label: teacher,
    }))}
    value={
      selectedTeacher
        ? { value: selectedTeacher, label: selectedTeacher }
        : null
    }
    onChange={handleTeacherSelection}
    className="text-black"
    placeholder="Select a teacher"
    isDisabled={loading || teachers.length === 0}
    isClearable
    menuPortalTarget={portalTarget}
    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
  />
</div>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Days:</label>
          <Select<SelectOption, true>
            instanceId={daySelectedId}
            inputId={`${daySelectedId}-input`}
            isMulti
            options={daySelectOptions}
            onChange={handleDaySelection}
            className="text-black"
            placeholder="Select Days"
            value={dayOptions.filter((opt) =>
              selectedDay.includes(opt.value as DayType)
            )}
            isDisabled={loading}
            menuPortalTarget={portalTarget}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>
        <div className="flex gap-3 flex-col  lg:flex-row md:flex-row mt-3 w-full max-w-md">
          <button
            className="bg-[#042954] py-3 md:py-2 px-14 rounded-md cursor-pointer text-white disabled:opacity-50 hover:brightness-110 transition-colors w-full"
            onClick={handleSearch}
            disabled={loading}
          >
            Show Classes
          </button>
          {results.length > 0 && (
            <ExportTimetable
              results={results}
              selectedSection={selectedTeacher || "" }
              selectedDays={selectedDay}
              selectedVersion={selectedVersion}
              isLoading={loading}
              setError={(errorMsg: string | null) => setError(errorMsg || "")}
              identifier="Teacher"
            />
          )}
        </div>
        <div className="text-2xl mt-4">
          {error && <p className="text-red-500">{error}</p>}
          {hookError && <p className="text-red-500">Hook Error: {hookError}</p>}
        </div>
        {results.length > 0 && (
          <div className="mt-4 text-lg text-green-600">
            Found {results.length} class{results.length !== 1 ? "es" : ""} for{" "}
            {selectedTeacher}
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-6 mb-10 px-10 overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">Day</th>
                {timeSlots.map((time: TimeSlotType) => (
                  <th key={time} className="border border-gray-300 p-2">
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Days.map((day: DayType) => (
                <tr key={day}>
                  <td className="border border-gray-300 p-2 font-medium bg-gray-50">
                    {day}
                  </td>
                  {timeSlots.map((time: TimeSlotType) => {
                    const course = classLookup[day]?.[time];
                    return (
                      <td
                        key={`${day}-${time}`}
                        className={`border border-gray-300  hover:bg-gray-50 min-w-[170px] ${
                          course ? "bg-blue-50" : ""
                        }`}
                      >
                        {course && (
                          <div className="flex flex-col items-center text-sm p-2 ">
                            <p className="font-bold text-center text-blue-800">
                              {course.Subject}
                            </p>
                            <p className="text-gray-600 text-center">{course.Teacher}</p>
                            <p className="text-gray-600 text-center">{course.Section}</p>
                            <p className="text-black font-bold">
                              {course.Room}
                            </p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
