"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import JobMap from "../JobMap";
import type {
  JobForMap,
  HomeLocation,
  SearchAreaCircle,
} from "@/types/JobMapTypes";

const demoJobs: JobForMap[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "MetroTech",
    city: "Washington",
    state: "DC",
    country: "USA",
    latitude: 38.9072,
    longitude: -77.0369,
    job_url: "#",
    description: "Own the map-based job search experience.",
    is_remote: false,
    color: "#22c55e",
    order: 1,
    distanceMeters: 1800,
    durationSeconds: 1200,
  },
  {
    id: "2",
    title: "Product Manager, Commute Insights",
    company: "TransitLoop",
    city: "Arlington",
    state: "VA",
    country: "USA",
    latitude: 38.8816,
    longitude: -77.091,
    job_url: "#",
    description: "Ship features that turn commute data into decisions.",
    is_remote: true,
    color: "#0ea5e9",
    order: 2,
    distanceMeters: 8200,
    durationSeconds: 2100,
  },
  {
    id: "3",
    title: "Data Scientist, Salary Signals",
    company: "CompassLabs",
    city: "Alexandria",
    state: "VA",
    country: "USA",
    latitude: 38.8048,
    longitude: -77.0469,
    job_url: "#",
    description: "Model real-world salary and commute trade-offs.",
    is_remote: true,
    color: "#a855f7",
    order: 3,
    distanceMeters: 12400,
    durationSeconds: 2800,
  },
];

const demoHome: HomeLocation = {
  label: "Home base",
  latitude: 38.8951,
  longitude: -77.0364,
  color: "#f97316",
};

const demoSearchCircle: SearchAreaCircle = {
  center: [-77.0369, 38.9072],
  radiusMeters: 12000,
};

export default function LandingMapDemo() {
  const [selectedId, setSelectedId] = useState<string | null>(demoJobs[0].id as string);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeJob = useMemo(
    () =>
      demoJobs.find((job) => job.id === (hoveredId ?? selectedId)) ??
      demoJobs[0],
    [hoveredId, selectedId],
  );

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_18px_80px_rgba(15,23,42,0.85)]">
      <JobMap
        jobs={demoJobs}
        onSelect={(job) => setSelectedId(String(job.id))}
        onHover={(job) => setHoveredId(job ? String(job.id) : null)}
        selectedJobId={selectedId}
        homeLocation={demoHome}
        routeGeometry={null}
        routeSummary={null}
        searchAreaCircle={demoSearchCircle}
        comparisonRoutes={[]}
      />

      <AnimatePresence mode="wait">
        {activeJob && (
          <motion.div
            key={activeJob.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-none absolute inset-x-3 bottom-3 z-20"
          >
            <div className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/95 px-4 py-3 text-xs text-slate-200 shadow-lg shadow-black/50">
              <div className="space-y-1">
                <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Example result
                </p>
                <p className="line-clamp-1 text-sm font-semibold text-slate-50">
                  {activeJob.title}
                </p>
                {activeJob.company && (
                  <p className="line-clamp-1 text-[11px] text-slate-400">
                    {activeJob.company} •{" "}
                    {[activeJob.city, activeJob.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {activeJob.description && (
                  <p className="line-clamp-2 text-[11px] text-slate-400">
                    {activeJob.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end justify-between gap-1 text-[11px] text-slate-300">
                <p className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  ~{Math.round((activeJob.distanceMeters ?? 0) / 1000)} km
                  away
                </p>
                <p className="text-[10px] text-slate-500">
                  Click pins to see how your workspace responds.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
