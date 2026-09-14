import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, MapPin, Pencil, Plus, Ruler } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Spinner } from "@/components/Spinner";
import { RaceFormDialog } from "@/components/RaceFormDialog";
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
import { RACE_STATUSES, RACE_TYPES, labelize, type Race } from "@/lib/types";

export const Route = createFileRoute("/races/")({
  head: () => ({
    meta: [
      { title: "Race Schedule — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content:
          "The full EIA race calendar with course details, capacity and registration status for every heat.",
      },
      { property: "og:title", content: "Race Schedule — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Every scheduled camel and dwarf heat, filterable by status and race type.",
      },
    ],
  }),
  component: RacesPage,
});

function RacesPage() {
  const { canManage } = useAuth();
  const { races, registrations, loading } = useStore();
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [editing, setEditing] = useState<Race | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      races
        .filter((r) => (status === "ALL" || r.status === status) && (type === "ALL" || r.type === type))
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [races, status, type],
  );

  return (
    <AppShell
      title="Races"
      subtitle={`${filtered.length} of ${races.length} heats shown`}
      actions={
        canManage ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New race</span>
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {RACE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {labelize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All race types</SelectItem>
              {RACE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {labelize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Spinner label="Loading the calendar…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No races match those filters"
            description="Adjust the status or race type filters to see more heats."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((race) => {
              const pending = registrations.filter(
                (r) => r.raceId === race.id && r.status === "PENDING",
              ).length;
              return (
                <Card key={race.id} className="shadow-card">
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{race.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelize(race.type)} race · max {race.maxParticipants}
                      </p>
                    </div>
                    <StatusBadge value={race.status} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{race.description}</p>
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        {new Date(race.scheduledAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Ruler className="size-3.5" />
                        {race.distanceMeters.toLocaleString()} m
                      </span>
                      <span className="flex items-center gap-1.5 sm:col-span-2">
                        <MapPin className="size-3.5" />
                        {race.startLocation} → {race.finishLocation}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/races/$id" params={{ id: String(race.id) }}>
                          Race detail
                        </Link>
                      </Button>
                      {canManage ? (
                        <>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/races/$id/registrations" params={{ id: String(race.id) }}>
                              Registrations{pending ? ` (${pending})` : ""}
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(race);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RaceFormDialog open={open} onOpenChange={setOpen} race={editing} />
    </AppShell>
  );
}