import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
};

type GroupMember = {
  user_id: string;
  role: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type GroupSearchPreset = {
  id: string;
  name: string;
  search_term: string | null;
  location: string | null;
  hours_old: number | null;
  results_wanted: number | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
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
  latitude: number | null;
  longitude: number | null;
};

async function createPreset(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) {
    redirect("/app/groups");
  }

  const name = String(formData.get("name") ?? "").trim();
  const searchTerm = String(formData.get("search_term") ?? "").trim();
  const locationRaw = formData.get("location");
  const location =
    typeof locationRaw === "string" && locationRaw.trim()
      ? locationRaw.trim()
      : null;

  const hoursRaw = Number(formData.get("hours_old") ?? 72);
  const hours_old =
    Number.isFinite(hoursRaw) && hoursRaw > 0
      ? Math.min(hoursRaw, 720)
      : 72;

  const resultsRaw = Number(formData.get("results_wanted") ?? 30);
  const results_wanted =
    Number.isFinite(resultsRaw) && resultsRaw > 0
      ? Math.min(resultsRaw, 200)
      : 30;

  if (!name && !searchTerm && !location) {
    redirect(`/app/groups/${groupId}`);
  }

  const { data: preset, error } = await supabase
    .from("group_search_presets")
    .insert({
      group_id: groupId,
      name,
      search_term: searchTerm || null,
      location,
      hours_old,
      results_wanted,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !preset) {
    console.error("createPreset error:", error);
    redirect(`/app/groups/${groupId}`);
  }

  redirect(`/app/groups/${groupId}?preset_id=${preset.id}`);
}

async function shareJobToGroup(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!groupId || !jobId) {
    redirect("/app/groups");
  }

  const { error } = await supabase.from("group_jobs").insert({
    group_id: groupId,
    job_id: jobId,
    shared_by: user.id,
  });

  if (error) {
    console.error("shareJobToGroup error:", error);
  }
}

async function leaveGroup(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) {
    redirect("/app/groups");
  }

  // Owners should transfer ownership or disband instead of leaving directly.
  const { data: group } = await supabase
    .from("groups")
    .select("id, owner_id")
    .eq("id", groupId)
    .maybeSingle<{ id: string; owner_id: string | null }>();

  if (!group) {
    redirect("/app/groups");
  }

  if (group.owner_id === user.id) {
    redirect(`/app/groups/${groupId}`);
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error && error.code !== "PGRST205") {
    console.error("leaveGroup error:", error);
  }

  redirect("/app/groups");
}

async function disbandGroup(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) {
    redirect("/app/groups");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, owner_id")
    .eq("id", groupId)
    .maybeSingle<{ id: string; owner_id: string | null }>();

  if (!group || group.owner_id !== user.id) {
    redirect(`/app/groups/${groupId}`);
  }

  // Best-effort cleanup of related records; ignore missing tables.
  const [membersResult, presetsResult, jobsResult] = await Promise.all([
    supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId),
    supabase
      .from("group_search_presets")
      .delete()
      .eq("group_id", groupId),
    supabase
      .from("group_jobs")
      .delete()
      .eq("group_id", groupId),
  ]);

  for (const res of [membersResult, presetsResult, jobsResult]) {
    if (res.error && res.error.code !== "PGRST205") {
      console.error("disbandGroup cleanup error:", res.error);
    }
  }

  const { error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("owner_id", user.id);

  if (deleteError && deleteError.code !== "PGRST205") {
    console.error("disbandGroup delete error:", deleteError);
    redirect(`/app/groups/${groupId}`);
  }

  redirect("/app/groups");
}

