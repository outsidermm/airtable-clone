"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckIcon, XIcon, InfoIcon, WarningIcon } from "~/components/icons";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, "success"), [addToast]);
  const error = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const info = useCallback((message: string) => addToast(message, "info"), [addToast]);
  const warning = useCallback((message: string) => addToast(message, "warning"), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-9999 flex flex-col items-end justify-end gap-2 p-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const bgColor = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
    warning: "bg-yellow-50 border-yellow-200",
  }[toast.type];

  const textColor = {
    success: "text-green-800",
    error: "text-red-800",
    info: "text-blue-800",
    warning: "text-yellow-800",
  }[toast.type];

  const iconColor = {
    success: "text-green-500",
    error: "text-red-500",
    info: "text-blue-500",
    warning: "text-yellow-500",
  }[toast.type];

  const icon = {
    success: <CheckIcon className={`h-5 w-5 ${iconColor}`} />,
    error: <XIcon className={`h-5 w-5 ${iconColor}`} />,
    info: <InfoIcon className={`h-5 w-5 ${iconColor}`} />,
    warning: <WarningIcon className={`h-5 w-5 ${iconColor}`} />,
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex w-96 items-start gap-3 rounded-lg border ${bgColor} p-4 shadow-lg animate-in slide-in-from-right`}
    >
      <div className="shrink-0">{icon}</div>
      <div className={`flex-1 text-sm ${textColor}`}>{toast.message}</div>
      <button
        onClick={() => onClose(toast.id)}
        className={`shrink-0 rounded hover:bg-black/10 ${textColor}`}
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
