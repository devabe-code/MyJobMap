"use client";

import Link from "next/link";
import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { motion } from "motion/react";
import LandingMapDemo from "./LandingMapDemo";

export default function LandingHero({ isAuthed }: { isAuthed?: boolean }) {
  const heading = "See your next role on the map".split(" ");
  const [mapWidth, setMapWidth] = useState<number>(45);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startX = event.clientX;
    const rect = container.getBoundingClientRect();
    const startWidth = mapWidth;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const next = Math.min(65, Math.max(30, startWidth - deltaPercent));
      setMapWidth(next);
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const textWidth = 100 - mapWidth;

  return (
    <div className="relative mx-auto my-10 flex max-w-7xl flex-col items-center justify-center">
      <div className="absolute inset-y-0 left-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80">
        <div className="absolute top-0 h-40 w-px bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
      </div>
      <div className="absolute inset-y-0 right-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80">
        <div className="absolute h-40 w-px bg-gradient-to-b from-transparent via-cyan-500 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px w-full bg-neutral-200/80 dark:bg-neutral-800/80">
        <div className="absolute mx-auto h-px w-40 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      </div>
      <div
        ref={containerRef}
        className="relative z-10 w-full px-4 py-10 md:flex md:items-center md:gap-4 md:py-20"
      >
        <div
          className="space-y-6 md:pr-4"
          style={{ flexBasis: `${textWidth}%`, minWidth: 0 }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-100">
            Live map • Commute-aware • Fresh listings
          </p>
          <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-slate-50 md:text-4xl lg:text-5xl">
            {heading.map((word, index) => (
              <motion.span
                key={word + index}
                initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.08,
                  ease: "easeInOut",
                }}
                className="mr-2 inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.7 }}
            className="max-w-md text-sm text-slate-300 md:text-base"
          >
            MyJobMap turns a wall of job listings into a commute-aware map. See
            where roles actually live, how long they take to reach, and which
            ones fit your real life.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.9 }}
            className="flex flex-wrap items-center gap-3"
          >
            {isAuthed ? (
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:-translate-y-px"
              >
                Open your workspace
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:-translate-y-px"
              >
                Start mapping jobs
              </Link>
            )}
            <span className="text-[11px] text-slate-400">
              No spam. Just a better map of your options.
            </span>
          </motion.div>
        </div>
        <div
          className="hidden h-[260px] cursor-col-resize items-center justify-center md:flex"
          onMouseDown={handleResizeStart}
        >
          <div className="h-24 w-[3px] rounded-full bg-slate-700/80 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1 }}
          className="relative mt-8 md:mt-0"
          style={{
            flexBasis: `${mapWidth}%`,
            minWidth: "260px",
          }}
        >
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />
          <LandingMapDemo />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/5" />
        </motion.div>
      </div>
    </div>
  );
}

