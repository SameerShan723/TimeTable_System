"use client";
import { RootState } from "@/state/store";
import { useSelector } from "react-redux";

const Timetable = () => {
  const data = useSelector(
    (state: RootState) => state.timetableData.timetableData
  );
  console.log(data, "data");

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  console.log(columns, "columns");

  if (!data || data.length === 0) {
    return <div>No timetable data available.</div>;
  }

  return (
    <main>
      <div></div>
    </main>
  );
};

export default Timetable;
