"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { Loader2, Plus } from "lucide-react";

interface AddRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roomName: string) => void;
  existingRooms: string[];
  isLoading?: boolean;
}

export default function AddRoomDialog({
  isOpen,
  onClose,
  onSubmit,
  existingRooms,
  isLoading = false,
}: AddRoomDialogProps) {
  const [roomName, setRoomName] = useState("");

  const handleSubmit = () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    if (existingRooms.includes(roomName.trim())) {
      toast.error("Room with this name already exists");
      return;
    }

    onSubmit(roomName.trim());
    setRoomName("");
    onClose();
  };

  const handleClose = () => {
    setRoomName("");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="bg-black bg-opacity-50" />
        <AlertDialogContent className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-blue-900">
              Add New Room
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-sm">
              Create a new room in the current timetable version. It will be added for all days as empty slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex flex-col gap-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Room 301 or Comp Lab 05"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              onClick={handleClose}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none"
              disabled={isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#042954] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
              Add Room
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
