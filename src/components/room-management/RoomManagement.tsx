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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-[#194c87]">Room & Classroom Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage classrooms and laboratories for timetable generation
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "outline" : "default"}
          className="self-start sm:self-auto"
        >
          {showAddForm ? (
            <>
              <X size={16} className="mr-1" />
              Cancel
            </>
          ) : (
            <>
              <Plus size={16} className="mr-1" />
              Add New Room
            </>
          )}
        </Button>
      </div>

      {/* Add Room Form */}
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

      {/* Summary and Tips */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <p className="text-sm font-medium text-gray-800">
              Total Rooms: {rooms.length}
            </p>
            <p className="text-xs text-gray-600">
              {regularRooms.length} Regular Classrooms • {labRooms.length} Laboratories
            </p>
          </div>
          <div className="text-xs text-gray-500">
            💡 Click names to edit • Lab courses scheduled only in labs
          </div>
        </div>
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
