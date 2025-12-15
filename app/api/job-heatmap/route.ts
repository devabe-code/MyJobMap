import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

type HeatmapRequestBody = {
  searchTerm?: string;
  location?: string;
  hoursOld?: number;
};

type JobRow = {
  id: string | number;
  latitude: number | null;
  longitude: number | null;
  date_posted?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as HeatmapRequestBody;

    const rawSearchTerm = body.searchTerm?.trim() || "";
    const rawLocation = body.location?.trim() || "";
    const rawHoursOld = body.hoursOld;

    const hoursOld =
      typeof rawHoursOld === "number" && Number.isFinite(rawHoursOld)
        ? Math.max(1, Math.min(rawHoursOld, 720))
        : undefined;

    const supabase = createAdminClient();

    let query = supabase
      .from("jobs")
      .select("id, latitude, longitude, date_posted")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(2000);

    const orConditions: string[] = [];

    if (rawSearchTerm) {
      const likeTerm = `%${rawSearchTerm}%`;
      orConditions.push(
        `title.ilike.${likeTerm}`,
        `description.ilike.${likeTerm}`,
      );
    }

    if (rawLocation) {
      const likeLoc = `%${rawLocation}%`;
      orConditions.push(
        `city.ilike.${likeLoc}`,
        `state.ilike.${likeLoc}`,
        `country.ilike.${likeLoc}`,
      );
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(","));
    }

    if (hoursOld !== undefined) {
      const cutoffIso = new Date(
        Date.now() - hoursOld * 60 * 60 * 1000,
      ).toISOString();
      query = query.gte("date_posted", cutoffIso);
    }

    const { data, error } = await query;

    if (error) {
      console.error("job-heatmap query error:", error);
      return NextResponse.json(
        { error: "Failed to load heatmap data" },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as JobRow[];

    const points = rows
      .filter(
        (row) =>
          typeof row.latitude === "number" &&
          typeof row.longitude === "number",
      )
      .map((row) => ({
        id: row.id,
        lat: row.latitude as number,
        lon: row.longitude as number,
        weight: 1,
      }));

    return NextResponse.json(
      {
        count: points.length,
        points,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/job-heatmap:", err);
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}

