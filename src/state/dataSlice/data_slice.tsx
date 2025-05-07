import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ITimetable {
  className: string;
  courseDetail: string;
  facultyAssigned: string;
  day: string;
  time: string;
  room: string;
  section: string;
  sem: string;
}

interface TimetableState {
  timetableData: ITimetable[];
}

const initialState: TimetableState = {
  timetableData: [],
};
export const timeTableData = createSlice({
  name: "timetable",
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<ITimetable[]>) => {
      state.timetableData = action.payload;
      console.log(action.payload, " Timetable data");
      console.log(state.timetableData, "data");
    },
  },
});

export const { setData } = timeTableData.actions;

export default timeTableData.reducer;
