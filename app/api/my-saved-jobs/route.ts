import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type SavedRow = {
  job_id: string | null;
};

type JobRow = {
  id: string;
  site_name: string | null;
  job_url: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { data: savedRows } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", user.id) as any as { data: SavedRow[] | null };

    const saved = savedRows ?? [];
    const jobIds = Array.from(
      new Set(
        saved
          .map((row) => row.job_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (jobIds.length === 0) {
      return NextResponse.json(
        { jobs: [] },
        { status: 200 },
      );
    }

    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id,site_name,job_url")
      .in("id", jobIds);

    const jobs = (jobsData ?? []) as JobRow[];

    const result = jobs
      .filter((job) => job.site_name && job.job_url)
      .map((job) => ({
        site_name: job.site_name as string,
        job_url: job.job_url as string,
      }));

    return NextResponse.json(
      { jobs: result },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/my-saved-jobs:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}

