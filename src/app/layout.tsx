import type { Metadata } from "next";
import "./globals.css";
import SidebarWrapper from "@/components/sidebar/SidebarWrapper";
import Header from "@/components/header/page";
import NextTopLoader from "nextjs-toploader";
import { TimetableVersionProvider } from "@/context/TimetableContext";
import { AuthProvider } from "@/context/AuthContext";
import CourseDataFetcher from "@/lib/serverData/CourseDataFetcher";
import {
  getTimetableData,
  TimetableServerData,
} from "@/lib/serverData/serverData";

export const metadata: Metadata = {
  title: "Timetable Management System",
  description: "School timetable management application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serverData: TimetableServerData = await getTimetableData();

  return (
    <html lang="en">
      <body
        className="antialiased overflow-hidden"
        suppressHydrationWarning
      >
        <NextTopLoader showSpinner={false} color="#3b82f6" height={3} />
        <AuthProvider
          initialAuth={{
            isAuthenticated: serverData.isAuthenticated,
            isSuperadmin: serverData.isSuperadmin,
            user: serverData.user, // Pass user object here
          }}
        >
          <div className="h-16 sticky top-0 z-50 shadow-xl">
            <Header />
          </div>
          <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
            <SidebarWrapper />
            <div className="flex-1 overflow-x-auto">
              <CourseDataFetcher>
                <TimetableVersionProvider
                  initialData={{
                    versions: serverData.versions,
                    selectedVersion: serverData.selectedVersion,
                    timetableData: serverData.timetableData,
                  }}
                >
                  {children}
                </TimetableVersionProvider>
              </CourseDataFetcher>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
