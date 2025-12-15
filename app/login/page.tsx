// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

export default function LoginPage() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if already signed in
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!cancelled) {
        if (!error) setUser(data.user);
        setLoadingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    try {
      setError(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback?next=/app`,
        }
        // For a more advanced setup, you can pass options.redirectTo here.
        // options: { redirectTo: `${window.location.origin}/` },
      });

      if (error) {
        console.error(error);
        setError(error.message);
        return;
      }

      // In the browser, Supabase *usually* redirects automatically.
      // If it doesn't for some reason, force it:
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Unexpected error");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center text-foreground">
      <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-card/90 border border-border shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your favorite provider to log in to{" "}
            <span className="font-semibold">MyJobMap</span>.
          </p>
        </div>

        {loadingUser ? (
          <p className="text-sm text-muted-foreground mb-4">Checking your session…</p>
        ) : user ? (
          <div className="mb-4 rounded-lg bg-accent/10 border border-accent px-4 py-3 text-sm">
            <p className="font-medium mb-1">You&apos;re signed in 🎉</p>
            <p className="text-foreground break-all">{user.email}</p>
          </div>
        ) : null}

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive px-4 py-3 text-sm">
            <p className="font-medium mb-1">Sign-in error</p>
            <p>{error}</p>
          </div>
        )}

        {!user && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthSignIn("google")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-white text-slate-900 hover:bg-slate-100 transition"
            >
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn("github")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 transition"
            >
              <span>Continue with GitHub</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn("linkedin_oidc")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-sky-700 hover:bg-sky-600 transition"
            >
              <span>Continue with LinkedIn</span>
            </button>
          </div>
        )}

        {user && (
          <div className="flex flex-col gap-3 mb-6">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 transition"
            >
              Go to home
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium border border-border hover:border-ring hover:bg-muted transition"
            >
              Sign out
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to the{" "}
          <span className="underline underline-offset-2 cursor-pointer">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline underline-offset-2 cursor-pointer">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </main>
  );
}
