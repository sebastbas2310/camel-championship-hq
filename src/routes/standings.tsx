import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { labelize } from "@/lib/types";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "Standings — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Season leaderboard ranking every camel and dwarf competitor by points scored.",
      },
      { property: "og:title", content: "Standings — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Live points table for the EIA camel and dwarf racing season.",
      },
    ],
  }),
  component: StandingsPage,
});

const POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 1 };

function StandingsPage() {
  const { competitors, results, teams } = useStore();

  const table = competitors
    .map((competitor) => {
      const own = results.filter((r) => r.competitorId === competitor.id);
      return {
        competitor,
        points: own.reduce((sum, r) => sum + (r.position ? (POINTS[r.position] ?? 0) : 0), 0),
        races: own.length,
        wins: own.filter((r) => r.position === 1).length,
        podiums: own.filter((r) => r.position !== null && r.position <= 3).length,
      };
    })
    .filter((row) => row.races > 0)
    .sort((a, b) => b.points - a.points || b.wins - a.wins);

  return (
    <AppShell title="Standings" subtitle="Points across all completed races">
      {table.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Standings appear once race results have been recorded."
        />
      ) : (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-warning" /> Season leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Competitor</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Team</TableHead>
                  <TableHead className="text-right">Races</TableHead>
                  <TableHead className="text-right">Wins</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.map((row, index) => (
                  <TableRow key={row.competitor.id}>
                    <TableCell className="font-semibold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{row.competitor.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {labelize(row.competitor.type)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {teams.find((t) => t.id === row.competitor.teamId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{row.races}</TableCell>
                    <TableCell className="text-right">{row.wins}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {row.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}