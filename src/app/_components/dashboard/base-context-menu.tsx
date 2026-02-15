"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { PencilIcon, DuplicateIcon, FolderIcon, ArrowCircleRightIcon, TrashIcon } from "~/components/icons";

interface BaseContextMenuProps {
  base: {
    id: string;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export function BaseContextMenu({
  base,
  isOpen,
  onClose,
  buttonRef,
}: BaseContextMenuProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newName, setNewName] = useState(base.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  const renameMutation = api.base.rename.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
      setShowRenameDialog(false);
      onClose();
    },
  });

  const deleteMutation = api.base.delete.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
      onClose();
    },
  });

  // Calculate menu position
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const rect = buttonRef?.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen, buttonRef]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef?.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleRename = () => {
    setShowRenameDialog(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== base.name) {
      renameMutation.mutate({ id: base.id, name: newName.trim() });
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate({ id: base.id });
  };

  const showToast = (message: string) => {
    // Simple toast - could be replaced with a toast library
    alert(message);
  };

  if (!isOpen) return null;

  // Rename dialog
  if (showRenameDialog) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Rename base</h2>
          <form onSubmit={handleRenameSubmit}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRenameDialog(false);
                  onClose();
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim() || renameMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {renameMutation.isPending ? "Renaming..." : "Rename"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  // Delete confirmation
  if (showDeleteConfirm) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Delete base?</h2>
          <p className="mb-4 text-sm text-gray-600">
            This will permanently delete &quot;{base.name}&quot; and all its tables, columns, and rows. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                onClose();
              }}
              className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Context menu
  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <button
        onClick={handleRename}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <PencilIcon className="h-4 w-4" />
        Rename
      </button>

      <button
        onClick={() => {
          showToast("Duplication coming soon");
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <DuplicateIcon className="h-4 w-4" />
        Duplicate
      </button>

      <button
        onClick={() => {
          showToast("Workspaces coming soon");
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <FolderIcon className="h-4 w-4" />
        Move to workspace
      </button>

      <button
        onClick={() => {
          showToast("Workspaces coming soon");
          onClose();
        }}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <ArrowCircleRightIcon className="h-4 w-4" />
        Go to workspace
      </button>

      <div className="my-1 border-t border-gray-200" />

      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
      >
        <TrashIcon className="h-4 w-4" />
        Delete
      </button>
    </div>,
    document.body
  );
}
