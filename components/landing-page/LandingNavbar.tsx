"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
} from "@/components/ui/resizable-navbar";

interface LandingNavbarProps {
  isAuthed: boolean;
}

const navItems = [
  { name: "Overview", link: "#top" },
  { name: "Features", link: "#features" },
  { name: "How it works", link: "#how-it-works" },
];

export default function LandingNavbar({ isAuthed }: LandingNavbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <Navbar className="top-6">
      <NavBody>
        <div className="relative z-20 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40">
            MJ
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
              MyJobMap
            </p>
            <p className="text-xs text-slate-200/90">
              Commute-aware job search
            </p>
          </div>
        </div>
        <NavItems items={navItems} onItemClick={handleNavClick} />
        <div className="flex items-center gap-2">
          {!isAuthed && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden text-xs sm:inline-flex border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900/60"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="text-xs bg-gradient-to-r from-emerald-400 to-cyan-300 text-slate-950 shadow-lg shadow-emerald-400/30 hover:from-emerald-300 hover:to-cyan-200"
          >
            <Link href={isAuthed ? "/app" : "/login"}>
              {isAuthed ? "Open workspace" : "Try MyJobMap"}
            </Link>
          </Button>
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={isMobileOpen}
            onClick={() => setIsMobileOpen((open) => !open)}
          />
        </MobileNavHeader>
        <MobileNavMenu
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        >
          <div className="flex w-full flex-col gap-4">
            {navItems.map((item) => (
              <a
                key={item.link}
                href={item.link}
                className="text-sm text-neutral-800 dark:text-neutral-100"
                onClick={handleNavClick}
              >
                {item.name}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {!isAuthed && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900/60"
                  onClick={handleNavClick}
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="w-full justify-center text-xs bg-gradient-to-r from-emerald-400 to-cyan-300 text-slate-950 shadow-lg shadow-emerald-400/30 hover:from-emerald-300 hover:to-cyan-200"
                onClick={handleNavClick}
              >
                <Link href={isAuthed ? "/app" : "/login"}>
                  {isAuthed ? "Open workspace" : "Try MyJobMap"}
                </Link>
              </Button>
            </div>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
