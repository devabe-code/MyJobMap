import { NextResponse } from "next/server";
import { getLatLonForLocation } from "@/utils/geocode";

type GeocodeBody = {
  location: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeocodeBody;
    const locationText = body.location?.trim();

    if (!locationText) {
      return NextResponse.json(
        { error: "location is required" },
        { status: 400 }
      );
    }

    const coords = await getLatLonForLocation(locationText, null, "USA");

    if (!coords) {
      return NextResponse.json(
        { error: "Location could not be resolved" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { lat: coords.lat, lon: coords.lon },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/geocode-location:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

