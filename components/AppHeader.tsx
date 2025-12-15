// components/AppHeader.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export default function AppHeader({ email, name, avatarUrl }: AppHeaderProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // After sign-out, send user back to landing page
      window.location.href = "/";
    } catch (err) {
      console.error("Error signing out", err);
      setLoading(false);
    }
  };

  const displayName = name || email;

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/app" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="font-semibold text-lg tracking-tight">
            MyJobMap
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={32}
                height={32}
                className="rounded-full border border-border/60"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-secondary border border-border/60 flex items-center justify-center text-xs">
                {displayName.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground truncate max-w-40">
                {email}
              </span>
            </div>
          </div>

          <Button
            onClick={handleSignOut}
            disabled={loading}
            variant="outline"
            size="sm"
            className="px-3 py-1.5 text-xs"
          >
            {loading ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
    </header>
  );
}
