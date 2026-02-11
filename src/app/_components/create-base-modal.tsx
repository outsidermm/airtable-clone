"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CreateBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBaseModal({ isOpen, onClose }: CreateBaseModalProps) {
  const router = useRouter();
  const [baseName, setBaseName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setBaseName("");
      setSelectedTemplate(null);
    }
  }, [isOpen]);

  const handleCreate = () => {
    // TODO: Create base via tRPC
    // For now, just navigate to a mock base
    const mockBaseId = Math.random().toString(36).substr(2, 9);
    router.push(`/base/${mockBaseId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Create a base
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Templates */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-900">
              Start from a template
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "blank", name: "Start from scratch", icon: "📋" },
                { id: "marketing", name: "Marketing", icon: "📊" },
                { id: "project", name: "Project Management", icon: "🎯" },
              ].map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`flex flex-col items-center rounded-lg border-2 p-4 transition-all ${
                    selectedTemplate === template.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2 text-3xl">{template.icon}</div>
                  <span className="text-center text-xs font-medium text-gray-700">
                    {template.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Base Name */}
          <div>
            <label
              htmlFor="base-name"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Base name
            </label>
            <input
              id="base-name"
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="Enter base name..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!baseName.trim() || !selectedTemplate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create base
          </button>
        </div>
      </div>
    </div>
  );
}
