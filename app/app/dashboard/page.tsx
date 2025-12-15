import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type ApplicationStatus =
  | "not_applied"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

type SavedJobRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  status: ApplicationStatus;
  created_at: string;
  applied_at: string | null;
};

type JobRow = {
  id: string;
  title: string;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  job_type: string | null;
  interval: string | null;
  min_amount: number | null;
  max_amount: number | null;
  date_posted: string | null;
  job_url: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  default_location: string | null;
};

type JobSearchRow = {
  id: string;
  user_id: string;
  search_term: string;
  location: string | null;
  hours_old: number | null;
  results_wanted: number | null;
  created_at: string;
};

const STATUS_ORDER: ApplicationStatus[] = [
  "not_applied",
  "applied",
  "interview",
  "offer",
  "rejected",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_applied: "Not applied",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  not_applied: "bg-slate-600",
  applied: "bg-sky-500",
  interview: "bg-amber-400",
  offer: "bg-emerald-400",
  rejected: "bg-rose-500",
};

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

function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJobLocation(job: JobRow | null | undefined) {
  if (!job) return "Location unknown";
  const parts: string[] = [];
  if (job.city) parts.push(job.city);
  if (job.state) parts.push(job.state);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (job.country) return job.country;
  return "Location unknown";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const userId = user.id;

  const [{ data: profile }, { data: allSavedJobs }, { data: recentSavedRaw }, { data: recentSearches }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("saved_jobs")
        .select("id,user_id,job_id,status,created_at,applied_at")
        .eq("user_id", userId) as any as Promise<{ data: SavedJobRow[] | null }>,
      supabase
        .from("saved_jobs")
        .select("id,user_id,job_id,status,created_at,applied_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5) as any as Promise<{ data: SavedJobRow[] | null }>,
      supabase
        .from("job_searches")
        .select(
          "id,user_id,search_term,location,hours_old,results_wanted,created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5) as any as Promise<{ data: JobSearchRow[] | null }>,
    ]);

  const savedJobs = allSavedJobs ?? [];
  const totalSavedJobs = savedJobs.length;

  const statusCounts: Record<ApplicationStatus, number> = {
    not_applied: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };

  let applicationsCount = 0;
  let applicationsLast7Days = 0;
  let interviewCount = 0;

  const now = new Date();
  const sevenDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 7,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );

  for (const job of savedJobs) {
    if (job.status in statusCounts) {
      statusCounts[job.status] += 1;
    }

    if (job.status !== "not_applied") {
      applicationsCount += 1;

      if (job.applied_at) {
        const appliedDate = new Date(job.applied_at);
        if (!Number.isNaN(appliedDate.getTime()) && appliedDate >= sevenDaysAgo) {
          applicationsLast7Days += 1;
        }
      }
    }

    if (job.status === "interview") {
      interviewCount += 1;
    }
  }

  const recentSaved = recentSavedRaw ?? [];
  const recentJobIds = Array.from(
    new Set(
      recentSaved
        .map((row) => row.job_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let recentJobsById = new Map<string, JobRow>();

  if (recentJobIds.length > 0) {
    const { data: jobsData } = await supabase
      .from("jobs")
      .select(
        "id,title,company,city,state,country,job_type,interval,min_amount,max_amount,date_posted,job_url",
      )
      .in("id", recentJobIds);

    if (jobsData) {
      recentJobsById = new Map(
        (jobsData as JobRow[]).map((job) => [job.id, job]),
      );
    }
  }

  const greetingName = (profile as ProfileRow | null | undefined)?.full_name;
  const defaultLocation =
    (profile as ProfileRow | null | undefined)?.default_location ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-8">
        {/* Top row: greeting + quick stats */}
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">
              {greetingName ? `Welcome back, ${greetingName}` : "Welcome back"}
            </h1>
            {defaultLocation && (
              <p className="mt-1 text-sm text-emerald-200/80">
                Default location:{" "}
                <span className="font-medium text-emerald-300">
                  {defaultLocation}
                </span>
              </p>
            )}
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              This is your job search overview — saved roles, application
              momentum, and recent searches at a glance.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
              Your job search overview
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Stay on top of saved jobs, applications, and interviews.
            </p>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Saved jobs"
            value={totalSavedJobs}
            helper="tracked in MyJobMap"
          />
          <SummaryCard
            title="Active applications"
            value={applicationsCount}
            helper='status not "Not applied"'
          />
          <SummaryCard
            title="Interviews"
            value={interviewCount}
            helper="currently in interview"
          />
          <SummaryCard
            title="Applied last 7 days"
            value={applicationsLast7Days}
            helper="momentum over the last week"
          />
        </section>

        {/* Middle: status breakdown + recent searches */}
        <section className="grid gap-6 md:grid-cols-[2fr,1.2fr]">
          {/* Applications by status */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Applications by status
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Distribution of your saved jobs by application status.
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300 border border-slate-800">
                Total:{" "}
                <span className="font-medium text-emerald-300">
                  {totalSavedJobs}
                </span>
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = statusCounts[status];
                const ratio =
                  totalSavedJobs > 0 ? (count / totalSavedJobs) * 100 : 0;

                return (
                  <div
                    key={status}
                    className="flex items-center gap-3 text-xs text-slate-300"
                  >
                    <div className="flex min-w-[120px] items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`}
                      />
                      <span className="text-slate-200">
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                    <span className="w-10 text-right text-slate-300">
                      {count}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${STATUS_COLORS[status]} transition-all`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {totalSavedJobs === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  No saved jobs yet — once you start saving roles from the map,
                  you&apos;ll see your status breakdown here.
                </p>
              )}
            </div>
          </div>

          {/* Recent searches */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Recent searches
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Last few job searches you ran.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(recentSearches ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">
                  No searches yet — try searching from the main app page.
                </p>
              ) : (
                (recentSearches ?? []).map((search) => {
                  const createdLabel = formatDateTimeLabel(search.created_at);
                  const hoursLabel =
                    search.hours_old != null
                      ? `Last ${search.hours_old} hours`
                      : null;

                  return (
                    <div
                      key={search.id}
                      className="rounded-lg border border-slate-800/80 bg-slate-900/90 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-100">
                          {search.search_term}
                        </p>
                        {hoursLabel && (
                          <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] text-emerald-300 border border-slate-800">
                            {hoursLabel}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {search.location && (
                          <span className="rounded-full bg-slate-950/70 px-2 py-0.5 border border-slate-800/80 text-slate-300">
                            {search.location}
                          </span>
                        )}
                        {search.results_wanted != null && (
                          <span className="text-slate-500">
                            Targeting{" "}
                            <span className="font-medium text-slate-300">
                              {search.results_wanted}
                            </span>{" "}
                            results
                          </span>
                        )}
                        {createdLabel && (
                          <span className="ml-auto text-[10px] text-slate-500">
                            {createdLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Bottom: recent saved jobs */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Recent saved jobs
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                The latest roles you&apos;ve saved from the map.
              </p>
            </div>
            <Link
              href="/app"
              className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
            >
              Open map workspace
            </Link>
          </div>

          {totalSavedJobs === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              You haven&apos;t saved any jobs yet. When you find roles that look
              promising in the map view, save them to start tracking your search
              here.
            </p>
          ) : (recentSaved ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No recent saved jobs to show yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentSaved.map((saved) => {
                const job =
                  saved.job_id != null
                    ? recentJobsById.get(saved.job_id)
                    : undefined;
                const status = saved.status;
                const statusLabel = STATUS_LABELS[status];
                const statusColor = STATUS_COLORS[status];
                const createdLabel = formatDateLabel(saved.created_at);
                const postedLabel = formatDateLabel(job?.date_posted ?? null);
                const appliedLabel = formatDateLabel(saved.applied_at);

                const locationLabel = formatJobLocation(job);

                const jobTitle = job?.title ?? "Saved job";
                const company = job?.company ?? "Unknown company";
                const jobUrl = job?.job_url ?? undefined;

                const salaryLabel =
                  job?.min_amount != null && job?.max_amount != null
                    ? `${job.interval ?? "yearly"} · $${job.min_amount.toLocaleString()}–$${job.max_amount.toLocaleString()}`
                    : null;

                return (
                  <div
                    key={saved.id}
                    className="rounded-xl border border-slate-800/90 bg-slate-950/70 px-3 py-3.5 md:px-4 md:py-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {jobUrl ? (
                            <Link
                              href={jobUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
                            >
                              {jobTitle}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold text-emerald-200">
                              {jobTitle}
                            </p>
                          )}
                          <span className="text-xs text-slate-400">
                            · {company}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full bg-slate-900/80 px-2 py-0.5 border border-slate-800/80">
                            {locationLabel}
                          </span>
                          {job?.job_type && (
                            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 border border-slate-800/80 text-slate-300">
                              {job.job_type}
                            </span>
                          )}
                          {salaryLabel && (
                            <span className="text-slate-500">{salaryLabel}</span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium text-slate-50 ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {createdLabel && (
                        <span>Saved on {createdLabel}</span>
                      )}
                      {postedLabel && (
                        <span>· Posted {postedLabel}</span>
                      )}
                      {appliedLabel && (
                        <span className="text-emerald-300">
                          · Applied on {appliedLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  helper?: string;
}

function SummaryCard({ title, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/40">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-emerald-300">
        {value.toLocaleString()}
      </p>
      {helper && (
        <p className="mt-1 text-[11px] text-slate-500">{helper}</p>
      )}
    </div>
  );
}
