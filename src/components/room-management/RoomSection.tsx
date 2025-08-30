"use client";

import React from "react";
import { RoomCard } from "./RoomCard";
import { Room } from "@/lib/generate-timetable-schema/page";
import { School, Microscope } from "lucide-react";

interface RoomSectionProps {
  title: string;
  rooms: Room[];
  variant: "regular" | "lab";
  onRoomEdit: (roomId: string, field: keyof Room, value: string | number) => void;
  onRoomDelete: (roomId: string) => void;
}

export function RoomSection({ 
  title, 
  rooms, 
  variant, 
  onRoomEdit, 
  onRoomDelete 
}: RoomSectionProps) {
  const Icon = variant === "regular" ? School : Microscope;
  
  return (
    <div className={rooms.length === 0 ? "mb-6" : "mb-6"}>
      <h4 className="text-lg font-medium text-[#194c87] mb-3 flex items-center gap-2">
        <Icon size={20} className="text-[#194c87]" />
        {title} ({rooms.length})
      </h4>
      {rooms.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-sm">No {variant} rooms added yet</p>
          <p className="text-xs mt-1">Use the "Add New Room" button to create {variant} classrooms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              variant={variant}
              onEdit={(field, value) => onRoomEdit(room.id, field, value)}
              onDelete={() => onRoomDelete(room.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
