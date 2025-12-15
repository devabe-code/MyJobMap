// utils/geocode.ts
import { createAdminClient } from "@/utils/supabase/admin";

type Coords = { lat: number; lon: number };
console.log("Geocode Running...")
function buildLocationKey(
  city: string | null,
  state: string | null,
  country: string | null
) {
  const c = (country || "USA").trim().toLowerCase();
  const ct = (city || "").trim().toLowerCase();
  const st = (state || "").trim().toLowerCase();
  return `${ct}|${st}|${c}`;
}
export async function getLatLonForLocation(
  city: string | null,
  state: string | null,
  country: string | null = "USA"
): Promise<Coords | null> {
  if (!process.env.GEOCODER_API_URL) {
    console.warn("GEOCODER_API_URL not set; skipping geocoding.");
    return null;
  }
  console.log("Geocoding:", { city, state, country });

  const supabaseAdmin = createAdminClient();

  // 1) Check cache table first
  const { data: cached, error: cacheError } = await supabaseAdmin
    .from("locations")
    .select("latitude, longitude, city, state, country")
    .eq("city", city)
    .eq("state", state)
    .eq("country", country || "USA")
    .maybeSingle();

  if (cacheError) {
    console.error("locations cache lookup error:", cacheError);
  }

  if (cached) {
    return { lat: cached.latitude, lon: cached.longitude };
  }

  // 2) Build Nominatim query
  const queryParts = [city, state, country].filter(Boolean);
  if (queryParts.length === 0) return null;

  const query = queryParts.join(", ");

  const url = new URL(process.env.GEOCODER_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  // optional but recommended
  if (process.env.GEOCODER_EMAIL) {
    url.searchParams.set("email", process.env.GEOCODER_EMAIL);
  }

  const userAgent =
    process.env.GEOCODER_USER_AGENT ||
    "MyJobMap/1.0 (contact: change-me@example.com)";

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": userAgent,
    },
  });

  if (!res.ok) {
    console.error("Nominatim HTTP error:", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;

  const first = json[0];
  if (!first?.lat || !first?.lon) {
    console.warn("Nominatim: no results for", query);
    return null;
  }

  const lat = Number(first.lat);
  const lon = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.warn("Nominatim: invalid coords for", query, first);
    return null;
  }

  // 3) Store in cache (best-effort)
  const { error: insertError } = await supabaseAdmin.from("locations").insert({
    city,
    state,
    country: country || "USA",
    latitude: lat,
    longitude: lon,
  });

  if (insertError) {
    console.error("locations cache insert error:", insertError);
  }

  return { lat, lon };
}
