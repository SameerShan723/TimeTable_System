"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}

export function FormSection({ title, children, className, description }: FormSectionProps) {
  return (
    <div className={cn("bg-white rounded-xl border-2 border-gray-200 p-6 mb-6", className)}>
      <h3 className="text-xl font-semibold text-[#194c87] mb-4">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}
