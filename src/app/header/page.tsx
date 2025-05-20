import Image from "next/image";

export default function Header() {
  return (
    <div className="">
      <div className="flex items-center ">
        <Image
          src="/logo.png"
          alt="Description of image"
          width={232}
          height={52}
          style={{ objectFit: "cover" }}
        />
        <div className="flex flex-1 justify-center">
          <h1 className=" text-blue-900 text-2xl font-bold ">
            Weekly Timetable For The CS Department
          </h1>
        </div>
      </div>
    </div>
  );
}
