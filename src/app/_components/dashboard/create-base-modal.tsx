"use client";

import { useRouter } from "next/navigation";
import { XIcon } from "~/components/icons";
import { useBaseMutations } from "./hooks/use-base-mutations";
import Image from "next/image";

interface CreateBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBaseModal({ isOpen, onClose }: CreateBaseModalProps) {
  const router = useRouter();
  const baseMutations = useBaseMutations();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
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
            <h2 className="mb-3 text-sm font-medium text-gray-900">
              Workspace:
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <button
                key={"omni"}
                className="flex flex-col items-center rounded-lg border border-gray-200 transition-all hover:shadow-md"
                onClick={() => {
                  onClose();
                }}
              >
                <div className="relative h-40 w-full">
                  <Image
                    src="/Omni_2x.png"
                    alt="Omni logo"
                    fill
                    className="rounded-md object-cover"
                  />
                </div>
                <div className="flex flex-col items-start p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">
                      Build an app with Omni
                    </h3>
                    <span className="rounded-xl bg-green-100 px-2 py-1 text-xs text-green-500">
                      New
                    </span>
                  </div>
                  <p className="text-left text-gray-500">
                    Use AI to build a custom app tailored to your workflow.
                  </p>
                </div>
              </button>

              <button
                key={"own"}
                className="flex flex-col items-center rounded-lg border border-gray-200 transition-all hover:shadow-md"
                onClick={async () => {
                  const newBase = await baseMutations.handleCreateBase();
                  router.push(`/base/${newBase.id}`);
                  onClose();
                }}
                disabled={baseMutations.createBaseMutation.isPending}
              >
                <div className="relative h-40 w-full">
                  <Image
                    src="/start-with-data.png"
                    alt="data"
                    fill
                    className="rounded-md object-cover"
                  />
                </div>
                <div className="flex flex-col items-start p-4">
                  <h3 className="text-xl font-semibold">
                    Build an app on your own
                  </h3>
                  <p className="text-left text-gray-500">
                    Start with a blank app and build your ideal workflow.
                  </p>
                </div>
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
