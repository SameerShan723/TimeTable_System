"use client";

import { useEffect, useState, useId, useCallback } from "react";
import Select, { MultiValue } from "react-select";
import { supabase } from "@/lib/supabase/supabase";
import SpinnerLoader from "@/components/loaders/FadeLoader";

interface ClassItem {
  "Faculty Assigned": string;
  Time: string;
  Section: string;
  "Course Details": string;
  Day: string;
  Domain: string;
  "Pre-Req": string;
  Room: string;
  Sem: string;
  "Subject Code": string;
  "Subject TYPE": string;
}

type RoomObject = {
  [roomName: string]: ClassItem[];
};

type DaySchedule = RoomObject[];

interface TimetableData {
  [day: string]: DaySchedule;
}

export default function StudentTimetable() {
  const [timetable, setTimetable] = useState<TimetableData>({});
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string[]>([]);
  const [results, setResult] = useState<(ClassItem & { Room: string })[]>([]);
  const [error, setError] = useState<string>("");
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const sectionSelectedId = useId();
  const daySelectedId = useId();
  const versionSelectedId = useId();
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = [
    "9:30-10:30",
    "10:30-11:30",
    "11:30-12:30",
    "12:30-1:30",
    "1:30-2:30",
    "2:30-3:30",
    "3:30-4:30",
  ];

  const getData = useCallback(
    async (versionOverride?: number | null) => {
      setError("");
      setLoading(true);

      try {
        // Fetch available versions
        const { data: versionData, error: versionError } = await supabase
          .from("timetable_data")
          .select("version_number")
          .order("version_number", { ascending: true });

        if (versionError) {
          // console.error("Version fetch error:", versionError);
          throw new Error(versionError.message);
        }

        const versionNumbers = versionData.map((v) => v.version_number);
        // console.log("Available versions:", versionNumbers);
        setVersions(versionNumbers);

        const versionToUse =
          versionOverride ||
          selectedVersion ||
          versionNumbers[versionNumbers.length - 1] ||
          null;

        if (!selectedVersion && versionToUse) {
          // console.log("Setting initial selectedVersion:", versionToUse);
          setSelectedVersion(versionToUse);
        }

        if (!versionToUse) {
          throw new Error("No valid version available.");
        }

        // console.log("Fetching timetable for version:", versionToUse);
        const url = `/api/timetable?version=${versionToUse}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          // console.error("Fetch error:", errorData);
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }

        const data = await response.json();
        // console.log("Fetched timetable data:", data);

        const filteredData: TimetableData = Object.fromEntries(
          Object.entries(data).filter(([key]) => days.includes(key))
        ) as TimetableData;
        // console.log("Filtered timetable data:", filteredData);
        setTimetable(filteredData);
        setLoading(false);

        const sectionSet = new Set<string>();
        Object.entries(filteredData).forEach(([day, dayRooms]) => {
          // console.log(dayRooms, "dayroom");
          if (!Array.isArray(dayRooms)) {
            // console.warn(`Invalid dayRooms for ${day}:`, dayRooms);

            return;
          }
          dayRooms.forEach((roomObj) => {
            const roomName = Object.keys(roomObj)[0];
            const classes = roomObj[roomName];
            if (!Array.isArray(classes)) {
              console.warn(
                `Invalid classes for ${roomName} on ${day}:`,
                classes
              );
              // console.log(classes, "classes");
              return;
            }
            classes.forEach((cls) => {
              if (cls.Section) {
                sectionSet.add(cls.Section);
              }
            });
          });
        });

        setSections(Array.from(sectionSet));
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message || "Failed to load timetable");
          setTimetable({});
          setSections([]);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedVersion]
  );

  useEffect(() => {
    getData();

    const subscription = supabase
      .channel("timetable_data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetable_data" },
        async (payload) => {
          console.log(
            "Timetable data changed:",
            payload,
            "Reloading for version:",
            selectedVersion
          );
          await getData(selectedVersion || undefined);
        }
      );

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getData]);

  useEffect(() => {
    if (selectedVersion) {
      // console.log("Selected version changed, reloading:", selectedVersion);
      getData(selectedVersion);
    }
  }, [selectedVersion, getData]);

  const dayOptions = Object.keys(timetable).map((day) => ({
    value: day,
    label: day,
  }));

  const allOption = { value: "all", label: "Select All Days" };

  const handleDayOptions = (
    selected: MultiValue<{ value: string; label: string }>
  ) => {
    if (!selected) {
      setSelectedDay([]);
      return;
    }

    const isAllSelected = selected.find((opt) => opt.value === "all");

    if (isAllSelected) {
      setSelectedDay(dayOptions.map((opt) => opt.value));
    } else {
      const filtered = selected.filter((opt) => opt.value !== "all");
      setSelectedDay(filtered.map((opt) => opt.value));
    }
  };

  const handleChange = () => {
    setError("");
    if (!selectedSection) {
      setError("Please select a teacher!");
      setResult([]);
      return;
    }

    if (selectedDay.length === 0) {
      setError("Please select a day!");
      setResult([]);
      return;
    }
    setError("");

    const result: (ClassItem & { Room: string; Day: string })[] = [];

    selectedDay.forEach((day) => {
      if (!timetable[day]) return;

      timetable[day].forEach((roomObj) => {
        const roomName = Object.keys(roomObj)[0];
        const classes = roomObj[roomName];

        classes.forEach((cls) => {
          if (cls.Section === selectedSection) {
            result.push({ ...cls, Room: roomName, Day: day });
          }
        });
      });
    });

    if (result.length === 0) {
      setError("No classes found for the selected teacher on this day.");
    } else {
      setError("");
    }
    setResult(result);
  };

  const getTimetable = (day: string, time: string) => {
    return results.find((course) => course.Time === time && course.Day === day);
  };

  const isAllSelected = selectedDay.length === dayOptions.length;
  const filteredOptions = isAllSelected
    ? dayOptions
    : [allOption, ...dayOptions];

  if (error && !timetable.Monday) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-2xl  my-6">
          Check Students Timetable by Section
        </h1>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Version:</label>
          <div className="flex w-full items-center gap-2">
            <Select
              instanceId={versionSelectedId}
              options={versions.map((version) => ({
                value: version,
                label: `Version ${version}`,
              }))}
              value={
                selectedVersion
                  ? {
                      value: selectedVersion,
                      label: `Version ${selectedVersion}`,
                    }
                  : null
              }
              onChange={(selectedOption) =>
                setSelectedVersion(selectedOption ? selectedOption.value : null)
              }
              className="text-black w-full"
              placeholder="Select version"
              isClearable
            />
            {loading && <SpinnerLoader />}
          </div>
        </div>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Section :</label>
          <Select
            instanceId={sectionSelectedId}
            options={sections.map((section) => ({
              value: section,
              label: section,
            }))}
            value={
              selectedSection
                ? { value: selectedSection, label: selectedSection }
                : null
            }
            onChange={(selectedOption) =>
              setSelectedSection(selectedOption ? selectedOption.value : "")
            }
            className="text-black"
            placeholder="Select Section"
            isDisabled={loading}
            isClearable
          />
        </div>

        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Days:</label>
          <Select
            instanceId={daySelectedId}
            isMulti
            options={filteredOptions}
            onChange={handleDayOptions}
            className="text-black"
            placeholder="Select days"
            value={dayOptions.filter((opt) => selectedDay.includes(opt.value))}
            isDisabled={loading}
          />
        </div>
        <div>
          <button
            className="bg-blue-900 py-2 px-20 cursor-pointer text-[#ccd8e8]"
            onClick={handleChange}
            disabled={loading}
          >
            Show Classes
          </button>
        </div>
        <div className="text-2xl">
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </div>

      <div className="overflow-x-auto mt-6 mb-10 px-10">
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Day</th>
              {timeSlots.map((time) => (
                <th key={time} className="border border-gray-300 p-2">
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="border border-gray-300 p-2 font-medium">
                  {day}
                </td>
                {timeSlots.map((time) => {
                  const course = getTimetable(day, time);
                  return (
                    <td
                      key={`${day}-${time}`}
                      className="border border-gray-300 p-2 hover:bg-gray-50"
                    >
                      {course && (
                        <div className="flex flex-col items-center">
                          <p className="font-bold">
                            {course["Course Details"]}
                          </p>
                          <p>{course["Faculty Assigned"]}</p>
                          <p>{course.Section}</p>
                          <p>{course.Room}</p>
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
    </>
  );
}
