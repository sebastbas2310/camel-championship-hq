import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
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
import { labelize } from "@/lib/types";

export const Route = createFileRoute("/teams/$id")({
  head: () => ({
    meta: [
      { title: "Team detail — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Team roster, coaching staff and race strategy for an EIA racing squad.",
      },
      { property: "og:title", content: "Team detail — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Roster, coach and strategy for a single EIA racing squad.",
      },
    ],
  }),
  component: TeamDetail,
});

function TeamDetail() {
  const { id } = useParams({ from: "/teams/$id" });
  const { canManage } = useAuth();
  const { teams, competitors, addMember, removeMember } = useStore();
  const [pick, setPick] = useState("");
  const team = teams.find((t) => t.id === Number(id));

  if (!team) {
    return (
      <AppShell title="Team">
        <EmptyState title="Team not found" description="This squad may have been disbanded." />
      </AppShell>
    );
  }

  const members = competitors.filter((c) => team.memberIds.includes(c.id));
  const available = competitors.filter(
    (c) =>
      !team.memberIds.includes(c.id) &&
      c.status !== "RETIRED" &&
      (c.teamId == null || c.teamId === team.id),
  );

  return (
    <AppShell title={team.name} subtitle={`Coach ${team.coach} · ${members.length} members`}>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/teams">
            <ArrowLeft className="size-4" /> Back to teams
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">{team.strategy}</p>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Head coach</span>
                <span className="font-medium">{team.coach}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Members</CardTitle>
              {canManage ? (
                <div className="flex gap-2">
                  <Select value={pick} onValueChange={setPick}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Add a competitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} · {labelize(c.type)}
                        </SelectItem>
                      ))}
                      {available.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No available competitors
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
                      void addMember(team.id, Number(pick)).then((saved) => {
                        if (!saved) return;
                        setPick("");
                        toast.success("Member added to the team.");
                      });
                    }}
                  >
                    <Plus className="size-4" /> Add
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">This team has no members yet.</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Link
                      to="/competitors/$id"
                      params={{ id: String(member.id) }}
                      className="font-medium hover:text-primary"
                    >
                      {member.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{labelize(member.type)}</span>
                    <StatusBadge value={member.status} />
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() => {
                          removeMember(team.id, member.id);
                          toast.success(`${member.name} removed from ${team.name}.`);
                        }}
                      >
                        <UserMinus className="size-4" /> Remove
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}