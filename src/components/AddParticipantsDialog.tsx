import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/lib/store";
import { labelize, type Race } from "@/lib/types";

/**
 * Adds one or more competitors to a race in a single pass.
 * Only active competitors that are not registered yet are listed, and the
 * race capacity is enforced before anything is sent to the server.
 */
export function AddParticipantsDialog({
  race,
  size = "sm",
  variant = "default",
}: {
  race: Race;
  size?: "sm" | "default";
  variant?: "default" | "outline";
}) {
  const { competitors, teams, registrations, registerCompetitor, registerTeam } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const isTeamRace = race.type === "TEAM";
  const taken = registrations.filter((r) => r.raceId === race.id && r.status !== "REJECTED");
  const remaining = Math.max(race.maxParticipants - taken.length, 0);

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (isTeamRace) {
      return teams
        .filter((t) => !needle || `${t.name} ${t.coach}`.toLowerCase().includes(needle))
        .map((t) => ({ id: t.id, title: t.name, subtitle: `${t.memberIds.length} integrante(s)` }));
    }
    const registeredIds = taken.map((r) => r.competitorId);
    return competitors
      .filter((c) => c.status === "ACTIVE" && !registeredIds.includes(c.id))
      .filter((c) => !needle || `${c.name} ${c.nickname}`.toLowerCase().includes(needle))
      .map((c) => ({ id: c.id, title: c.name, subtitle: labelize(c.type) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitors, teams, registrations, race.id, query, isTeamRace]);

  function toggle(id: number) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (picked.length === 0) {
      toast.error(isTeamRace ? "Selecciona al menos un equipo." : "Selecciona al menos un competidor.");
      return;
    }
    if (picked.length > remaining) {
      toast.error(`Solo quedan ${remaining} cupos en esta carrera.`);
      return;
    }
    setSaving(true);
    let added = 0;
    for (const id of picked) {
      // Sequential: the server validates capacity and duplicates per request.
      const ok = isTeamRace ? await registerTeam(race.id, id) : await registerCompetitor(race.id, id);
      if (ok) added += 1;
    }
    setSaving(false);
    if (added > 0) {
      toast.success(
        `${added} ${isTeamRace ? "equipo(s)" : "participante(s)"} inscrito(s) en ${race.name}.`,
      );
      setPicked([]);
      setOpen(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <UserPlus className="size-4" />
          Agregar participantes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar participantes</DialogTitle>
          <DialogDescription>
            {race.name} · {remaining} cupo(s) disponible(s) de {race.maxParticipants}.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar competidor…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <ScrollArea className="h-64 rounded-md border border-border">
          <div className="space-y-1 p-2">
            {options.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No hay competidores activos disponibles para esta carrera.
              </p>
            ) : (
              options.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <Checkbox
                    checked={picked.includes(c.id)}
                    onCheckedChange={() => toggle(c.id)}
                  />
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{labelize(c.type)}</span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || remaining === 0}>
            {saving ? "Inscribiendo…" : `Inscribir (${picked.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
