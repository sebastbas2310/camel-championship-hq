import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit logs — EIA Camel vs. Dwarf Racing" },
      {
        name: "description",
        content: "Administrator-only trail of every change made across the EIA racing system.",
      },
      { property: "og:title", content: "Audit logs — EIA Camel vs. Dwarf Racing" },
      {
        property: "og:description",
        content: "Immutable activity trail for administrators of the EIA racing system.",
      },
    ],
  }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { auditLogs } = useStore();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auditLogs
      .filter((log) =>
        !q
          ? true
          : `${log.action} ${log.entityType} ${log.username} ${log.description}`
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [auditLogs, query]);

  return (
    <AppShell allow={["ADMINISTRATOR"]} title="Audit logs" subtitle={`${rows.length} events`}>
      <div className="space-y-4">
        <Input
          className="max-w-sm"
          placeholder="Search action, entity or user…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {rows.length === 0 ? (
          <EmptyState title="No matching activity" description="Try a different search term." />
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="size-4 text-primary" /> Activity trail
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden sm:table-cell">Entity</TableHead>
                    <TableHead className="hidden md:table-cell">User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {log.entityType}
                        
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{log.username}</TableCell>
                      <TableCell className="text-muted-foreground">{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}