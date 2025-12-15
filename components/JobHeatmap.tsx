"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-react-components/style.css";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import {
  RMap,
  RNavigationControl,
  RSource,
  RLayer,
} from "maplibre-react-components";

type HeatmapPoint = {
  id: string | number;
  lat: number;
  lon: number;
  weight?: number;
};

interface JobHeatmapProps {
  searchTerm?: string;
  location?: string;
  hoursOld?: number;
}

export default function JobHeatmap({
  searchTerm,
  location,
  hoursOld,
}: JobHeatmapProps) {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const body: {
          searchTerm?: string;
          location?: string;
          hoursOld?: number;
        } = {};

        if (searchTerm && searchTerm.trim()) {
          body.searchTerm = searchTerm.trim();
        }
        if (location && location.trim()) {
          body.location = location.trim();
        }
        if (typeof hoursOld === "number" && Number.isFinite(hoursOld)) {
          body.hoursOld = hoursOld;
        }

        const res = await fetch("/api/job-heatmap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Request failed with ${res.status}`);
        }

        const json = await res.json();
        const nextPoints: HeatmapPoint[] = Array.isArray(json.points)
          ? json.points
              .filter(
                (p: any) =>
                  typeof p.lat === "number" && typeof p.lon === "number",
              )
              .map((p: any) => ({
                id: p.id,
                lat: p.lat,
                lon: p.lon,
                weight:
                  typeof p.weight === "number" && p.weight > 0
                    ? p.weight
                    : 1,
              }))
          : [];

        setPoints(nextPoints);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error("job-heatmap fetch error:", err);
        setError(err?.message ?? "Failed to load heatmap data.");
        setPoints([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [searchTerm, location, hoursOld]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.lon, p.lat] as [number, number],
        },
        properties: {
          weight: p.weight ?? 1,
        },
      })),
    }),
    [points],
  );

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    points.forEach((p) => {
      bounds.extend([p.lon, p.lat]);
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 11,
        duration: 600,
      });
    }
  }, [points]);

  const defaultCenter: [number, number] = [-98.5795, 39.8283]; // USA-ish

  return (
    <div className="relative h-full w-full rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
      {isMounted && (
        <RMap
          initialCenter={defaultCenter}
          initialZoom={4}
          minZoom={2}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          className="h-full w-full"
          onMounted={(map) => {
            mapRef.current = map;
          }}
        >
          <RNavigationControl position="top-right" visualizePitch />

          {points.length > 0 && (
            <>
              <RSource id="jobs-heatmap" type="geojson" data={geojson} />
              <RLayer
                id="jobs-heatmap-layer"
                type="heatmap"
                source="jobs-heatmap"
                paint={{
                  "heatmap-weight": ["coalesce", ["get", "weight"], 1],
                  "heatmap-intensity": 1,
                  "heatmap-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    0,
                    2,
                    9,
                    20,
                  ],
                  "heatmap-opacity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    3,
                    0.9,
                    11,
                    0.0,
                  ],
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0.0,
                    "rgba(30,64,175,0)",
                    0.2,
                    "rgba(56,189,248,0.35)",
                    0.4,
                    "rgba(45,212,191,0.55)",
                    0.6,
                    "rgba(234,179,8,0.7)",
                    0.8,
                    "rgba(248,113,113,0.9)",
                  ],
                }}
              />
            </>
          )}
        </RMap>
      )}

      {(loading || error) && (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between text-[11px]">
          {loading && (
            <span className="rounded-full bg-slate-950/80 px-3 py-1 text-slate-200 border border-slate-700">
              Building heatmap from recent jobs…
            </span>
          )}
          {error && (
            <span className="ml-auto rounded-full bg-rose-950/80 px-3 py-1 text-rose-200 border border-rose-700">
              {error}
            </span>
          )}
        </div>
      )}

      {!loading && !error && points.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300 shadow-md shadow-black/40">
          <p className="mb-1 text-[10px] font-semibold text-slate-100">
            Heatmap legend
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Fewer jobs</span>
            <div className="h-2 w-28 rounded-full bg-[linear-gradient(to_right,rgba(30,64,175,0.9),rgba(56,189,248,0.9),rgba(45,212,191,0.9),rgba(234,179,8,0.9),rgba(248,113,113,0.9))]" />
            <span className="text-[10px] text-slate-400">More jobs</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Colors reflect how many matching roles are clustered in an area.
          </p>
        </div>
      )}

      {!loading && !error && points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full border border-slate-800 bg-slate-950/85 px-4 py-1.5 text-[11px] text-slate-300">
            No jobs found for this heatmap yet. Try adjusting your search.
          </p>
        </div>
      )}
    </div>
  );
}
