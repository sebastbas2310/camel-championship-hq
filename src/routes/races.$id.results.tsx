import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { RESULT_STATUSES, labelize, type ResultStatus } from "@/lib/types";

export const Route = createFileRoute("/races/$id/results")({
  head: () => ({
    meta: [
      { title: "Record results — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Enter finishing positions, times and completion statuses for an EIA race.",
      },
      { property: "og:title", content: "Record results — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Official results entry for the top five finishers of an EIA heat.",
      },
    ],
  }),
  component: ResultsPage,
});

interface Row {
  competitorId: string;
  position: string;
  timeSeconds: string;
  status: ResultStatus;
}

function ResultsPage() {
  const { id } = useParams({ from: "/races/$id/results" });
  const raceId = Number(id);
  const { races, registrations, competitors, results, saveResults } = useStore();
  const race = races.find((r) => r.id === raceId);
  const approved = registrations.filter((r) => r.raceId === raceId && r.status === "APPROVED");

  const [rows, setRows] = useState<Row[]>(() =>
    approved.map((registration) => {
      const existing = results.find(
        (r) => r.raceId === raceId && r.competitorId === registration.competitorId,
      );
      return {
        competitorId: String(registration.competitorId),
        position: existing?.position ? String(existing.position) : "",
        timeSeconds: existing?.timeSeconds ? String(existing.timeSeconds) : "",
        status: existing?.status ?? "FINISHED",
      };
    }),
  );

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function submit() {
    const positions = rows.map((r) => r.position).filter((p) => p !== "");
    if (new Set(positions).size !== positions.length) {
      toast.error("Two competitors can't share the same finishing position.");
      return;
    }
    if (positions.some((p) => Number(p) < 1 || Number(p) > 5)) {
      toast.error("Only positions 1 through 5 are scored — leave the rest blank.");
      return;
    }
    for (const row of rows) {
      if (row.status === "FINISHED" && (!row.position || !row.timeSeconds)) {
        toast.error("Finishers need both a position and a completion time.");
        return;
      }
      if (row.timeSeconds && Number(row.timeSeconds) <= 0) {
        toast.error("Completion times must be greater than zero seconds.");
        return;
      }
    }
    saveResults(
      raceId,
      rows.map((row) => ({
        raceId,
        competitorId: Number(row.competitorId),
        position: row.position ? Number(row.position) : null,
        timeSeconds: row.timeSeconds ? Number(row.timeSeconds) : null,
        status: row.status,
      })),
    );
    toast.success("Results recorded — the race is now complete.");
  }

  return (
    <AppShell
      allow={["ADMINISTRATOR", "RACE_ORGANIZER"]}
      title="Record results"
      subtitle={race?.name}
    >
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/races/$id" params={{ id }}>
            <ArrowLeft className="size-4" /> Back to race
          </Link>
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">
              Finishing order — 1st: 10 pts, 2nd: 7, 3rd: 5, 4th: 3, 5th: 1
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.length === 0 ? (
              <EmptyState
                title="No approved participants"
                description="Approve registrations before recording results."
              />
            ) : (
              <>
                {rows.map((row, index) => {
                  const competitor = competitors.find((c) => c.id === Number(row.competitorId));
                  return (
                    <div
                      key={row.competitorId}
                      className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
                    >
                      <p className="font-medium">{competitor?.name ?? "Unknown competitor"}</p>
                      <Input
                        aria-label="Position"
                        className="sm:w-24"
                        type="number"
                        min={1}
                        max={5}
                        placeholder="Pos"
                        value={row.position}
                        onChange={(e) => update(index, { position: e.target.value })}
                      />
                      <Input
                        aria-label="Completion time in seconds"
                        className="sm:w-32"
                        type="number"
                        step="0.1"
                        placeholder="Seconds"
                        value={row.timeSeconds}
                        onChange={(e) => update(index, { timeSeconds: e.target.value })}
                      />
                      <Select
                        value={row.status}
                        onValueChange={(v) => update(index, { status: v as ResultStatus })}
                      >
                        <SelectTrigger className="sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESULT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {labelize(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
                <Button onClick={submit}>
                  <Save className="size-4" /> Save results
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}