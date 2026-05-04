// src/components/organizer/EventQuickActions.tsx

import React, { useEffect, useRef, useState } from "react";
import { MoreVertical, Eye, Edit3, XCircle, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

type Props = {
  status: "published" | "draft" | "cancelled" | "past";
  onView: () => void;
  onEdit: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  isProcessing?: boolean;
};

const EventQuickActions: React.FC<Props> = ({
  status,
  onView,
  onEdit,
  onCancel,
  onDelete,
  isProcessing,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"cancel" | "delete" | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------------------------------
     Close menu when clicking outside
  -------------------------------------------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canCancel = status === "published";
  const canDelete = status === "draft" || status === "cancelled" || status === "past";

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger */}
      <button
        type="button"
        className="p-2 rounded-full hover:bg-gray-100 transition"
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <MoreVertical className="w-5 h-5 text-gray-500" />
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-30 overflow-hidden">
          {/* View */}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              onView();
              setIsMenuOpen(false);
            }}
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </button>

          {/* Edit */}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              onEdit();
              setIsMenuOpen(false);
            }}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>

          {/* Cancel */}
          {canCancel && onCancel && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-orange-600"
              onClick={() => {
                setConfirmType("cancel");
                setIsMenuOpen(false);
              }}
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}

          {/* Delete */}
          {canDelete && onDelete && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
              onClick={() => {
                setConfirmType("delete");
                setIsMenuOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmType !== null}
        onClose={() => !isProcessing && setConfirmType(null)}
        title={confirmType === "cancel" ? "Cancel Event" : "Delete Event"}
      >
        <p className="text-sm text-gray-600 mb-4">
          {confirmType === "cancel"
            ? "Are you sure you want to cancel this event? Attendees may be notified."
            : "This will permanently delete this event and its registrations. This action cannot be undone."}
        </p>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmType(null)}
            disabled={isProcessing}
          >
            Keep event
          </Button>

          <Button
            onClick={() => {
              if (confirmType === "cancel" && onCancel) onCancel();
              if (confirmType === "delete" && onDelete) onDelete();
            }}
            isLoading={isProcessing}
          >
            {confirmType === "cancel" ? "Yes, cancel" : "Yes, delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default EventQuickActions;
