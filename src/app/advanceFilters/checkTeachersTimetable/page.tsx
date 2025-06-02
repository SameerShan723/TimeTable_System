"use client";

import { useState, useId, useCallback, useEffect, useMemo, JSX } from "react";
import Select, { MultiValue, SingleValue } from "react-select";
import SpinnerLoader from "@/components/loaders/Spinner";
import { useTimetableVersions } from "../../hooks/useTimetableVersion";
import { Days } from "@/helpers/page";
import { timeSlots } from "@/helpers/page";

type DayType = (typeof Days)[number];
type TimeSlotType = (typeof timeSlots)[number];

interface ClassItem {
  Subject: string;
  Teacher: string;
  Section: string;
  Time: string;
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

export default function TeacherTimetable(): JSX.Element {
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

  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<DayType[]>([]);
  const [results, setResult] = useState<EnhancedClassItem[]>([]);
  const [error, setError] = useState<string>("");

  const teacherSelectedId: string = useId();
  const DayselectedId: string = useId();
  const versionSelectedId: string = useId();

  const teachers: string[] = useMemo(() => {
    const teacherSet = new Set<string>();
    Days.forEach((day: DayType) => {
      if (!timetableData[day] || !Array.isArray(timetableData[day])) return;
      timetableData[day].forEach((roomObj: Record<string, ClassItem[]>) => {
        const roomName: string = Object.keys(roomObj)[0];
        const classes: ClassItem[] = roomObj[roomName];
        if (Array.isArray(classes)) {
          classes.forEach((cls: ClassItem) => {
            if (cls.Teacher && cls.Teacher.trim()) {
              teacherSet.add(cls.Teacher.trim());
            }
          });
        }
      });
    });
    return Array.from(teacherSet).sort();
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
    const isAllSelected: SelectOption | undefined = selected.find(
      (opt: SelectOption) => opt.value === "all"
    );
    if (isAllSelected) {
      setSelectedDay([...Days]);
    } else {
      const filtered: SelectOption[] = selected.filter(
        (opt: SelectOption) => opt.value !== "all"
      );
      setSelectedDay(filtered.map((opt: SelectOption) => opt.value as DayType));
    }
  }, []);

  const handleSearch = useCallback((): void => {
    setError("");
    if (!selectedTeacher) {
      setError("Please select a teacher!");
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
            if (cls.Teacher === selectedTeacher) {
              const normalizedTime =
                timeSlots.find((time) =>
                  cls.Time.includes(time.split("-")[0])
                ) || cls.Time;
              result.push({
                ...cls,
                Room: roomName,
                Day: day,
                Time: normalizedTime,
              });
            }
          });
        }
      });
    });
    console.log("Results:", result); // Debug
    if (result.length === 0) {
      setError("No classes found for the selected teacher on selected Days.");
    } else {
      setError("");
    }
    setResult(result);
  }, [selectedTeacher, selectedDay, timetableData]);

  const getTimetable = useCallback(
    (day: string, time: string): EnhancedClassItem | undefined => {
      console.log("Searching for day:", day, "time:", time); // Debug
      return results.find(
        (course: EnhancedClassItem) =>
          course.Time === time && course.Day === day
      );
    },
    [results]
  );

  useEffect((): void => {
    setResult([]);
    setError("");
    setSelectedTeacher("");
    setSelectedDay([]);
  }, [selectedVersion]);

  const isAllSelected: boolean = selectedDay.length === Days.length;
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
        <h1 className="font-bold text-3xl mt-6 mb-6">
          Check Teachers Timetable
        </h1>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Version:</label>
          <div className="flex w-full items-center ">
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
            <div>{loading && <SpinnerLoader />}</div>
          </div>
        </div>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Teacher:</label>
          <Select<SelectOption>
            instanceId={teacherSelectedId}
            options={teachers.map((teacher: string) => ({
              value: teacher,
              label: teacher,
            }))}
            value={
              selectedTeacher
                ? { value: selectedTeacher, label: selectedTeacher }
                : null
            }
            onChange={(selectedOption: SingleValue<SelectOption>) =>
              setSelectedTeacher(selectedOption ? selectedOption.value : "")
            }
            className="text-black"
            placeholder="Select teacher"
            isDisabled={loading || teachers.length === 0}
            isClearable
          />
          {teachers.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mt-1">
              No teachers available. Please select a version first.
            </p>
          )}
        </div>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Days:</label>
          <Select<SelectOption, true>
            instanceId={DayselectedId}
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
        <div>
          <button
            className="bg-blue-900 py-2 px-20 cursor-pointer text-[#ccd8e8] disabled:opacity-50 hover:bg-blue-800 transition-colors"
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
            {selectedTeacher}
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-6 mb-10 px-10">
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
                              {course.Subject}
                            </p>
                            <p className="text-gray-600">{course.Teacher}</p>
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
    </div>
  );
}
