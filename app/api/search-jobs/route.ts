// app/api/search-jobs/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getLatLonForLocation } from "@/utils/geocode";

type JobSpyJob = {
  site?: string;
  SITE?: string;
  title?: string;
  TITLE?: string;
  company?: string;
  COMPANY?: string;

  // raw location text (Arlington, VA, etc.)
  location?: string;
  LOCATION?: string;

  city?: string;
  CITY?: string;
  state?: string;
  STATE?: string;
  country?: string;
  COUNTRY?: string;

  job_url?: string;
  JOB_URL?: string;
  description?: string;
  DESCRIPTION?: string;
  job_type?: string | null;
  JOB_TYPE?: string | null;
  is_remote?: boolean | null;
  IS_REMOTE?: boolean | null;
  interval?: string | null;
  INTERVAL?: string | null;
  min_amount?: number | null;
  MIN_AMOUNT?: number | null;
  max_amount?: number | null;
  MAX_AMOUNT?: number | null;
  date_posted?: string | null;
  DATE_POSTED?: string | null;
};

type SearchBody = {
  searchTerm: string;
  location?: string;
  resultsWanted?: number;
  hoursOld?: number;
  forceExternal?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;

    const searchTerm = body.searchTerm?.trim();
    if (!searchTerm) {
      return NextResponse.json(
        { error: "searchTerm is required" },
        { status: 400 }
      );
    }

    const location = body.location?.trim() || "";
    const resultsWanted = body.resultsWanted ?? 30;
    const hoursOld = Math.min(body.hoursOld ?? 72, 720);
    const forceExternal = body.forceExternal === true;

    const supabaseAdmin = createAdminClient();

    // 0) Try to satisfy this search from existing jobs in the DB first,
    // unless the caller explicitly requests an external refresh.
    if (!forceExternal) {
      try {
        const now = Date.now();
        const cutoffIso = new Date(
          now - hoursOld * 60 * 60 * 1000
        ).toISOString();

        const likeTerm = `%${searchTerm}%`;
        const likeLocation = location ? `%${location}%` : null;

        const orConditions: string[] = [
          `title.ilike.${likeTerm}`,
          `description.ilike.${likeTerm}`,
        ];

        if (likeLocation) {
          orConditions.push(
            `city.ilike.${likeLocation}`,
            `state.ilike.${likeLocation}`,
            `country.ilike.${likeLocation}`
          );
        }

        let dbQuery = supabaseAdmin
          .from("jobs")
          .select(
            `
            site_name,
            job_url,
            title,
            company,
            description,
            job_type,
            is_remote,
            city,
            state,
            country,
            interval,
            min_amount,
            max_amount,
            currency,
            salary_source,
            date_posted,
            latitude,
            longitude
          `
          )
          .gte("date_posted", cutoffIso)
          .limit(resultsWanted);

        if (orConditions.length > 0) {
          dbQuery = dbQuery.or(orConditions.join(","));
        }

        const { data: cachedJobs, error: dbError } = await dbQuery;

        if (dbError) {
          console.error("DEBUG: jobs DB lookup error:", dbError);
        } else if (cachedJobs && cachedJobs.length > 0) {
          console.log(
            "DEBUG: returning cached jobs from DB:",
            cachedJobs.length
          );
          return NextResponse.json(
            { count: cachedJobs.length, jobs: cachedJobs },
            { status: 200 }
          );
        } else {
          console.log(
            "DEBUG: no cached jobs found for search; falling back to JobSpy"
          );
        }
      } catch (dbLookupErr) {
        console.error(
          "DEBUG: unexpected error during jobs DB lookup:",
          dbLookupErr
        );
      }
    } else {
      console.log("DEBUG: forceExternal=true, skipping DB cache lookup");
    }

    if (!process.env.JOBSPY_API_URL) {
      console.error("JOBSPY_API_URL is not configured");
      return NextResponse.json(
        { error: "JOBSPY_API_URL is not configured" },
        { status: 500 }
      );
    }

    // 1) Call JobSpy API
    const url = new URL("/scrape", process.env.JOBSPY_API_URL);
    url.searchParams.set("search_term", searchTerm);
    if (location) url.searchParams.set("location", location);
    url.searchParams.set("results_wanted", String(resultsWanted));
    url.searchParams.set("hours_old", String(hoursOld));

    console.log("DEBUG: calling JobSpy with:", url.toString());

    const jobspyRes = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!jobspyRes.ok) {
      const text = await jobspyRes.text();
      console.error("JobSpy error:", jobspyRes.status, text);
      return NextResponse.json(
        { error: "JobSpy API error", details: text },
        { status: 502 }
      );
    }

    const jobspyJson = await jobspyRes.json();
    const jobs: JobSpyJob[] = jobspyJson.jobs ?? [];

    console.log("DEBUG: JobSpy returned jobs:", jobs.length);

    // 2) Normalize into jobs table shape
    const rowsToUpsert = jobs
      .map((job) => {
        const siteRaw = job.site ?? job.SITE ?? "";
        const site = String(siteRaw).toLowerCase();

        const jobUrl = job.job_url ?? job.JOB_URL;
        const title = job.title ?? job.TITLE;

        if (!site || !jobUrl || !title) {
          return null;
        }

        const company = job.company ?? job.COMPANY ?? null;
        const locationText = job.location ?? job.LOCATION ?? null;

        // Structured fields
        let city = job.city ?? job.CITY ?? null;
        let state = job.state ?? job.STATE ?? null;
        let country = job.country ?? job.COUNTRY ?? "USA";

        // Fallback: if no city/state but we have a raw location string,
        // treat that as "city" for geocoding (e.g. "Arlington, VA")
        if (!city && !state && locationText) {
          city = locationText;
        }

        // Normalize cases where the provider puts everything in "city"
        // e.g. "Tuscaloosa, AL, US" with state=null, country="USA"
        if (city) {
          const parts = city.split(",").map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const rawCity = parts[0];
            const rawState = parts[1];
            const rawCountry = parts[2] ?? null;

            // If the "city" value is really a state-level location like "AL, US"
            if (!state && rawCity.length <= 3 && !rawCountry) {
              state = rawCity;
              city = null;
            } else {
              city = rawCity;
              if (!state && rawState && rawState.length <= 3) {
                state = rawState;
              }
            }

            if (!country && rawCountry) {
              country = rawCountry;
            }
          }
        }

        const description = job.description ?? job.DESCRIPTION ?? null;

        const jobTypeRaw = job.job_type ?? job.JOB_TYPE ?? null;
        const intervalRaw = job.interval ?? job.INTERVAL ?? null;

        const site_name = site as
          | "indeed"
          | "linkedin"
          | "zip_recruiter"
          | "google"
          | "glassdoor"
          | "bayt"
          | "naukri"
          | "bdjobs";

        const normalizedJobType = jobTypeRaw
          ? jobTypeRaw.toLowerCase()
          : null;

        const job_type =
          normalizedJobType === "fulltime"
            ? "fulltime"
            : normalizedJobType === "parttime"
            ? "parttime"
            : normalizedJobType === "internship"
            ? "internship"
            : normalizedJobType === "contract"
            ? "contract"
            : normalizedJobType
            ? "other"
            : null;

        const intervalNorm = intervalRaw
          ? intervalRaw.toLowerCase()
          : null;

        const interval =
          intervalNorm === "yearly" ||
          intervalNorm === "monthly" ||
          intervalNorm === "weekly" ||
          intervalNorm === "daily" ||
          intervalNorm === "hourly"
            ? intervalNorm
            : intervalNorm
            ? "other"
            : null;

        const min_amount = job.min_amount ?? job.MIN_AMOUNT ?? null;
        const max_amount = job.max_amount ?? job.MAX_AMOUNT ?? null;

        const date_posted_str =
          job.date_posted ?? job.DATE_POSTED ?? null;

        const date_posted = date_posted_str
          ? new Date(date_posted_str).toISOString()
          : null;

        return {
          site_name,
          job_url: jobUrl,
          title,
          company,
          description,
          job_type,
          is_remote: job.is_remote ?? job.IS_REMOTE ?? null,
          city,
          state,
          country,
          interval,
          min_amount,
          max_amount,
          currency: null as string | null,
          salary_source: null as string | null,
          date_posted,
          latitude: null as number | null,
          longitude: null as number | null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    console.log("DEBUG: normalized rowsToUpsert:", rowsToUpsert.length);

    // 2.5) Geocode unique locations
    const uniqueLocations = new Map<
      string,
      { city: string | null; state: string | null; country: string | null }
    >();

    for (const row of rowsToUpsert) {
      const city = row.city ?? null;
      const state = row.state ?? null;
      const country = row.country ?? "USA";

      if (!city && !state) continue;

      const key = `${(city || "").toLowerCase()}|${(state || "").toLowerCase()}|${country.toLowerCase()}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, { city, state, country });
      }
    }

    console.log(
      "DEBUG: uniqueLocations to geocode:",
      Array.from(uniqueLocations.values())
    );

    const coordsByKey = new Map<string, { lat: number; lon: number }>();

    for (const [key, loc] of uniqueLocations.entries()) {
      console.log("DEBUG: calling geocoder for:", loc);
      const coords = await getLatLonForLocation(
        loc.city,
        loc.state,
        loc.country
      );
      console.log("DEBUG: geocoder result for key", key, coords);
      if (coords) {
        coordsByKey.set(key, coords);
      }
    }

    // Attach coords
    for (const row of rowsToUpsert) {
      const city = row.city ?? null;
      const state = row.state ?? null;
      const country = row.country ?? "USA";

      if (!city && !state) continue;

      const key = `${(city || "").toLowerCase()}|${(state || "").toLowerCase()}|${country.toLowerCase()}`;
      const coords = coordsByKey.get(key);
      if (coords) {
        row.latitude = coords.lat;
        row.longitude = coords.lon;
      }
    }

    console.log(
      "DEBUG: rowsToUpsert with coords (first 3):",
      rowsToUpsert.slice(0, 3)
    );

    // 3) Upsert into Supabase (re-using the admin client)
    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("jobs")
        .upsert(rowsToUpsert, {
          onConflict: "site_name,job_url",
        });

      if (upsertError) {
        console.error("jobs upsert error:", upsertError);
        return NextResponse.json(
          {
            error: "Failed to upsert jobs",
            details: upsertError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { count: rowsToUpsert.length, jobs: rowsToUpsert },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/search-jobs:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
