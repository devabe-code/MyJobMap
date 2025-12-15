import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type JobTitleRow = {
  title: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("title")
      .not("title", "is", null)
      .limit(100);

    if (error) {
      console.error("job-keywords query error:", error);
      return NextResponse.json(
        { keywords: [] },
        { status: 200 },
      );
    }

    const rows = (data ?? []) as JobTitleRow[];
    const counts = new Map<string, number>();

    for (const row of rows) {
      if (!row.title) continue;
      const norm = row.title.trim();
      if (!norm) continue;
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }

    const keywords = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([title]) => title);

    return NextResponse.json(
      { keywords },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/job-keywords:", err);
    return NextResponse.json(
      { keywords: [] },
      { status: 200 },
    );
  }
}

