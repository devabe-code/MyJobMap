export type JobResult = {
  site_name: string;
  job_url: string;
  title: string;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  description: string | null;
  job_type: string | null;
  is_remote: boolean | null;
  interval: string | null;
  min_amount: number | null;
  max_amount: number | null;
  date_posted: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type JobDisplay = JobResult & {
  id: string;
  accentColor: string;
  order: number;
};

export type HomeLocation = {
  label?: string;
  latitude: number;
  longitude: number;
  color?: string;
};

export type DistanceInfo = {
  meters: number;
  durationSeconds: number | null;
  geometry: [number, number][] | null;
};

export type ComparisonEntry = {
  jobId: string;
  title: string;
  company: string | null;
  siteName: string;
  distanceMeters: number;
  durationSeconds: number | null;
   routeGeometry?: [number, number][] | null;
   color?: string;
};

export type TimeRange = "any" | "24h" | "week" | "month";
export type SortOrder = "relevance" | "recent";
export type RemoteMode = "any" | "remote" | "onsite" | "hybrid";
export type ExperienceLevel =
  | "any"
  | "internship"
  | "entry"
  | "associate"
  | "mid-senior"
  | "director"
  | "executive";

export interface JobMapWorkspaceProps {
  defaultLocation?: string;
}

// Legacy location types used by the sidebar component
export type LocationMode = "structured" | "zip";

export type CscCountry = {
  id: number;
  status?: string;
  name?: string;
  iso2?: string;
};

export type CscState = {
  id: number;
  name: string;
  iso2?: string;
};

// Map-specific types

export type JobForMap = {
  id?: number | string;
  title: string;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  job_url: string;
  site_name?: string;
  description?: string | null;
  job_type?: string | null;
  is_remote?: boolean | null;
  color?: string;
  order?: number;
   distanceMeters?: number | null;
   durationSeconds?: number | null;
};

export type RouteSummary = {
  distanceLabel: string;
  durationLabel?: string;
};

export type SearchAreaCircle = {
  center: [number, number];
  radiusMeters: number;
};

export interface JobMapProps {
  jobs: JobForMap[];
  onSelect?: (job: JobForMap) => void;
  selectedJobId?: string | number | null;
  onHover?: (job: JobForMap | null) => void;
  homeLocation?: HomeLocation | null;
  routeGeometry?: [number, number][] | null;
  routeSummary?: RouteSummary | null;
  searchAreaCircle?: SearchAreaCircle | null;
  comparisonRoutes?: {
    jobId: string;
    geometry: [number, number][];
    color?: string;
  }[];
}
