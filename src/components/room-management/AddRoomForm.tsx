"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { Room } from "@/lib/generate-timetable-schema/page";
import { Plus, X } from "lucide-react";

interface AddRoomFormProps {
  onAdd: (room: Omit<Room, 'id'>) => void;
  onCancel: () => void;
}

export function AddRoomForm({ onAdd, onCancel }: AddRoomFormProps) {
  const [newRoom, setNewRoom] = useState({
    name: "",
    type: "Regular" as "Regular" | "Lab",
    capacity: 40 as number | undefined,
  });

  const handleAdd = () => {
    if (newRoom.name.trim()) {
      onAdd({
        name: newRoom.name.trim(),
        type: newRoom.type,
        capacity: newRoom.capacity,
        isNew: true,
      });
      setNewRoom({
        name: "",
        type: "Regular",
        capacity: 40,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
      <h4 className="font-medium text-gray-800 mb-4">Add New Room</h4>
      
      {/* Form Fields */}
      <div className="space-y-4 mb-4">
        {/* Room Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Name
          </label>
          <Input
            type="text"
            placeholder="Enter room name (e.g., Room 301, Lab A)"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            onKeyPress={handleKeyPress}
            className="w-full"
          />
        </div>

        {/* Type and Capacity Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Type
            </label>
            <Select
              value={newRoom.type}
              onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as "Regular" | "Lab" })}
              className="w-full"
            >
              <option value="Regular">Regular Classroom</option>
              <option value="Lab">Laboratory</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity
            </label>
            <Input
              type="number"
              placeholder="40"
              value={newRoom.capacity || ""}
              onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value ? parseInt(e.target.value) : 40 })}
              onKeyPress={handleKeyPress}
              className="w-full"
              min="1"
              max="200"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="default"
          onClick={handleAdd}
          disabled={!newRoom.name.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 h-10 px-4 w-full sm:w-auto"
        >
          <Plus size={16} className="mr-2" />
          Add Room
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10 px-4 w-full sm:w-auto"
        >
          <X size={16} className="mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
