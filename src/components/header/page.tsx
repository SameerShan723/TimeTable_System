import Image from "next/image";

export default function Header() {
  return (
    <div className="h-full bg-white flex items-center justify-between px-4 shadow-md sticky top-0 z-50">
      <div className="flex-shrink-0">
        <Image
          src="/logo.png" // or use "/logo.svg" for best quality
          alt="University Logo"
          width={232}
          height={52}
          priority
          className="object-contain w-[115px] md:w-[232px] h-auto"
        />
      </div>

      <div className="flex-1 flex justify-center px-2">
        <h1 className="text-blue-900 text-[9px] md:text-2xl font-bold text-center overflow-hidden text-ellipsis whitespace-nowrap">
          Weekly Timetable For The CS Department
        </h1>
      </div>

      <div className="flex-shrink-0 w-10 md:w-20"></div>
    </div>
  );
}
