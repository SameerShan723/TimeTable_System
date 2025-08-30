"use client";

import { useState, useId, useCallback, useMemo, useEffect, JSX } from "react";
import Select, { MultiValue, SingleValue } from "react-select";
import { useTimetableVersion } from "@/context/TimetableContext";
import { timeSlots, Days } from "@/helpers/page";
import ExportTimetable from "@/lib/download-timetable/ExportTimetable";
import { RoomSchedule, Session, EmptySlot } from "@/app/timetable/types";
import { EnhancedClassItem } from "@/lib/download-timetable/ExportTimetable";

type DayType = (typeof Days)[number];
type TimeSlotType = (typeof timeSlots)[number];

interface SelectOption {
  value: string;
  label: string;
}

export default function StudentTimetable(): JSX.Element {
  const {
    selectedVersion,
    timetableData,
    loading,
    error: hookError,
  } = useTimetableVersion();

  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<DayType[]>([...Days]);
  const [results, setResult] = useState<EnhancedClassItem[]>([]);
  const [error, setError] = useState<string>("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const sectionSelectedId = useId();
  const daySelectedId = useId();
  // Set portalTarget to document.body only in the browser
  useEffect(() => {
    if (typeof document !== "undefined") {
      setPortalTarget(document.body);
    }
  }, []);

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
              Subject: `${session.Subject || ""}${(session as Session).Type === "Lab" ? " (Lab)" : ""}`,
              Teacher: session.Teacher || "",
              Section: session.Section || "",
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
    // Reset to all days when version changes
    setSelectedDay([...Days]);
  }, [selectedVersion]);

  const isAllSelected = selectedDay.length === Days.length;
  const filteredOptions: SelectOption[] = isAllSelected
    ? dayOptions
    : [allOption, ...dayOptions];

  if (
    hookError ||
    (!loading && Object.values(timetableData).every((arr) => arr.length === 0))
  ) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">
          {hookError ||
            "No timetable data available. Please select a version in the main timetable."}
        </div>
      </div>
    );
  }

  if (selectedVersion === null && !loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-500">
          Please select a version in the main timetable.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-full px-4 overflow-x-hidden">
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-xl mt-3 mb-4 md:text-2xl lg:text-3xl lg:mt-6 lg:mb-6">
          Check Students Timetable
        </h1>

        <div className="mb-2 flex flex-col w-full max-w-md">
          <label className="text-[13px] mb-2 md:text-[17px] lg:text-xl">
            Section:
          </label>
          <Select<SelectOption, false>
            instanceId={sectionSelectedId}
            inputId={`${sectionSelectedId}-input`}
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
            menuPortalTarget={portalTarget}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
          {sections.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mt-1">
              No sections available for the selected version.
            </p>
          )}
        </div>

        <div className="mb-2 flex flex-col w-full max-w-md">
          <label className="text-[13px] mb-2 md:text-[17px] lg:text-xl">
            Days:
          </label>
          <Select<SelectOption, true>
            instanceId={daySelectedId}
            inputId={`${daySelectedId}-input`}
            isMulti
            options={filteredOptions}
            onChange={handleDayOptions}
            className="text-black"
            placeholder="Select Days"
            value={dayOptions.filter((opt: SelectOption) =>
              selectedDay.includes(opt.value as DayType)
            )}
            isDisabled={loading}
            menuPortalTarget={portalTarget}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>

        <div className="flex gap-3 flex-col  lg:flex-row md:flex-row mt-3 w-full max-w-md">
          <button
            className="bg-[#042954] py-3 md:py-2 px-14 rounded-md cursor-pointer text-white hover:brightness-110 transition-colors w-full"
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
