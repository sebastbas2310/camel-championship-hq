import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelize } from "@/lib/types";

const TONES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success border-success/30",
  APPROVED: "bg-success/15 text-success border-success/30",
  FINISHED: "bg-success/15 text-success border-success/30",
  COMPLETED: "bg-success/15 text-success border-success/30",
  OPEN_FOR_REGISTRATION: "bg-accent/20 text-accent-foreground border-accent/40",
  IN_PROGRESS: "bg-primary/15 text-primary border-primary/30",
  PENDING: "bg-warning/25 text-warning-foreground border-warning/50",
  INJURED: "bg-warning/25 text-warning-foreground border-warning/50",
  CLOSED_FOR_REGISTRATION: "bg-warning/25 text-warning-foreground border-warning/50",
  DRAFT: "bg-muted text-muted-foreground border-border",
  RETIRED: "bg-muted text-muted-foreground border-border",
  DID_NOT_START: "bg-muted text-muted-foreground border-border",
  SUSPENDED: "bg-destructive/15 text-destructive border-destructive/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
  CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
  DISQUALIFIED: "bg-destructive/15 text-destructive border-destructive/30",
  DID_NOT_FINISH: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full font-semibold", TONES[value] ?? "bg-muted", className)}
    >
      {labelize(value)}
    </Badge>
  );
}