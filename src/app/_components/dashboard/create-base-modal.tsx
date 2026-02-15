"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { XIcon } from "~/components/icons";

interface CreateBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBaseModal({ isOpen, onClose }: CreateBaseModalProps) {
  const router = useRouter();

  const utils = api.useUtils();

  const createBase = api.base.create.useMutation({
    onSuccess: async (newBase) => {
      await utils.base.getAll.invalidate();
      router.push(`/base/${newBase.id}`);
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            How do you want to start?
          </h2>
          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 hover:bg-gray-100"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Templates */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-gray-900">
              Workspace:
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                key={"omni"}
                className="flex flex-col items-center rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md"
              >
                <div className="mb-2 text-3xl">{"Test"}</div>
                <div className="flex flex-col items-start">
                  <h3 className="text-xl font-semibold">
                    Build an app with Omni
                  </h3>
                  <p className="text-xs font-medium text-gray-700">
                    Use AI to build a custom app tailored to your workflow.
                  </p>
                </div>
              </button>

              <button
                key={"own"}
                className="flex flex-col items-center rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md"
                onClick={() => {
                  createBase.mutate({});
                }}
                disabled={createBase.isPending}
              >
                <div className="mb-2 text-3xl">{"Test"}</div>
                <div className="flex flex-col items-start">
                  <h3 className="text-xl font-semibold">
                    Build an app on your own
                  </h3>
                  <p className="text-xs font-medium text-gray-700">
                    Start with a blank app and build your ideal workflow.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
