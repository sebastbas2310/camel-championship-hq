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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  COMPETITOR_STATUSES,
  COMPETITOR_TYPES,
  labelize,
  type Competitor,
  type CompetitorStatus,
  type CompetitorType,
} from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  nickname: z.string().trim().min(2, "Nickname must be at least 2 characters").max(40),
  type: z.enum(["DWARF", "CAMEL", "MEDIUM", "OTHER"]),
  age: z.number().int().min(1, "Age must be at least 1").max(200),
  weight: z.number().min(1, "Weight must be greater than 0").max(2000),
  height: z.number().min(1, "Height must be greater than 0").max(400),
  country: z.string().trim().min(2, "Country is required").max(60),
  status: z.enum(["ACTIVE", "INJURED", "SUSPENDED", "RETIRED"]),
});

const blank = {
  name: "",
  nickname: "",
  type: "DWARF" as CompetitorType,
  age: "",
  weight: "",
  height: "",
  country: "",
  status: "ACTIVE" as CompetitorStatus,
};

export function CompetitorFormDialog({
  open,
  onOpenChange,
  competitor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitor: Competitor | null;
}) {
  const { competitors, saveCompetitor } = useStore();
  const { user } = useAuth();
  const [form, setForm] = useState<typeof blank>(blank);

  useEffect(() => {
    if (!open) return;
    setForm(
      competitor
        ? {
            name: competitor.name,
            nickname: competitor.nickname,
            type: competitor.type,
            age: String(competitor.age),
            weight: String(competitor.weight),
            height: String(competitor.height),
            country: competitor.country,
            status: competitor.status,
          }
        : blank,
    );
  }, [open, competitor]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      age: Number(form.age),
      weight: Number(form.weight),
      height: Number(form.height),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form.");
      return;
    }
    const nicknameTaken = competitors.some(
      (c) =>
        c.nickname.toLowerCase() === parsed.data.nickname.toLowerCase() && c.id !== competitor?.id,
    );
    if (nicknameTaken) {
      toast.error("That nickname is already taken — nicknames must be unique.");
      return;
    }
    saveCompetitor({
      ...parsed.data,
      // New competitors are registered under the signed-in user's email; edits
      // keep whoever registered them originally.
      registeredByEmail: competitor?.registeredByEmail ?? user?.username ?? undefined,
      ...(competitor ? { id: competitor.id, teamId: competitor.teamId ?? null } : { teamId: null }),
    });
    toast.success(competitor ? "Competitor updated." : "Competitor created.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{competitor ? "Edit competitor" : "New competitor"}</DialogTitle>
          <DialogDescription>
            Nicknames must be unique across the entire racing roster.
            {competitor
              ? competitor.registeredByEmail
                ? ` Registered by ${competitor.registeredByEmail}.`
                : ""
              : user?.username
                ? ` It will be registered under ${user.username}.`
                : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={form.name}
                maxLength={80}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-nickname">Nickname</Label>
              <Input
                id="c-nickname"
                value={form.nickname}
                maxLength={40}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as CompetitorType })}
              >
                <SelectTrigger id="c-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPETITOR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as CompetitorStatus })}
              >
                <SelectTrigger id="c-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPETITOR_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-age">Age</Label>
              <Input
                id="c-age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-country">Country</Label>
              <Input
                id="c-country"
                value={form.country}
                maxLength={60}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-weight">Weight (kg)</Label>
              <Input
                id="c-weight"
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-height">Height (cm)</Label>
              <Input
                id="c-height"
                type="number"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{competitor ? "Save changes" : "Create competitor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}