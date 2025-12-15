import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40">
            MJ
          </div>
          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
              MyJobMap
            </p>
            <p className="text-xs text-slate-400">
              Map your next role around your life.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <Link
            href="#features"
            className="transition hover:text-emerald-300"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="transition hover:text-emerald-300"
          >
            How it works
          </Link>
          <Link
            href="/app"
            className="transition hover:text-emerald-300"
          >
            Open app
          </Link>
          <Link
            href="/login"
            className="transition hover:text-emerald-300"
          >
            Get started
          </Link>
        </nav>

        <div className="flex flex-col items-start gap-1 text-[11px] text-slate-500 md:items-end">
          <p>© {new Date().getFullYear()} MyJobMap. All rights reserved.</p>
          <p>Built around real maps, routes, and searches.</p>
        </div>
      </div>
    </footer>
  );
}

