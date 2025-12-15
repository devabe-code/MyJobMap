// components/JobMap.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-react-components/style.css";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import {
  RMap,
  RMarker,
  RPopup,
  RNavigationControl,
  RSource,
  RLayer,
} from "maplibre-react-components";
import { HouseIcon } from "lucide-react";
import CustomMarker from "./CustomMarker";
import { Tooltip } from "./ui/tooltip-card";
import type {
  JobForMap,
  JobMapProps,
} from "@/types/JobMapTypes";
import { formatDistance, formatDuration } from "@/utils/jobMap";

export default function JobMap({
  jobs,
  onSelect,
  selectedJobId,
  onHover,
  homeLocation,
  routeGeometry,
  routeSummary,
  searchAreaCircle,
  comparisonRoutes,
}: JobMapProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.latitude !== null &&
          job.longitude !== null &&
          !Number.isNaN(job.latitude) &&
          !Number.isNaN(job.longitude)
      ),
    [jobs]
  );

  useEffect(() => {
    if (!mapRef.current || !routeGeometry || routeGeometry.length < 2) return;
    const bounds = new maplibregl.LngLatBounds();
    routeGeometry.forEach(([lng, lat]) => {
      bounds.extend([lng, lat]);
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 10,
        duration: 700,
      });
    }
  }, [routeGeometry]);

  useEffect(() => {
    if (!mapRef.current || !selectedJobId) return;
    const job = validJobs.find(
      (j) =>
        j.id !== undefined && String(j.id) === String(selectedJobId)
    );
    if (!job || job.longitude == null || job.latitude == null) return;
    mapRef.current.flyTo({
      center: [job.longitude, job.latitude],
      zoom: 12,
      essential: true,
    });
  }, [selectedJobId, validJobs]);

  useEffect(() => {
    if (!mapRef.current || validJobs.length === 0 || routeGeometry?.length)
      return;
    const bounds = new maplibregl.LngLatBounds();
    validJobs.forEach((job) => {
      bounds.extend([job.longitude as number, job.latitude as number]);
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 })
    }
  }, [validJobs]);

  const defaultCenter: [number, number] = [-77.0369, 38.9072];

  const positionedJobs = useMemo(() => {
    const groups = new Map<string, JobForMap[]>();
    validJobs.forEach((job) => {
      const lat = job.latitude;
      const lon = job.longitude;
      if (lat == null || lon == null) return;
      const key = `${lat.toFixed(5)}|${lon.toFixed(5)}`;
      const list = groups.get(key);
      if (list) {
        list.push(job);
      } else {
        groups.set(key, [job]);
      }
    });

    const result: {
      id: string;
      displayLat: number;
      displayLon: number;
      jobs: JobForMap[];
    }[] = [];

    groups.forEach((jobsAtPoint, key) => {
      if (jobsAtPoint.length === 0) return;
      const baseLat = jobsAtPoint[0].latitude as number;
      const baseLon = jobsAtPoint[0].longitude as number;
      result.push({
        id: `cluster-${key}`,
        displayLat: baseLat,
        displayLon: baseLon,
        jobs: jobsAtPoint,
      });
    });

    return result;
  }, [validJobs]);

  const searchAreaFeature = useMemo(() => {
    if (!searchAreaCircle) return null;
    const { center, radiusMeters } = searchAreaCircle;
    const [lng, lat] = center;
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(radiusMeters) ||
      radiusMeters <= 0
    ) {
      return null;
    }

    const steps = 64;
    const coords: [number, number][] = [];
    const earthRadius = 6371000; // meters
    const latRad = (lat * Math.PI) / 180;

    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const dx = (radiusMeters / earthRadius) * Math.cos(angle);
      const dy = (radiusMeters / earthRadius) * Math.sin(angle);

      const newLat = lat + (dx * 180) / Math.PI;
      const newLng =
        lng +
        ((dy * 180) / Math.PI) / Math.cos(latRad);

      coords.push([newLng, newLat]);
    }

    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [coords],
      },
      properties: {},
    };
  }, [searchAreaCircle]);

  const comparisonRoutesFeature = useMemo(() => {
    if (!comparisonRoutes || comparisonRoutes.length === 0) return null;
    const features = comparisonRoutes
      .filter((r) => r.geometry && r.geometry.length >= 2)
      .map((r) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: r.geometry,
        },
        properties: {
          jobId: r.jobId,
          color: r.color || "#22c55e",
        },
      }));
    if (features.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [comparisonRoutes]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      {isMounted && (
        <RMap
          initialCenter={defaultCenter}
          initialZoom={8}
          minZoom={3}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          className="h-full w-full"
          onMounted={(map) => {
            mapRef.current = map;
          }}
        >
          <RNavigationControl position="top-right" visualizePitch />

          {comparisonRoutesFeature && (
            <>
              <RSource
                id="comparison-routes"
                type="geojson"
                data={comparisonRoutesFeature}
              />
              <RLayer
                id="comparison-routes-line"
                type="line"
                source="comparison-routes"
                paint={{
                  "line-color": ["coalesce", ["get", "color"], "#22c55e"],
                  "line-width": 2.5,
                  "line-opacity": 0.85,
                }}
              />
            </>
          )}

          {searchAreaFeature && (
            <>
              <RSource
                id="search-area-circle"
                type="geojson"
                data={searchAreaFeature}
              />
              <RLayer
                id="search-area-circle-fill"
                type="fill"
                source="search-area-circle"
                paint={{
                  "fill-color": "#22c55e",
                  "fill-opacity": 0.12,
                }}
              />
              <RLayer
                id="search-area-circle-outline"
                type="line"
                source="search-area-circle"
                paint={{
                  "line-color": "#22c55e",
                  "line-width": 1.5,
                  "line-opacity": 0.8,
                }}
              />
            </>
          )}

          {routeGeometry && routeGeometry.length >= 2 && (
            <>
              <RSource
                id="home-job-route"
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: routeGeometry,
                  },
                  properties: {},
                }}
              />
              <RLayer
                id="home-job-route-line"
                type="line"
                source="home-job-route"
                paint={{
                  "line-color": "#f97316",
                  "line-width": 2.5,
                  "line-opacity": 0.9,
                }}
              />
              {routeSummary && (
                <RPopup
                  anchor="top"
                  closeButton={false}
                  longitude={routeGeometry[routeGeometry.length - 1][0]}
                  latitude={routeGeometry[routeGeometry.length - 1][1]}
                  offset={12}
                >
                  <div className="rounded-md bg-card/90 px-2.5 py-1.5 text-[11px] text-foreground shadow">
                    <p className="font-semibold text-emerald-300">
                      {routeSummary.distanceLabel}
                    </p>
                    {routeSummary.durationLabel && (
                      <p className="text-slate-300">
                        {routeSummary.durationLabel}
                      </p>
                    )}
                  </div>
                </RPopup>
              )}
            </>
          )}

          {homeLocation &&
            homeLocation.latitude != null &&
            homeLocation.longitude != null && (
              <RMarker
                longitude={homeLocation.longitude}
                latitude={homeLocation.latitude}
                initialAnchor="bottom"
              >
                <Tooltip
                  stickyOnClick
                  containerClassName="cursor-pointer"
                  content={
                    <div className="space-y-1 text-[12px] text-slate-100">
                      <p className="font-semibold text-slate-50">
                        {homeLocation.label || "Home"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Home location
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {homeLocation.latitude.toFixed(4)},{" "}
                        {homeLocation.longitude.toFixed(4)}
                      </p>
                    </div>
                  }
                >
                  <CustomMarker
                    pinColor={homeLocation.color || "#f97316"}
                    backgroundColor={
                      homeLocation.color
                        ? `${homeLocation.color}1a`
                        : "rgba(249,115,22,0.1)"
                    }
                    contentColor="#0f172a"
                    size={36}
                  >
                    <HouseIcon className="h-4 w-4" />
                  </CustomMarker>
                </Tooltip>
              </RMarker>
            )}

          {positionedJobs.map((cluster) => {
            if (!cluster.jobs.length) return null;
            const primaryJob = cluster.jobs[0];
            const isSelected =
              selectedJobId !== undefined &&
              selectedJobId !== null &&
              cluster.jobs.some(
                (job) =>
                  job.id !== undefined &&
                  job.id !== null &&
                  String(job.id) === String(selectedJobId)
              );

            const pinColor = primaryJob.color || "#22c55e";
            const count = cluster.jobs.length;
            return (
              <RMarker
                key={cluster.id}
                longitude={cluster.displayLon}
                latitude={cluster.displayLat}
                initialAnchor="bottom"
                onClick={() => onSelect?.(primaryJob)}
                onMouseEnter={() => {
                  onHover?.(primaryJob);
                }}
                onMouseLeave={() => {
                  onHover?.(null);
                }}
              >
                <Tooltip
                  stickyOnClick
                  containerClassName="cursor-pointer"
                  content={
                    count === 1 ? (
                      <div className="space-y-1 text-[12px] text-slate-100">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-50 line-clamp-1">
                            {primaryJob.title}
                          </p>
                        </div>
                        {primaryJob.company && (
                          <p className="text-[11px] text-slate-300 line-clamp-1">
                            {primaryJob.company}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          {[primaryJob.city, primaryJob.state, primaryJob.country]
                            .filter(Boolean)
                            .join(", ") || "Location unknown"}
                          {primaryJob.is_remote ? " - Remote friendly" : ""}
                        </p>
                        {primaryJob.distanceMeters &&
                          primaryJob.distanceMeters > 0 && (
                            <p className="text-[11px] text-emerald-300">
                              {formatDistance(primaryJob.distanceMeters)}
                              {primaryJob.durationSeconds
                                ? ` • ${formatDuration(primaryJob.durationSeconds)}`
                                : ""}
                            </p>
                          )}
                        {primaryJob.description && (
                          <p className="text-[11px] text-slate-300 line-clamp-3">
                            {primaryJob.description}
                          </p>
                        )}
                        <a
                          href={primaryJob.job_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-emerald-300 underline underline-offset-2"
                        >
                          View posting
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2 text-[12px] text-slate-100 max-w-xs">
                        <p className="font-semibold text-slate-50">
                          {count} jobs in this area
                        </p>
                        <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                          {cluster.jobs.map((job) => (
                            <li
                              key={
                                job.id ??
                                `${job.job_url}-${job.latitude}-${job.longitude}`
                              }
                              className="border-t border-slate-800 pt-1.5 first:border-t-0 first:pt-0"
                            >
                              <p className="text-[11px] font-semibold text-slate-50 line-clamp-1">
                                {job.title}
                              </p>
                              {job.company && (
                                <p className="text-[11px] text-slate-300 line-clamp-1">
                                  {job.company}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-400">
                                {[job.city, job.state, job.country]
                                  .filter(Boolean)
                                  .join(", ") || "Location unknown"}
                                {job.is_remote ? " - Remote friendly" : ""}
                              </p>
                              {job.distanceMeters &&
                                job.distanceMeters > 0 && (
                                  <p className="text-[11px] text-emerald-300">
                                    {formatDistance(job.distanceMeters)}
                                    {job.durationSeconds
                                      ? ` • ${formatDuration(job.durationSeconds)}`
                                      : ""}
                                  </p>
                                )}
                              <a
                                href={job.job_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-emerald-300 underline underline-offset-2"
                              >
                                View posting
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }
                >
                  <CustomMarker
                    pinColor={pinColor}
                    contentColor="#f9fafb"
                    isSelected={isSelected}
                    size={36}
                  >
                    {count > 1 ? count : primaryJob.order ?? "#"}
                  </CustomMarker>
                </Tooltip>
              </RMarker>
            );
          })}
        </RMap>
      )}
    </div>
  );
}
