"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Room } from "@/lib/generate-timetable-schema/page";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { AddRoomForm } from "./AddRoomForm";
import { RoomSection } from "./RoomSection";
import { Plus, X } from "lucide-react";

interface RoomManagementProps {
  rooms: Room[];
  onRoomEdit: (roomId: string, field: keyof Room, value: string | number) => void;
  onAddRoom: (room: Omit<Room, 'id'>) => void;
  onRemoveRoom: (roomId: string) => void;
}

export function RoomManagement({
  rooms,
  onRoomEdit,
  onAddRoom,
  onRemoveRoom,
}: RoomManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const regularRooms = rooms.filter(room => room.type === "Regular");
  const labRooms = rooms.filter(room => room.type === "Lab");

  const handleDeleteRoom = (roomId: string) => {
    if (rooms.length <= 1) {
      alert("Cannot delete the last remaining room. At least one room is required for timetable generation.");
      return;
    }
    setDeleteConfirm(roomId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onRemoveRoom(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleAddRoom = (room: Omit<Room, 'id'>) => {
    onAddRoom(room);
    setShowAddForm(false);
  };

  const roomToDelete = rooms.find(r => r.id === deleteConfirm);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-[#194c87]">Room & Classroom Management</h3>
        <Button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "outline" : "default"}
        >
          {showAddForm ? (
            <>
              <X size={16} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={16} />
              Add New Room
            </>
          )}
        </Button>
      </div>

      {showAddForm && (
        <AddRoomForm 
          onAdd={handleAddRoom}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Regular Classrooms */}
      <RoomSection
        title="Regular Classrooms"
        rooms={regularRooms}
        variant="regular"
        onRoomEdit={onRoomEdit}
        onRoomDelete={handleDeleteRoom}
      />

      {/* Laboratory Classrooms */}
      <RoomSection
        title="Laboratory Classrooms"
        rooms={labRooms}
        variant="lab"
        onRoomEdit={onRoomEdit}
        onRoomDelete={handleDeleteRoom}
      />

      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Total Rooms:</strong> {rooms.length} ({regularRooms.length} Regular, {labRooms.length} Labs)
        </p>
        <p className="text-xs text-gray-500 mt-1">
          💡 Tips: Click room names to edit • Use ✏️ to edit or 🗑️ to delete • Lab courses will only be scheduled in Laboratory rooms
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${roomToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
