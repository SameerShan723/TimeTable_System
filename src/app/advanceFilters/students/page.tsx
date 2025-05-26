"use client";

import { useState, useId, useCallback, useEffect, useMemo, JSX } from "react";
import Select, { MultiValue, SingleValue } from "react-select";
import SpinnerLoader from "@/components/loaders/FadeLoader";
import { useTimetableVersions } from "../../hooks/useTimetableVersion";
import { timeSlots } from "@/helpers/page";
import { DAYS } from "@/helpers/page";
// const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
// const TIME_SLOTS = [
//   "9:30-10:30",
//   "10:30-11:30",
//   "11:30-12:30",
//   "12:30-1:30",
//   "1:30-2:30",
//   "2:30-3:30",
//   "3:30-4:30",
// ] as const;

type DayType = (typeof DAYS)[number];
type TimeSlotType = (typeof timeSlots)[number];

interface ClassItem {
  "Course Details": string;
  "Faculty Assigned": string;
  Section: string;
  Time: string;
  Day: string;
  Domain: string;
  "Pre-Req": string;
  Room: string;
  Sem: string;
  "Subject Code": string;
  "Subject TYPE": string;
  [key: string]: string;
}

interface TimetableData {
  Monday: Record<string, ClassItem[]>[];
  Tuesday: Record<string, ClassItem[]>[];
  Wednesday: Record<string, ClassItem[]>[];
  Thursday: Record<string, ClassItem[]>[];
  Friday: Record<string, ClassItem[]>[];
  [key: string]: Record<string, ClassItem[]>[];
}

interface EnhancedClassItem extends ClassItem {
  Room: string;
  Day: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface VersionOption {
  value: number;
  label: string;
}

export default function StudentTimetable(): JSX.Element {
  const {
    versions,
    selectedVersion,
    timetableData,
    loading,
    error: hookError,
    setSelectedVersion,
  } = useTimetableVersions<TimetableData>(
    { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] },
    [],
    null
  );

  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<DayType[]>([]);
  const [results, setResult] = useState<EnhancedClassItem[]>([]);
  const [error, setError] = useState<string>("");

  const sectionSelectedId: string = useId();
  const daySelectedId: string = useId();
  const versionSelectedId: string = useId();

  const sections: string[] = useMemo(() => {
    const sectionSet = new Set<string>();

    DAYS.forEach((day: DayType) => {
      if (!timetableData[day] || !Array.isArray(timetableData[day])) return;

      timetableData[day].forEach((roomObj: Record<string, ClassItem[]>) => {
        const roomName: string = Object.keys(roomObj)[0];
        const classes: ClassItem[] = roomObj[roomName];

        if (Array.isArray(classes)) {
          classes.forEach((cls: ClassItem) => {
            if (cls.Section && cls.Section.trim()) {
              sectionSet.add(cls.Section.trim());
            }
          });
        }
      });
    });

    return Array.from(sectionSet).sort();
  }, [timetableData]);

  const dayOptions: SelectOption[] = useMemo(
    () =>
      DAYS.map((day: DayType) => ({
        value: day,
        label: day,
      })),
    []
  );

  const allOption: SelectOption = useMemo(
    () => ({ value: "all", label: "Select All Days" }),
    []
  );

  const handleDayOptions = useCallback((selected: MultiValue<SelectOption>) => {
    if (!selected) {
      setSelectedDay([]);
      return;
    }

    const isAllSelected: SelectOption | undefined = selected.find(
      (opt: SelectOption) => opt.value === "all"
    );

    if (isAllSelected) {
      setSelectedDay([...DAYS]);
    } else {
      const filtered: SelectOption[] = selected.filter(
        (opt: SelectOption) => opt.value !== "all"
      );
      setSelectedDay(filtered.map((opt: SelectOption) => opt.value as DayType));
    }
  }, []);

  const handleSearch = useCallback((): void => {
    setError("");

    if (!selectedSection) {
      setError("Please select a section!");
      setResult([]);
      return;
    }

    if (selectedDay.length === 0) {
      setError("Please select a day!");
      setResult([]);
      return;
    }

    const result: EnhancedClassItem[] = [];

    selectedDay.forEach((day: DayType) => {
      if (!timetableData[day] || !Array.isArray(timetableData[day])) return;

      timetableData[day].forEach((roomObj: Record<string, ClassItem[]>) => {
        const roomName: string = Object.keys(roomObj)[0];
        const classes: ClassItem[] = roomObj[roomName];

        if (Array.isArray(classes)) {
          classes.forEach((cls: ClassItem) => {
            if (cls.Section === selectedSection) {
              result.push({ ...cls, Room: roomName, Day: day });
            }
          });
        }
      });
    });

    if (result.length === 0) {
      setError("No classes found for the selected section on selected days.");
    } else {
      setError("");
    }
    setResult(result);
  }, [selectedSection, selectedDay, timetableData]);

