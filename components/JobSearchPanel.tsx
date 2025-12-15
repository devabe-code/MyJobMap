// components/JobSearchPanel.tsx
"use client";

import { FormEvent, useState } from "react";
import JobMap from "@/components/JobMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobResult } from "@/types/JobMapTypes";


interface JobSearchPanelProps {
  defaultLocation?: string;
}

export default function JobSearchPanel({ defaultLocation }: JobSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("software engineer");
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [resultsWanted, setResultsWanted] = useState(20);
  const [hoursOld, setHoursOld] = useState(72);

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm,
          location,
          resultsWanted,
          hoursOld,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err?.message ?? "Unexpected error while searching jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 md:grid-cols-[2fr,3fr] items-start">
      {/* LEFT: Search Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-1">
          Quick search
        </h2>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Role / keywords</label>
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. Software Engineer, Backend, Next.js"
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Location</label>
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State (or Remote)"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Results per search</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={resultsWanted}
                onChange={(e) => setResultsWanted(Number(e.target.value) || 10)}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Posted within (hours)</label>
              <Input
                type="number"
                min={1}
                max={720}
                value={hoursOld}
                onChange={(e) => setHoursOld(Number(e.target.value) || 72)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="px-4 py-2 text-sm font-medium"
            >
              {loading ? "Searching…" : "Search jobs"}
            </Button>
            <span className="text-xs text-slate-400">
              Results are scraped live and cached into MyJobMap.
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-1">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* RIGHT: Map + Results List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col min-h-[260px]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-200">
            Map & results
          </h2>
          {hasSearched && !loading && (
            <span className="text-xs text-slate-400">
              {jobs.length} job{jobs.length === 1 ? "" : "s"} found
            </span>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-[3fr,2fr] flex-1 min-h-[260px]">
          {/* Map */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 min-h-[220px]">
            {jobs.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 px-3 text-center">
                Run a search to see job markers on the map.  
                Once jobs include coordinates, they&apos;ll appear here.
              </div>
            ) : (
              <div className="w-full h-full min-h-[220px]">
                <JobMap
                  jobs={jobs.map((job, idx) => ({
                    id: `${job.site_name}-${job.job_url}-${idx}`,
                    title: job.title,
                    company: job.company,
                    city: job.city,
                    state: job.state,
                    country: job.country,
                    latitude:
                      typeof job.latitude === "number"
                        ? job.latitude
                        : null,
                    longitude:
                      typeof job.longitude === "number"
                        ? job.longitude
                        : null,
                    job_url: job.job_url,
                    site_name: job.site_name,
                  }))}
                />
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 max-h-[360px] overflow-hidden flex flex-col">
            {loading && (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Fetching jobs from boards…
              </div>
            )}

            {!loading && hasSearched && jobs.length === 0 && !error && (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 px-4 text-center">
                No jobs found for this search yet. Try widening the time window or changing your keywords.
              </div>
            )}

            {!loading && jobs.length > 0 && (
              <ul className="divide-y divide-slate-800 flex-1 overflow-y-auto text-sm">
                {jobs.map((job, idx) => (
                  <li
                    key={`${job.site_name}-${job.job_url}-${idx}`}
                    className="p-3 hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-slate-100 line-clamp-2">
                          {job.title}
                        </h3>
                        {job.company && (
                          <p className="text-xs text-slate-300">
                            {job.company}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-700 rounded-full px-2 py-0.5">
                        {job.site_name}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {job.city && job.state
                        ? `${job.city}, ${job.state}`
                        : job.city || job.state || job.country || "Location unknown"}
                      {job.is_remote ? " · Remote" : ""}
                    </p>

                    {job.min_amount || job.max_amount ? (
                      <p className="text-xs text-emerald-300 mt-1">
                        {job.min_amount && job.max_amount
                          ? `$${job.min_amount.toLocaleString()}–$${job.max_amount.toLocaleString()}`
                          : job.min_amount
                          ? `From $${job.min_amount.toLocaleString()}`
                          : `Up to $${job.max_amount?.toLocaleString()}`}
                        {job.interval ? ` / ${job.interval}` : ""}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between mt-2">
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                      >
                        View job posting
                      </a>
                      {job.date_posted && (
                        <span className="text-[10px] text-slate-500">
                          Posted{" "}
                          {new Date(job.date_posted).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <div className="border-t border-slate-800 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
