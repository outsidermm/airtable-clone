"use client";
import { useRouter } from "next/navigation";
import { useBaseMutations } from "../../hooks/use-base-mutations";
import type { Base } from "~/types/base";
import { QuestionIcon } from "../../ui/icons";

interface DeleteBaseConfirmModalProps {
  base: Base;
  setShowDeleteBaseConfirm: (show: boolean) => void;
}

export function DeleteBaseConfirmModal({
  base,
  setShowDeleteBaseConfirm,
}: DeleteBaseConfirmModalProps) {
  const router = useRouter();

  const baseMutations = useBaseMutations();
  return (
    <div className="absolute top-10 left-10 z-60 w-62 rounded-lg bg-white p-4 shadow-xl">
      <h2 className="mb-2 font-semibold text-gray-600">
        Are you sure you want to delete {base.name}?
      </h2>
      <p className="mb-4 text-xs text-gray-600">
        Recently deleted bases can be restored from trash.{" "}
        <QuestionIcon className="inline h-3 w-3 text-gray-400" />
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowDeleteBaseConfirm(false)}
          className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            baseMutations.handleDeleteConfirm(base.id);
            router.push("/dashboard");
          }}
          disabled={baseMutations.deleteBaseMutation.isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          {baseMutations.deleteBaseMutation.isPending
            ? "Deleting..."
            : "Delete"}
        </button>
      </div>
    </div>
  );
}
