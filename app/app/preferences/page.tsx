import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string | null;
  default_location: string | null;
  home_lat: number | null;
  home_lon: number | null;
};

type UserPreferencesRow = {
  user_id: string;
  default_map_view: "pins" | "heatmap" | null;
  default_zoom: number | null;
  default_lat: number | null;
  default_lon: number | null;
  show_heatmap_layer: boolean | null;
  show_job_pins: boolean | null;
  default_search_term: string | null;
  default_search_location: string | null;
  default_hours_old: number | null;
  default_results_wanted: number | null;
  default_job_types: string[] | null;
  commute_mode: "driving" | "transit" | "walking" | "bicycling" | null;
  max_commute_minutes: number | null;
  limit_results_by_commute: boolean | null;
  email_job_alerts: boolean | null;
  email_group_updates: boolean | null;
  email_frequency: "immediate" | "daily" | "weekly" | null;
  allow_group_recommendations: boolean | null;
  auto_share_saved_jobs_to_default_group: boolean | null;
  default_group_id: string | null;
  theme: "system" | "light" | "dark" | null;
  compact_card_layout: boolean | null;
  show_profile_in_groups: boolean | null;
  share_approx_location_with_groups: boolean | null;
};

type UserGroup = {
  id: string;
  name: string;
  role: string;
};

async function updateProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("full_name") ?? "").trim() || null;
  const defaultLocation =
    String(formData.get("default_location") ?? "").trim() || null;

  const homeLatRaw = formData.get("home_lat");
  const homeLonRaw = formData.get("home_lon");

  const homeLat =
    homeLatRaw != null && String(homeLatRaw).trim() !== ""
      ? Number(homeLatRaw)
      : null;
  const homeLon =
    homeLonRaw != null && String(homeLonRaw).trim() !== ""
      ? Number(homeLonRaw)
      : null;

  const hasHomeLat = homeLat !== null && !Number.isNaN(homeLat);
  const hasHomeLon = homeLon !== null && !Number.isNaN(homeLon);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      default_location: defaultLocation,
      home_lat: hasHomeLat && hasHomeLon ? homeLat : null,
      home_lon: hasHomeLat && hasHomeLon ? homeLon : null,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("updateProfile error:", error);
  }

  redirect("/app/preferences?saved=1");
}

