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
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/supabase";
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
    .nonempty({ message: "Semester is required." })
    .regex(/^[1-9]$/, {
      message: "Semester must be a number from 1 to 9.",
    }),
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
});

// Define form values type
type FormValues = z.infer<typeof formSchema>;

export default function CourseForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { courses, setCourses } = useCourses(); // Access CourseContext

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
    },
  });

  // Submit handler with explicit type
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      // Insert the new course into Supabase and select the inserted row
      const { data, error } = await supabase
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

      toast.success("Course data saved successfully!", {
        description: "The course has been added to the database.",
      });
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Failed to save course data.", {
          description: "Please try again or check your connection.",
        });
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
          className="space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
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
                    <Input
                      placeholder="e.g., 4"
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
