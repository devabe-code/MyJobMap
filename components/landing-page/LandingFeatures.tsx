import { cn } from "@/lib/utils";
import {
  IconRouteAltLeft,
  IconMap2,
  IconClock,
  IconHome,
  IconAdjustmentsBolt,
  IconFlame,
  IconLayoutGrid,
  IconShare3,
} from "@tabler/icons-react";

type LandingFeature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const features: LandingFeature[] = [
  {
    title: "Map-first results",
    description:
      "Stop scanning endless lists. See roles as pins on a live map so you can compare neighborhoods at a glance.",
    icon: <IconMap2 />,
  },
  {
    title: "Commute-aware ranking",
    description:
      "Sort by realistic commute time across transit, bike, and car so your best options float to the top.",
    icon: <IconClock />,
  },
  {
    title: "Saved homes & hubs",
    description:
      "Pin your home, partner’s job, or favorite districts once and reuse them across every search.",
    icon: <IconHome />,
  },
  {
    title: "Flexible filters",
    description:
      "Filter by salary, experience, remote mode, and distance radius without losing the bigger map view.",
    icon: <IconAdjustmentsBolt />,
  },
  {
    title: "Heatmap of demand",
    description:
      "Flip into heatmap mode to see job density by keyword and zoom into the corridors that actually hire.",
    icon: <IconFlame />,
  },
  {
    title: "Workspace for saved roles",
    description:
      "Bookmark promising jobs, keep notes, and compare commutes side by side before you apply.",
    icon: <IconLayoutGrid />,
  },
  {
    title: "Route comparison",
    description:
      "Compare commute routes between multiple offers so you can pick the role that fits your week, not just your résumé.",
    icon: <IconRouteAltLeft />,
  },
  {
    title: "Shareable snapshots",
    description:
      "Export light snapshots of your map to share with partners, mentors, or recruiters in seconds.",
    icon: <IconShare3 />,
  },
];

export default function LandingFeatures() {
  return (
    <div className="grid relative z-10 max-w-6xl mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-slate-800/60 rounded-3xl overflow-hidden bg-slate-950/60">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

function Feature({ title, description, icon, index }: LandingFeature & { index: number }) {
  const topRow = index < 4;
  const leftColumn = index === 0 || index === 4;

  return (
    <div
      className={cn(
        "relative flex flex-col py-8 group/feature border-slate-800/60 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/80",
        "backdrop-blur-sm",
        "border-l border-t",
        (index + 1) % 4 === 0 && "border-r",
        topRow && "border-b",
        leftColumn && "border-l",
      )}
    >
      {topRow && (
        <div className="pointer-events-none absolute inset-0 h-full w-full opacity-0 group-hover/feature:opacity-100 transition duration-200 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent" />
      )}
      {!topRow && (
        <div className="pointer-events-none absolute inset-0 h-full w-full opacity-0 group-hover/feature:opacity-100 transition duration-200 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
      )}
      <div className="relative z-10 mb-4 px-8 text-emerald-300/90">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80 ring-1 ring-emerald-500/30">
          {icon}
        </div>
      </div>
      <div className="relative z-10 mb-2 px-8 text-lg font-semibold">
        <div className="absolute left-0 inset-y-0 h-6 w-1 origin-center rounded-tr-full rounded-br-full bg-slate-700 group-hover/feature:h-8 group-hover/feature:bg-emerald-400 transition-all duration-200" />
        <span className="inline-block translate-x-0 text-slate-50 group-hover/feature:translate-x-1 transition duration-200">
          {title}
        </span>
      </div>
      <p className="relative z-10 px-8 text-sm text-slate-300/90 max-w-xs">
        {description}
      </p>
    </div>
  );
}

