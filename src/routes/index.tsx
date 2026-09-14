import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Flag,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/Spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Race Dashboard — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content:
          "Live overview of competitors, upcoming heats, active teams and recent winners in the Great EIA Camel vs. Dwarf Racing System.",
      },
      { property: "og:title", content: "Race Dashboard — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Competitors, upcoming heats, active teams and recent winners at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, canManage } = useAuth();
  const { competitors, teams, races, results, registrations, loading } = useStore();

  const activeCompetitors = competitors.filter((c) => c.status === "ACTIVE");
  const upcoming = races
    .filter((r) => new Date(r.scheduledAt).getTime() > Date.now() && r.status !== "CANCELLED")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const pending = registrations.filter((r) => r.status === "PENDING");
  const winners = results
    .filter((r) => r.position === 1)
    .map((r) => ({
      race: races.find((race) => race.id === r.raceId),
      competitor: competitors.find((c) => c.id === r.competitorId),
      time: r.timeSeconds,
    }))
    .filter((row) => row.race && row.competitor);

  const cards = [
    {
      label: "Competitors",
      value: `${activeCompetitors.length}/${competitors.length}`,
      hint: "active of total registered",
      icon: Users,
    },
    { label: "Upcoming races", value: upcoming.length, hint: "scheduled ahead", icon: CalendarClock },
    { label: "Active teams", value: teams.length, hint: "with named coaches", icon: UsersRound },
    { label: "Recent winners", value: winners.length, hint: "first-place finishes", icon: Trophy },
  ];

  return (
    <AppShell
      title={`Welcome back, ${user?.displayName ?? "racer"}`}
      subtitle="Everything happening across the Great EIA season"
    >
      {loading ? (
        <Spinner label="Loading race data…" />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.label} className="shadow-card">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="font-display text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.hint}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="shadow-card lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Next races</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/races">
                    All races <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.slice(0, 4).map((race) => (
                  <Link
                    key={race.id}
                    to="/races/$id"
                    params={{ id: String(race.id) }}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <Flag className="size-4 text-primary" />
                    <span className="font-medium">{race.name}</span>
                    <StatusBadge value={race.status} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(race.scheduledAt).toLocaleString()}
                    </span>
                  </Link>
                ))}
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No races scheduled yet.</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent winners</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {winners.slice(0, 4).map((row) => (
                    <div key={row.race!.id} className="flex items-center gap-3">
                      <Trophy className="size-4 text-warning" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.competitor!.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.race!.name} · {row.time ? `${row.time}s` : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {winners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No results recorded yet.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Quick links</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/standings">
                      <Trophy className="size-4" /> Standings
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/competitors">
                      <Users className="size-4" /> Competitors
                    </Link>
                  </Button>
                  {canManage ? (
                    <Button asChild variant="outline" className="justify-start">
                      <Link to="/races">
                        <ClipboardCheck className="size-4" /> Pending approvals ({pending.length})
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
