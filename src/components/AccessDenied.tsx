import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessDenied({ detail }: { detail?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="size-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold">403 — Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {detail ?? "Your current role doesn't have the clearance for this part of the paddock."}
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}