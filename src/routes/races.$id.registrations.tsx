import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { labelize } from "@/lib/types";

export const Route = createFileRoute("/races/$id/registrations")({
  head: () => ({
    meta: [
      { title: "Registrations — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Review, approve or reject competitor registrations for an EIA race.",
      },
      { property: "og:title", content: "Registrations — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Approval queue for competitor entries into an EIA heat.",
      },
    ],
  }),
  component: RegistrationsPage,
});

function RegistrationsPage() {
  const { id } = useParams({ from: "/races/$id/registrations" });
  const raceId = Number(id);
  const { races, registrations, competitors, approveRegistration, rejectRegistration } = useStore();
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const race = races.find((r) => r.id === raceId);
  const rows = registrations.filter((r) => r.raceId === raceId);
  const pending = rows.filter((r) => r.status === "PENDING");
  const decided = rows.filter((r) => r.status !== "PENDING");

  return (
    <AppShell
      allow={["ADMINISTRATOR", "RACE_ORGANIZER"]}
      title="Registrations"
      subtitle={race ? `${race.name} · ${pending.length} awaiting review` : undefined}
    >
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/races/$id" params={{ id }}>
            <ArrowLeft className="size-4" /> Back to race
          </Link>
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Pending registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <EmptyState title="Nothing to review" description="All entries have been decided." />
            ) : (
              pending.map((registration) => {
                const competitor = competitors.find((c) => c.id === registration.competitorId);
                return (
                  <div
                    key={registration.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{competitor?.name ?? "Unknown competitor"}</p>
                      <p className="text-xs text-muted-foreground">
                        {competitor ? `${labelize(competitor.type)} · ${competitor.country}` : ""} ·
                        submitted {new Date(registration.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          approveRegistration(registration.id);
                          toast.success("Registration approved.");
                        }}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejecting(registration.id);
                          setNotes("");
                        }}
                      >
                        <X className="size-4" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Decided</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {decided.length === 0 ? (
              <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
            ) : (
              decided.map((registration) => {
                const competitor = competitors.find((c) => c.id === registration.competitorId);
                return (
                  <div key={registration.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">{competitor?.name ?? "Unknown"}</span>
                      <StatusBadge value={registration.status} />
                    </div>
                    {registration.validationNotes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reason: {registration.validationNotes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              A reason is required and will be shared with the competitor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={notes}
            maxLength={300}
            placeholder="e.g. Competitor is currently suspended"
            onChange={(e) => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (notes.trim().length < 5) {
                  toast.error("Please give a reason of at least 5 characters.");
                  return;
                }
                if (rejecting !== null) rejectRegistration(rejecting, notes.trim());
                toast.success("Registration rejected.");
                setRejecting(null);
              }}
            >
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}