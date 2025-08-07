"use client";

import { useForm, SubmitHandler, UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Select from "react-select";
import { toast } from "react-toastify";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useState } from "react";
import { useCourses } from "@/context/CourseContext";
import { Course } from "@/lib/serverData/CourseDataFetcher";

// Validation schema
const formSchema = z.object({
  courseDetails: z
    .string()
    .trim()
    .min(5, { message: "Course details must be at least 5 characters." }),
  section: z
    .string()
    .trim()
    .min(5, { message: "Section must be at least 5 characters." }),
  semester: z
    .string()
    .trim()
    .nonempty({ message: "Semester is required." }),
  semesterDetails: z.string().trim().optional(),
  creditHour: z
    .string()
    .trim()
    .nonempty({ message: "Credit hour is required." })
    .regex(/^[1-9]$/, {
      message: "Credit hour must be a number from 1 to 9.",
    }),
  facultyAssigned: z
    .string()
    .trim()
    .min(5, { message: "Faculty name must be at least 5 characters." }),
  isRegularTeacher: z.boolean().default(false),
  domain: z.string().optional(),
  subjectCode: z.string().optional(),
  subjectType: z.string().optional(),
  theoryClassesWeek: z.number().min(1, { message: "Theory classes per week is required and must be at least 1." }),
  labClassesWeek: z.number().min(0).default(0),
});

// Define form values type
type FormValues = z.infer<typeof formSchema>;

export default function CourseForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { courses, setCourses } = useCourses(); // Access CourseContext

  // Semester options for react-select
  const semesterOptions = [
    { value: "1", label: "Semester 1" },
    { value: "2", label: "Semester 2" },
    { value: "3", label: "Semester 3" },
    { value: "4", label: "Semester 4" },
    { value: "5", label: "Semester 5" },
    { value: "6", label: "Semester 6" },
    { value: "7", label: "Semester 7" },
    { value: "8", label: "Semester 8" },
  ];

  // Define form with explicit typing
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as UseFormProps<FormValues>["resolver"],
    mode: "onTouched",
    defaultValues: {
      courseDetails: "",
      section: "",
      semester: "",
      semesterDetails: "",
      creditHour: "",
      facultyAssigned: "",
      isRegularTeacher: false,
      domain: "",
      subjectCode: "",
      subjectType: "",
             theoryClassesWeek: 1,
       labClassesWeek: 0,
    },
  });

  // Submit handler with explicit type
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
             // Insert the new course into Supabase and select the inserted row
       const { data, error } = await supabaseClient
         .from("courses")
         .insert([
           {
             course_details: values.courseDetails,
             section: values.section,
             semester: parseInt(values.semester),
             semester_details: values.semesterDetails || null,
             credit_hour: parseInt(values.creditHour),
             faculty_assigned: values.facultyAssigned,
             is_regular_teacher: values.isRegularTeacher,
             domain: values.domain || null,
             subject_code: values.subjectCode || null,
             subject_type: values.subjectType || null,
             theory_classes_week: values.theoryClassesWeek,
             lab_classes_week: values.labClassesWeek,
           },
         ])
         .select()
         .single();

      if (error) {
        throw error;
      }

      // Update the CourseContext with the new course
      if (data) {
        setCourses([...courses, data as Course]);
      }

      toast.success("Course data saved successfully!");
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Failed to save course data.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="flex items-center justify-center text-4xl font-bold pb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-600">
        Add New Course
      </h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100  overflow-y-auto"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="courseDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Course Details
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Introduction to Remote Sensing"
                      className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Section
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., (BS (GIS &RS (2024-2028)) 2nd"
                      className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
          </div>
                     <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
             <FormField
               control={form.control}
               name="semester"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-sm font-semibold text-gray-700">
                     Semester
                   </FormLabel>
                   <FormControl>
                     <Select
                       options={semesterOptions}
                       value={semesterOptions.find(option => option.value === field.value) || null}
                       onChange={(selectedOption) => field.onChange(selectedOption?.value || "")}
                       placeholder="Select Semester"
                       className="w-full"
                       classNamePrefix="react-select"
                       styles={{
                         control: (provided) => ({
                           ...provided,
                           height: '48px',
                           backgroundColor: '#f9fafb',
                           border: '1px solid #e5e7eb',
                           borderRadius: '8px',
                           '&:hover': {
                             borderColor: '#3b82f6'
                           },
                           '&:focus-within': {
                             borderColor: '#3b82f6',
                             boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
                           }
                         }),
                         option: (provided, state) => ({
                           ...provided,
                           backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                           color: state.isSelected ? 'white' : '#374151'
                         })
                       }}
                     />
                   </FormControl>
                   <FormMessage className="text-sm text-red-500 mt-1" />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="semesterDetails"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-sm font-semibold text-gray-700">
                     Semester Details (Optional)
                   </FormLabel>
                   <FormControl>
                     <Input
                       placeholder="e.g., Spring 2025"
                       className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                       {...field}
                     />
                   </FormControl>
                   <FormMessage className="text-sm text-red-500 mt-1" />
                 </FormItem>
               )}
             />
           </div>
                     <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
             <FormField
               control={form.control}
               name="creditHour"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-sm font-semibold text-gray-700">
                     Credit Hour
                   </FormLabel>
                   <FormControl>
                     <Input
                       placeholder="e.g., 3"
                       type="number"
                       className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                       {...field}
                     />
                   </FormControl>
                   <FormMessage className="text-sm text-red-500 mt-1" />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="facultyAssigned"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-sm font-semibold text-gray-700">
                     Faculty Assigned
                   </FormLabel>
                   <FormControl>
                     <Input
                       placeholder="e.g., Syed Najam Ul Hassan"
                       className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                       {...field}
                     />
                   </FormControl>
                   <FormMessage className="text-sm text-red-500 mt-1" />
                 </FormItem>
               )}
             />
           </div>
           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                           <FormField
                control={form.control}
                name="theoryClassesWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Theory Classes per Week
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2"
                        type="number"
                        min="1"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
                           <FormField
                control={form.control}
                name="labClassesWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Lab Classes per Week (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1"
                        type="number"
                        min="0"
                        className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-500 mt-1" />
                  </FormItem>
                )}
              />
           </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Domain (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., CS"
                      className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subjectCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Subject Code (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., GIS-302"
                      className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="subjectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Subject Type (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., RS-Core"
                      className="w-full h-12 px-4 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRegularTeacher"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 pt-4">
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Regular Teacher
                  </FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="h-5 w-5"
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-500 mt-1" />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-white bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-700 hover:to-indigo-700 rounded-lg font-semibold text-lg transition-all duration-200 shadow-md"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