  const getTimetable = useCallback(
    (day: string, time: string): EnhancedClassItem | undefined => {
      return results.find(
        (course: EnhancedClassItem) =>
          course.Time === time && course.Day === day
      );
    },
    [results]
  );

  // Clear results and errors when version changes
  useEffect((): void => {
    setResult([]);
    setError("");
    setSelectedSection("");
    setSelectedDay([]);
  }, [selectedVersion]);

  const isAllSelected: boolean = selectedDay.length === DAYS.length;
  const filteredOptions: SelectOption[] = isAllSelected
    ? dayOptions
    : [allOption, ...dayOptions];

  // Show error if there's a critical error
  if (
    hookError &&
    (!timetableData.Monday || timetableData.Monday.length === 0)
  ) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">Error: {hookError}</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-3xl mt-6 mb-6">
          Check Students Timetable
        </h1>

        {/* Version Selection */}
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Version:</label>
          <div className="flex w-full items-center gap-2">
            <Select<VersionOption>
              instanceId={versionSelectedId}
              options={versions.map((version: number) => ({
                value: version,
                label: `Version ${version}`,
              }))}
              value={
                selectedVersion !== null
                  ? {
                      value: selectedVersion,
                      label: `Version ${selectedVersion}`,
                    }
                  : null
              }
              onChange={(selectedOption: SingleValue<VersionOption>) =>
                setSelectedVersion(selectedOption ? selectedOption.value : null)
              }
              className="text-black w-full"
              placeholder="Select version"
              isClearable
            />
            {loading && <SpinnerLoader />}
          </div>
        </div>

        {/* Section Selection */}
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Section:</label>
          <Select<SelectOption>
            instanceId={sectionSelectedId}
            options={sections.map((section: string) => ({
              value: section,
              label: section,
            }))}
            value={
              selectedSection
                ? { value: selectedSection, label: selectedSection }
                : null
            }
            onChange={(selectedOption: SingleValue<SelectOption>) =>
              setSelectedSection(selectedOption ? selectedOption.value : "")
            }
            className="text-black"
            placeholder="Select section"
            isDisabled={loading || sections.length === 0}
            isClearable
          />
          {sections.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mt-1">
              No sections available. Please select a version first.
            </p>
          )}
        </div>

        {/* Day Selection */}
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Days:</label>
          <Select<SelectOption, true>
            instanceId={daySelectedId}
            isMulti
            options={filteredOptions}
            onChange={handleDayOptions}
            className="text-black"
            placeholder="Select days"
            value={dayOptions.filter((opt: SelectOption) =>
              selectedDay.includes(opt.value as DayType)
            )}
            isDisabled={loading}
          />
        </div>

        <div>
          <button
            className="bg-blue-900 py-2 px-20 cursor-pointer text-[#ccd8e8]  hover:bg-blue-800 transition-colors"
            onClick={handleSearch}
            disabled={loading}
          >
            Show Classes
          </button>
        </div>

        <div className="text-2xl mt-4">
          {error && <p className="text-red-500">{error}</p>}
          {hookError && <p className="text-red-500">Hook Error: {hookError}</p>}
        </div>

        {results.length > 0 && (
          <div className="mt-4 text-lg text-green-600">
            Found {results.length} class{results.length !== 1 ? "es" : ""} for{" "}
            {selectedSection}
          </div>
        )}
      </div>

      {/* Timetable Display */}
      {results.length > 0 && (
        <div className="overflow-x-auto mt-6 mb-10 px-10">
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
              {DAYS.map((day: DayType) => (
                <tr key={day}>
                  <td className="border border-gray-300 p-2 font-medium bg-gray-50">
                    {day}
                  </td>
                  {timeSlots.map((time: TimeSlotType) => {
                    const course: EnhancedClassItem | undefined = getTimetable(
                      day,
                      time
                    );
                    return (
                      <td
                        key={`${day}-${time}`}
                        className={`border border-gray-300 p-2 hover:bg-gray-50 ${
                          course ? "bg-blue-50" : ""
                        }`}
                      >
                        {course && (
                          <div className="flex flex-col items-center text-sm">
                            <p className="font-bold text-blue-800">
                              {course["Course Details"]}
                            </p>
                            <p className="text-gray-600">
                              {course["Faculty Assigned"]}
                            </p>
                            <p className="text-gray-600">{course.Section}</p>
                            <p className="text-gray-500 text-xs">
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
    </>
  );
}
