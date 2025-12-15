"use client";

import type {
  JobDisplay,
  HomeLocation,
  DistanceInfo,
  ComparisonEntry,
  TimeRange,
  SortOrder,
  RemoteMode,
  ExperienceLevel,
  LocationMode,
  CscCountry,
  CscState,
} from "@/types/JobMapTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatLocation,
  formatSalary,
  formatDistance,
  formatDuration,
  estimateBikeDuration,
} from "@/utils/jobMap";
import type { FormEvent } from "react";

type JobMapSidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: "search" | "jobs" | "details";
  setActiveTab: (tab: "search" | "jobs" | "details") => void;
  tabLabels: Record<"search" | "jobs" | "details", string>;

  searchTerm: string;
  setSearchTerm: (value: string) => void;
  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;
  zipCode: string;
  setZipCode: (value: string) => void;
  countries: CscCountry[];
  states: CscState[];
  selectedCountry: CscCountry | null;
  setSelectedCountry: (country: CscCountry | null) => void;
  selectedState: CscState | null;
  setSelectedState: (state: CscState | null) => void;
  cityName: string;
  setCityName: (value: string) => void;
  timeRange: TimeRange;
  setTimeRange: (value: TimeRange) => void;
  sortOrder: SortOrder;
  setSortOrder: (value: SortOrder) => void;
  remoteMode: RemoteMode;
  setRemoteMode: (value: RemoteMode) => void;
  selectedJobTypes: string[];
  toggleJobType: (value: string) => void;
  experienceLevel: ExperienceLevel;
  setExperienceLevel: (value: ExperienceLevel) => void;
  minSalary: number | "";
  setMinSalary: (value: number | "") => void;
  hasBenefitsOnly: boolean;
  setHasBenefitsOnly: (value: boolean) => void;
  handleSubmit: (e: FormEvent) => void;
  loading: boolean;
  error: string | null;
  defaultLocation: string;

  companyOptions: string[];
  selectedCompanies: string[];
  toggleCompany: (value: string) => void;
  locationOptions: string[];
  selectedLocations: string[];
  toggleLocationFilter: (value: string) => void;
  displayJobs: JobDisplay[];
  visibleJobs: JobDisplay[];
  visibleCount: number;
  canLoadMore: boolean;
  handleLoadMore: () => void;
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  hoveredJobId: string | null;
  hasSearched: boolean;

  selectedJob: JobDisplay | null;
  homeLocation: HomeLocation | null;
  distanceInfo: DistanceInfo | null;
  distanceLoading: boolean;
  distanceError: string | null;
  handleCalculateDistance: () => void;
  handleAddToComparison: () => void;
  comparisonEntries: ComparisonEntry[];
};