async function updatePreferences(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bool = (name: string) => formData.get(name) === "on";

  const defaultMapViewRaw = String(
    formData.get("default_map_view") ?? "",
  ).trim() as "pins" | "heatmap" | "";
  const default_map_view =
    defaultMapViewRaw === "pins" || defaultMapViewRaw === "heatmap"
      ? defaultMapViewRaw
      : "pins";

  const defaultZoomRaw = formData.get("default_zoom");
  const default_zoom =
    defaultZoomRaw != null && String(defaultZoomRaw).trim() !== ""
      ? Number(defaultZoomRaw)
      : null;

  const defaultLatRaw = formData.get("default_lat");
  const default_lonRaw = formData.get("default_lon");

  const default_lat =
    defaultLatRaw != null && String(defaultLatRaw).trim() !== ""
      ? Number(defaultLatRaw)
      : null;
  const default_lon =
    default_lonRaw != null && String(default_lonRaw).trim() !== ""
      ? Number(default_lonRaw)
      : null;

  const default_search_term =
    String(formData.get("default_search_term") ?? "").trim() || null;
  const default_search_location =
    String(formData.get("default_search_location") ?? "").trim() || null;

  const hoursRaw = Number(formData.get("default_hours_old") ?? 72);
  const default_hours_old =
    Number.isFinite(hoursRaw) && hoursRaw > 0
      ? Math.min(hoursRaw, 720)
      : 72;

  const resultsRaw = Number(formData.get("default_results_wanted") ?? 30);
  const default_results_wanted =
    Number.isFinite(resultsRaw) && resultsRaw > 0
      ? Math.min(resultsRaw, 200)
      : 30;

  const default_job_types = formData
    .getAll("default_job_types")
    .map((v) => String(v))
    .filter(Boolean);

  const commuteModeRaw = String(
    formData.get("commute_mode") ?? "",
  ).trim() as "driving" | "transit" | "walking" | "bicycling" | "";
  const commute_mode: UserPreferencesRow["commute_mode"] =
    commuteModeRaw && ["driving", "transit", "walking", "bicycling"].includes(commuteModeRaw)
      ? commuteModeRaw
      : "driving";

  const maxCommuteRaw = formData.get("max_commute_minutes");
  const max_commute_minutes =
    maxCommuteRaw != null && String(maxCommuteRaw).trim() !== ""
      ? Number(maxCommuteRaw)
      : null;

  const emailFrequencyRaw = String(
    formData.get("email_frequency") ?? "daily",
  ) as UserPreferencesRow["email_frequency"];
  const email_frequency: UserPreferencesRow["email_frequency"] =
    emailFrequencyRaw && ["immediate", "daily", "weekly"].includes(emailFrequencyRaw)
      ? emailFrequencyRaw
      : "daily";

  const themeRaw = String(
    formData.get("theme") ?? "system",
  ) as UserPreferencesRow["theme"];
  const theme: UserPreferencesRow["theme"] =
    themeRaw && ["system", "light", "dark"].includes(themeRaw)
      ? themeRaw
      : "system";

  const defaultGroupIdRaw = formData.get("default_group_id");
  const default_group_id =
    defaultGroupIdRaw && String(defaultGroupIdRaw).trim() !== ""
      ? String(defaultGroupIdRaw)
      : null;

  const payload: Partial<UserPreferencesRow> & { user_id: string } = {
    user_id: user.id,
    default_map_view,
    default_zoom:
      default_zoom != null && !Number.isNaN(default_zoom)
        ? default_zoom
        : null,
    default_lat:
      default_lat != null && !Number.isNaN(default_lat)
        ? default_lat
        : null,
    default_lon:
      default_lon != null && !Number.isNaN(default_lon)
        ? default_lon
        : null,
    show_heatmap_layer: bool("show_heatmap_layer"),
    show_job_pins: bool("show_job_pins"),
    default_search_term,
    default_search_location,
    default_hours_old,
    default_results_wanted,
    default_job_types: default_job_types.length
      ? default_job_types
      : null,
    commute_mode,
    max_commute_minutes:
      max_commute_minutes != null && !Number.isNaN(max_commute_minutes)
        ? max_commute_minutes
        : null,
    limit_results_by_commute: bool("limit_results_by_commute"),
    email_job_alerts: bool("email_job_alerts"),
    email_group_updates: bool("email_group_updates"),
    email_frequency,
    allow_group_recommendations: bool("allow_group_recommendations"),
    auto_share_saved_jobs_to_default_group: bool(
      "auto_share_saved_jobs_to_default_group",
    ),
    default_group_id,
    theme,
    compact_card_layout: bool("compact_card_layout"),
    show_profile_in_groups: bool("show_profile_in_groups"),
    share_approx_location_with_groups: bool(
      "share_approx_location_with_groups",
    ),
  };

  const { error } = await supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("updatePreferences error:", error);
  }

  redirect("/app/preferences?saved=1");
}

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: prefs }, { data: groupsData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, default_location, home_lat, home_lon",
        )
        .eq("id", user.id)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<UserPreferencesRow>(),
      supabase
        .from("group_members")
        .select("group_id, role, groups(id, name)")
        .eq("user_id", user.id),
    ]);

  const preferences: UserPreferencesRow = {
    user_id: user.id,
    default_map_view: prefs?.default_map_view ?? "pins",
    default_zoom: prefs?.default_zoom ?? null,
    default_lat: prefs?.default_lat ?? null,
    default_lon: prefs?.default_lon ?? null,
    show_heatmap_layer:
      prefs?.show_heatmap_layer ?? true,
    show_job_pins: prefs?.show_job_pins ?? true,
    default_search_term:
      prefs?.default_search_term ?? "",
    default_search_location:
      prefs?.default_search_location ?? "",
    default_hours_old: prefs?.default_hours_old ?? 72,
    default_results_wanted:
      prefs?.default_results_wanted ?? 30,
    default_job_types: prefs?.default_job_types ?? [],
    commute_mode: prefs?.commute_mode ?? "driving",
    max_commute_minutes:
      prefs?.max_commute_minutes ?? null,
    limit_results_by_commute:
      prefs?.limit_results_by_commute ?? false,
    email_job_alerts:
      prefs?.email_job_alerts ?? false,
    email_group_updates:
      prefs?.email_group_updates ?? false,
    email_frequency: prefs?.email_frequency ?? "daily",
    allow_group_recommendations:
      prefs?.allow_group_recommendations ?? true,
    auto_share_saved_jobs_to_default_group:
      prefs?.auto_share_saved_jobs_to_default_group ?? false,
    default_group_id: prefs?.default_group_id ?? null,
    theme: prefs?.theme ?? "system",
    compact_card_layout:
      prefs?.compact_card_layout ?? false,
    show_profile_in_groups:
      prefs?.show_profile_in_groups ?? true,
    share_approx_location_with_groups:
      prefs?.share_approx_location_with_groups ?? false,
  };

  const groups: UserGroup[] =
    (groupsData as any[])?.map((row) => ({
      id: row.groups?.id as string,
      name: row.groups?.name as string,
      role: row.role as string,
    }))?.filter((g) => g.id && g.name) ?? [];

  const sp = await searchParams;
  const saved = sp?.saved === "1";

  const hasHomeLocation =
    profile &&
    typeof profile.home_lat === "number" &&
    typeof profile.home_lon === "number";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 overflow-scroll">
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-8 space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">
              Preferences
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Control how MyJobMap searches, maps, and shares jobs for you.
            </p>
          </div>
          {saved && (
            <div className="inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              Preferences saved
            </div>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr),220px]">
          {/* Main content */}
          <div className="space-y-5">
            {/* Profile & Location */}
            <section
              id="profile"
              className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
            >
              <h2 className="text-sm font-semibold text-slate-100 mb-2">
                Profile & location
              </h2>
              <p className="mb-4 text-xs text-slate-400">
                Keep your basic info and home location up to date for better
                map and commute suggestions.
              </p>

              <form action={updateProfile} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="full_name"
                      className="text-xs text-slate-300"
                    >
                      Full name
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      defaultValue={profile?.full_name ?? ""}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="How should we label your workspace?"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      Email
                    </label>
                    <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                      {user.email ?? "Signed in via provider"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="default_location"
                      className="text-xs text-slate-300"
                    >
                      Default location
                    </label>
                    <input
                      id="default_location"
                      name="default_location"
                      defaultValue={profile?.default_location ?? ""}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="e.g. Arlington, VA"
                    />
                    <p className="text-[11px] text-slate-500">
                      Used as a starting point for searches and map defaults.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      Home location for routes
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="home_lat"
                        type="number"
                        step="0.000001"
                        defaultValue={
                          typeof profile?.home_lat === "number"
                            ? profile.home_lat
                            : ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="Latitude"
                      />
                      <input
                        name="home_lon"
                        type="number"
                        step="0.000001"
                        defaultValue={
                          typeof profile?.home_lon === "number"
                            ? profile.home_lon
                            : ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="Longitude"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Used as the origin for commute distances and route links.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 hover:shadow-emerald-400/60"
                >
                  Save profile
                </button>
              </form>
            </section>

            {/* Preferences form */}
            <form
              action={updatePreferences}
              className="space-y-5"
            >
              {/* Map & heatmap */}
              <section
                id="map"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Map & heatmap
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Choose whether to start on pins, a heatmap, or both.
                </p>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Default map view
                    </span>
                    <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80">
                      <label className="px-3 py-1.5">
                        <input
                          type="radio"
                          name="default_map_view"
                          value="pins"
                          defaultChecked={
                            preferences.default_map_view === "pins"
                          }
                          className="mr-2 align-middle"
                        />
                        Pins
                      </label>
                      <label className="px-3 py-1.5">
                        <input
                          type="radio"
                          name="default_map_view"
                          value="heatmap"
                          defaultChecked={
                            preferences.default_map_view === "heatmap"
                          }
                          className="mr-2 align-middle"
                        />
                        Heatmap
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="show_job_pins"
                        defaultChecked={
                          preferences.show_job_pins ?? true
                        }
                        className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                      />
                      <span>Show job pins by default</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="show_heatmap_layer"
                        defaultChecked={
                          preferences.show_heatmap_layer ?? true
                        }
                        className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                      />
                      <span>Show heatmap layer by default</span>
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="default_zoom"
                        className="text-xs text-slate-300"
                      >
                        Default zoom
                      </label>
                      <input
                        id="default_zoom"
                        name="default_zoom"
                        type="number"
                        step="0.1"
                        min={2}
                        max={18}
                        defaultValue={
                          preferences.default_zoom ?? ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="Auto"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="default_lat"
                        className="text-xs text-slate-300"
                      >
                        Default center lat
                      </label>
                      <input
                        id="default_lat"
                        name="default_lat"
                        type="number"
                        step="0.000001"
                        defaultValue={
                          preferences.default_lat ?? ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="Auto"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="default_lon"
                        className="text-xs text-slate-300"
                      >
                        Default center lon
                      </label>
                      <input
                        id="default_lon"
                        name="default_lon"
                        type="number"
                        step="0.000001"
                        defaultValue={
                          preferences.default_lon ?? ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Search defaults */}
              <section
                id="search"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Search defaults
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  These are used to prefill future searches in the app.
                </p>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        htmlFor="default_search_term"
                        className="text-xs text-slate-300"
                      >
                        Default search term
                      </label>
                      <input
                        id="default_search_term"
                        name="default_search_term"
                        defaultValue={
                          preferences.default_search_term ?? ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder='e.g. "software engineer"'
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="default_search_location"
                        className="text-xs text-slate-300"
                      >
                        Default location
                      </label>
                      <input
                        id="default_search_location"
                        name="default_search_location"
                        defaultValue={
                          preferences.default_search_location ?? ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="City, state, or region"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="default_hours_old"
                        className="text-xs text-slate-300"
                      >
                        Default time window (hours)
                      </label>
                      <select
                        id="default_hours_old"
                        name="default_hours_old"
                        defaultValue={String(
                          preferences.default_hours_old,
                        )}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <option value="24">24</option>
                        <option value="48">48</option>
                        <option value="72">72</option>
                        <option value="168">168 (7 days)</option>
                        <option value="720">720 (30 days)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="default_results_wanted"
                        className="text-xs text-slate-300"
                      >
                        Default results wanted
                      </label>
                      <select
                        id="default_results_wanted"
                        name="default_results_wanted"
                        defaultValue={String(
                          preferences.default_results_wanted,
                        )}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                    <div />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Default job types
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        "fulltime",
                        "parttime",
                        "internship",
                        "contract",
                        "other",
                      ].map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            name="default_job_types"
                            value={type}
                            defaultChecked={preferences.default_job_types?.includes(
                              type,
                            )}
                            className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                          />
                          <span className="capitalize">
                            {type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Commute & routes */}
              <section
                id="commute"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Commute & routes
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Set your preferred commute mode and rough limits for job
                  suggestions.
                </p>

                {!hasHomeLocation && (
                  <div className="mb-4 rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                    Set your home location in the Profile section above to
                    enable commute-aware features and route links.
                  </div>
                )}

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-300">
                      Commute mode
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: "driving", label: "Driving" },
                        { value: "transit", label: "Transit" },
                        { value: "walking", label: "Walking" },
                        { value: "bicycling", label: "Bicycling" },
                      ].map((mode) => (
                        <label
                          key={mode.value}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="radio"
                            name="commute_mode"
                            value={mode.value}
                            defaultChecked={
                              preferences.commute_mode ===
                              mode.value
                            }
                            className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                          />
                          <span>{mode.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        htmlFor="max_commute_minutes"
                        className="text-xs text-slate-300"
                      >
                        Max commute time (minutes)
                      </label>
                      <input
                        id="max_commute_minutes"
                        name="max_commute_minutes"
                        type="number"
                        min={10}
                        max={180}
                        defaultValue={
                          preferences.max_commute_minutes ?? ""
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        placeholder="e.g. 45"
                      />
                      <p className="text-[11px] text-slate-500">
                        Used as a soft limit when evaluating roles.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">
                        Filter by commute
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="limit_results_by_commute"
                          defaultChecked={
                            preferences.limit_results_by_commute ??
                            false
                          }
                          className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                        />
                        <span>
                          Filter out jobs beyond this commute time
                          (approximate)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notifications */}
              <section
                id="notifications"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Notifications
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  These may be used later as we roll out email digests and
                  alerts.
                </p>

                <div className="space-y-3 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="email_job_alerts"
                      defaultChecked={
                        preferences.email_job_alerts ?? false
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>Send me email job alerts</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="email_group_updates"
                      defaultChecked={
                        preferences.email_group_updates ?? false
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>
                      Send me email updates when someone shares jobs
                      to my groups
                    </span>
                  </label>

                  <div className="space-y-1">
                    <label
                      htmlFor="email_frequency"
                      className="text-xs text-slate-300"
                    >
                      Email frequency
                    </label>
                    <select
                      id="email_frequency"
                      name="email_frequency"
                      defaultValue={preferences.email_frequency ?? "daily"}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Groups & sharing */}
              <section
                id="groups"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Groups & sharing
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Control how your activity feeds into group recommendations and
                  sharing flows.
                </p>

                <div className="space-y-3 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="allow_group_recommendations"
                      defaultChecked={
                        preferences.allow_group_recommendations ?? true
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>
                      Allow MyJobMap to use my saved jobs and searches to
                      improve group recommendations
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="auto_share_saved_jobs_to_default_group"
                      defaultChecked={
                        preferences.auto_share_saved_jobs_to_default_group ??
                        false
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>
                      Automatically suggest sharing newly saved jobs to my
                      default group
                    </span>
                  </label>

                  <div className="space-y-1">
                    <label
                      htmlFor="default_group_id"
                      className="text-xs text-slate-300"
                    >
                      Default group for sharing
                    </label>
                    <select
                      id="default_group_id"
                      name="default_group_id"
                      defaultValue={preferences.default_group_id ?? ""}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    >
                      <option value="">None</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}{" "}
                          {g.role
                            ? `(${g.role.toLowerCase()})`
                            : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      You&apos;ll see this group suggested more often when
                      sharing roles.
                    </p>
                  </div>

                  {groups.length > 0 && (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-400">
                      <p className="mb-1 text-[11px] font-semibold text-slate-200">
                        Your groups
                      </p>
                      <ul className="space-y-1">
                        {groups.map((g) => (
                          <li
                            key={g.id}
                            className="flex items-center justify-between"
                          >
                            <span className="truncate">
                              {g.name}
                            </span>
                            <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
                              {g.role.toLowerCase()}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2">
                        <Link
                          href="/app/groups"
                          className="text-[11px] text-emerald-300 hover:text-emerald-200"
                        >
                          Open groups workspace
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Appearance */}
              <section
                id="appearance"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Appearance
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Theme and layout preferences for how results are displayed.
                </p>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <label
                      htmlFor="theme"
                      className="text-xs text-slate-300"
                    >
                      Theme
                    </label>
                    <select
                      id="theme"
                      name="theme"
                      defaultValue={preferences.theme ?? "system"}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Theme switching is applied across the app where
                      supported.
                    </p>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="compact_card_layout"
                      defaultChecked={
                        preferences.compact_card_layout ?? false
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>
                      Use compact list/card layout for job results
                    </span>
                  </label>
                </div>
              </section>

              {/* Privacy & data */}
              <section
                id="privacy"
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
              >
                <h2 className="text-sm font-semibold text-slate-100 mb-2">
                  Privacy & data
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Decide what information is visible to group members and how
                  your data is handled.
                </p>

                <div className="space-y-3 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="show_profile_in_groups"
                      defaultChecked={
                        preferences.show_profile_in_groups ?? true
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>
                      Show my profile info (name & avatar) to other group
                      members
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="share_approx_location_with_groups"
                      defaultChecked={
                        preferences.share_approx_location_with_groups ??
                        false
                      }
                      className="h-3 w-3 rounded border-slate-600 bg-slate-950"
                    />
                    <span>
                      Share an approximate location for group heatmaps and
                      insights
                    </span>
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs">
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-3">
                    <p className="font-semibold text-slate-100">
                      Export my data
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Download a copy of your saved jobs, searches, and
                      preferences. This is a placeholder action for now.
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
                      disabled
                    >
                      Export (coming soon)
                    </button>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-3">
                    <p className="font-semibold text-slate-100">
                      Delete my account
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Permanently remove your account and associated data.
                      This will be handled via a dedicated flow.
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-200"
                      disabled
                    >
                      Delete account (coming soon)
                    </button>
                  </div>
                </div>
              </section>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 hover:shadow-emerald-400/60"
                >
                  Save preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
