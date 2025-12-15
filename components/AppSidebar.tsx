// components/AppSidebar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  FaHistory,
  FaQuestionCircle,
  FaSignOutAlt,
  FaUser,
  FaBusAlt,
  FaMap,
  FaStar,
} from "react-icons/fa";
import { FaHouse, FaGears, FaTrainSubway, FaUserGroup } from "react-icons/fa6";
import { RiLayoutGrid2Fill } from "react-icons/ri";


interface AppSidebarProps {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

const navItems = [
  { label: "Home", href: "/app", icon: <FaHouse /> },
  { label: "Dashboard", href: "/app/dashboard", icon: <RiLayoutGrid2Fill />},
  { label: "Groups", href: "/app/groups", icon: <FaUserGroup />},
  { label: "Saved Jobs", href: "/app/saved-jobs", icon: <FaStar /> },
  { label: "Preferences", href: "/app/preferences", icon: <FaGears /> },
  { label: "Support", href: "/app/support", icon: <FaQuestionCircle /> },
];

export default function AppSidebar({ email, name, avatarUrl }: AppSidebarProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [collapsed] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Error signing out", err);
      setLoading(false);
    }
  };

  const displayName = name || email;

  useEffect(() => {
    let isMounted = true;
    async function loadLocation() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_location")
          .eq("id", userId)
          .maybeSingle();
        if (!isMounted) return;
        if (profile?.default_location) {
          setLocationLabel(profile.default_location as string);
        }
      } catch (err) {
        console.error("Failed to load profile location for sidebar:", err);
      }
    }
    void loadLocation();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const { metroFeed, newsFeed, feedLabel } = useMemo(() => {
    const label = locationLabel || "Popular metros";
    const normalized = label.toLowerCase();

    if (
      normalized.includes("dc") ||
      normalized.includes("washington") ||
      normalized.includes("maryland") ||
      normalized.includes("virginia")
    ) {
      return {
        feedLabel: "DC Metro / WMATA",
        metroFeed: [
          {
            line: "Red Line",
            status: "On time",
            detail: "Normal service with minor crowding at peak.",
          },
          {
            line: "Silver + Orange",
            status: "Delay",
            detail: "Single-tracking between Ballston and Clarendon.",
          },
          {
            line: "Metrobus",
            status: "Advisory",
            detail: "Check routes 16Y and 38B for detours downtown.",
          },
        ],
        newsFeed: [
          {
            title: "Weekend track work: expect 20 min headways downtown",
            source: "WMATA Service Alert",
            url: "https://www.wmata.com/service/status/detail.cfm",
          },
          {
            title: "New reversible bus lanes pilot on 16th St NW",
            source: "DDOT Transit News",
            url: "https://ddot.dc.gov/newsroom",
          },
        ],
      };
    }

    if (
      normalized.includes("new york") ||
      normalized.includes("nyc") ||
      normalized.includes("brooklyn") ||
      normalized.includes("queens")
    ) {
      return {
        feedLabel: "NYC Subway / MTA",
        metroFeed: [
          {
            line: "A / C / E",
            status: "Delay",
            detail: "Signal issues near 34 St – Penn Station.",
          },
          {
            line: "L Train",
            status: "Planned work",
            detail: "Late-night headways up to 20 minutes.",
          },
          {
            line: "Select Bus",
            status: "On time",
            detail: "Most SBS routes running normally.",
          },
        ],
        newsFeed: [
          {
            title: "Off-peak fare discounts extended through spring",
            source: "MTA Press Release",
            url: "https://new.mta.info/press-release",
          },
          {
            title: "New countdown clocks coming to more bus stops",
            source: "NYC Transit Blog",
            url: "https://new.mta.info/transparency/blog",
          },
        ],
      };
    }

    return {
      feedLabel: "Popular metros",
      metroFeed: [
        {
          line: "City bus",
          status: "On time",
          detail: "Most routes operating normal weekday service.",
        },
        {
          line: "Commuter rail",
          status: "Advisory",
          detail: "Check weekend schedules for reduced service.",
        },
      ],
      newsFeed: [
        {
          title: "New park-and-ride lots opening near major corridors",
          source: "Regional transit update",
          url: "https://www.apta.com/news-publications/news-releases/",
        },
        {
          title: "Tap-to-pay pilots expanding across several cities",
          source: "Transit tech digest",
          url: "https://www.masstransitmag.com/technology/contactless-payments",
        },
      ],
    };
  }, [locationLabel]);

  return (
    <aside
      className={[
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sm text-sidebar-foreground transition-all",
        collapsed ? "w-16 px-2 py-3" : "w-60 px-3 py-4",
      ].join(" ")}
    >
      <div className="flex-1 flex flex-col">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-sidebar-primary/10 hover:text-sidebar-accent-foreground"
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {!collapsed && (
          <section className="mt-5 rounded-xl border border-sidebar-border bg-sidebar-primary/5 px-3 py-3 text-xs text-slate-600">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary">
                  <FaTrainSubway className="h-3 w-3" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/80">
                    Transit &amp; news
                  </p>
                  <p className="truncate text-[12px] text-slate-500">
                    {feedLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {metroFeed.map((item) => (
                <div
                  key={item.line}
                  className="flex items-start gap-3 rounded-lg bg-sidebar-primary/10 px-3 py-2"
                >
                  <div className="mt-1 text-sidebar-primary">
                    <FaBusAlt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12px] font-semibold text-sidebar-foreground">
                        {item.line}
                      </p>
                      <span className="shrink-0 rounded-full bg-sidebar-primary/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sidebar-primary">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {item.detail}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Typical impact:{" "}
                      {item.status === "Delay"
                        ? "allow extra time and expect crowding during peaks."
                        : item.status === "Advisory"
                        ? "check route-specific alerts before you head out."
                        : "service is generally running as scheduled."}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {newsFeed.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-sidebar-border/60 pt-3">
                {newsFeed.map((item) => (
                  <div key={item.title} className="space-y-0.5">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="line-clamp-3 text-[12px] font-medium text-sidebar-foreground underline-offset-2 hover:underline"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <p className="line-clamp-3 text-[12px] font-medium text-sidebar-foreground">
                        {item.title}
                      </p>
                    )}
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      {item.source}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-sidebar-border bg-sidebar-primary/20">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-base font-semibold">
                {displayName.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-semibold truncate max-w-[130px]">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                {email}
              </p>
            </div>
          )}
      </div>
      <Button
        onClick={handleSignOut}
        disabled={loading}
        variant="outline"
        size="sm"
        className="mt-3 px-3 py-2 text-xs font-semibold border-sidebar-border hover:border-sidebar-ring"
      >
        {loading ? "Signing out..." : <FaSignOutAlt />}
      </Button>
    </aside>
  );
}
