import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { POINTS_BY_POSITION, labelize } from "@/lib/types";

export const Route = createFileRoute("/competitors/$id")({
  head: () => ({
    meta: [
      { title: "Competitor profile — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Full profile, race history and points earned for an EIA racing competitor.",
      },
      { property: "og:title", content: "Competitor profile — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Vitals, team, race history and season points for a single competitor.",
      },
    ],
  }),
  component: CompetitorDetail,
});

function CompetitorDetail() {
  const { id } = useParams({ from: "/competitors/$id" });
  const { competitors, teams, races, results } = useStore();
  const competitor = competitors.find((c) => c.id === Number(id));

  if (!competitor) {
    return (
      <AppShell title="Competitor">
        <EmptyState
          title="Competitor not found"
          description="This competitor may have been removed from the roster."
        />
      </AppShell>
    );
  }

  const team = teams.find((t) => t.id === competitor.teamId);
  const history = results.filter((r) => r.competitorId === competitor.id);
  const points = history.reduce(
    (total, row) => total + (row.position ? (POINTS_BY_POSITION[row.position] ?? 0) : 0),
    0,
  );

  const vitals = [
    ["Nickname", `“${competitor.nickname}”`],
    ["Type", labelize(competitor.type)],
    ["Age", `${competitor.age}`],
    ["Weight", `${competitor.weight} kg`],
    ["Height", `${competitor.height} cm`],
    ["Country", competitor.country],
    ["Team", team?.name ?? "Unassigned"],
  ] as const;

  return (
    <AppShell title={competitor.name} subtitle={`Season points: ${points}`}>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/competitors">
            <ArrowLeft className="size-4" /> Back to competitors
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-1">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Vitals</CardTitle>
              <StatusBadge value={competitor.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {vitals.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Race history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed races yet.</p>
              ) : (
                history.map((row) => {
                  const race = races.find((r) => r.id === row.raceId);
                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Trophy className="size-4 text-warning" />
                      <span className="font-medium">{race?.name ?? `Race #${row.raceId}`}</span>
                      <StatusBadge value={row.status} />
                      <span className="ml-auto text-sm text-muted-foreground">
                        {row.position ? `P${row.position}` : "—"} ·{" "}
                        {row.timeSeconds ? `${row.timeSeconds}s` : "no time"} ·{" "}
                        {row.position ? (POINTS_BY_POSITION[row.position] ?? 0) : 0} pts
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}