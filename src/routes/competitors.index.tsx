import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CompetitorFormDialog } from "@/components/CompetitorFormDialog";
import { EmptyState, Spinner } from "@/components/Spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { COMPETITOR_STATUSES, COMPETITOR_TYPES, labelize, type Competitor } from "@/lib/types";

export const Route = createFileRoute("/competitors/")({
  head: () => ({
    meta: [
      { title: "Competitors — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content:
          "Browse, search and filter every dwarf, camel and medium competitor on the EIA racing roster.",
      },
      { property: "og:title", content: "Competitors — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "The full EIA racing roster with types, statuses and team assignments.",
      },
    ],
  }),
  component: CompetitorsPage,
});

const PAGE_SIZE = 6;

function CompetitorsPage() {
  const { canManage } = useAuth();
  const { competitors, teams, loading, deactivateCompetitor } = useStore();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toRetire, setToRetire] = useState<Competitor | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return competitors.filter((c) => {
      const matchesTerm =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.nickname.toLowerCase().includes(term) ||
        c.country.toLowerCase().includes(term);
      return matchesTerm && (type === "ALL" || c.type === type) && (status === "ALL" || c.status === status);
    });
  }, [competitors, query, type, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AppShell
      title="Competitors"
      subtitle={`${filtered.length} of ${competitors.length} competitors shown`}
      actions={
        canManage ? (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New competitor</span>
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, nickname or country"
              className="pl-9"
              value={query}
              maxLength={80}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {COMPETITOR_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {labelize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {COMPETITOR_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {labelize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Spinner label="Loading roster…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No competitors match those filters"
            description="Try clearing the search box or widening the type and status filters."
          />
        ) : (
          <Card className="overflow-hidden p-0 shadow-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Country</TableHead>
                    <TableHead className="hidden lg:table-cell">Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((competitor) => (
                    <TableRow key={competitor.id}>
                      <TableCell>
                        <Link
                          to="/competitors/$id"
                          params={{ id: String(competitor.id) }}
                          className="font-medium hover:text-primary"
                        >
                          {competitor.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">“{competitor.nickname}”</p>
                      </TableCell>
                      <TableCell>{labelize(competitor.type)}</TableCell>
                      <TableCell className="hidden md:table-cell">{competitor.country}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {teams.find((t) => t.id === competitor.teamId)?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={competitor.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Edit ${competitor.name}`}
                              onClick={() => {
                                setEditing(competitor);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Retire ${competitor.name}`}
                              disabled={competitor.status === "RETIRED"}
                              onClick={() => setToRetire(competitor)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Read only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <CompetitorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        competitor={editing}
      />

      <AlertDialog open={!!toRetire} onOpenChange={(open) => !open && setToRetire(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire {toRetire?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates the competitor and removes them from their team. Historical results
              and standings are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toRetire) {
                  deactivateCompetitor(toRetire.id);
                  toast.success(`${toRetire.name} has been retired.`);
                }
                setToRetire(null);
              }}
            >
              Retire competitor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}