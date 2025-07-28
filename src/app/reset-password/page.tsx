"use client";

import ResetPassword from "@/components/reset-password/page";

export default function ResetPasswordPage() {
 ;
  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className=" w-full max-w-md">
        <ResetPassword />
      </div>
    </div>
  );
}