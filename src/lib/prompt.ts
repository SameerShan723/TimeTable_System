// const generateDynamicPrompt = (data: FormValues): string => {
//   const totalCreditHours = data.teacherData.reduce((sum, teacher) => {
//     const hours = parseInt(teacher["Credit Hours"]);
//     return sum + (isNaN(hours) ? 0 : hours);
//   }, 0);

//   const rooms = Array.from(
//     new Set(data.rulesData.map((rule) => rule["Key"]))
//   ).filter((room) => room && typeof room === "string");

//   let prompt = `You are an AI assistant responsible for generating a university-level timetable using the provided teacher and room data. The timetable must follow these strict rules and return structured JSON data.\n\n`;

//   // Rules
//   prompt += `Constraints:\n`;
//   prompt += `- Each class duration: 1 hour.\n`;
//   prompt += `- University working hours: 9:30 AM to 4:30 PM (7 one-hour slots: 9:30-10:30, 10:30-11:30, 11:30-12:30, 12:30-1:30, 1:30-2:30, 2:30-3:30, 3:30-4:30).\n`;
//   prompt += `- Prefer morning classes: ${
//     data.preferMorningClass ? "Yes" : "No"
//   }.\n`;
//   prompt += `- Distribute all classes evenly across Monday to Friday.\n`;
//   prompt += `- Total weekly subject class count is ${totalCreditHours}, so approximately ${Math.ceil(
//     totalCreditHours / 5
//   )} classes should be scheduled per day.\n`;

//   // Room balancing constraints
//   prompt += `- **Do not leave any room completely empty on any day.**\n`;
//   prompt += `- **Every room must have at least 4 classes scheduled each weekday** (out of 7 available time slots).\n`;
//   prompt += `- **Distribute free time and gaps across all rooms evenly.** No room should carry all the free slots while others are fully packed.\n`;
//   prompt += `- **Every room must be used every day.**\n`;

//   // Class frequency from credit hours
//   prompt += `- Class frequency based on credit hours:\n`;
//   data.teacherData.forEach((teacher) => {
//     const faculty = teacher["Faculty Assigned"];
//     const subject = teacher["Course Details"];
//     const creditHours = parseInt(teacher["Credit Hours"]);
//     if (!isNaN(creditHours)) {
//       prompt += `  - ${faculty} (${subject}) → ${creditHours} class${
//         creditHours > 1 ? "es" : ""
//       } per week, spread across weekdays.\n`;
//     }
//   });

//   // Teachers
//   prompt += `\nTeacher List:\n`;
//   data.teacherData.forEach((teacher, index) => {
//     prompt += `${index + 1}. Faculty: ${
//       teacher["Faculty Assigned"]
//     }, Subject: ${teacher["Course Details"]}, Subject Code: ${
//       teacher["Subject Code"]
//     }, Subject TYPE: ${teacher["Subject TYPE"]}, Sem: ${
//       teacher["Sem"]
//     }, Section: ${teacher["section"]}, Semester Details: ${
//       teacher["Semester Details"]
//     }, Credit Hours: ${teacher["Credit Hours"]}, Domain: ${
//       teacher["Domain"]
//     }, Pre-Req: ${teacher["Pre-Req"]}\n`;
//   });

//   // Rooms
//   if (rooms.length === 0) {
//     prompt += `\nNo rooms available.\n`;
//   } else {
//     prompt += `\nAvailable Rooms:\n`;
//     rooms.forEach((room, index) => {
//       prompt += `${index + 1}. Room: ${room}\n`;
//     });
//   }

//   // Output structure
//   prompt += `\n---\n`;
//   prompt += `Generate only valid JSON using the following format:\n\n`;
//   prompt += `{\n`;

//   const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
//   const timeSlots = [
//     "9:30-10:30",
//     "10:30-11:30",
//     "11:30-12:30",
//     "12:30-1:30",
//     "1:30-2:30",
//     "2:30-3:30",
//     "3:30-4:30",
//   ];

//   weekdays.forEach((day, dayIndex) => {
//     prompt += `  "${day}": [\n`;
//     rooms.forEach((room, roomIndex) => {
//       prompt += `    {\n`;
//       prompt += `      "${room}": [\n`;
//       timeSlots.forEach((time, slotIndex) => {
//         prompt += `        ${
//           slotIndex < 4 ? `{ /* Class details for ${time} */ }` : `{}`
//         }${slotIndex < timeSlots.length - 1 ? "," : ""}\n`;
//       });
//       prompt += `      ]${roomIndex < rooms.length - 1 ? "," : ""}\n`;
//       prompt += `    }\n`;
//     });
//     prompt += `  ]${dayIndex < weekdays.length - 1 ? "," : ""}\n`;
//   });

//   prompt += `}\n\n`;

//   prompt += `Notes:\n`;
//   prompt += `- Each scheduled class object must include: Room, Time, Faculty Assigned, Course Details, Subject Code, Subject TYPE, Domain, Pre-Req, Sem, Section, Semester Details.\n`;
//   prompt += `- Sem should be a number (e.g., 2, 4, 6).\n`;
//   prompt += `- Unscheduled time slots should be represented as empty objects ({}).\n`;
//   prompt += `- Each room must have exactly 7 time slots per day, with at least 4 scheduled classes and the rest as empty objects.\n`;
//   prompt += `- Do not schedule overlapping classes in the same room or for the same teacher.\n`;
//   prompt += `- Return only valid raw JSON without markdown or any extra text.\n`;

//   return prompt;
// };
