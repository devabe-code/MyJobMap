// app/api/debug-geocode/route.ts
import { NextResponse } from "next/server";
import { getLatLonForLocation } from "@/utils/geocode";

export async function GET() {
  console.log("DEBUG: /api/debug-geocode called");

  const coords = await getLatLonForLocation("Arlington, VA", null, "USA");

  console.log("DEBUG: geocode result:", coords);

  return NextResponse.json({ coords });
}
