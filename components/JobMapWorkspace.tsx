// components/JobMapWorkspace.tsx
"use client";

import { FormEvent, useCallback, useMemo, useState, useEffect } from "react";
import JobMap from "./JobMap";
import JobHeatmap from "./JobHeatmap";
import { FaCarSide, FaBusAlt, FaBicycle, FaRoute, FaStar } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { HomeLocationPrompt } from "./HomeLocationPrompt";
import type {
  JobResult,
  JobDisplay,
  HomeLocation,
  DistanceInfo,
  ComparisonEntry,
  TimeRange,
  SortOrder,
  RemoteMode,
  ExperienceLevel,
  JobMapWorkspaceProps,
} from "@/types/JobMapTypes";
import {
  makeJobId,
  matchesExperienceLevel,
  looksLikeBenefits,
  formatLocation,
  formatSalary,
  formatDistance,
  formatDuration,
  estimateBikeDuration,
  distanceMetersBetween,
} from "@/utils/jobMap";
import { useSearchParams } from "next/navigation";

const ACCENT_PALETTE = [
  "#22c55e",
  "#60a5fa",
  "#f59e0b",
  "#a855f7",
  "#f472b6",
  "#38bdf8",
  "#f97316",
];

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia"},
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export default function JobMapWorkspace({
  defaultLocation = "",
}: JobMapWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"search" | "jobs" | "details" | "compare">("search");
  const [viewMode, setViewMode] = useState<"pins" | "heatmap">("pins");
  const [searchTerm, setSearchTerm] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("");
  const [cityName, setCityName] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [remoteModes, setRemoteModes] = useState<RemoteMode[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("any");
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [minSalary, setMinSalary] = useState<number | "">("");
  const [hasBenefitsOnly, setHasBenefitsOnly] = useState(false);

  const [visibleCount, setVisibleCount] = useState(3);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [heatmapSearchTerm, setHeatmapSearchTerm] = useState("");
  const [heatmapLocation, setHeatmapLocation] = useState("");
  const [heatmapTimeRange, setHeatmapTimeRange] =
    useState<TimeRange>("month");

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [homePromptOpen, setHomePromptOpen] = useState(false);
  const [homePromptStep, setHomePromptStep] =
    useState<"choice" | "manual">("choice");
  const [homeLabelInput, setHomeLabelInput] = useState("Home");
  const [homeManualLocationInput, setHomeManualLocationInput] =
    useState(defaultLocation);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(
    null
  );
  const [comparisonEntries, setComparisonEntries] = useState<ComparisonEntry[]>(
    []
  );
  const [distanceSelection, setDistanceSelection] = useState<string>("");
  const [distanceRadiusMiles, setDistanceRadiusMiles] = useState<number | null>(
    null
  );
  const [customRadiusInput, setCustomRadiusInput] = useState<string>("");
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Record<string, boolean>>({});
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const tabLabels: Record<"search" | "jobs" | "details" | "compare", string> = {
    search: "Search",
    jobs: "Jobs nearby",
    details: "Job details",
    compare: "Compare routes",
  };

  const heatmapHoursOld = useMemo(() => {
    const base =
      heatmapTimeRange === "24h"
        ? 24
        : heatmapTimeRange === "week"
        ? 24 * 7
        : heatmapTimeRange === "month"
        ? 24 * 30
        : 24 * 30;
    return Math.min(base, 720);
  }, [heatmapTimeRange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("myjobmap_home");
      if (raw) {
        const stored = JSON.parse(raw) as HomeLocation;
        if (
          stored &&
          typeof stored.latitude === "number" &&
          typeof stored.longitude === "number"
        ) {
          setHomeLocation({
            label: stored.label || "Home",
            latitude: stored.latitude,
            longitude: stored.longitude,
            color: stored.color || "#f97316",
          });
          return;
        }
      }
    } catch {
      // ignore localStorage errors
    }
    setHomePromptOpen(true);
  }, [defaultLocation]);

  const companyOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      if (!job.company) continue;
      const key = job.company;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 10);
  }, [jobs]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/my-saved-jobs", {
          method: "GET",
        });
        if (!res.ok) return;
        const data = await res.json();
        const next: Record<string, boolean> = {};
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        for (const job of jobs) {
          if (!job?.site_name || !job?.job_url) continue;
          const key = `${job.site_name}|${job.job_url}`;
          next[key] = true;
        }
        if (!cancelled) {
          setSavedJobIds(next);
        }
      } catch (err) {
        console.error("Failed to load saved jobs:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/job-keywords");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.keywords)) {
          setKeywordSuggestions(data.keywords);
        }
      } catch (err) {
        console.error("Failed to load job keyword suggestions:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const locationOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      const parts = [job.city, job.state, job.country].filter(Boolean);
      if (parts.length === 0) continue;
      const label = parts.join(", ");
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label)
      .slice(0, 10);
  }, [jobs]);

  const comparisonRoutes = useMemo(
    () =>
      comparisonEntries
        .filter(
          (entry) =>
            entry.routeGeometry && entry.routeGeometry.length >= 2
        )
        .map((entry) => ({
          jobId: entry.jobId,
          geometry: entry.routeGeometry as [number, number][],
          color: entry.color,
        })),
    [comparisonEntries]
  );

  const filteredJobs: JobResult[] = useMemo(() => {
    let next = [...jobs];

    if (distanceRadiusMiles && homeLocation) {
      const radiusMeters = distanceRadiusMiles * 1609.34;
      next = next.filter((job) => {
        if (
          typeof job.latitude !== "number" ||
          typeof job.longitude !== "number"
        ) {
          return false;
        }
        const d = distanceMetersBetween(
          homeLocation.latitude,
          homeLocation.longitude,
          job.latitude,
          job.longitude
        );
        return d <= radiusMeters;
      });
    }

    if (selectedJobTypes.length > 0) {
      next = next.filter(
        (job) => job.job_type && selectedJobTypes.includes(job.job_type)
      );
    }

    if (remoteModes.length > 0) {
      next = next.filter((job) => {
        const isRemote = job.is_remote === true;
        const isOnsite = job.is_remote === false;
        const looksHybrid =
          (job.description || "")
            .toLowerCase()
            .includes("hybrid");

        return remoteModes.some((mode) => {
          if (mode === "remote") return isRemote;
          if (mode === "onsite") return isOnsite && !looksHybrid;
          if (mode === "hybrid") return looksHybrid;
          // treat any/unknown as no-op in multi-select
          return true;
        });
      });
    }

    if (experienceLevel !== "any") {
      next = next.filter((job) =>
        matchesExperienceLevel(job, experienceLevel)
      );
    }

    if (selectedCompany) {
      next = next.filter(
        (job) => job.company && job.company === selectedCompany
      );
    }

    if (selectedLocation) {
      next = next.filter((job) => {
        const label = [job.city, job.state, job.country]
          .filter(Boolean)
          .join(", ");
        return label && label === selectedLocation;
      });
    }

    if (minSalary !== "" && typeof minSalary === "number") {
      next = next.filter((job) => {
        const min = job.min_amount ?? job.max_amount;
        if (!min) return false;
        return min >= minSalary;
      });
    }

    if (hasBenefitsOnly) {
      next = next.filter((job) =>
        looksLikeBenefits(job.description || "")
      );
    }

    if (sortOrder === "recent") {
      next.sort((a, b) => {
        const ta = a.date_posted ? new Date(a.date_posted).getTime() : 0;
        const tb = b.date_posted ? new Date(b.date_posted).getTime() : 0;
        return tb - ta;
      });
    }

    return next;
  }, [
    jobs,
    selectedJobTypes,
    remoteModes,
    experienceLevel,
    selectedCompany,
    selectedLocation,
    minSalary,
    hasBenefitsOnly,
    sortOrder,
    distanceRadiusMiles,
    homeLocation,
  ]);

  const focusJobUrlParam = searchParams.get("jobUrl");

  useEffect(() => {
    if (!focusJobUrlParam || filteredJobs.length === 0) return;
    const matchIndex = filteredJobs.findIndex(
      (job) => job.job_url && job.job_url === focusJobUrlParam
    );
    if (matchIndex === -1) return;
    const match = filteredJobs[matchIndex];
    const matchId = makeJobId(match, matchIndex);
    setSelectedJobId(matchId);
    setActiveTab("details");
    setSidebarOpen(true);
  }, [focusJobUrlParam, filteredJobs, setActiveTab, setSidebarOpen]);

  const displayJobs: JobDisplay[] = useMemo(
    () =>
      filteredJobs.map((job, idx) => ({
        ...job,
        id: makeJobId(job, idx),
        accentColor: ACCENT_PALETTE[idx % ACCENT_PALETTE.length],
        order: idx + 1,
      })),
    [filteredJobs]
  );

  const visibleJobs = useMemo(
    () => displayJobs.slice(0, visibleCount),
    [displayJobs, visibleCount]
  );

  const jobPins = useMemo(
    () => {
      const byId = new Map(
        comparisonEntries.map((e) => [e.jobId, e])
      );
      return displayJobs.map((job) => {
        const entry = byId.get(job.id);
        const isSelected = selectedJobId === job.id;
        const selectedDistanceMeters =
          isSelected && distanceInfo ? distanceInfo.meters : null;
        const selectedDurationSeconds =
          isSelected && distanceInfo ? distanceInfo.durationSeconds : null;

        return {
          id: job.id,
          title: job.title,
          company: job.company,
          city: job.city,
          state: job.state,
          country: job.country,
          latitude: typeof job.latitude === "number" ? job.latitude : null,
          longitude: typeof job.longitude === "number" ? job.longitude : null,
          job_url: job.job_url,
          site_name: job.site_name,
          description: job.description,
          job_type: job.job_type,
          is_remote: job.is_remote,
          color: job.accentColor,
          order: job.order,
          distanceMeters:
            entry?.distanceMeters ?? selectedDistanceMeters ?? null,
          durationSeconds:
            entry?.durationSeconds ?? selectedDurationSeconds ?? null,
        };
      });
    },
    [displayJobs, comparisonEntries, selectedJobId, distanceInfo]
  );

  const selectedJob = useMemo(
    () => displayJobs.find((job) => job.id === selectedJobId) || null,
    [displayJobs, selectedJobId]
  );
  useEffect(() => {
    // Clear distance when home or selection changes; user must recalc
    setDistanceInfo(null);
    setDistanceError(null);
    setRouteGeometry(null);
    setDistanceLoading(false);
  }, [homeLocation, selectedJobId]);

  const handleMarkerSelect = useCallback((job: { id?: string | number }) => {
    if (job.id !== undefined && job.id !== null) {
      setSelectedJobId(String(job.id));
      setActiveTab("details");
      setSidebarOpen(true);
    }
  }, []);

  const handleMarkerHover = useCallback(
    (job: { id?: string | number } | null) => {
      setHoveredJobId(
        job?.id !== undefined && job?.id !== null ? String(job.id) : null
      );
    },
    []
  );

  const handleCalculateDistance = async () => {
    if (!homeLocation || !selectedJob) {
      setDistanceError("Set a home location and select a job first.");
      return;
    }

    if (
      typeof selectedJob.latitude !== "number" ||
      typeof selectedJob.longitude !== "number"
    ) {
      setDistanceError("This job does not have a mapped location yet.");
      return;
    }

    setDistanceLoading(true);
    setDistanceError(null);

    try {
      const res = await fetch("/api/distance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: {
            lat: homeLocation.latitude,
            lon: homeLocation.longitude,
          },
          to: {
            lat: selectedJob.latitude as number,
            lon: selectedJob.longitude as number,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      setDistanceInfo({
        meters:
          typeof data.distance_meters === "number" ? data.distance_meters : 0,
        durationSeconds:
          typeof data.duration_seconds === "number"
            ? data.duration_seconds
            : null,
        geometry:
          Array.isArray(data.geometry) && data.geometry.length >= 2
            ? (data.geometry as [number, number][])
            : null,
      });
      setRouteGeometry(
        Array.isArray(data.geometry) && data.geometry.length >= 2
          ? (data.geometry as [number, number][])
          : null
      );
    } catch (err: any) {
      console.error("Distance error:", err);
      setDistanceError(
        err?.message || "Unable to calculate distance from home."
      );
      setDistanceInfo(null);
      setRouteGeometry(null);
    } finally {
      setDistanceLoading(false);
    }
  };

  const handleAddToComparison = () => {
    if (!selectedJob || !distanceInfo || distanceInfo.meters <= 0) return;
    const entry: ComparisonEntry = {
      jobId: selectedJob.id,
      title: selectedJob.title,
      company: selectedJob.company,
      siteName: selectedJob.site_name,
      distanceMeters: distanceInfo.meters,
      durationSeconds: distanceInfo.durationSeconds,
       routeGeometry: routeGeometry,
       color: selectedJob.accentColor,
    };
    setComparisonEntries((prev) => {
      const filtered = prev.filter((e) => e.jobId !== entry.jobId);
      return [...filtered, entry];
    });
  };

  async function executeSearch(forceExternal = false) {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    const baseHoursOld =
      timeRange === "24h"
        ? 24
        : timeRange === "week"
        ? 24 * 7
        : timeRange === "month"
        ? 24 * 30
        : 24 * 30;
    const hoursOld = Math.min(baseHoursOld, 720);

    let resolvedLocation = "";
    const trimmedZip = zipCode.trim();
    const trimmedCity = cityName.trim();

    if (trimmedZip) {
      resolvedLocation = trimmedZip;
    } else if (selectedStateCode && trimmedCity) {
      resolvedLocation = `${trimmedCity}, ${selectedStateCode}, US`;
    } else if (selectedStateCode) {
      resolvedLocation = `${selectedStateCode}, US`;
    } else if (trimmedCity) {
      resolvedLocation = `${trimmedCity}, US`;
    }

    try {
      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm,
          location: resolvedLocation,
          resultsWanted: forceExternal ? 25 : 15,
          hoursOld,
          forceExternal,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      const nextJobs: JobResult[] = data.jobs ?? [];
      setJobs(nextJobs);
      setVisibleCount(nextJobs.length || 3);
      setSelectedJobId(nextJobs.length ? makeJobId(nextJobs[0], 0) : null);
      setHoveredJobId(null);
      setActiveTab("jobs");
      setSidebarOpen(true);
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err?.message ?? "Unexpected error while searching jobs.");
      setJobs([]);
      setSelectedJobId(null);
      setHoveredJobId(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await executeSearch(false);
  }

  useEffect(() => {
    if (visibleCount > displayJobs.length) {
      setVisibleCount(displayJobs.length || 3);
    }
  }, [displayJobs.length, visibleCount]);

  const toggleJobType = (value: string) => {
    setSelectedJobTypes((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleLoadMore = () => {
    if (!canLoadMore) return;
    setVisibleCount((prev) =>
      Math.min(prev + 3, displayJobs.length)
    );
    setCanLoadMore(false);
    window.setTimeout(() => {
      setCanLoadMore(true);
    }, 5000);
  };

  const handleSaveJob = async (job: JobDisplay) => {
    if (!job.job_url || !job.site_name) return;
    const key = `${job.site_name}|${job.job_url}`;
    if (savedJobIds[key]) return;

    setSavingJobId(key);
    try {
      const res = await fetch("/api/save-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_name: job.site_name,
          job_url: job.job_url,
          title: job.title,
          company: job.company,
          city: job.city,
          state: job.state,
          country: job.country,
          description: job.description,
          job_type: job.job_type,
          is_remote: job.is_remote,
          interval: job.interval,
          min_amount: job.min_amount,
          max_amount: job.max_amount,
          date_posted: job.date_posted,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Save job error:", body);
        return;
      }

      setSavedJobIds((prev) => ({
        ...prev,
        [key]: true,
      }));
    } catch (err) {
      console.error("Save job error:", err);
    } finally {
      setSavingJobId(null);
    }
  };

  const persistHomeLocation = (loc: HomeLocation) => {
    setHomeLocation(loc);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("myjobmap_home", JSON.stringify(loc));
    } catch {
      // ignore storage errors
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setHomeError("Geolocation is not available in this browser.");
      return;
    }

    setHomeLoading(true);
    setHomeError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: HomeLocation = {
          label: homeLabelInput || "Home",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          color: "#f97316",
        };
        persistHomeLocation(loc);
        setHomeLoading(false);
        setHomePromptOpen(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setHomeError("Could not access your current location.");
        setHomeLoading(false);
      }
    );
  };

  const handleSaveManualHome = async () => {
    const raw = homeManualLocationInput.trim();
    if (!raw) {
      setHomeError("Please enter a location for your home.");
      return;
    }

    setHomeLoading(true);
    setHomeError(null);
    try {
      const res = await fetch("/api/geocode-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location: raw }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      if (
        typeof data.lat !== "number" ||
        typeof data.lon !== "number"
      ) {
        throw new Error("Home location could not be resolved.");
      }

      const loc: HomeLocation = {
        label: homeLabelInput || raw || "Home",
        latitude: data.lat,
        longitude: data.lon,
        color: "#f97316",
      };
      persistHomeLocation(loc);
      setHomePromptOpen(false);
    } catch (err: any) {
      console.error("Home geocode error:", err);
      setHomeError(err?.message || "Failed to look up that location.");
    } finally {
      setHomeLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-background text-foreground">
      {/* Map layer fills the viewport */}
      <div className="absolute inset-0">
        {viewMode === "pins" ? (
          <JobMap
            jobs={jobPins}
            selectedJobId={selectedJobId}
            onSelect={handleMarkerSelect}
            onHover={handleMarkerHover}
            homeLocation={
              homeLocation
                ? {
                    latitude: homeLocation.latitude,
                    longitude: homeLocation.longitude,
                    label: homeLocation.label,
                    color: homeLocation.color,
                  }
                : undefined
            }
            routeGeometry={routeGeometry}
            routeSummary={
              distanceInfo && routeGeometry
                ? {
                    distanceLabel: formatDistance(distanceInfo.meters),
                    durationLabel: distanceInfo.durationSeconds
                      ? formatDuration(distanceInfo.durationSeconds)
                      : undefined,
                  }
                : undefined
            }
            searchAreaCircle={
              homeLocation && distanceRadiusMiles
                ? {
                    center: [homeLocation.longitude, homeLocation.latitude],
                    radiusMeters: distanceRadiusMiles * 1609.34,
                  }
                : null
            }
            comparisonRoutes={activeTab === "compare" ? comparisonRoutes : []}
          />
        ) : (
          <JobHeatmap
            searchTerm={heatmapSearchTerm}
            location={heatmapLocation}
            hoursOld={heatmapHoursOld}
          />
        )}
      </div>

      {/* Single sidebar with tabs */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div
          className={[
            "pointer-events-auto absolute top-4 right-4 bottom-4 w-full max-w-[400px] transition duration-300",
            sidebarOpen ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0",
          ].join(" ")}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/85 backdrop-blur shadow-[0_16px_60px_rgba(15,23,42,0.6)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">
                  Live job map
                </p>
                <p className="text-xs text-muted-foreground">
                  Toggle pins or heatmap; tabs keep controls together.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("pins")}
                    className={[
                      "px-3 py-1 rounded-full transition",
                      viewMode === "pins"
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "text-slate-300 hover:text-emerald-200",
                    ].join(" ")}
                  >
                    Pins
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("heatmap")}
                    className={[
                      "px-3 py-1 rounded-full transition",
                      viewMode === "heatmap"
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "text-slate-300 hover:text-emerald-200",
                    ].join(" ")}
                  >
                    Heatmap
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                >
                  Collapse
                </Button>
              </div>
            </div>

            {viewMode === "pins" && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                {(["search", "jobs", "details", "compare"] as const).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <Button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab);
                        setSidebarOpen(true);
                      }}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {tabLabels[tab]}
                    </Button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {viewMode === "pins" && activeTab === "search" && (
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <div className="flex flex-wrap gap-3">
                    <div className="space-y-1 min-w-[200px] flex-1">
                      <label className="text-xs text-slate-400">Role or keywords</label>
                      <Input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Type role here..."
                        className="w-full"
                      />
                      {keywordSuggestions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {keywordSuggestions.map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => setSearchTerm(term)}
                              className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] text-slate-300 hover:border-emerald-400 hover:text-emerald-200"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 min-w-[180px] flex-1">
                      <label className="text-xs text-slate-400">
                        Location (US only)
                      </label>
                      <div className="mt-1 space-y-2">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            State &amp; city
                          </p>
                          <select
                            value={selectedStateCode}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSelectedStateCode(value);
                              if (value) {
                                // Clear ZIP when using state/city
                                setZipCode("");
                              }
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                          >
                            <option value="">State</option>
                            {US_STATES.map((state) => (
                              <option key={state.code} value={state.code}>
                                {state.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="text"
                            value={cityName}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCityName(value);
                              if (value.trim()) {
                                // Clear ZIP when using state/city
                                setZipCode("");
                              }
                            }}
                            placeholder="City (optional)"
                            className="w-full"
                          />
                        </div>

                        <div className="flex items-center justify-center">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                            OR
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            ZIP code
                          </p>
                          <Input
                            type="text"
                            value={zipCode}
                            onChange={(e) => {
                              const value = e.target.value;
                              setZipCode(value);
                              if (value.trim()) {
                                // Clear state/city when using ZIP
                                setSelectedStateCode("");
                                setCityName("");
                              }
                            }}
                            placeholder="Required when using ZIP"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="space-y-1 min-w-40">
                      <label className="text-xs text-slate-400">Posted date</label>
                      <select
                        value={timeRange}
                        onChange={(e) =>
                          setTimeRange(e.target.value as TimeRange)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <option value="any">Any time</option>
                        <option value="24h">Past 24 hours</option>
                        <option value="week">Past week</option>
                        <option value="month">Past month</option>
                      </select>
                    </div>
                    <div className="space-y-1 min-w-40">
                      <label className="text-xs text-slate-400">Sort by</label>
                      <select
                        value={sortOrder}
                        onChange={(e) =>
                          setSortOrder(e.target.value as SortOrder)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <option value="relevance">Most relevant</option>
                        <option value="recent">Most recent</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="space-y-1 min-w-40">
                      <label className="text-xs text-slate-400">Job type</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "fulltime", label: "Full Time" },
                          { value: "parttime", label: "Part Time" },
                          { value: "contract", label: "Contract" },
                          { value: "internship", label: "Internship" },
                        ].map(({ value, label }) => {
                          const active = selectedJobTypes.includes(value);
                          return (
                            <Button
                              key={value}
                              type="button"
                              onClick={() => toggleJobType(value)}
                              variant={active ? "default" : "outline"}
                              size="sm"
                              className="rounded-full px-2 py-1 text-[11px] font-semibold"
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1 min-w-40">
                      <label className="text-xs text-slate-400">Remote / on-site</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => setRemoteModes([])}
                          variant={remoteModes.length === 0 ? "default" : "outline"}
                          size="sm"
                          className="rounded-full px-2 py-1 text-[11px] font-semibold"
                        >
                          Any
                        </Button>
                        {(["remote", "onsite", "hybrid"] as RemoteMode[]).map(
                          (mode) => {
                            const active = remoteModes.includes(mode);
                            return (
                              <Button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  setRemoteModes((prev) =>
                                    prev.includes(mode)
                                      ? prev.filter((m) => m !== mode)
                                      : [...prev, mode]
                                  )
                                }
                                variant={active ? "default" : "outline"}
                                size="sm"
                                className="rounded-full px-2 py-1 text-[11px] font-semibold"
                              >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                              </Button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="space-y-1 min-w-40">
                      <label className="text-xs text-slate-400">Experience level</label>
                      <select
                        value={experienceLevel}
                        onChange={(e) =>
                          setExperienceLevel(
                            e.target.value as ExperienceLevel
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <option value="any">Any</option>
                        <option value="internship">Internship</option>
                        <option value="entry">Entry level</option>
                        <option value="associate">Associate</option>
                        <option value="mid-senior">Mid-senior</option>
                        <option value="director">Director</option>
                        <option value="executive">Executive</option>
                      </select>
                    </div>
                    <div className="space-y-1 min-w-40">
                      <label className="text-xs text-slate-400">Minimum salary</label>
                      <Input
                        type="number"
                        min={0}
                        value={minSalary === "" ? "" : minSalary}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (!next) {
                            setMinSalary("");
                          } else {
                            const parsed = Number(next);
                            setMinSalary(Number.isNaN(parsed) ? "" : parsed);
                          }
                        }}
                        placeholder="e.g. 100000"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={hasBenefitsOnly}
                        onCheckedChange={(value) =>
                          setHasBenefitsOnly(Boolean(value))
                        }
                      />
                      Only roles mentioning benefits
                    </label>
                  </div>

                  {homeLocation && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">
                          Search radius from {homeLocation.label || "Home"}
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={distanceSelection}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDistanceSelection(value);
                              if (!value) {
                                setDistanceRadiusMiles(null);
                                setCustomRadiusInput("");
                                return;
                              }
                              if (value === "custom") {
                                return;
                              }
                              const miles = Number(value);
                              if (!Number.isNaN(miles)) {
                                setDistanceRadiusMiles(miles);
                              }
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                          >
                            <option value="">Any</option>
                            <option value="5">5 mi</option>
                            <option value="10">10 mi</option>
                            <option value="25">25 mi</option>
                            <option value="50">50 mi</option>
                            <option value="custom">Custom…</option>
                          </select>
                          {distanceSelection === "custom" && (
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={customRadiusInput}
                              onChange={(e) => setCustomRadiusInput(e.target.value)}
                              onBlur={() => {
                                const v = customRadiusInput.trim();
                                if (!v) {
                                  setDistanceRadiusMiles(null);
                                  return;
                                }
                                const miles = Number(v);
                                if (!Number.isNaN(miles) && miles > 0) {
                                  setDistanceRadiusMiles(miles);
                                }
                              }}
                              placeholder="mi"
                              className="w-16"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        disabled={loading || !searchTerm.trim()}
                        className="rounded-xl px-4 py-2 text-sm font-semibold shadow-lg shadow-emerald-400/30 transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? "Searching..." : "Search"}
                      </Button>
                      {defaultLocation && (
                        <Badge
                          variant="outline"
                          className="border-emerald-400/40 bg-emerald-500/10 text-[11px] text-emerald-100"
                        >
                          Default: {defaultLocation}
                        </Badge>
                      )}
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                  </div>
                </form>
              )}

              {viewMode === "pins" && activeTab === "jobs" && (
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {hasSearched && !loading
                        ? `${displayJobs.length} job${displayJobs.length === 1 ? "" : "s"} found`
                        : "Run a search to populate pins"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          void executeSearch(true);
                        }}
                        disabled={loading || !searchTerm.trim()}
                        variant="outline"
                        size="sm"
                        className="rounded-full px-2 py-1 text-[11px] font-semibold"
                      >
                        Search more
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab("search")}
                        variant="outline"
                        size="sm"
                        className="rounded-full px-2 py-1 text-[11px] font-semibold"
                      >
                        Edit search
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                    {companyOptions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wide text-slate-500">
                          Company
                        </span>
                        <select
                          value={selectedCompany}
                          onChange={(e) => setSelectedCompany(e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        >
                          <option value="">All</option>
                          {companyOptions.map((company) => (
                            <option key={company} value={company}>
                              {company}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {locationOptions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wide text-slate-500">
                          Location
                        </span>
                        <select
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        >
                          <option value="">All</option>
                          {locationOptions.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {homeLocation && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wide text-slate-500">
                          Distance
                        </span>
                        <select
                          value={distanceSelection}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDistanceSelection(value);
                            if (!value) {
                              setDistanceRadiusMiles(null);
                              setCustomRadiusInput("");
                              return;
                            }
                            if (value === "custom") {
                              return;
                            }
                            const miles = Number(value);
                            if (!Number.isNaN(miles)) {
                              setDistanceRadiusMiles(miles);
                            }
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                        >
                          <option value="">Any</option>
                          <option value="5">5 mi</option>
                          <option value="10">10 mi</option>
                          <option value="25">25 mi</option>
                          <option value="50">50 mi</option>
                          <option value="custom">Custom…</option>
                        </select>
                        {distanceSelection === "custom" && (
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            value={customRadiusInput}
                            onChange={(e) => setCustomRadiusInput(e.target.value)}
                            onBlur={() => {
                              const v = customRadiusInput.trim();
                              if (!v) {
                                setDistanceRadiusMiles(null);
                                return;
                              }
                              const miles = Number(v);
                              if (!Number.isNaN(miles) && miles > 0) {
                                setDistanceRadiusMiles(miles);
                              }
                            }}
                            placeholder="mi"
                            className="w-16"
                          />
                        )}
                      </div>
                      {distanceRadiusMiles && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3 py-1 text-[11px] font-semibold"
                          onClick={() => {
                            void executeSearch();
                          }}
                        >
                          Search this area
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
                    {loading && (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Fetching jobs...
                      </div>
                    )}

                    {!loading && hasSearched && displayJobs.length === 0 && !error && (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
                        No jobs yet. Try changing keywords, widening the time window, or toggling locations.
                      </div>
                    )}

                    {!loading && displayJobs.length > 0 && (
                      <ul className="divide-y divide-slate-800/80">
                        {visibleJobs.map((job) => {
                          const isSelected = selectedJobId === job.id;
                          const isHovered = hoveredJobId === job.id;
                          const key =
                            job.site_name && job.job_url
                              ? `${job.site_name}|${job.job_url}`
                              : String(job.id);
                          const isSaved = savedJobIds[key];
                          const isSaving = savingJobId === key;

                          return (
                            <li
                              key={job.id}
                              className={[
                                "cursor-pointer p-4 transition border-l-4",
                                isSelected
                                  ? "bg-slate-900/85"
                                  : isHovered
                                  ? "bg-slate-900/60"
                                  : "hover:bg-slate-900/50",
                              ].join(" ")}
                              style={{ borderLeftColor: job.accentColor }}
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setActiveTab("details");
                                setSidebarOpen(true);
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3">
                                  <span
                                    className="mt-0.5 inline-flex h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-slate-50 shadow"
                                    style={{
                                      borderColor: job.accentColor,
                                      backgroundColor: `${job.accentColor}1a`,
                                    }}
                                  >
                                    {job.order}
                                  </span>
                                  <div className="space-y-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-100 line-clamp-2">
                                      {job.title}
                                    </p>
                                    {job.company && (
                                      <p className="text-xs text-slate-300">
                                        {job.company}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-slate-400">
                                      {formatLocation(job)}
                                      {job.is_remote ? " - Remote friendly" : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleSaveJob(job);
                                    }}
                                    disabled={isSaving || isSaved}
                                    className={[
                                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                      isSaved
                                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                                        : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-emerald-400 hover:text-emerald-200",
                                    ].join(" ")}
                                  >
                                    <FaStar
                                      color={
                                        isSaved
                                          ? "#22c55e"
                                          : isSaving
                                          ? "#a5b4fc"
                                          : "#94a3b8"
                                      }
                                      className="h-3 w-3"
                                    />
                                  </button>
                                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                    {job.site_name}
                                  </span>
                                </div>
                              </div>

                              {(job.min_amount || job.max_amount) && (
                                <p className="mt-2 text-xs text-emerald-300">
                                  {formatSalary(job)}
                                </p>
                              )}

                              {job.description && (
                                <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                                  {job.description}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {!loading && displayJobs.length > visibleCount && (
                      <div className="border-t border-slate-800 px-4 py-2 text-center">
                        <Button
                          type="button"
                          onClick={handleLoadMore}
                          disabled={!canLoadMore}
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                        >
                          {canLoadMore ? "Load 3 more" : "Please wait..."}
                        </Button>
                      </div>
                    )}

                    {error && (
                      <div className="border-t border-slate-800 px-4 py-2 text-xs text-red-400">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === "pins" && activeTab === "details" && (
                <div className="flex h-full flex-col gap-3">
                  {!selectedJob && (
                    <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-sm text-slate-400">
                      Select a job from the list or map to view details.
                    </div>
                  )}

                  {selectedJob && (
                    <div
                      className="flex h-full flex-col overflow-hidden rounded-2xl border bg-slate-950/90 backdrop-blur shadow-[0_12px_50px_rgba(15,23,42,0.55)]"
                      style={{ borderColor: selectedJob.accentColor }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-7 w-7 min-w-7 items-center justify-center rounded-full border text-xs font-semibold text-slate-50"
                            style={{
                              borderColor: selectedJob.accentColor,
                              backgroundColor: `${selectedJob.accentColor}1a`,
                            }}
                          >
                            {selectedJob.order}
                          </span>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">
                              Job details
                            </p>
                            <p className="text-sm text-slate-300">
                              {formatLocation(selectedJob)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            setSelectedJobId(null);
                            setActiveTab("jobs");
                          }}
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                        >
                          Close
                        </Button>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-slate-50">
                            {selectedJob.title}
                          </p>
                          {selectedJob.company && (
                            <p className="text-slate-300">{selectedJob.company}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            {selectedJob.job_type || "Job type not specified"}
                            {selectedJob.is_remote ? " - Remote friendly" : ""}
                          </p>
                        </div>

                        {homeLocation && (
                          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                                  <FaRoute className="h-3 w-3" />
                                </span>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                    Commute from {homeLocation.label}
                                  </p>
                                  {distanceInfo && (
                                    <p className="text-[11px] text-slate-300">
                                      {formatDistance(distanceInfo.meters)}
                                      {distanceInfo.durationSeconds
                                        ? ` • ${formatDuration(
                                            distanceInfo.durationSeconds
                                          )}`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={handleCalculateDistance}
                                disabled={distanceLoading}
                                variant="outline"
                                size="sm"
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {distanceLoading ? "Loading…" : "Calculate routes"}
                              </Button>
                            </div>
                            {distanceError && (
                              <p className="mt-1 text-xs text-red-400">
                                {distanceError}
                              </p>
                            )}
                            {distanceInfo && (
                              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                                <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <FaCarSide className="h-3 w-3 text-emerald-300" />
                                    <span>Driving</span>
                                  </div>
                                  <span className="font-semibold text-slate-100">
                                    {formatDistance(distanceInfo.meters)}
                                    {distanceInfo.durationSeconds
                                      ? ` • ${formatDuration(
                                          distanceInfo.durationSeconds
                                        )}`
                                      : ""}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <FaBusAlt className="h-3 w-3 text-cyan-300" />
                                    <span>Transit</span>
                                  </div>
                                  <span className="text-slate-400">
                                    Uses driving distance • timing TBD
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <FaBicycle className="h-3 w-3 text-amber-300" />
                                    <span>Bike (est.)</span>
                                  </div>
                                  <span className="font-semibold text-slate-100">
                                    {formatDistance(distanceInfo.meters)}
                                    {" • "}
                                    {formatDuration(
                                      estimateBikeDuration(distanceInfo.meters)
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                            {!distanceLoading &&
                              !distanceError &&
                              !distanceInfo && (
                                <p className="mt-1 text-xs text-slate-400">
                                  Click “Calculate routes” to see approximate
                                  distances.
                                </p>
                              )}

                            {distanceInfo && (
                              <div className="mt-2 flex justify-between gap-2">
                                <Button
                                  type="button"
                                  onClick={handleAddToComparison}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                >
                                  Save to comparison
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  onClick={() => setActiveTab("compare")}
                                >
                                  View compare tab
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {(selectedJob.min_amount || selectedJob.max_amount) && (
                          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-emerald-200">
                            {formatSalary(selectedJob)}
                          </div>
                        )}

                        {selectedJob.description && (
                          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-300">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Description
                            </p>
                            <p className="leading-relaxed text-sm whitespace-pre-wrap">
                              {selectedJob.description}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                          <div className="text-xs text-slate-400">
                            {selectedJob.date_posted
                              ? `Posted ${new Date(
                                  selectedJob.date_posted
                                ).toLocaleDateString()}`
                              : "Posting date unknown"}
                          </div>
                          <a
                            href={selectedJob.job_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 shadow hover:-translate-y-px hover:bg-emerald-300 transition"
                          >
                            View posting
                          </a>
                        </div>

                        {comparisonEntries.length > 0 && (
                          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
                              Commute comparison
                            </p>
                            <ul className="space-y-1.5">
                              {comparisonEntries
                                .slice()
                                .sort(
                                  (a, b) => a.distanceMeters - b.distanceMeters
                                )
                                .map((entry) => (
                                  <li
                                    key={entry.jobId}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-slate-100">
                                        {entry.title}
                                      </p>
                                      {entry.company && (
                                        <p className="truncate text-[11px] text-slate-400">
                                          {entry.company}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[11px] font-semibold text-slate-100">
                                        {formatDistance(entry.distanceMeters)}
                                      </p>
                                      {entry.durationSeconds && (
                                        <p className="text-[11px] text-slate-400">
                                          {formatDuration(entry.durationSeconds)}
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewMode === "pins" && activeTab === "compare" && (
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                        <FaRoute className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
                          Route comparison
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Saved commutes sorted by distance.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-2 py-1 text-[11px] font-semibold"
                      onClick={() => setActiveTab("details")}
                    >
                      Back to details
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
                    {comparisonEntries.length === 0 && (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
                        No routes saved yet. Calculate a commute from Home on a job and click
                        “Save to comparison”.
                      </div>
                    )}

                    {comparisonEntries.length > 0 && (
                      <ul className="divide-y divide-slate-800/80 text-xs">
                        {comparisonEntries
                          .slice()
                          .sort(
                            (a, b) => a.distanceMeters - b.distanceMeters
                          )
                          .map((entry, idx) => (
                            <li
                              key={entry.jobId}
                              className="flex items-center justify-between gap-3 px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-[11px] font-semibold text-slate-50">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-100">
                                    {entry.title}
                                  </p>
                                  {entry.company && (
                                    <p className="truncate text-[11px] text-slate-400">
                                      {entry.company}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-semibold text-slate-100">
                                  {formatDistance(entry.distanceMeters)}
                                </p>
                                {entry.durationSeconds && (
                                  <p className="text-[11px] text-slate-400">
                                    {formatDuration(entry.durationSeconds)}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {viewMode === "heatmap" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                      Heatmap explorer
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      See where roles cluster by keyword and region.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      Job keywords
                    </label>
                    <Input
                      type="text"
                      value={heatmapSearchTerm}
                      onChange={(e) => setHeatmapSearchTerm(e.target.value)}
                      placeholder='e.g. "software engineer", "data analyst"'
                      className="w-full"
                    />
                    <p className="text-[11px] text-slate-500">
                      The heatmap highlights where these roles appear most often.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      Region or city
                    </label>
                    <Input
                      type="text"
                      value={heatmapLocation}
                      onChange={(e) => setHeatmapLocation(e.target.value)}
                      placeholder="Any city, state, or country (optional)"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      Posted within
                    </label>
                    <select
                      value={heatmapTimeRange}
                      onChange={(e) =>
                        setHeatmapTimeRange(e.target.value as TimeRange)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                    >
                      <option value="24h">Last 24 hours</option>
                      <option value="week">Last 7 days</option>
                      <option value="month">Last 30 days</option>
                    </select>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    The heatmap updates automatically as you adjust these
                    filters. Zoom and pan the map to explore hotspots.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating toggle when collapsed */}
        {!sidebarOpen && (
          <div className="pointer-events-auto absolute right-4 bottom-4">
            <Button
              type="button"
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-full border-slate-800 bg-slate-950/85 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur"
            >
              Open panel
            </Button>
          </div>
        )}
      </div>

      {/* Lightweight status badge */}
      {loading && (
        <div className="pointer-events-none absolute left-4 bottom-4 z-20 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 backdrop-blur">
          Searching boards...
        </div>
      )}

      <HomeLocationPrompt
        open={homePromptOpen}
        step={homePromptStep}
        label={homeLabelInput}
        manualLocation={homeManualLocationInput}
        loading={homeLoading}
        error={homeError}
        onChangeLabel={setHomeLabelInput}
        onChangeManualLocation={setHomeManualLocationInput}
        onUseCurrentLocation={handleUseCurrentLocation}
        onSaveManualHome={handleSaveManualHome}
        onClose={() => setHomePromptOpen(false)}
        onEnterManual={() => {
          setHomePromptStep("manual");
          setHomeError(null);
        }}
        onBackToChoice={() => {
          setHomePromptStep("choice");
          setHomeError(null);
        }}
      />
    </div>
  );
}
