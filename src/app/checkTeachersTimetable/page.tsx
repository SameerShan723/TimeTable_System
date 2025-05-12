"use client";

import { useEffect, useState } from "react";

interface ClassItem {
  "Faculty Assigned": string;
  Time: string;
  Section: string;
  "Course Details": string;
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
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [results, setResult] = useState<(ClassItem & { Room: string })[]>([]);
  const [error, setError] = useState<string>("");

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

  const handleChange = () => {
    setError("");
    if (!selectedTeacher) {
      setError("Please select a teacher!");
      setResult([]);
      return;
    }

    if (!selectedDay) {
      setError("Please select a day!");
      setResult([]);
      return;
    }

    if (!timetable[selectedDay]) {
      setError("No timetable found for the selected day!");
      setResult([]);
      return;
    }

    setError("");

    const result: (ClassItem & { Room: string })[] = [];

    timetable[selectedDay].forEach((roomObj) => {
      const roomName = Object.keys(roomObj)[0];
      const classes = roomObj[roomName];
      classes.forEach((cls) => {
        if (cls["Faculty Assigned"] === selectedTeacher) {
          result.push({ ...cls, Room: roomName });
        }
      });
    });
    if (result.length === 0) {
      setError("No classes found for the selected teacher on this day.");
    } else {
      setError(""); // Clear previous error
    }
    setResult(result);
  };

  return (
    <>
      <div className="flex items-center justify-center flex-col">
        <h1 className="font-bold text-2xl">Check Teachers Timetable</h1>
        <div className="mb-4 flex flex-col ">
          <label htmlFor="" className="text-xl">
            Teacher :
          </label>
          <select
            onChange={(e) => setSelectedTeacher(e.target.value)}
            value={selectedTeacher}
            className="border-2 w-100 h-10"
          >
            <option value="">Select Teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher} value={teacher}>
                {teacher}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4 flex flex-col ">
          <label htmlFor="" className="text-xl">
            Day:
          </label>
          <select
            onChange={(e) => setSelectedDay(e.target.value)}
            value={selectedDay}
            className="border-2 w-100 h-10"
          >
            <option value="">Select day</option>
            {Object.keys(timetable).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button className="bg-blue-400 py-2 px-20 " onClick={handleChange}>
            Show Classes
          </button>
        </div>
        <div className="text-2xl">
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </div>
      {results.length > 0 && (
        <section className="flex justify-center mt-20 ">
          <ul className="flex justify-center gap-6 flex-wrap">
            {results.map((cls, idx) => (
              <li key={idx} className="border p-2 rounded shadow-sm w-80">
                <div>
                  <strong>Time:</strong> {cls.Time}
                </div>
                <div>
                  <strong>Course:</strong> {cls["Course Details"]}
                </div>
                <div>
                  <strong>Room:</strong> {cls.Room}
                </div>
                <div>
                  <strong>Section:</strong> {cls.Section}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
