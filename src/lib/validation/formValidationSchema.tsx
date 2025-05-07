import * as Yup from "yup";

export const timetableSchema = Yup.object({
  teacherData: Yup.array()
    .min(1, "Teacher data is required")
    .required("Teacher data is required"),
  rulesData: Yup.array()
    .min(1, "Rules data is required")
    .required("Rules data is required"),
});
