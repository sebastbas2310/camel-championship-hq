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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  RACE_STATUSES,
  RACE_TYPES,
  labelize,
  type Race,
  type RaceStatus,
  type RaceType,
} from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(3, "Race name must be at least 3 characters").max(100),
  description: z.string().trim().max(500),
  scheduledAt: z.string().min(1, "Pick a scheduled date and time"),
  startLocation: z.string().trim().min(2, "Start location is required").max(80),
  finishLocation: z.string().trim().min(2, "Finish location is required").max(80),
  distanceMeters: z.number().int().min(50, "Distance must be at least 50 m").max(100000),
  maxParticipants: z.number().int().min(2, "Allow at least 2 participants").max(200),
  registrationDeadline: z.string().min(1, "Pick a registration deadline"),
  status: z.enum([
    "DRAFT",
    "OPEN_FOR_REGISTRATION",
    "CLOSED_FOR_REGISTRATION",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  type: z.enum(["INDIVIDUAL", "TEAM", "MIXED"]),
});

const toInput = (iso: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
/** datetime-local gives "YYYY-MM-DDTHH:mm"; the backend wants ISO local date-time with seconds. */
const toServerDateTime = (value: string) => {
  const base = value.includes("T") ? value : new Date(value).toISOString().slice(0, 16);
  const noZone = base.replace(/(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/, "");
  return noZone.length === 16 ? `${noZone}:00` : noZone;
};

const blank = {
  name: "",
  description: "",
  scheduledAt: "",
  startLocation: "",
  finishLocation: "",
  distanceMeters: "",
  maxParticipants: "",
  registrationDeadline: "",
  status: "DRAFT" as RaceStatus,
  type: "INDIVIDUAL" as RaceType,
};

export function RaceFormDialog({
  open,
  onOpenChange,
  race,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: Race | null;
}) {
  const { saveRace } = useStore();
  const [form, setForm] = useState<typeof blank>(blank);

  useEffect(() => {
    if (!open) return;
    setForm(
      race
        ? {
            name: race.name,
            description: race.description,
            scheduledAt: toInput(race.scheduledAt),
            startLocation: race.startLocation,
            finishLocation: race.finishLocation,
            distanceMeters: String(race.distanceMeters),
            maxParticipants: String(race.maxParticipants),
            registrationDeadline: toInput(race.registrationDeadline),
            status: race.status,
            type: race.type,
          }
        : blank,
    );
  }, [open, race]);

  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      distanceMeters: Number(form.distanceMeters),
      maxParticipants: Number(form.maxParticipants),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form.");
      return;
    }
    if (new Date(parsed.data.registrationDeadline) > new Date(parsed.data.scheduledAt)) {
      toast.error("The registration deadline must fall before the race start.");
      return;
    }
    if (new Date(parsed.data.scheduledAt) <= new Date()) {
      toast.error("The race date must be in the future.");
      return;
    }
    setSaving(true);
    try {
      const ok = await saveRace({
        ...parsed.data,
        // The server expects local date-times without a timezone suffix.
        scheduledAt: toServerDateTime(parsed.data.scheduledAt),
        registrationDeadline: toServerDateTime(parsed.data.registrationDeadline),
        ...(race ? { id: race.id } : {}),
      });
      if (!ok) return; // the store already showed the server's error
      toast.success(race ? "Race updated." : "Race created.");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{race ? "Edit race" : "New race"}</DialogTitle>
          <DialogDescription>
            Set the schedule, course and capacity for this heat.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="r-name">Race name</Label>
              <Input
                id="r-name"
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="r-description">Description</Label>
              <Textarea
                id="r-description"
                rows={3}
                value={form.description}
                maxLength={500}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-scheduled">Scheduled date &amp; time</Label>
              <Input
                id="r-scheduled"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-deadline">Registration deadline</Label>
              <Input
                id="r-deadline"
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-start">Start location</Label>
              <Input
                id="r-start"
                value={form.startLocation}
                maxLength={80}
                onChange={(e) => setForm({ ...form, startLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-finish">Finish location</Label>
              <Input
                id="r-finish"
                value={form.finishLocation}
                maxLength={80}
                onChange={(e) => setForm({ ...form, finishLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-distance">Distance (metres)</Label>
              <Input
                id="r-distance"
                type="number"
                value={form.distanceMeters}
                onChange={(e) => setForm({ ...form, distanceMeters: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-max">Max participants</Label>
              <Input
                id="r-max"
                type="number"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-type">Race type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as RaceType })}
              >
                <SelectTrigger id="r-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as RaceStatus })}
              >
                <SelectTrigger id="r-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : race ? "Save changes" : "Create race"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}