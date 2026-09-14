import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, UsersRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Spinner } from "@/components/Spinner";
import { TeamFormDialog } from "@/components/TeamFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Team } from "@/lib/types";

export const Route = createFileRoute("/teams/")({
  head: () => ({
    meta: [
      { title: "Teams — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Every racing squad, its coach, its strategy and its current member count.",
      },
      { property: "og:title", content: "Teams — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Racing squads with coaches, strategies and rosters.",
      },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { canManage } = useAuth();
  const { teams, loading } = useStore();
  const [editing, setEditing] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Teams"
      subtitle={`${teams.length} squads on the season roster`}
      actions={
        canManage ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New team</span>
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Spinner label="Loading teams…" />
      ) : teams.length === 0 ? (
        <EmptyState title="No teams yet" description="Create a team to start assigning members." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="flex flex-col shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Coach {team.coach}</p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  <UsersRound className="mr-1 size-3" />
                  {team.memberIds.length}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">{team.strategy}</p>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to="/teams/$id" params={{ id: String(team.id) }}>
                      View team
                    </Link>
                  </Button>
                  {canManage ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${team.name}`}
                      onClick={() => {
                        setEditing(team);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamFormDialog open={open} onOpenChange={setOpen} team={editing} />
    </AppShell>
  );
}