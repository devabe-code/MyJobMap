import type {
  JobResult,
  ExperienceLevel,
} from "@/types/JobMapTypes";

export function makeJobId(job: JobResult, idx: number) {
  return `${job.site_name || "job"}-${idx}-${job.job_url}`;
}

export function matchesExperienceLevel(
  job: JobResult,
  level: ExperienceLevel
) {
  if (level === "any") return true;
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  switch (level) {
    case "internship":
      return text.includes("intern") || text.includes("internship");
    case "entry":
      return (
        text.includes("entry level") ||
        text.includes("junior") ||
        text.includes("graduate")
      );
    case "associate":
      return text.includes("associate");
    case "mid-senior":
      return (
        text.includes("senior") ||
        text.includes("sr.") ||
        text.includes("mid-senior") ||
        text.includes("staff")
      );
    case "director":
      return text.includes("director");
    case "executive":
      return (
        text.includes("vp ") ||
        text.includes("vice president") ||
        text.includes("chief ") ||
        text.includes("cxo") ||
        text.includes("executive")
      );
    default:
      return true;
  }
}

export function looksLikeBenefits(description: string) {
  const text = description.toLowerCase();
  const keywords = [
    "benefits",
    "health insurance",
    "medical",
    "dental",
    "vision",
    "401k",
    "401(k)",
    "pto",
    "paid time off",
    "stock",
    "equity",
  ];
  return keywords.some((kw) => text.includes(kw));
}

export function formatLocation(job: JobResult) {
  const location = [job.city, job.state, job.country]
    .filter(Boolean)
    .join(", ");
  return location || "Location unknown";
}

export function formatSalary(job: JobResult) {
  if (!job.min_amount && !job.max_amount) return "Salary unknown";

  const min = job.min_amount ? `$${job.min_amount.toLocaleString()}` : null;
  const max = job.max_amount ? `$${job.max_amount.toLocaleString()}` : null;

  const range = min && max ? `${min} - ${max}` : min || max;
  return job.interval ? `${range} / ${job.interval}` : range;
}

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return "unknown distance";
  const miles = meters / 1609.34;
  if (miles < 0.5) {
    const feet = miles * 5280;
    return `${feet.toFixed(0)} ft`;
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

export function estimateBikeDuration(distanceMeters: number) {
  // Approximate at 15 km/h cycling speed
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0;
  const speedMetersPerSecond = 15_000 / 60 / 60; // 15 km/h
  return Math.round(distanceMeters / speedMetersPerSecond);
}

export function distanceMetersBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

