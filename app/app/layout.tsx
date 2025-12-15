// app/app/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <AppSidebar
        email={user.email ?? "Unknown user"}
        name={(user.user_metadata as any)?.full_name ?? (user.user_metadata as any)?.name}
        avatarUrl={(user.user_metadata as any)?.avatar_url}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
