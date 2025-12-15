import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RemoveBody = {
  job_id?: string | null;
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

    const body = (await request.json().catch(() => ({}))) as RemoveBody;
    const rawJobId = body.job_id;
    const jobId =
      typeof rawJobId === "string"
        ? rawJobId.trim()
        : rawJobId != null
        ? String(rawJobId)
        : "";

    if (!jobId) {
      return NextResponse.json(
        { error: "job_id is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", user.id)
      .eq("job_id", jobId);

    if (error) {
      console.error("remove-saved-job delete error:", error);
      return NextResponse.json(
        { error: "Failed to remove saved job" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in /api/remove-saved-job:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
