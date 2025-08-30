export const timeSlots: string[] = [
  "9:30-10:30",
  "10:30-11:30",
  "11:30-12:30",
  "12:30-1:30",
  "1:30-2:30",
  "2:30-3:30",
  "3:30-4:30",
];

export const RegularRooms: string[] = [
  "Room 229",
  "Room 247",
  "NAB 01",
  "NAB 03",
  "NAB 04",
  "NAB 05",
  "NAB 06",
  "NAB 07",
  "NAB 08",
  "Extra Room 1",
  "Extra Room 02",
];

export const LabRooms: string[] = [
  "Comp Lab 01",
  "Comp Lab 02",
  "Comp Lab 03",
  "Comp Lab 04",
  "Lab Room 210",
  "Research Lab",
];

// Combined array for backward compatibility
export const Rooms: string[] = [...RegularRooms, ...LabRooms];

export const Days: string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
