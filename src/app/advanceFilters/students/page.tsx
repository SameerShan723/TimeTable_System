"use client";

import { useState, useId, useCallback, useMemo, useEffect, JSX } from "react";
import Select, { MultiValue, SingleValue } from "react-select";
import { useTimetableVersions } from "../../hooks/useTimetableVersion";
import { timeSlots, Days } from "@/helpers/page";
import ExportTimetable from "@/lib/download_timetable/ExportTimetable";
import {
  TimetableData,
  RoomSchedule,
  Session,
  EmptySlot,
} from "@/app/timetable/types";
import { EnhancedClassItem } from "@/lib/download_timetable/ExportTimetable";

type DayType = (typeof Days)[number];
type TimeSlotType = (typeof timeSlots)[number];

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

  const sectionSelectedId = useId();
  const daySelectedId = useId();
  const versionSelectedId = useId();

  const sections: string[] = useMemo(() => {
    const sectionSet = new Set<string>();

    Days.forEach((day: DayType) => {
      const daySchedule: RoomSchedule[] = timetableData[day] || [];
      daySchedule.forEach((roomObj: RoomSchedule) => {
        const roomName: string = Object.keys(roomObj)[0];
        const sessions: (Session | EmptySlot)[] = roomObj[roomName] || [];
        sessions.forEach((session) => {
          if (
            "Section" in session &&
            session.Section &&
            session.Section.trim()
          ) {
            sectionSet.add(session.Section.trim());
          }
        });
      });
    });

    return Array.from(sectionSet).sort();
  }, [timetableData]);

  const dayOptions: SelectOption[] = useMemo(
    () =>
      Days.map((day: DayType) => ({
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

    const isAllSelected = selected.find(
      (opt: SelectOption) => opt.value === "all"
    );

    if (isAllSelected) {
      setSelectedDay([...Days]);
    } else {
      const filtered = selected.filter(
        (opt: SelectOption) => opt.value !== "all"
      );
      setSelectedDay(filtered.map((opt: SelectOption) => opt.value as DayType));
    }
  }, []);

  const handleSearch = useCallback(() => {
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
      const daySchedule: RoomSchedule[] = timetableData[day] || [];
      daySchedule.forEach((roomObj: RoomSchedule) => {
        const roomName: string = Object.keys(roomObj)[0];
        const sessions: (Session | EmptySlot)[] = roomObj[roomName] || [];
        sessions.forEach((session) => {
          if ("Section" in session && session.Section === selectedSection) {
            result.push({
              Subject: session.Subject || "",
              Teacher: session.Teacher || "",
              Section: session.Section || "", // Default to "" if undefined
              Time: session.Time || "",
              Day: day,
              Room: roomName,
            });
          }
        });
      });
    });

    if (result.length === 0) {
      setError("No classes found for the selected section on selected Days.");
    } else {
      setError("");
    }
    setResult(result);
  }, [selectedSection, selectedDay, timetableData]);

  const getTimetable = useCallback(
    (day: string, time: string): EnhancedClassItem | undefined =>
      results.find(
        (course: EnhancedClassItem) =>
          course.Time === time && course.Day === day
      ),
    [results]
  );

  useEffect(() => {
    setResult([]);
    setError("");
    setSelectedSection("");
    setSelectedDay([]);
  }, [selectedVersion]);

  const isAllSelected = selectedDay.length === Days.length;
  const filteredOptions: SelectOption[] = isAllSelected
    ? dayOptions
    : [allOption, ...dayOptions];

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
    <div className="flex flex-col flex-1 h-full w-full overflow-y-auto">
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-xl mt-3 mb-4 md:text-2xl lg:text-3xl lg:mt-6 lg:mb-6">
          Check Students Timetable
        </h1>

        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-[13px] mb-2 md:text-[17px] lg:text-xl">
            Version:
          </label>
          <div className="flex w-full items-center">
            <Select<VersionOption, false>
              instanceId={versionSelectedId}
              options={
                loading
                  ? [{ value: -1, label: "Loading..." }]
                  : versions.map((version: number) => ({
                      value: version,
                      label: `Version ${version}`,
                    }))
              }
              value={
                selectedVersion !== null
                  ? {
                      value: selectedVersion,
                      label: loading
                        ? "Loading..."
                        : `Version ${selectedVersion}`,
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
          </div>
        </div>

        <div className="mb-2 flex flex-col w-full max-w-md">
          <label className="text-[13px] mb-2 md:text-[17px] lg:text-xl">
            Section:
          </label>
          <Select<SelectOption, false>
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

        <div className="mb-2 flex flex-col w-full max-w-md">
          <label className="text-[13px] mb-2 md:text-[17px] lg:text-xl">
            Days:
          </label>
          <Select<SelectOption, true>
            instanceId={daySelectedId}
            isMulti
            options={filteredOptions}
            onChange={handleDayOptions}
            className="text-black"
            placeholder="Select Days"
            value={dayOptions.filter((opt: SelectOption) =>
              selectedDay.includes(opt.value as DayType)
            )}
            isDisabled={loading}
          />
        </div>

        <div className="flex space-x-4">
          <button
            className="bg-blue-900 py-2 px-20 cursor-pointer text-[#ccd8e8] hover:bg-blue-800 transition-colors"
            onClick={handleSearch}
            disabled={loading}
          >
            Show Classes
          </button>
          {results.length > 0 && (
            <ExportTimetable
              results={results}
              selectedSection={selectedSection}
              selectedDays={selectedDay}
              selectedVersion={selectedVersion}
              isLoading={loading}
              setError={(error: string | null) => setError(error || "")}
              identifier="Section"
            />
          )}
        </div>

        <div className="text-2xl mt-4">
          {error && <p className="text-red-500">{error}</p>}
          {hookError && <p className="text-red-500">Hook Error: {hookError}</p>}
        </div>

        {results.length > 0 && (
          <div className="flex justify-center px-2">
            <div className="text-sm text-green-600 lg:text-lg">
              Found {results.length} class{results.length !== 1 ? "es" : ""} for{" "}
              {selectedSection}
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-6 mb-10 px-2 lg:px-10 overflow-x-auto">
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
                    const course = getTimetable(day, time);
                    return (
                      <td
                        key={`${day}-${time}`}
                        className={`border border-gray-300 p-2 hover:bg-gray-50 ${
                          course ? "bg-blue-50" : ""
                        }`}
                      >
                        {course && (
                          <div className="flex justify-center">
                            <div className="flex flex-col items-center text-sm">
                              <p className="font-semibold text-blue-800">
                                {course.Subject}
                              </p>
                              <p className="text-gray-600">{course.Teacher}</p>
                              <p className="text-gray-600">{course.Section}</p>
                              <p className="text-gray-500 text-xs">
                                {course.Room}
                              </p>
                            </div>
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
