"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    capacity: undefined as number | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        capacity: undefined,
      });
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
      <h4 className="font-medium text-gray-800 mb-3">Add New Room</h4>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Room Name"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            required
            className="h-auto py-2"
          />
          <select
            value={newRoom.type}
            onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as "Regular" | "Lab" })}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Regular">Regular Classroom</option>
            <option value="Lab">Laboratory</option>
          </select>
          <Input
            type="number"
            placeholder="Capacity (optional)"
            value={newRoom.capacity || ""}
            onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
            className="h-auto py-2"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus size={16} />
              Add Room
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              <X size={16} />
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
