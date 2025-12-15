"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type HomeLocationPromptProps = {
  open: boolean;
  step: "choice" | "manual";
  label: string;
  manualLocation: string;
  loading: boolean;
  error: string | null;
  onChangeLabel: (value: string) => void;
  onChangeManualLocation: (value: string) => void;
  onUseCurrentLocation: () => void;
  onSaveManualHome: () => void;
  onClose: () => void;
  onEnterManual: () => void;
  onBackToChoice: () => void;
};

export function HomeLocationPrompt({
  open,
  step,
  label,
  manualLocation,
  loading,
  error,
  onChangeLabel,
  onChangeManualLocation,
  onUseCurrentLocation,
  onSaveManualHome,
  onClose,
  onEnterManual,
  onBackToChoice,
}: HomeLocationPromptProps) {
  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-30 max-w-xs rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-xs text-slate-200 shadow-xl">
      {step === "choice" && (
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
            Home location
          </p>
          <p className="text-xs text-slate-300">
            Would you like to add a home location to see distance to jobs?
          </p>
          <div className="space-y-2">
            <Button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={loading}
              className="w-full px-3 py-1.5 text-[11px] font-semibold shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Detecting location..." : "Use my current location"}
            </Button>
            <Button
              type="button"
              onClick={onEnterManual}
              variant="outline"
              className="w-full px-3 py-1.5 text-[11px] font-semibold"
            >
              Enter home manually
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="w-full px-3 py-1.5 text-[11px] font-semibold"
            >
              Not now
            </Button>
          </div>
          {error && (
            <p className="text-[11px] text-red-400">{error}</p>
          )}
        </div>
      )}

      {step === "manual" && (
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
            Set home location
          </p>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">
                Label
              </label>
              <Input
                type="text"
                value={label}
                onChange={(e) => onChangeLabel(e.target.value)}
                placeholder="Home"
                className="w-full px-2 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">
                Location
              </label>
              <Input
                type="text"
                value={manualLocation}
                onChange={(e) => onChangeManualLocation(e.target.value)}
                placeholder="City, State (optional country)"
                className="w-full px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              onClick={onSaveManualHome}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-[11px] font-semibold shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save home"}
            </Button>
            <Button
              type="button"
              onClick={onBackToChoice}
              variant="outline"
              className="px-3 py-1.5 text-[11px] font-semibold"
            >
              Back
            </Button>
          </div>
          {error && (
            <p className="text-[11px] text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
