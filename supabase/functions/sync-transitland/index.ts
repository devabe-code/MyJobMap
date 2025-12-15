// deno-lint-ignore-file no-import-prefix
// supabase/functions/sync-transitland/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Environment variables ----
const SUPABASE_URL = Deno.env.get("PROJECT_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const TRANSITLAND_API_KEY = Deno.env.get("TRANSITLAND_API_KEY")!;

// Transitland v2 REST base
const TRANSITLAND_BASE = "https://transit.land/api/v2/rest";

// Define regions you care about.
// You can add more cities later.
// radius is in meters.
const REGIONS = [
  {
    name: "dc",
    lat: 38.9072,
    lon: -77.0369,
    radius: 10000, // 10km
    maxStops: 50,  // we will limit stop-departures calls per region
  },
];

// Supabase admin client (bypasses RLS – keep this server-side only)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to call Transitland with API key and query params
async function tlGet(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<any> {
  const url = new URL(`${TRANSITLAND_BASE}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("apikey", TRANSITLAND_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    console.error("Transitland error:", res.status, body);
    throw new Error(`Transitland error ${res.status} for ${url}`);
  }

  const json = await res.json();
  return json;
}

serve(async (req: Request) => {
  // Optional: require a secret header or method check
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    console.log("Starting Transitland sync...");

    // 1) Clear snapshot tables before inserting fresh data
    // (If you want partial TTL instead, we can adjust later.)
    const { error: depDelError } = await supabase
      .from("transit_departures_live")
      .delete()
      .gt("id", 0);

    if (depDelError) {
      console.error("Error deleting departures:", depDelError.message);
      throw depDelError;
    }

    const { error: alertsDelError } = await supabase
      .from("transit_alerts_live")
      .delete()
      .gt("id", 0);

    if (alertsDelError) {
      console.error("Error deleting alerts:", alertsDelError.message);
      throw alertsDelError;
    }

    for (const region of REGIONS as {
      name: string;
      lat: number;
      lon: number;
      radius: number;
      maxStops: number;
    }[]) {
      console.log(`Syncing region: ${region.name}`);

      // 2) Fetch stops near this region
      // /stops?lat=&lon=&radius=&per_page=
      // Transitland docs: you can tweak per_page and pagination if needed.
      const stopsRes = await tlGet("/stops", {
        lat: region.lat,
        lon: region.lon,
        radius: region.radius,
        per_page: 200,
      });

      const stops = (stopsRes?.stops ?? []) as any[];

      console.log(`Fetched ${stops.length} stops for region ${region.name}`);

      // Upsert stops into transit_stops
      if (stops.length > 0) {
        const upsertStops = stops
          .map((s: any) => {
            const coords = s.geometry?.coordinates || [];
            const lon = coords[0];
            const lat = coords[1];

            if (lat == null || lon == null) return null;

            return {
              onestop_id: s.onestop_id,
              name: s.name || "Unknown stop",
              lat,
              lon,
              city: region.name,
              region: region.name,
              updated_at: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (upsertStops.length > 0) {
          const { error: stopsError } = await supabase
            .from("transit_stops")
            .upsert(upsertStops as any[], {
              onConflict: "onestop_id",
            });

          if (stopsError) {
            console.error("Error upserting stops:", stopsError.message);
            throw stopsError;
          }
        }
      }

      // 3) For a limited subset of stops, fetch upcoming departures
      const limitedStops = stops.slice(0, region.maxStops);

      for (const stop of limitedStops as any[]) {
        const stopId = stop.onestop_id as string | undefined;
        if (!stopId) continue;

        try {
            const depsRes = await tlGet(
              `/stops/${encodeURIComponent(stopId)}/departures`,
              {
                // how far ahead to look (in seconds) – 3600 = next hour
                next: 3600,
                // or you can use a specific date instead:
                // date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
                relative_date: "TODAY",      // optional but explicit
                include_alerts: "true",      // include GTFS-RT alerts
                limit: 50,                   // max departures to return
              }
            );

          const departures = (depsRes?.departures ?? []) as any[];
          const alerts = (depsRes?.alerts ?? []) as any[];

          if (departures.length > 0) {
            const rows = departures
              .map((d: any) => {
                const route = d.route || {};
                const s = d.stop || {};
                const departureTime =
                  d.departure?.time || d.scheduled?.departure_time;

                if (!departureTime) return null;

                return {
                  stop_onestop_id: s.onestop_id || stopId,
                  route_onestop_id: route.onestop_id || null,
                  route_short_name: route.short_name || null,
                  route_long_name: route.long_name || null,
                  headsign: d.trip?.headsign || null,
                  departure_time: new Date(departureTime).toISOString(),
                  is_real_time: Boolean(d.departure?.is_real_time),
                  operator_name: d.operator?.name || null,
                  fetched_at: new Date().toISOString(),
                };
              })
              .filter(Boolean);

            if (rows.length > 0) {
              const { error: depInsertError } = await supabase
                .from("transit_departures_live")
                .insert(rows as any[]);

              if (depInsertError) {
                console.error(
                  "Error inserting departures for stop",
                  stopId,
                  depInsertError.message,
                );
              }
            }
          }

          if (alerts.length > 0) {
            const alertRows = alerts.map((a: any) => ({
              scope: a.scope || "global",
              route_onestop_id: a.route_onestop_id || null,
              stop_onestop_id: a.stop_onestop_id || null,
              header: a.header || null,
              description: a.description || null,
              effect: a.effect || null,
              starts_at: a.starts_at
                ? new Date(a.starts_at).toISOString()
                : null,
              ends_at: a.ends_at ? new Date(a.ends_at).toISOString() : null,
              fetched_at: new Date().toISOString(),
            }));

            const { error: alertsInsertError } = await supabase
              .from("transit_alerts_live")
              .insert(alertRows);

            if (alertsInsertError) {
              console.error(
                "Error inserting alerts for stop",
                stopId,
                alertsInsertError.message,
              );
            }
          }
        } catch (e) {
          console.error(
            `Error fetching stop-departures for stop ${stopId}:`,
            (e as Error).message,
          );
          // Keep going for other stops
        }
      }
    }

    console.log("Transitland sync completed successfully.");

    return new Response(
      JSON.stringify({ ok: true, message: "Transitland sync complete" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Transitland sync failed:", (err as Error).message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: (err as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
