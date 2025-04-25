import * as Yup from "yup";

export const timetableSchema = Yup.object({
  maxClasses: Yup.string().required("Max classes per day is required"),
  classBreakTime: Yup.string().required("Class break time is required"),
  teacherData: Yup.array()
    .min(1, "Teacher data is required")
    .required("Teacher data is required"),
  rulesData: Yup.array()
    .min(1, "Rules data is required")
    .required("Rules data is required"),
});
