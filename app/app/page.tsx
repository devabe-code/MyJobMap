// app/app/page.tsx
import { createClient } from "@/utils/supabase/server";
import JobMapWorkspace from "@/components/JobMapWorkspace";

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const { data: profile } =
    userId
      ? await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle()
      : { data: null };

  const defaultLocation = profile?.default_location ?? "";

  return <JobMapWorkspace defaultLocation={defaultLocation} />;
}
