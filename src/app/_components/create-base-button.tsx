"use client";

import { useState } from "react";
import { CreateBaseModal } from "./create-base-modal";

interface CreateBaseButtonProps {
  variant?: "card" | "primary";
}

export function CreateBaseButton({ variant = "card" }: CreateBaseButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === "primary") {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create a base
        </button>
        <CreateBaseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 transition-all hover:border-blue-500 hover:bg-blue-50"
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          Create a base
        </span>
      </button>
      <CreateBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
