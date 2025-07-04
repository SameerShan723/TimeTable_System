import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog";

interface DeleteClassDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteClassDialog: React.FC<DeleteClassDialogProps> = ({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogPortal>
        <AlertDialogOverlay
          className="bg-[#042957]"
          style={{ backdropFilter: "blur(2px)" }}
        />
        <AlertDialogContent className="bg-[#042957] text-[#9ea8b5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#9EA8F5]">
              Delete Class
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#9ea8b5] text-sm">
              Are you sure you want to delete this class? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={onClose}
              className="bg-red-800 hover:bg-red-900 text-white text-sm"
              disabled={isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              className="bg-blue-900 hover:bg-blue-800 text-white text-sm flex items-center gap-2"
              disabled={isLoading}
            >
              Delete
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
};

export default DeleteClassDialog;
