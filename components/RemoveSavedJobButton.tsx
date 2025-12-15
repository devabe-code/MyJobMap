"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RemoveSavedJobButtonProps {
  jobId: string;
}

export function RemoveSavedJobButton({ jobId }: RemoveSavedJobButtonProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch("/api/remove-saved-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to remove saved job.");
        setRemoving(false);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to remove saved job:", err);
      setError("Failed to remove saved job.");
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-semibold text-slate-300 hover:border-rose-500 hover:text-rose-300 disabled:opacity-60"
      >
        {removing ? "Removing…" : "Remove from saved"}
      </button>
      {error && (
        <p className="text-[10px] text-rose-400 max-w-[220px] text-right">
          {error}
        </p>
      )}
    </div>
  );
}

