"use client";

import { useEffect, useState, useId } from "react";
import Select from "react-select";
import { MultiValue } from "react-select";

interface ClassItem {
  "Faculty Assigned": string;
  Time: string;
  Section: string;
  "Course Details": string;
  Day: string;
}

type RoomObject = {
  [roomName: string]: ClassItem[];
};

type DaySchedule = RoomObject[];

interface TimetableData {
  [day: string]: DaySchedule;
}

export default function TeacherTimetable() {
  const [timetable, setTimetable] = useState<TimetableData>({});
  const [teachers, setTeachers] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string[]>([]);
  const [results, setResult] = useState<(ClassItem & { Room: string })[]>([]);
  const [error, setError] = useState<string>("");

  const teacherSelectedId = useId();
  const daySelectedId = useId();
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
  useEffect(() => {
    fetch("/api/timetable")
      .then((res) => res.json())
      .then((data: TimetableData) => {
        setTimetable(data);

        const teacherSet = new Set<string>();
        Object.values(data).forEach((dayRooms) => {
          dayRooms.forEach((roomObj) => {
            const roomName = Object.keys(roomObj)[0];
            const classes = roomObj[roomName];
            classes.forEach((cls) => {
              if (cls["Faculty Assigned"]) {
                teacherSet.add(cls["Faculty Assigned"]);
              }
            });
          });
        });

        setTeachers(Array.from(teacherSet));
      });
  }, []);
  const dayOptions = Object.keys(timetable).map((day) => ({
    value: day,
    label: day,
  }));

  const allOption = { value: "all", label: "Select All Days" };
  const handleDayOptions = (
    selected: MultiValue<{ value: string; label: string }>
  ) => {
    console.log(selected, "selected");
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
    setError("");

    const result: (ClassItem & { Room: string; Day: string })[] = [];

    selectedDay.forEach((day) => {
      if (!timetable[day]) return;

      timetable[day].forEach((roomObj) => {
        const roomName = Object.keys(roomObj)[0];
        const classes = roomObj[roomName];

        classes.forEach((cls) => {
          if (cls["Faculty Assigned"] === selectedTeacher) {
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
  console.log(results, "results");
  const getTimetable = (day: string, time: string) => {
    return results.find((course) => course.Time === time && course.Day === day);
  };
  const isAllSelected = selectedDay.length === dayOptions.length;
  const filteredOptions = isAllSelected
    ? dayOptions
    : [allOption, ...dayOptions];
  return (
    <>
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-2xl">Check Teachers Timetable</h1>
        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Teacher:</label>
          <Select
            instanceId={teacherSelectedId}
            options={teachers.map((teacher) => ({
              value: teacher,
              label: teacher,
            }))}
            value={
              selectedTeacher
                ? { value: selectedTeacher, label: selectedTeacher }
                : null
            }
            onChange={(selectedOption) =>
              setSelectedTeacher(selectedOption ? selectedOption.value : "")
            }
            className="text-black"
            placeholder="Select teacher"
            isClearable
          />
        </div>

        <div className="mb-4 flex flex-col w-full max-w-md">
          <label className="text-xl mb-2">Days:</label>
          <Select
            instanceId={daySelectedId}
            isMulti
            options={filteredOptions}
            onChange={(e) => handleDayOptions(e)}
            // (selectedOptions) =>
            // setSelectedDay(selectedOptions.map((opt) => opt.value))
            // }
            className="text-black"
            placeholder="Select days"
            value={dayOptions.filter((opt) => selectedDay.includes(opt.value))}
          />
        </div>
        <div>
          <button
            className="bg-blue-400 py-2 px-20 cursor-pointer"
            onClick={handleChange}
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
              <tr key={day} className="">
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
