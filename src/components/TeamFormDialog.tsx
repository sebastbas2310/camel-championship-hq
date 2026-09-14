import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Team } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(80),
  coach: z.string().trim().min(2, "Coach name is required").max(80),
  strategy: z.string().trim().min(4, "Describe the team strategy").max(400),
});

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
}) {
  const { saveTeam } = useStore();
  const [form, setForm] = useState({ name: "", coach: "", strategy: "" });

  useEffect(() => {
    if (!open) return;
    setForm(
      team
        ? { name: team.name, coach: team.coach, strategy: team.strategy }
        : { name: "", coach: "", strategy: "" },
    );
  }, [open, team]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form.");
      return;
    }
    saveTeam({ ...parsed.data, ...(team ? { id: team.id } : {}) });
    toast.success(team ? "Team updated." : "Team created.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? "Edit team" : "New team"}</DialogTitle>
          <DialogDescription>Members are managed from the team detail page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Team name</Label>
            <Input
              id="t-name"
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-coach">Coach</Label>
            <Input
              id="t-coach"
              value={form.coach}
              maxLength={80}
              onChange={(e) => setForm({ ...form, coach: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-strategy">Strategy</Label>
            <Textarea
              id="t-strategy"
              rows={4}
              value={form.strategy}
              maxLength={400}
              onChange={(e) => setForm({ ...form, strategy: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{team ? "Save changes" : "Create team"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}