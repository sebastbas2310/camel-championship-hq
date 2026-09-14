import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";
import { api, ApiError, friendlyMessage } from "./api";
import { fetchRemoteSnapshot } from "./remote";
import type {
  AuditLog,
  Competitor,
  Race,
  RaceResult,
  Registration,
  Team,
} from "./types";

interface StoreState {
  competitors: Competitor[];
  teams: Team[];
  races: Race[];
  registrations: Registration[];
  results: RaceResult[];
  auditLogs: AuditLog[];
}

interface StoreValue extends StoreState {
  loading: boolean;
  /** True when the racing server answered; false means the demo dataset is on screen. */
  live: boolean;
  refresh: () => Promise<void>;
  saveCompetitor: (input: Omit<Competitor, "id"> & { id?: number }) => void;
  deactivateCompetitor: (id: number) => void;
  saveTeam: (input: Omit<Team, "id" | "memberIds"> & { id?: number }) => void;
  addMember: (teamId: number, competitorId: number) => Promise<boolean>;
  removeMember: (teamId: number, competitorId: number) => void;
  saveRace: (input: Omit<Race, "id"> & { id?: number }) => Promise<boolean>;
  setRaceStatus: (id: number, status: Race["status"]) => Promise<boolean>;
  registerCompetitor: (raceId: number, competitorId: number) => Promise<boolean>;
  approveRegistration: (id: number) => void;
  rejectRegistration: (id: number, validationNotes: string) => void;
  saveResults: (raceId: number, rows: Omit<RaceResult, "id">[]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const nextId = (rows: { id: number }[]) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<StoreState>({
    competitors: [],
    teams: [],
    races: [],
    registrations: [],
    results: [],
    auditLogs: [],
  });

  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    const snapshot = await fetchRemoteSnapshot();
    setLive(snapshot.reachable);
    if (!snapshot.reachable) return;
    setState((prev) => ({
      ...prev,
      competitors: snapshot.competitors,
      teams: snapshot.teams,
      races: snapshot.races,
      registrations: snapshot.registrations,
      results: snapshot.results,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);


  const log = useCallback(
    (entry: Omit<AuditLog, "id" | "timestamp" | "username">) =>
      setState((prev) => ({
        ...prev,
        auditLogs: [
          {
            id: nextId(prev.auditLogs),
            timestamp: new Date().toISOString(),
            username: user?.username ?? "system",
            ...entry,
          },
          ...prev.auditLogs,
        ],
      })),
    [user],
  );

  const value = useMemo<StoreValue>(() => {
    /** Write-through to the racing server; failures surface as a toast. */
    const persist = (action: () => Promise<unknown>): Promise<boolean> => {
      if (!live) {
        // Without a live server nothing is stored, so never pretend it saved.
        toast.error(
          "No hay conexión con el servidor de carreras: el cambio no se guardó. Inicia sesión e inténtalo de nuevo.",
        );
        return Promise.resolve(false);
      }
      return action()
        .then(async () => {
          // Wait for the reload so the screen shows the server's version.
          await refresh();
          return true;
        })
        .catch((error) => {
          toast.error(friendlyMessage(error));
          // Roll back the optimistic change by re-syncing from the server.
          void refresh();
          return false;
        });
    };

    return {
      ...state,
      loading,
      live,
      refresh,
      saveCompetitor: (input) => {
        persist(() => {
          // The backend stores age as a birth date; approximate it from the form's age.
          const dateOfBirth = new Date(
            Date.UTC(new Date().getUTCFullYear() - input.age, 0, 1),
          ).toISOString();
          const body = {
            name: input.name,
            nickname: input.nickname,
            type: input.type,
            dateOfBirth,
            weight: input.weight,
            height: input.height,
            origin: input.country,
            status: input.status,
            // The record is tied to the email of whoever registers it.
            registeredByEmail: user?.username ?? "",
            email: user?.username ?? "",
          };
          if (input.id) return api.competitors.update(input.id, body);
          // Backends without the competitors controller (404) still accept the
          // registration through /users, keyed by the registering user's email.
          return api.competitors.create(body).catch((error) => {
            if (error instanceof ApiError && error.status === 404) {
              return api.users.create({
                fullName: input.name,
                email: body.email,
                role: "VIEWER",
              });
            }
            throw error;
          });
        });
        setState((prev) => {
          if (input.id) {
            return {
              ...prev,
              competitors: prev.competitors.map((c) =>
                c.id === input.id ? ({ ...c, ...input, id: input.id } as Competitor) : c,
              ),
            };
          }
          const id = nextId(prev.competitors);
          return { ...prev, competitors: [...prev.competitors, { ...input, id } as Competitor] };
        });
        log({
          action: input.id ? "UPDATE_COMPETITOR" : "CREATE_COMPETITOR",
          entityType: "Competitor",
          description: `${input.id ? "Updated" : "Created"} competitor ${input.name}`,
          newValue: input.status,
        });
      },
      deactivateCompetitor: (id) => {
        persist(() => api.competitors.setStatus(id, "RETIRED"));
        setState((prev) => ({
          ...prev,
          competitors: prev.competitors.map((c) =>
            c.id === id ? { ...c, status: "RETIRED", teamId: null } : c,
          ),
          teams: prev.teams.map((t) => ({
            ...t,
            memberIds: t.memberIds.filter((m) => m !== id),
          })),
        }));
        log({
          action: "DEACTIVATE_COMPETITOR",
          entityType: "Competitor",
          description: `Retired competitor #${id}`,
          newValue: "RETIRED",
        });
      },
      saveTeam: (input) => {
        persist(() => {
          const body = { name: input.name, description: input.strategy, coach: input.coach, maximumMembers: 5 };
          return input.id ? api.teams.update(input.id, body) : api.teams.create(body);
        });
        setState((prev) => {
          if (input.id) {
            return {
              ...prev,
              teams: prev.teams.map((t) =>
                t.id === input.id ? { ...t, ...input, id: input.id } : t,
              ),
            };
          }
          const id = nextId(prev.teams);
          return { ...prev, teams: [...prev.teams, { ...input, id, memberIds: [] }] };
        });
        log({
          action: input.id ? "UPDATE_TEAM" : "CREATE_TEAM",
          entityType: "Team",
          description: `${input.id ? "Updated" : "Created"} team ${input.name}`,
          newValue: input.name,
        });
      },
      addMember: async (teamId, competitorId) => {
        const saved = await persist(() => api.teams.addCompetitor(teamId, competitorId));
        if (!saved) return false;

        setState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId && !t.memberIds.includes(competitorId)
              ? { ...t, memberIds: [...t.memberIds, competitorId] }
              : t,
          ),
          competitors: prev.competitors.map((c) =>
            c.id === competitorId ? { ...c, teamId } : c,
          ),
        }));
        log({
          action: "ADD_TEAM_MEMBER",
          entityType: "Team",
          description: `Added competitor #${competitorId} to team #${teamId}`,
        });
        return true;
      },
      removeMember: (teamId, competitorId) => {
        persist(() => api.teams.removeCompetitor(teamId, competitorId));
        setState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId ? { ...t, memberIds: t.memberIds.filter((m) => m !== competitorId) } : t,
          ),
          competitors: prev.competitors.map((c) =>
            c.id === competitorId ? { ...c, teamId: null } : c,
          ),
        }));
        log({
          action: "REMOVE_TEAM_MEMBER",
          entityType: "Team",
          description: `Removed competitor #${competitorId} from team #${teamId}`,
        });
      },
      saveRace: (input) => {
        const current = input.id ? state.races.find((r) => r.id === input.id) : undefined;
        const saved = persist(async () => {
          // The backend stores LocalDateTime: no milliseconds, no timezone suffix.
          const local = (iso: string) => iso.replace(/(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/, "");
          const body = {
            name: input.name,
            description: input.description,
            type: input.type,
            status: input.status,
            distanceMeters: input.distanceMeters,
            startLocation: input.startLocation,
            finishLocation: input.finishLocation,
            scheduledAt: local(input.scheduledAt),
            registrationDeadline: local(input.registrationDeadline),
            maximumParticipants: input.maxParticipants,
          };
          if (!input.id) return api.races.create(body);
          const updated = await api.races.update(input.id, body);
          // PUT /races/{id} ignores the status field; the lifecycle lives on
          // PATCH /races/{id}/status, so send it separately when it changed.
          if (current && current.status !== input.status) {
            await api.races.setStatus(input.id, input.status);
          }
          return updated;
        });
        setState((prev) => {
          if (input.id) {
            return {
              ...prev,
              races: prev.races.map((r) => (r.id === input.id ? { ...r, ...input, id: input.id } : r)),
            };
          }
          const id = nextId(prev.races);
          return { ...prev, races: [...prev.races, { ...input, id }] };
        });
        log({
          action: input.id ? "UPDATE_RACE" : "CREATE_RACE",
          entityType: "Race",
          description: `${input.id ? "Updated" : "Created"} race ${input.name}`,
          newValue: input.status,
        });
        return saved;
      },
      setRaceStatus: async (id, status) => {
        const previous = state.races.find((r) => r.id === id)?.status;
        const saved = await persist(() => api.races.setStatus(id, status));
        if (!saved) return false;

        setState((prev) => ({
          ...prev,
          races: prev.races.map((r) => (r.id === id ? { ...r, status } : r)),
        }));
        log({
          action: "UPDATE_RACE_STATUS",
          entityType: "Race",
          description: `Race #${id} moved to ${status}`,
          ...(previous ? { previousValue: previous } : {}),
          newValue: status,
        });
        return true;
      },
      registerCompetitor: async (raceId, competitorId) => {
        const saved = await persist(() => api.registrations.create({ raceId, competitorId }));
        if (!saved) return false;

        setState((prev) => {
          const exists = prev.registrations.some(
            (r) => r.raceId === raceId && r.competitorId === competitorId && r.status !== "REJECTED",
          );
          if (exists) return prev;
          return {
            ...prev,
            registrations: [
              ...prev.registrations,
              {
                id: nextId(prev.registrations),
                raceId,
                competitorId,
                status: "PENDING",
                submittedAt: new Date().toISOString(),
              },
            ],
          };
        });
        log({
          action: "CREATE_REGISTRATION",
          entityType: "Registration",
          description: `Registered competitor #${competitorId} for race #${raceId}`,
          newValue: "PENDING",
        });
        toast.success("Competitor registered for race.");
        return true;
      },
      approveRegistration: (id) => {
        setState((prev) => ({
          ...prev,
          registrations: prev.registrations.map((r) =>
            r.id === id ? { ...r, status: "APPROVED", validationNotes: undefined } : r,
          ),
        }));
        log({
          action: "APPROVE_REGISTRATION",
          entityType: "Registration",
          description: `Approved registration #${id}`,
          previousValue: "PENDING",
          newValue: "APPROVED",
        });
      },
      rejectRegistration: (id, validationNotes) => {
        setState((prev) => ({
          ...prev,
          registrations: prev.registrations.map((r) =>
            r.id === id ? { ...r, status: "REJECTED", validationNotes } : r,
          ),
        }));
        log({
          action: "REJECT_REGISTRATION",
          entityType: "Registration",
          description: `Rejected registration #${id}: ${validationNotes}`,
          previousValue: "PENDING",
          newValue: "REJECTED",
        });
      },
      saveResults: (raceId, rows) => {
        setState((prev) => {
          const others = prev.results.filter((r) => r.raceId !== raceId);
          let seed = nextId(prev.results);
          const saved = rows.map((row) => ({ ...row, id: seed++ }));
          return {
            ...prev,
            results: [...others, ...saved],
            races: prev.races.map((r) => (r.id === raceId ? { ...r, status: "COMPLETED" } : r)),
          };
        });
        log({
          action: "RECORD_RESULTS",
          entityType: "Race",
          description: `Recorded ${rows.length} result rows for race #${raceId}`,
          newValue: "COMPLETED",
        });
      },
    };
  }, [state, loading, log, live, refresh, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
