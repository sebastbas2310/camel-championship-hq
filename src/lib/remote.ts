import { api, unwrapPage } from "./api";
import type {
  Competitor,
  Race,
  RaceResult,
  Registration,
  Team,
} from "./types";

/**
 * Adapters between the Spring Boot DTOs on https://camelvsdwarf.onrender.com/api/v1
 * and the shapes the UI already renders. Field names are read defensively so a
 * slightly different DTO still lands on screen instead of crashing the page.
 */

type Row = Record<string, unknown>;

const str = (row: Row, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
};

const num = (row: Row, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
};

const ids = (row: Row, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) =>
          typeof entry === "number"
            ? entry
            : entry && typeof entry === "object"
              ? num(entry as Row, "id", "userId", "competitorId")
              : 0,
        )
        .filter((id) => id > 0);
    }
  }
  return [];
};

/** Years between an ISO date string and today; 0 when unparsable. */
const ageFrom = (iso: string) => {
  const born = new Date(iso);
  if (Number.isNaN(born.getTime())) return 0;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age > 0 ? age : 0;
};

/** Maps the dedicated `/competitors` DTO (CompetitorResponse). */
function mapCompetitor(row: Row): Competitor {
  const mapped = mapUser(row);
  const dateOfBirth = str(row, "dateOfBirth", "birthDate");
  return {
    ...mapped,
    name: str(row, "name", "fullName") || mapped.name,
    country: str(row, "origin", "country") || mapped.country,
    age: num(row, "age") || ageFrom(dateOfBirth),
    registeredByEmail:
      str(row, "registeredByEmail", "email", "createdByEmail", "userEmail") || undefined,
  };
}

function mapUser(row: Row): Competitor {
  const type = str(row, "participantType", "competitorType", "type").toUpperCase();
  const status = str(row, "status", "competitorStatus").toUpperCase();
  return {
    id: num(row, "id", "userId"),
    name: str(row, "fullName", "name", "username") || `Competitor #${num(row, "id")}`,
    nickname: str(row, "nickname", "username", "email"),
    type: (["DWARF", "CAMEL", "MEDIUM", "OTHER"].includes(type)
      ? type
      : "OTHER") as Competitor["type"],
    age: num(row, "age"),
    weight: num(row, "weightKg", "weight"),
    height: num(row, "heightCm", "height"),
    country: str(row, "country", "nationality", "region"),
    status: (["ACTIVE", "INJURED", "SUSPENDED", "RETIRED"].includes(status)
      ? status
      : "ACTIVE") as Competitor["status"],
    teamId: (row["teamId"] as number | null | undefined) ?? null,
  };
}

function mapTeam(row: Row): Team {
  return {
    id: num(row, "id", "teamId"),
    name: str(row, "name", "teamName") || `Team #${num(row, "id")}`,
    coach: str(row, "coach", "coachName", "captainName", "manager"),
    strategy: str(row, "strategy", "description", "motto"),
    memberIds: ids(row, "memberIds", "competitorIds", "members", "users", "competitors"),
  };
}

function mapRace(row: Row): Race {
  const status = str(row, "status", "raceStatus").toUpperCase();
  const type = str(row, "type", "raceType").toUpperCase();
  return {
    id: num(row, "id", "raceId"),
    name: str(row, "name", "title") || `Race #${num(row, "id")}`,
    description: str(row, "description", "notes"),
    scheduledAt: str(row, "scheduledAt", "startsAt", "raceDate"),
    startLocation: str(row, "startLocation", "start"),
    finishLocation: str(row, "finishLocation", "finish"),
    distanceMeters: num(row, "distanceMeters", "distance"),
    maxParticipants: num(row, "maximumParticipants", "maxParticipants"),
    registrationDeadline: str(row, "registrationDeadline", "deadline"),
    status: ([
      "DRAFT",
      "OPEN_FOR_REGISTRATION",
      "CLOSED_FOR_REGISTRATION",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ].includes(status)
      ? status
      : "DRAFT") as Race["status"],
    type: (["INDIVIDUAL", "TEAM", "MIXED"].includes(type) ? type : "INDIVIDUAL") as Race["type"],
  };
}

function mapRegistration(row: Row): Registration {
  const status = str(row, "status", "registrationStatus").toUpperCase();
  return {
    id: num(row, "id", "registrationId"),
    raceId: num(row, "raceId", "race"),
    competitorId: num(row, "competitorId", "userId", "participantId"),
    status: (["PENDING", "APPROVED", "REJECTED"].includes(status)
      ? status
      : "PENDING") as Registration["status"],
    submittedAt: str(row, "submittedAt", "createdAt", "registeredAt"),
    validationNotes: str(row, "validationNotes", "notes") || undefined,
  };
}

function mapResult(row: Row): RaceResult {
  const status = str(row, "status", "resultStatus").toUpperCase();
  const position = num(row, "position", "finishingPosition");
  const time = num(row, "timeSeconds", "finishTimeSeconds", "durationSeconds");
  return {
    id: num(row, "id", "resultId"),
    raceId: num(row, "raceId"),
    competitorId: num(row, "competitorId", "userId", "participantId"),
    position: position > 0 ? position : null,
    timeSeconds: time > 0 ? time : null,
    status: (["FINISHED", "DISQUALIFIED", "DID_NOT_FINISH", "DID_NOT_START"].includes(status)
      ? status
      : "FINISHED") as RaceResult["status"],
  };
}

export interface RemoteSnapshot {
  reachable: boolean;
  competitors: Competitor[];
  teams: Team[];
  races: Race[];
  registrations: Registration[];
  results: RaceResult[];
}

/** Loads everything the live API exposes today. Never throws. */
export async function fetchRemoteSnapshot(): Promise<RemoteSnapshot> {
  const [competitors, users, teams, races, registrations, results] = await Promise.allSettled([
    api.competitors.list(),
    api.users.list(),
    api.teams.list(),
    api.races.list(),
    api.registrations.list(),
    api.results.list(),
  ]);

  const rows = <T>(
    settled: PromiseSettledResult<unknown>,
    map: (row: Row) => T,
  ): { ok: boolean; data: T[] } =>
    settled.status === "fulfilled"
      ? { ok: true, data: unwrapPage<Row>(settled.value).map(map) }
      : { ok: false, data: [] };

  const c = rows(competitors, mapCompetitor);
  const u = rows(users, mapUser);
  const t = rows(teams, mapTeam);
  const r = rows(races, mapRace);
  const g = rows(registrations, mapRegistration);
  const s = rows(results, mapResult);

  // Prefer the dedicated competitors endpoint; older backends without it still
  // expose the roster through /users.
  const roster = c.ok ? c.data : u.data;

  return {
    reachable: [c, u, t, r, g, s].some((entry) => entry.ok),
    competitors: roster,
    teams: t.data,
    races: r.data,
    registrations: g.data,
    results: s.data,
  };
}
