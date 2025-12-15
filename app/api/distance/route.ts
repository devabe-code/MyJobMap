import { NextResponse } from "next/server";

type Point = {
  lat: number;
  lon: number;
};

type DistanceBody = {
  from: Point;
  to: Point;
};

function haversineMeters(a: Point, b: Point): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DistanceBody;

    if (
      !body.from ||
      !body.to ||
      typeof body.from.lat !== "number" ||
      typeof body.from.lon !== "number" ||
      typeof body.to.lat !== "number" ||
      typeof body.to.lon !== "number"
    ) {
      return NextResponse.json(
        { error: "from and to coordinates are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTESERVICE_API_KEY is not configured");
      return NextResponse.json(
        { error: "OPENROUTESERVICE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const url = new URL(
      "https://api.openrouteservice.org/v2/directions/driving-car"
    );
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("start", `${body.from.lon},${body.from.lat}`);
    url.searchParams.set("end", `${body.to.lon},${body.to.lat}`);

    const orsRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        // ORS expects GeoJSON by default; align Accept with that.
        Accept: "application/geo+json;charset=UTF-8",
      },
    });

    if (!orsRes.ok) {
      const text = await orsRes.text();
      console.error("OpenRouteService error:", orsRes.status, text);

      // Gracefully handle "no routable point"/similar 404s:
      // fall back to straight-line distance so the UI
      // can still show an approximate distance.
      if (orsRes.status === 404) {
        const approx = haversineMeters(body.from, body.to);
        return NextResponse.json(
          {
            distance_meters: approx,
            duration_seconds: null,
            reason: "approximate",
            geometry: null,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "OpenRouteService API error", details: text },
        { status: 502 }
      );
    }

    const json = await orsRes.json();
    const feature = json.features?.[0];
    const summary = feature?.properties?.summary;

    if (!summary || typeof summary.distance !== "number") {
      const approx = haversineMeters(body.from, body.to);
      return NextResponse.json(
        {
          distance_meters: approx,
          duration_seconds: null,
          reason: "approximate",
          geometry: null,
        },
        { status: 200 }
      );
    }

    const distanceMeters = summary.distance as number;
    const durationSeconds =
      typeof summary.duration === "number" ? (summary.duration as number) : null;

    return NextResponse.json(
      {
        distance_meters: distanceMeters,
        duration_seconds: durationSeconds,
        geometry:
          feature?.geometry?.type === "LineString"
            ? feature.geometry.coordinates
            : null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/distance:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
