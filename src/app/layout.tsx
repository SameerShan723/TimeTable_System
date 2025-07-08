import type { Metadata } from "next";
import "./globals.css";
import SidebarWrapper from "@/components/sidebar/SidebarWrapper";
import Header from "../components/header/page";
// import { Inter, Roboto } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { TimetableVersionProvider } from "@/context/TimetableContext";
import { getServerData } from "@/lib/serverData/serverData";
import { Toaster } from "sonner";
import CourseDataFetcher from "@/lib/serverData/CourseDataFetcher";

// Configure fonts
// className={`${inter.variable} ${roboto.variable}`}
// const inter = Inter({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-inter",
// });
// const roboto = Roboto({
//   weight: ["400", "700"],
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-roboto",
// });

export const metadata: Metadata = {
  title: "Timetable Management System",
  description: "School timetable management application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serverData = await getServerData();

  return (
    <html lang="en">
      <body
        style={{ fontFamily: "Arial, sans-serif" }}
        className=" antialiased overflow-hidden"
      >
        <NextTopLoader
          showSpinner={false}
          color="#3b82f6"
          height={3}
          crawlSpeed={300}
        />
        <div className="h-16 sticky top-0 z-50 shadow-xl">
          <Header />
        </div>
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
          <SidebarWrapper />
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <CourseDataFetcher>
              <TimetableVersionProvider initialData={serverData}>
                {children}
                <Toaster />
              </TimetableVersionProvider>
            </CourseDataFetcher>
          </div>
        </div>
      </body>
    </html>
  );
}
