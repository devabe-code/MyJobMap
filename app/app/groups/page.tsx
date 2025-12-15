import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type GroupWithMeta = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  role: string;
  membersCount?: number;
};

async function createGroup(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = formData.get("description");
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim()
      ? descriptionRaw.trim()
      : null;

  if (!name) {
    redirect("/app/groups");
  }

  // Ensure a profile row exists for this user so the
  // groups.owner_id foreign key constraint is satisfied.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("createGroup profile upsert error:", profileError);
    redirect("/app/groups");
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, description, owner_id: user.id })
    .select("id")
    .single();

  if (error || !group) {
    console.error("createGroup error:", error);
    redirect("/app/groups");
  }

  // Best-effort: add the creator as a member if the
  // group_members table exists in the database.
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError && memberError.code !== "PGRST205") {
    console.error("createGroup member insert error:", memberError);
  }

  redirect(`/app/groups/${group.id}`);
}

export default async function GroupsOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownedRows } = await supabase
    .from("groups")
    .select("id, name, description, created_at, owner_id")
    .eq("owner_id", user.id);

  const groupsMap = new Map<string, GroupWithMeta>();

  if (ownedRows) {
    for (const row of ownedRows as any[]) {
      groupsMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description ?? null,
        created_at: row.created_at,
        role: "owner",
      });
    }
  }

  // Best-effort: include groups where the user is a member
  // via the group_members table, if it exists.
  const { data: memberRows, error: memberError } = await supabase
    .from("group_members")
    .select(
      "group_id, role, created_at, groups(id, name, description, created_at, owner_id)",
    )
    .eq("user_id", user.id);

  if (!memberError || memberError.code !== "PGRST205") {
    if (memberRows) {
      for (const row of memberRows as any[]) {
        const group = row.groups;
        if (!group) continue;
        const existing = groupsMap.get(group.id);
        if (!existing) {
          groupsMap.set(group.id, {
            id: group.id,
            name: group.name,
            description: group.description ?? null,
            created_at: group.created_at,
            role: row.role ?? "member",
          });
        } else if (
          existing.role.toLowerCase() !== "owner" &&
          typeof row.role === "string"
        ) {
          existing.role = row.role;
        }
      }
    }
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const ownedGroups = groups.filter(
    (g) => g.role && g.role.toLowerCase() === "owner",
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">
              Groups
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Collaborate on job searches, share leads, and compare commute
              options with friends, peers, or your partner.
            </p>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[2fr,1.1fr]">
          {/* Your groups list */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Your groups
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Groups you&apos;re a member of, including ones you own.
                  </p>
                </div>
                <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] text-slate-300 border border-slate-800">
                  {groups.length}{" "}
                  {groups.length === 1 ? "group" : "groups"}
                </span>
              </div>

              {groups.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
                  <p className="font-medium text-slate-200">
                    You&apos;re not in any groups yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Create a group to share job leads, favorite searches, and
                    commute ideas with friends or peers.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-800/80">
                  {groups.map((group) => {
                    const roleLabel =
                      group.role?.toLowerCase() === "owner"
                        ? "Owner"
                        : group.role?.toLowerCase() === "admin"
                        ? "Admin"
                        : "Member";

                    const created = new Date(group.created_at);
                    const createdLabel = created.toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    );

                    return (
                      <li key={group.id}>
                        <Link
                          href={`/app/groups/${group.id}`}
                          className="flex items-start justify-between gap-3 px-2 py-3 rounded-xl hover:bg-slate-900/80 transition"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100 line-clamp-1">
                              {group.name}
                            </p>
                            {group.description && (
                              <p className="text-xs text-slate-400 line-clamp-2">
                                {group.description}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-500">
                              Created {createdLabel}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 border border-emerald-500/40">
                              {roleLabel}
                            </span>
                            {group.membersCount !== undefined && (
                              <span className="text-[10px] text-slate-400">
                                {group.membersCount} member
                                {group.membersCount === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {ownedGroups.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 shadow-inner shadow-black/40">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                  Owned groups
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Groups where you&apos;re the owner.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ownedGroups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/app/groups/${g.id}`}
                      className="inline-flex items-center rounded-full border border-emerald-500/40 bg-slate-950/80 px-3 py-1 text-[11px] text-emerald-200 hover:border-emerald-400 hover:text-emerald-100"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create group card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5 shadow-inner shadow-black/40">
            <h2 className="text-sm font-semibold text-slate-100">
              Create new group
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Spin up a space to coordinate job searches, share promising roles,
              and compare commute options together.
            </p>

            <form action={createGroup} className="mt-4 space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="text-xs text-slate-300"
                >
                  Group name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                  placeholder="e.g. DMV SWE cohort, Partner & me, Commute squad"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="description"
                  className="text-xs text-slate-300"
                >
                  Description{" "}
                  <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
                  placeholder="Describe what this group is for – e.g. where you’re looking, roles you’re targeting, or how you want to compare commutes."
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 hover:shadow-emerald-400/60"
              >
                Create group
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
