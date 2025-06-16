import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar/page";
import Header from "./header/page";
import { Inter, Roboto } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { TimetableVersionProvider } from "@/context/TimetableContext";
import { getServerData } from "@/lib/serverData/serverData";

// Configure fonts
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const roboto = Roboto({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Timetable Management System",
  description: "School timetable management application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch initial timetable data using server helper
  const serverData = await getServerData();

  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable}`}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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

        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
          <div className="w-full md:w-60 md:h-full flex-shrink-0">
            <Sidebar />
          </div>

          <div className="flex-1 h-full overflow-x-auto">
            {/* Pass server-fetched data to context provider */}
            <TimetableVersionProvider initialData={serverData}>
              {children}
            </TimetableVersionProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