export function JobMapSidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  tabLabels,
  searchTerm,
  setSearchTerm,
  locationMode,
  setLocationMode,
  zipCode,
  setZipCode,
  countries,
  states,
  selectedCountry,
  setSelectedCountry,
  selectedState,
  setSelectedState,
  cityName,
  setCityName,
  timeRange,
  setTimeRange,
  sortOrder,
  setSortOrder,
  remoteMode,
  setRemoteMode,
  selectedJobTypes,
  toggleJobType,
  experienceLevel,
  setExperienceLevel,
  minSalary,
  setMinSalary,
  hasBenefitsOnly,
  setHasBenefitsOnly,
  handleSubmit,
  loading,
  error,
  defaultLocation,
  companyOptions,
  selectedCompanies,
  toggleCompany,
  locationOptions,
  selectedLocations,
  toggleLocationFilter,
  displayJobs,
  visibleJobs,
  visibleCount,
  canLoadMore,
  handleLoadMore,
  selectedJobId,
  setSelectedJobId,
  hoveredJobId,
  hasSearched,
  selectedJob,
  homeLocation,
  distanceInfo,
  distanceLoading,
  distanceError,
  handleCalculateDistance,
  handleAddToComparison,
  comparisonEntries,
}: JobMapSidebarProps) {
  return (
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
                Tabs keep controls together; map stays in focus.
              </p>
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

          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            {(["search", "jobs", "details"] as const).map((tab) => {
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

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeTab === "search" && (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1 min-w-[200px] flex-1">
                    <label className="text-xs text-slate-400">Role or keywords</label>
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Software engineer, data, product"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1 min-w-[180px] flex-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400">Location</label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          ZIP
                        </span>
                        <Switch
                          checked={locationMode === "zip"}
                          onCheckedChange={(value) =>
                            setLocationMode(value ? "zip" : "structured")
                          }
                        />
                      </div>
                    </div>

                    {locationMode === "zip" ? (
                      <Input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="ZIP or postal code"
                        className="w-full mt-1"
                      />
                    ) : (
                      <div className="mt-1 space-y-2">
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 justify-between"
                              >
                                <span className="truncate">
                                  {selectedCountry?.status ||
                                    selectedCountry?.name ||
                                    "Country"}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-64 w-56 overflow-y-auto">
                              {countries.map((country) => (
                                <DropdownMenuItem
                                  key={country.id}
                                  onClick={() => {
                                    setSelectedCountry(country);
                                    setSelectedState(null);
                                  }}
                                >
                                  {country.status || country.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 justify-between"
                                disabled={!states.length}
                              >
                                <span className="truncate">
                                  {selectedState?.name || "State / region"}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-64 w-56 overflow-y-auto">
                              {states.map((state) => (
                                <DropdownMenuItem
                                  key={state.id}
                                  onClick={() => setSelectedState(state)}
                                >
                                  {state.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <Input
                          type="text"
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          placeholder="City (optional)"
                          className="w-full"
                        />
                      </div>
                    )}
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
                      {["fulltime", "parttime", "contract", "internship"].map(
                        (type) => {
                          const active = selectedJobTypes.includes(type);
                          return (
                            <Button
                              key={type}
                              type="button"
                              onClick={() => toggleJobType(type)}
                              variant={active ? "default" : "outline"}
                              size="sm"
                              className="rounded-full px-2 py-1 text-[11px] font-semibold"
                            >
                              {type}
                            </Button>
                          );
                        }
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 min-w-40">
                    <label className="text-xs text-slate-400">Remote / on-site</label>
                    <div className="flex flex-wrap gap-2">
                      {(["any", "remote", "onsite", "hybrid"] as RemoteMode[]).map(
                        (mode) => {
                          const active = remoteMode === mode;
                          return (
                            <Button
                              key={mode}
                              type="button"
                              onClick={() => setRemoteMode(mode)}
                              variant={active ? "default" : "outline"}
                              size="sm"
                              className="rounded-full px-2 py-1 text-[11px] font-semibold"
                            >
                              {mode === "any"
                                ? "Any"
                                : mode.charAt(0).toUpperCase() + mode.slice(1)}
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

            {activeTab === "jobs" && (
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {hasSearched && !loading
                      ? `${displayJobs.length} job${displayJobs.length === 1 ? "" : "s"} found`
                      : "Run a search to populate pins"}
                  </span>
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

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                  {companyOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="uppercase tracking-wide text-slate-500">
                        Companies:
                      </span>
                      {companyOptions.map((company) => {
                        const active = selectedCompanies.includes(company);
                        return (
                          <Button
                            key={company}
                            type="button"
                            onClick={() => toggleCompany(company)}
                            variant={active ? "default" : "outline"}
                            size="sm"
                            className="rounded-full px-2 py-0.5"
                          >
                            {company}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {locationOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="uppercase tracking-wide text-slate-500">
                        Locations:
                      </span>
                      {locationOptions.map((loc) => {
                        const active = selectedLocations.includes(loc);
                        return (
                          <Button
                            key={loc}
                            type="button"
                            onClick={() => toggleLocationFilter(loc)}
                            variant={active ? "default" : "outline"}
                            size="sm"
                            className="rounded-full px-2 py-0.5"
                          >
                            {loc}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>

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
                              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                {job.site_name}
                              </span>
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

            {activeTab === "details" && (
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
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Commute from {homeLocation.label || "Home"}
                            </p>
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
                          {!distanceError &&
                            !distanceInfo && (
                              <p className="mt-1 text-xs text-slate-400">
                                Click “Calculate routes” to see approximate
                                distances.
                              </p>
                            )}

                          {distanceInfo && (
                            <div className="mt-2 space-y-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  Driving
                                </span>
                                <span className="font-semibold text-slate-100">
                                  {formatDistance(distanceInfo.meters)}
                                  {distanceInfo.durationSeconds
                                    ? ` • ${formatDuration(
                                        distanceInfo.durationSeconds
                                      )}`
                                    : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  Bike (est.)
                                </span>
                                <span className="font-semibold text-slate-100">
                                  {formatDuration(
                                    estimateBikeDuration(
                                      distanceInfo.meters
                                    )
                                  )}
                                </span>
                              </div>
                              <Button
                                type="button"
                                onClick={handleAddToComparison}
                                variant="outline"
                                size="sm"
                                className="mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              >
                                Add to commute comparison
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {(selectedJob.min_amount || selectedJob.max_amount) && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">
                            Salary range
                          </p>
                          <p className="text-sm text-emerald-300">
                            {formatSalary(selectedJob)}
                          </p>
                        </div>
                      )}

                      {selectedJob.description && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">
                            Description
                          </p>
                          <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                            {selectedJob.description}
                          </p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">
                          Source & posting
                        </p>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                            {selectedJob.site_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {selectedJob.date_posted
                              ? `Posted ${new Date(
                                  selectedJob.date_posted
                                ).toLocaleDateString()}`
                              : "Posting date unknown"}
                          </span>
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
  );
}

