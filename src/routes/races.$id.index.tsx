import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, ClipboardCheck, Flag, MapPin, Plus, Ruler, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
import { RaceFormDialog } from "@/components/RaceFormDialog";
import { AddParticipantsDialog } from "@/components/AddParticipantsDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { labelize, type RaceStatus } from "@/lib/types";

export const Route = createFileRoute("/races/$id/")({
  head: () => ({
    meta: [
      { title: "Race detail — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Course details, approved participants and status controls for a single EIA heat.",
      },
      { property: "og:title", content: "Race detail — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Course, capacity, participants and live status for one EIA race.",
      },
    ],
  }),
  component: RaceDetail,
});

const TRANSITIONS: { label: string; status: RaceStatus; from: RaceStatus[] }[] = [
  { label: "Open registration", status: "OPEN_FOR_REGISTRATION", from: ["DRAFT"] },
  { label: "Close registration", status: "CLOSED_FOR_REGISTRATION", from: ["OPEN_FOR_REGISTRATION"] },
  { label: "Start race", status: "IN_PROGRESS", from: ["CLOSED_FOR_REGISTRATION"] },
  { label: "Cancel race", status: "CANCELLED", from: ["DRAFT", "OPEN_FOR_REGISTRATION", "CLOSED_FOR_REGISTRATION", "IN_PROGRESS"] },
];

function RaceDetail() {
  const { id } = useParams({ from: "/races/$id/" });
  const { canManage } = useAuth();
  const { races, registrations, competitors, results, setRaceStatus, registerCompetitor } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [pick, setPick] = useState("");
  const race = races.find((r) => r.id === Number(id));

  if (!race) {
    return (
      <AppShell title="Race">
        <EmptyState title="Race not found" description="This heat may have been removed." />
      </AppShell>
    );
  }

  const approved = registrations.filter((r) => r.raceId === race.id && r.status === "APPROVED");
  const pending = registrations.filter((r) => r.raceId === race.id && r.status === "PENDING");
  const raceResults = results.filter((r) => r.raceId === race.id);
  const canAddCompetitor =
    canManage && race.status !== "COMPLETED" && race.status !== "CANCELLED";
  const registeredIds = registrations
    .filter((r) => r.raceId === race.id && r.status !== "REJECTED")
    .map((r) => r.competitorId);
  const eligible = competitors.filter(
    (c) =>
      c.status === "ACTIVE" &&
      !registeredIds.includes(c.id) &&
      approved.length + pending.length < race.maxParticipants,
  );

  return (
    <AppShell
      title={race.name}
      subtitle={`${labelize(race.type)} race · ${approved.length}/${race.maxParticipants} confirmed`}
      actions={
        <div className="flex gap-2">
          {canAddCompetitor ? <AddParticipantsDialog race={race} /> : null}
          {canManage ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit race
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/races">
            <ArrowLeft className="size-4" /> Back to races
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Course</CardTitle>
              <StatusBadge value={race.status} />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{race.description}</p>
              <p className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                {new Date(race.scheduledAt).toLocaleString()}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                {race.startLocation} → {race.finishLocation}
              </p>
              <p className="flex items-center gap-2">
                <Ruler className="size-4 text-primary" />
                {race.distanceMeters.toLocaleString()} m
              </p>
              <p className="flex items-center gap-2">
                <Flag className="size-4 text-primary" />
                Registration closes {new Date(race.registrationDeadline).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Participants ({approved.length})</CardTitle>
              {canAddCompetitor ? (
                <div className="flex gap-2">
                  <Select value={pick} onValueChange={setPick}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Add competitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligible.map((competitor) => (
                        <SelectItem key={competitor.id} value={String(competitor.id)}>
                          {competitor.name} · {labelize(competitor.type)}
                        </SelectItem>
                      ))}
                      {eligible.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No eligible competitors
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (!pick || pick === "none") {
                        toast.error("Pick a competitor to add first.");
                        return;
                      }
                      void registerCompetitor(race.id, Number(pick)).then((saved) => {
                        if (!saved) return;
                        setPick("");
                      });
                    }}
                  >
                    <Plus className="size-4" /> Add competitor
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {approved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved participants yet.</p>
              ) : (
                approved.map((registration) => {
                  const competitor = competitors.find((c) => c.id === registration.competitorId);
                  const result = raceResults.find((r) => r.competitorId === registration.competitorId);
                  return (
                    <div
                      key={registration.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <span className="font-medium">{competitor?.name ?? "Unknown competitor"}</span>
                      {result ? (
                        <span className="ml-auto flex items-center gap-2 text-sm">
                          {result.position ? (
                            <span className="flex items-center gap-1 font-semibold">
                              <Trophy className="size-4 text-warning" />P{result.position}
                            </span>
                          ) : null}
                          <StatusBadge value={result.status} />
                        </span>
                      ) : null}
                    </div>
                  );
                })
              )}

              {canManage ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {TRANSITIONS.filter((t) => t.from.includes(race.status)).map((t) => (
                    <Button
                      key={t.status}
                      size="sm"
                      variant={t.status === "CANCELLED" ? "outline" : "default"}
                      onClick={() => {
                        void setRaceStatus(race.id, t.status).then((saved) => {
                          if (saved) toast.success(`${race.name} → ${labelize(t.status)}`);
                        });
                      }}
                    >
                      {t.label}
                    </Button>
                  ))}
                  <Button asChild size="sm" variant="outline">
                    <Link to="/races/$id/registrations" params={{ id: String(race.id) }}>
                      <ClipboardCheck className="size-4" /> Registrations ({pending.length} pending)
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/races/$id/results" params={{ id: String(race.id) }}>
                      <Trophy className="size-4" /> Record results
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <RaceFormDialog open={editOpen} onOpenChange={setEditOpen} race={race} />
    </AppShell>
  );
}