// app/page.tsx
import { createClient } from "@/utils/supabase/server";
import LandingHero from "@/components/landing-page/LandingHero";
import LandingFeatures from "@/components/landing-page/LandingFeatures";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import LandingFooter from "@/components/landing-page/LandingFooter";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = !!user;

  const glowClass =
    "absolute -left-10 -top-72 h-112 w-md rounded-full bg-emerald-500/10 blur-[140px]";

  return (
    <main
      id="top"
      className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={glowClass} />
        <div className="absolute -right-48 top-20 h-104 w-104 rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(94,234,212,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(52,211,153,0.12),transparent_28%)]" />
      </div>

      <div className="relative z-10">
        <LandingNavbar isAuthed={isAuthed} />

        <section className="pt-4 md:pt-6">
          <LandingHero isAuthed={isAuthed} />
        </section>

        <section
          id="features"
          className="relative mx-auto max-w-6xl px-4 pb-10 pt-6 md:pb-16"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">
                Why it feels different
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50 md:text-2xl">
                Features built around your actual commute
              </h2>
            </div>
            <p className="hidden max-w-xs text-xs text-slate-400 md:block">
              Layer jobs, routes, and saved presets into a single map-first
              workspace so you can compare roles at a glance.
            </p>
          </div>
          <LandingFeatures />
        </section>

        <section
          id="how-it-works"
          className="relative mx-auto max-w-6xl px-4 pb-20"
        >
          <div className="grid gap-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/95 p-6 shadow-[0_20px_80px_rgba(16,185,129,0.24)] md:grid-cols-[1.1fr,0.9fr] md:p-10">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">
                How it works
              </p>
              <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
                Search once, see everything that fits
              </h2>
              <ol className="space-y-3 text-sm text-slate-300">
                <li>
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-semibold text-emerald-300">
                    1
                  </span>
                  Tell MyJobMap your role, salary band, and where “home base”
                  really is.
                </li>
                <li>
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-semibold text-emerald-300">
                    2
                  </span>
                  We pull fresh roles, place them on the map, and compute
                  realistic commute times across transit, car, and bike.
                </li>
                <li>
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-semibold text-emerald-300">
                    3
                  </span>
                  Save the roles that actually work for your life and return
                  with your map exactly how you left it.
                </li>
              </ol>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                  Live preview
                </p>
                <p className="mt-1 text-sm text-slate-100">
                  The hero section above uses the same map engine as your
                  workspace. Pan around, hover pins, and imagine it filled with
                  your search.
                </p>
              </div>
              <div className="mt-2 space-y-1 text-[12px] text-slate-400">
                <p>• Powered by open maps and real job data</p>
                <p>• Built for multi-location and remote-friendly searches</p>
                <p>• Designed to feel fast, even on big searches</p>
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </main>
  );
}
