"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Room } from "@/lib/generate-timetable-schema/page";
import { Edit2, Trash2 } from "lucide-react";

interface RoomCardProps {
  room: Room;
  onEdit: (field: keyof Room, value: string | number) => void;
  onDelete: () => void;
  variant: "regular" | "lab";
}

export function RoomCard({ room, onEdit, onDelete, variant }: RoomCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleNameEdit = (newName: string) => {
    if (newName.trim()) {
      onEdit('name', newName.trim());
    }
    setIsEditing(false);
  };

  const themeClasses = {
    regular: {
      container: "bg-blue-50 border-blue-200 hover:shadow-md",
      text: "text-blue-800",
      input: "border-blue-300 text-blue-800",
      hover: "hover:bg-blue-100",
      editButton: "text-blue-600 hover:text-blue-800 hover:bg-blue-100",
      capacityLabel: "text-blue-600",
    },
    lab: {
      container: "bg-green-50 border-green-200 hover:shadow-md",
      text: "text-green-800",
      input: "border-green-300 text-green-800",
      hover: "hover:bg-green-100",
      editButton: "text-green-600 hover:text-green-800 hover:bg-green-100",
      capacityLabel: "text-green-600",
    },
  };

  const theme = themeClasses[variant];

  return (
    <div className={`border rounded-lg p-3 transition-shadow ${theme.container}`}>
      <div className="flex justify-between items-start mb-2">
        {isEditing ? (
          <Input
            defaultValue={room.name}
            onBlur={(e) => handleNameEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNameEdit(e.currentTarget.value);
              } else if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            autoFocus
            className={`font-medium bg-white flex-1 mr-2 h-auto py-1 ${theme.input}`}
          />
        ) : (
          <div 
            className={`font-medium flex-1 mr-2 cursor-pointer px-2 py-1 rounded ${theme.text} ${theme.hover}`}
            onClick={() => setIsEditing(true)}
            title="Click to edit room name"
          >
            {room.name}
          </div>
        )}
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(!isEditing)}
            className={`text-sm p-1 h-auto w-auto ${theme.editButton}`}
            title="Edit room name"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm p-1 h-auto w-auto hover:bg-red-100"
            title="Delete room"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className={theme.capacityLabel}>Capacity:</span>
        <Input
          type="number"
          value={room.capacity || 40}
          onChange={(e) => onEdit('capacity', e.target.value ? parseInt(e.target.value) : 40)}
          placeholder="40"
          className={`w-20 text-center h-auto py-0.5 ${theme.input}`}
        />
      </div>
    </div>
  );
}
