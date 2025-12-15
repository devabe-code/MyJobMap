import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import JobMap from "@/components/JobMap";
import { RemoveSavedJobButton } from "@/components/RemoveSavedJobButton";
import type { JobForMap } from "@/types/JobMapTypes";

type ApplicationStatus =
  | "not_applied"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | string;

type SavedJobRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  status?: ApplicationStatus | null;
  created_at: string;
  applied_at?: string | null;
};

type JobRow = {
  id: string;
  title: string;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  job_type: string | null;
  interval: string | null;
  min_amount: number | null;
  max_amount: number | null;
  date_posted: string | null;
  job_url: string | null;
  site_name?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  not_applied: "Not applied",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  not_applied: "bg-slate-600",
  applied: "bg-sky-500",
  interview: "bg-amber-400",
  offer: "bg-emerald-400",
  rejected: "bg-rose-500",
};

function formatLocation(job: JobRow | undefined) {
  if (!job) return "Location unknown";
  const parts = [job.city, job.state].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.country) return job.country;
  return "Location unknown";
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SavedJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  if (!userId) {
    // App layout should already redirect unauthenticated users, but guard anyway.
    return null;
  }

  const { data: savedRows } = await supabase
    .from("saved_jobs")
    .select("id,user_id,job_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }) as any as {
    data: SavedJobRow[] | null;
  };

  const savedJobs = savedRows ?? [];

  const jobIds = Array.from(
    new Set(
      savedJobs
        .map((row) => row.job_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let jobsById = new Map<string, JobRow>();

  if (jobIds.length > 0) {
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(
        "id,title,company,city,state,country,latitude,longitude,job_type,interval,min_amount,max_amount,date_posted,job_url,site_name",
      )
      .in("id", jobIds);

    if (jobsData) {
      jobsById = new Map(
        (jobsData as JobRow[]).map((job) => [job.id, job]),
      );
    }
  }

  const totalSaved = savedJobs.length;

  const jobsForMap: JobForMap[] = [];
  let mapOrder = 1;

  for (const saved of savedJobs) {
    if (!saved.job_id) continue;
    const job = jobsById.get(saved.job_id);
    if (
      !job ||
      job.latitude == null ||
      job.longitude == null ||
      !job.job_url
    ) {
      continue;
    }

    jobsForMap.push({
      id: job.id,
      title: job.title,
      company: job.company,
      city: job.city,
      state: job.state,
      country: job.country,
      latitude: job.latitude,
      longitude: job.longitude,
      job_url: job.job_url,
      site_name: job.site_name ?? undefined,
      description: null,
      job_type: job.job_type,
      is_remote: null,
      color: "#22c55e",
      order: mapOrder,
    });

    mapOrder += 1;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">
              Saved jobs
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Keep track of roles you care about, their status, and quick links
              back to each posting.
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <p>
              Total saved:{" "}
              <span className="font-semibold text-emerald-300">
                {totalSaved}
              </span>
            </p>
          </div>
        </header>

        {totalSaved === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">
              You haven&apos;t saved any jobs yet.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              When you find promising roles in the map view, save them to track
              status and revisit them here.
            </p>
            <div className="mt-4">
              <Link
                href="/app"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 hover:shadow-emerald-400/60"
              >
                Open live job map
              </Link>
            </div>
          </section>
        ) : (
          <>
            {jobsForMap.length > 0 && (
              <section
                id="saved-jobs-map"
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 md:p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                      Saved jobs minimap
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      See your saved roles plotted on a small map directly in this view.
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-64 w-full rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
                  <JobMap jobs={jobsForMap} />
                </div>
              </section>
            )}

            <section className="space-y-3">
              {savedJobs.map((saved) => {
                const job = saved.job_id
                  ? jobsById.get(saved.job_id)
                  : undefined;

                const statusKey = (saved.status ?? "").toLowerCase();
                const statusLabel =
                  STATUS_LABELS[statusKey] ?? saved.status ?? "Saved";
                const statusColor =
                  STATUS_COLORS[statusKey] ?? "bg-slate-700";

                const savedLabel = formatDateLabel(saved.created_at);
                const postedLabel = formatDateLabel(job?.date_posted ?? null);
                const appliedLabel = formatDateLabel(saved.applied_at);

                const title = job?.title ?? "Saved job";
                const company = job?.company ?? null;
                const locationLabel = formatLocation(job);

                const salaryLabel =
                  job?.min_amount != null &&
                  job?.max_amount != null &&
                  job.interval
                    ? `${job.interval} · $${job.min_amount.toLocaleString()}–$${job.max_amount.toLocaleString()}`
                    : null;

                return (
                  <article
                    key={saved.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3.5 md:px-5 md:py-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                          {job?.job_url ? (
                            <a
                              href={job.job_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
                            >
                              {title}
                            </a>
                          ) : (
                            <p className="text-sm font-semibold text-emerald-200">
                              {title}
                            </p>
                          )}
                          {company && (
                            <span className="text-xs text-slate-300">
                              · {company}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full bg-slate-900/80 px-2 py-0.5 border border-slate-800/80">
                            {locationLabel}
                          </span>
                          {job?.job_type && (
                            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 border border-slate-800/80 text-slate-300">
                              {job.job_type}
                            </span>
                          )}
                          {salaryLabel && (
                            <span className="text-slate-500">
                              {salaryLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {savedLabel && <span>Saved {savedLabel}</span>}
                          {postedLabel && (
                            <span>· Posted {postedLabel}</span>
                          )}
                          {appliedLabel && (
                            <span className="text-emerald-300">
                              · Applied {appliedLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold text-slate-50 ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {job?.job_url && (
                            <a
                              href={job.job_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-semibold text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                            >
                              See details
                            </a>
                          )}
                          <Link
                            href="#saved-jobs-map"
                            className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400"
                          >
                            See on minimap
                          </Link>
                          {saved.job_id && (
                            <RemoveSavedJobButton jobId={saved.job_id} />
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
