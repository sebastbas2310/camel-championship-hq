export type Role = "ADMINISTRATOR" | "RACE_ORGANIZER" | "VIEWER";

export type CompetitorType = "DWARF" | "CAMEL" | "MEDIUM" | "OTHER";
export type CompetitorStatus = "ACTIVE" | "INJURED" | "SUSPENDED" | "RETIRED";

export type RaceStatus =
  | "DRAFT"
  | "OPEN_FOR_REGISTRATION"
  | "CLOSED_FOR_REGISTRATION"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type RaceType = "INDIVIDUAL" | "TEAM" | "MIXED";

export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ResultStatus = "FINISHED" | "DISQUALIFIED" | "DID_NOT_FINISH" | "DID_NOT_START";

export interface AuthUser {
  username: string;
  displayName: string;
  role: Role;
}

export interface Competitor {
  id: number;
  name: string;
  nickname: string;
  type: CompetitorType;
  age: number;
  weight: number;
  height: number;
  country: string;
  status: CompetitorStatus;
  /** Email of the user who registered this competitor. */
  registeredByEmail?: string | undefined;
  teamId?: number | null | undefined;
}

export interface Team {
  id: number;
  name: string;
  coach: string;
  strategy: string;
  memberIds: number[];
}

export interface Race {
  id: number;
  name: string;
  description: string;
  scheduledAt: string;
  startLocation: string;
  finishLocation: string;
  distanceMeters: number;
  maxParticipants: number;
  registrationDeadline: string;
  status: RaceStatus;
  type: RaceType;
}

export interface Registration {
  id: number;
  raceId: number;
  competitorId: number;
  status: RegistrationStatus;
  submittedAt: string;
  validationNotes?: string | undefined;
}

export interface RaceResult {
  id: number;
  raceId: number;
  competitorId: number;
  position: number | null;
  timeSeconds: number | null;
  status: ResultStatus;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  entityType: string;
  description: string;
  previousValue?: string | undefined;
  newValue?: string | undefined;
}

export const POINTS_BY_POSITION: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 1 };

export const COMPETITOR_TYPES: CompetitorType[] = ["DWARF", "CAMEL", "MEDIUM", "OTHER"];
export const COMPETITOR_STATUSES: CompetitorStatus[] = [
  "ACTIVE",
  "INJURED",
  "SUSPENDED",
  "RETIRED",
];
export const RACE_STATUSES: RaceStatus[] = [
  "DRAFT",
  "OPEN_FOR_REGISTRATION",
  "CLOSED_FOR_REGISTRATION",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];
export const RACE_TYPES: RaceType[] = ["INDIVIDUAL", "TEAM", "MIXED"];
export const RESULT_STATUSES: ResultStatus[] = [
  "FINISHED",
  "DISQUALIFIED",
  "DID_NOT_FINISH",
  "DID_NOT_START",
];

export function labelize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}