async function transferOwnershipAndLeave(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const groupId = String(formData.get("group_id") ?? "").trim();
  const newOwnerId = String(formData.get("new_owner_id") ?? "").trim();

  if (!groupId || !newOwnerId) {
    redirect("/app/groups");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, owner_id")
    .eq("id", groupId)
    .maybeSingle<{ id: string; owner_id: string | null }>();

  if (!group || group.owner_id !== user.id) {
    redirect(`/app/groups/${groupId}`);
  }

  if (newOwnerId === user.id) {
    redirect(`/app/groups/${groupId}`);
  }

  const { data: newOwnerMembership, error: membershipError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", newOwnerId)
    .maybeSingle();

  if (membershipError && membershipError.code !== "PGRST205") {
    console.error("transferOwnership membership error:", membershipError);
    redirect(`/app/groups/${groupId}`);
  }

  if (!newOwnerMembership) {
    redirect(`/app/groups/${groupId}`);
  }

  const { error: updateGroupError } = await supabase
    .from("groups")
    .update({ owner_id: newOwnerId })
    .eq("id", groupId);

  if (updateGroupError && updateGroupError.code !== "PGRST205") {
    console.error("transferOwnership update group error:", updateGroupError);
    redirect(`/app/groups/${groupId}`);
  }

  const [{ error: promoteError }, { error: demoteError }, { error: deleteError }] =
    await Promise.all([
      supabase
        .from("group_members")
        .update({ role: "owner" })
        .eq("group_id", groupId)
        .eq("user_id", newOwnerId),
      supabase
        .from("group_members")
        .update({ role: "member" })
        .eq("group_id", groupId)
        .eq("user_id", user.id),
      supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id),
    ]);

  for (const err of [promoteError, demoteError, deleteError]) {
    if (err && err.code !== "PGRST205") {
      console.error("transferOwnership role update error:", err);
    }
  }

  redirect("/app/groups");
}

function formatLocation(job: JobRow) {
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

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: { preset_id?: string };
}) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: group }, { data: membership, error: membershipError }] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id, name, description, created_at, owner_id")
        .eq("id", groupId)
        .maybeSingle<Group>(),
      supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (!group) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">
              Group not found
            </p>
            <p className="mt-1 text-slate-400">
              The group you&apos;re looking for doesn&apos;t exist or was
              removed.
            </p>
            <Link
              href="/app/groups"
              className="mt-4 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Back to groups
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwner = group.owner_id === user.id;
  const isMember = !!membership;
  const membershipTableMissing =
    membershipError && membershipError.code === "PGRST205";

  if (!isOwner && !isMember && !membershipTableMissing) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">
              You don&apos;t have access to this group.
            </p>
            <p className="mt-1 text-slate-400">
              Ask the group owner to add you as a member, or return to your
              groups overview.
            </p>
            <Link
              href="/app/groups"
              className="mt-4 inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Back to groups
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [{ data: members }, { data: presets }, { data: profile }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select(
          "user_id, role, profiles(full_name, avatar_url)",
        )
        .eq("group_id", groupId),
      supabase
        .from("group_search_presets")
        .select(
          "id, name, search_term, location, hours_old, results_wanted, created_at, profiles(full_name)",
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, home_lat, home_lon")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const memberList = (members ?? []) as GroupMember[];
  const presetsList = (presets ?? []) as GroupSearchPreset[];
  const memberCount = memberList.length;

  const selectedPresetId =
    searchParams?.preset_id ??
    (presetsList.length > 0 ? presetsList[0].id : undefined);

  const selectedPreset =
    presetsList.find((p) => p.id === selectedPresetId) ??
    null;

  let recommendedJobs: JobRow[] = [];

  if (selectedPreset && selectedPreset.search_term) {
    const orConditions: string[] = [];
    const likeTerm = `%${selectedPreset.search_term}%`;
    orConditions.push(
      `title.ilike.${likeTerm}`,
      `description.ilike.${likeTerm}`,
    );

    let query = supabase
      .from("jobs")
      .select(
        "id, title, company, city, state, country, job_type, interval, min_amount, max_amount, date_posted, job_url, latitude, longitude",
      )
      .limit(50);

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(","));
    }

    const trimmedLocation = selectedPreset.location?.trim();
    if (trimmedLocation) {
      const likeLoc = `%${trimmedLocation}%`;
      query = query.or(
        `city.ilike.${likeLoc},state.ilike.${likeLoc},country.ilike.${likeLoc}`,
      );
    }

    const hours =
      selectedPreset.hours_old && selectedPreset.hours_old > 0
        ? Math.min(selectedPreset.hours_old, 720)
        : null;

    if (hours) {
      const cutoffIso = new Date(
        Date.now() - hours * 60 * 60 * 1000,
      ).toISOString();
      query = query.gte("date_posted", cutoffIso);
    }

    const { data: jobsData } = await query;
    if (jobsData) {
      recommendedJobs = jobsData as JobRow[];
    }
  }

  const createdLabel = formatDateLabel(group.created_at);

  const homeLat =
    profile && typeof (profile as any).home_lat === "number"
      ? (profile as any).home_lat
      : null;
  const homeLon =
    profile && typeof (profile as any).home_lon === "number"
      ? (profile as any).home_lon
      : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
              Group workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-50 md:text-3xl">
              {group.name}
            </h1>
            {group.description && (
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                {group.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {createdLabel && (
                <span>Created {createdLabel}</span>
              )}
              <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] text-slate-300 border border-slate-800">
                {memberCount} member{memberCount === 1 ? "" : "s"}
              </span>
              {isOwner && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
                  You are the owner
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-[11px] text-slate-400">
            <Link
              href="/app/groups"
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-500 hover:text-emerald-200"
            >
              Back to groups
            </Link>
            {!isOwner && (
              <form action={leaveGroup}>
                <input type="hidden" name="group_id" value={groupId} />
                <button
                  type="submit"
                  className="mt-1 inline-flex items-center rounded-full border border-rose-600/60 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300 hover:border-rose-400 hover:text-rose-200"
                >
                  Leave group
                </button>
              </form>
            )}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
          {/* Left: presets + recommendations */}
          <div className="space-y-5">
            {/* Shared search presets */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Shared search presets
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Save common searches for this group and quickly load
                    recommendations.
                  </p>
                </div>
              </div>

              {presetsList.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-4 text-xs text-slate-400">
                  <p className="font-medium text-slate-200">
                    No presets yet.
                  </p>
                  <p className="mt-1">
                    Create a preset below to track a shared search like
                    &ldquo;DC/MD/VA SWE&rdquo; or &ldquo;SF remote friendly
                    PM&rdquo;.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {presetsList.map((preset) => {
                    const isActive = preset.id === selectedPresetId;
                    const createdLabel = formatDateLabel(
                      preset.created_at,
                    );
                    const creator =
                      preset.profiles?.full_name ?? "Shared preset";
                    const summaryParts: string[] = [];
                    if (preset.search_term) {
                      summaryParts.push(preset.search_term);
                    }
                    if (preset.location) {
                      summaryParts.push(preset.location);
                    }

                    return (
                      <li
                        key={preset.id}
                        className={[
                          "rounded-xl border px-3 py-2 text-xs transition",
                          isActive
                            ? "border-emerald-500/60 bg-slate-950/80"
                            : "border-slate-800 bg-slate-950/40 hover:border-slate-600",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-[12px] font-semibold text-slate-100">
                              {preset.name || "Untitled preset"}
                            </p>
                            {summaryParts.length > 0 && (
                              <p className="text-[11px] text-slate-300">
                                {summaryParts.join(" • ")}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500">
                              {createdLabel && `Saved ${createdLabel} · `}{" "}
                              By {creator}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Link
                              href={`/app/groups/${groupId}?preset_id=${preset.id}`}
                              className={[
                                "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold",
                                isActive
                                  ? "bg-emerald-500 text-slate-950"
                                  : "border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-emerald-400 hover:text-emerald-200",
                              ].join(" ")}
                            >
                              View jobs
                            </Link>
                            <Link
                              href={`/app?searchTerm=${encodeURIComponent(
                                preset.search_term ?? "",
                              )}&location=${encodeURIComponent(
                                preset.location ?? "",
                              )}`}
                              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] text-slate-300 hover:border-emerald-400 hover:text-emerald-200"
                            >
                              Run in main app
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Create preset form */}
              <form
                action={createPreset}
                className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs md:grid-cols-2"
              >
                <input type="hidden" name="group_id" value={groupId} />
                <div className="space-y-1">
                  <label
                    htmlFor="preset-name"
                    className="text-[11px] text-slate-300"
                  >
                    Preset name
                  </label>
                  <input
                    id="preset-name"
                    name="name"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    placeholder="DMV SWE core"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="preset-search-term"
                    className="text-[11px] text-slate-300"
                  >
                    Job keywords
                  </label>
                  <input
                    id="preset-search-term"
                    name="search_term"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    placeholder="e.g. software engineer"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="preset-location"
                    className="text-[11px] text-slate-300"
                  >
                    Location
                  </label>
                  <input
                    id="preset-location"
                    name="location"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    placeholder="City, state, or region"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="preset-hours"
                    className="text-[11px] text-slate-300"
                  >
                    Posted within (hours)
                  </label>
                  <input
                    id="preset-hours"
                    name="hours_old"
                    type="number"
                    min={1}
                    max={720}
                    defaultValue={72}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="preset-results"
                    className="text-[11px] text-slate-300"
                  >
                    Results wanted
                  </label>
                  <input
                    id="preset-results"
                    name="results_wanted"
                    type="number"
                    min={5}
                    max={200}
                    defaultValue={30}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 hover:shadow-emerald-400/60"
                  >
                    Save preset
                  </button>
                </div>
              </form>
            </div>

            {/* Recommended jobs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Recommended jobs for this preset
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Based on the selected preset&apos;s keywords and location.
                  </p>
                </div>
              </div>

              {!selectedPreset ? (
                <p className="mt-4 text-xs text-slate-400">
                  Select a preset above to load recommended jobs for this
                  group.
                </p>
              ) : recommendedJobs.length === 0 ? (
                <p className="mt-4 text-xs text-slate-400">
                  No jobs found yet for this preset. Try widening the time
                  window or adjusting the keywords.
                </p>
              ) : (
                <ul className="mt-4 space-y-3 text-xs">
                  {recommendedJobs.map((job) => {
                    const locationLabel = formatLocation(job);
                    const postedLabel = formatDateLabel(
                      job.date_posted,
                    );
                    const salaryLabel =
                      job.min_amount != null &&
                      job.max_amount != null &&
                      job.interval
                        ? `${job.interval} · $${job.min_amount.toLocaleString()}–$${job.max_amount.toLocaleString()}`
                        : null;

                    const canRoute =
                      homeLat != null &&
                      homeLon != null &&
                      typeof job.latitude === "number" &&
                      typeof job.longitude === "number";

                    const origin =
                      homeLat != null && homeLon != null
                        ? `${homeLat},${homeLon}`
                        : "";
                    const destination =
                      typeof job.latitude === "number" &&
                      typeof job.longitude === "number"
                        ? `${job.latitude},${job.longitude}`
                        : "";

                    const mapsUrl =
                      origin && destination
                        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                            origin,
                          )}&destination=${encodeURIComponent(
                            destination,
                          )}&travelmode=driving`
                        : null;

                    return (
                      <li
                        key={job.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 md:px-4 md:py-3.5"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {job.job_url ? (
                                <a
                                  href={job.job_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[13px] font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
                                >
                                  {job.title}
                                </a>
                              ) : (
                                <p className="text-[13px] font-semibold text-emerald-200">
                                  {job.title}
                                </p>
                              )}
                              {job.company && (
                                <span className="text-[11px] text-slate-300">
                                  · {job.company}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span className="rounded-full bg-slate-900/80 px-2 py-0.5 border border-slate-800/80">
                                {locationLabel}
                              </span>
                              {job.job_type && (
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
                            {postedLabel && (
                              <p className="text-[10px] text-slate-500">
                                Posted {postedLabel}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <form action={shareJobToGroup}>
                              <input
                                type="hidden"
                                name="group_id"
                                value={groupId}
                              />
                              <input
                                type="hidden"
                                name="job_id"
                                value={job.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-semibold text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                              >
                                Share to group
                              </button>
                            </form>

                            {canRoute ? (
                              mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400"
                                >
                                  View route
                                </a>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                Set your home location in your profile to see
                                route links.
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: members sidebar */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
              <h2 className="text-sm font-semibold text-slate-100">
                Members
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Everyone currently in this group.
              </p>

              {memberList.length === 0 ? (
                <p className="mt-4 text-xs text-slate-400">
                  No members found.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {memberList.map((member) => {
                    const roleLabel = (() => {
                      const r = (member.role ?? "").toLowerCase();
                      if (r === "owner") return "Owner";
                      if (r === "admin") return "Admin";
                      return "Member";
                    })();

                    const name =
                      member.profiles?.full_name ?? "Member";

                    const isCurrent = member.user_id === user.id;

                    return (
                      <li
                        key={member.user_id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100">
                            {name
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-slate-100 line-clamp-1">
                              {name}
                              {isCurrent && (
                                <span className="ml-1 text-[10px] text-emerald-300">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {roleLabel}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {isOwner && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/40 text-xs text-slate-400 space-y-3">
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                    Invites
                  </h3>
                  <p className="mt-1">
                    Invite links and admin tools are coming soon. For now, you
                    can manually add members via the dashboard or ask them to
                    sign in with the same email you use here.
                  </p>
                </div>

                <div className="h-px w-full bg-slate-800/80" />

                <div className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300/80">
                    Owner tools
                  </h3>
                  <p>
                    You can transfer ownership to another member and leave, or
                    permanently disband this group.
                  </p>

                  <form action={transferOwnershipAndLeave} className="space-y-2">
                    <input type="hidden" name="group_id" value={groupId} />
                    <label className="block text-[11px] text-slate-300">
                      Transfer ownership to
                    </label>
                    <select
                      name="new_owner_id"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select a member…
                      </option>
                      {memberList
                        .filter((m) => m.user_id !== user.id)
                        .map((member) => {
                          const name =
                            member.profiles?.full_name ?? "Member";
                          return (
                            <option key={member.user_id} value={member.user_id}>
                              {name}
                            </option>
                          );
                        })}
                    </select>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:border-emerald-400 hover:text-emerald-100 disabled:opacity-60"
                      disabled={
                        memberList.filter((m) => m.user_id !== user.id).length ===
                        0
                      }
                    >
                      Transfer ownership &amp; leave
                    </button>
                    {memberList.filter((m) => m.user_id !== user.id).length ===
                      0 && (
                      <p className="text-[10px] text-slate-500">
                        You&apos;re the only member. Add someone else before
                        transferring ownership.
                      </p>
                    )}
                  </form>

                  <form action={disbandGroup}>
                    <input type="hidden" name="group_id" value={groupId} />
                    <button
                      type="submit"
                      className="mt-2 inline-flex items-center rounded-full border border-rose-600/70 bg-rose-600/10 px-3 py-1 text-[11px] font-semibold text-rose-300 hover:border-rose-500 hover:text-rose-200"
                    >
                      Disband group
                    </button>
                  </form>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
