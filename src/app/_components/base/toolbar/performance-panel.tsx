"use client";

import { useState, useEffect } from "react";
import { getQueryLog, clearQueryLog } from "~/lib/query-log";
import { XIcon } from "~/app/_components/ui/icons";

interface PerformancePanelProps {
  onClose: () => void;
}

export function PerformancePanel({ onClose }: PerformancePanelProps) {
  const [entries, setEntries] = useState(() => getQueryLog());

  // Poll for new entries every second while panel is open
  useEffect(() => {
    const interval = setInterval(() => {
      setEntries([...getQueryLog()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute top-full right-0 z-50 mt-1 w-160 rounded border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
          <h3 className="text-xs font-medium text-gray-700">Query Performance</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">SQL ms = pure DB time · Total ms = client RTT (includes dev delay in dev)</span>
            <button
              onClick={() => {
                clearQueryLog();
                setEntries([]);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
          {entries.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400">
              No queries yet. Scroll the grid to trigger page fetches.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-3 py-1.5 font-medium">Path</th>
                  <th className="px-3 py-1.5 font-medium">Label</th>
                  <th className="px-3 py-1.5 font-medium text-right">SQL ms</th>
                  <th className="px-3 py-1.5 font-medium text-right">Total ms</th>
                  <th className="px-3 py-1.5 font-medium text-right">Rows</th>
                  <th className="px-3 py-1.5 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-1 font-mono text-blue-600">{e.path}</td>
                    <td className="px-3 py-1 text-gray-500">{e.label}</td>
                    <td
                      className={`px-3 py-1 text-right font-mono ${
                        e.sqlMs !== undefined && e.sqlMs > 200
                          ? "text-orange-500"
                          : "text-gray-700"
                      }`}
                    >
                      {e.sqlMs !== undefined ? `${e.sqlMs}` : "—"}
                    </td>
                    <td
                      className={`px-3 py-1 text-right font-mono ${
                        e.totalMs > 800
                          ? "text-red-500"
                          : e.totalMs > 400
                            ? "text-orange-500"
                            : "text-green-600"
                      }`}
                    >
                      {e.totalMs}
                    </td>
                    <td className="px-3 py-1 text-right text-gray-500">
                      {e.rowCount ?? "—"}
                    </td>
                    <td className="px-3 py-1 text-right text-gray-400">
                      {new Date(e.timestamp).toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
