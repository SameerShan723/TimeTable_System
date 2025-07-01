"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { FaEllipsisV, FaInfoCircle } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { SessionDetails } from "./ClientTimetable";
import React, { useState, useRef, useEffect } from "react";
import { Session } from "./types";

interface DroppableCellProps {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isDraggingOver: boolean;
  isMobile: boolean;
  conflicts?: string[];
  isLoading: boolean;
  onAddClass: () => void;
  onDeleteClass: () => void;
}

interface DraggableSessionProps {
  id: string;
  session: Session;
  isDragging?: boolean;
  isDisabled?: boolean;
}

interface DroppableDivProps {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isDraggingOver: boolean;
  isMobile: boolean;
  conflicts?: string[];
  isLoading: boolean;
  onAddClass: () => void;
  onDeleteClass: () => void;
}

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-gray-200 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export const DroppableCell: React.FC<DroppableCellProps> = React.memo(
  ({
    id,
    children,
    isEmpty,
    isDraggingOver,
    isMobile,
    conflicts,
    isLoading,
    onAddClass,
    onDeleteClass,
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id,
      disabled: isMobile,
    });
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setShowMenu(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, []);

    const className = `border p-3 transition-all duration-200 min-w-0 relative group ${
      !isMobile && isOver ? "bg-blue-100 border-2 border-blue-400" : ""
    } ${
      !isMobile && isDraggingOver && isEmpty ? "bg-gray-100 opacity-50" : ""
    } ${
      !isLoading && conflicts && conflicts.length > 0
        ? "border-2 border-red-500"
        : ""
    }`;

    return (
      <td
        ref={setNodeRef}
        className={className}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isLoading ? (
          <div className="flex flex-col p-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            {children}
            {!isMobile && isHovered && !isDraggingOver && (
              <div className="absolute top-1 right-1" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Cell options"
                >
                  <FaEllipsisV className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    {isEmpty ? (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onAddClass();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Add Class
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onDeleteClass();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                      >
                        Delete Class
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {!isLoading && conflicts && conflicts.length > 0 && (
              <div className="absolute top-1 right-6 group">
                <FaInfoCircle className="w-4 h-4 text-red-500 cursor-pointer" />
                <div className="hidden group-hover:block absolute z-20 bg-gray-800 text-white text-xs p-2 rounded shadow-lg right-0 top-5 w-64">
                  {conflicts.map((message, i) => (
                    <p key={i}>{message}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </td>
    );
  }
);
DroppableCell.displayName = "DroppableCell";

export const DraggableSession: React.FC<DraggableSessionProps> = React.memo(
  ({ id, session, isDragging = false, isDisabled = false }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({
      id,
      disabled: isDisabled,
    });
    const className = `transition-all ease-in-out ${
      isDisabled
        ? "cursor-not-allowed opacity-50"
        : "cursor-move hover:bg-gray-50"
    } ${
      isDragging ? "opacity-70 scale-105 rotate-1 shadow-xl bg-blue-50" : ""
    }`;
    const staticAttributes = {
      ...attributes,
      "aria-describedby": `DndDescribedBy-${id.replace(/[^a-zA-Z0-9]/g, "")}`,
    };
    return (
      <div
        ref={setNodeRef}
        {...(isDisabled ? {} : listeners)}
        {...staticAttributes}
        className={className}
      >
        <SessionDetails session={session} />
      </div>
    );
  }
);
DraggableSession.displayName = "DraggableSession";

export const DroppableDiv: React.FC<DroppableDivProps> = React.memo(
  ({
    id,
    children,
    isEmpty,
    isDraggingOver,
    isMobile,
    conflicts,
    isLoading,
    onAddClass,
    onDeleteClass,
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id,
      disabled: isMobile,
    });
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setShowMenu(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, []);

    const className = `border p-1 md:p-2 transition-all duration-200 relative group ${
      !isMobile && isOver ? "bg-blue-100 border-2 border-blue-400" : ""
    } ${
      !isMobile && isDraggingOver && isEmpty ? "bg-gray-100 opacity-50" : ""
    } ${
      !isLoading && conflicts && conflicts.length > 0
        ? "border-2 border-red-500"
        : ""
    }`;

    return (
      <div
        ref={setNodeRef}
        className={className}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isLoading ? (
          <div className="flex flex-col p-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            {children}
            {!isMobile && isHovered && !isDraggingOver && (
              <div className="absolute top-1 right-1" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Cell options"
                >
                  <FaEllipsisV className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    {isEmpty ? (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onAddClass();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Add Class
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onDeleteClass();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                      >
                        Delete Class
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {!isLoading && conflicts && conflicts.length > 0 && (
              <div className="absolute top-1 right-6 group">
                <FaInfoCircle className="w-4 h-4 text-red-500 cursor-pointer" />
                <div className="hidden group-hover:block absolute z-20 bg-gray-800 text-white text-xs p-2 rounded shadow-lg right-0 top-5 w-64">
                  {conflicts.map((message, i) => (
                    <p key={i}>{message}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);
DroppableDiv.displayName = "DroppableDiv";
