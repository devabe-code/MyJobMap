import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type SaveJobBody = {
  site_name?: string;
  job_url?: string;
  title?: string;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  description?: string | null;
  job_type?: string | null;
  is_remote?: boolean | null;
  interval?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
  date_posted?: string | null;
};

export async function POST(request: Request) {
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

    const body = (await request.json().catch(() => ({}))) as SaveJobBody;

    const site_name = body.site_name?.trim();
    const job_url = body.job_url?.trim();

    if (!site_name || !job_url) {
      return NextResponse.json(
        { error: "site_name and job_url are required" },
        { status: 400 },
      );
    }

    // 1) Find or insert the job row using site_name + job_url as a stable key.
    const { data: existingJob, error: findError } = await supabase
      .from("jobs")
      .select("id")
      .eq("site_name", site_name)
      .eq("job_url", job_url)
      .maybeSingle();

    if (findError) {
      console.error("save-job find job error:", findError);
    }

    let jobId: string | null = existingJob?.id ?? null;

    if (!jobId) {
      const { data: insertedJob, error: insertError } = await supabase
        .from("jobs")
        .insert({
          site_name,
          job_url,
          title: body.title ?? null,
          company: body.company ?? null,
          description: body.description ?? null,
          job_type: body.job_type ?? null,
          is_remote: body.is_remote ?? null,
          city: body.city ?? null,
          state: body.state ?? null,
          country: body.country ?? null,
          interval: body.interval ?? null,
          min_amount: body.min_amount ?? null,
          max_amount: body.max_amount ?? null,
          currency: null,
          salary_source: null,
          date_posted: body.date_posted
            ? new Date(body.date_posted).toISOString()
            : null,
          latitude: null,
          longitude: null,
        })
        .select("id")
        .single();

      if (insertError || !insertedJob) {
        console.error("save-job insert job error:", insertError);
        return NextResponse.json(
          { error: "Failed to persist job" },
          { status: 500 },
        );
      }

      jobId = insertedJob.id as string;
    }

    if (!jobId) {
      return NextResponse.json(
        { error: "Unable to resolve job id" },
        { status: 500 },
      );
    }

    // 2) Ensure the saved_jobs row exists for this user + job.
    const { data: existingSaved, error: savedFindError } = await supabase
      .from("saved_jobs")
      .select("id")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle();

    if (savedFindError) {
      console.error("save-job find saved_jobs error:", savedFindError);
    }

    if (!existingSaved) {
      // Try inserting with a status column first (for schemas that support it),
      // then gracefully fall back to inserting without status if that column
      // does not exist.
      const { error: insertSavedError } = await supabase
        .from("saved_jobs")
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: "not_applied",
        });

      if (insertSavedError) {
        const needsFallback =
          insertSavedError.code === "PGRST204" ||
          (typeof insertSavedError.message === "string" &&
            insertSavedError.message.includes("status"));

        if (!needsFallback) {
          console.error("save-job insert saved_jobs error:", insertSavedError);
          return NextResponse.json(
            { error: "Failed to save job" },
            { status: 500 },
          );
        }

        const { error: fallbackError } = await supabase
          .from("saved_jobs")
          .insert({
            user_id: user.id,
            job_id: jobId,
          });

        if (fallbackError) {
          console.error(
            "save-job insert saved_jobs fallback error:",
            fallbackError,
          );
          return NextResponse.json(
            { error: "Failed to save job" },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in /api/save-job:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
