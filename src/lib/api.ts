import { getAccessToken, supabase } from "./supabase";

export const API_ORIGIN =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "https://camelvsdwarf.onrender.com";

/**
 * In the browser we go through the same-origin proxy (`/api/proxy/...`) because
 * the course backend does not allow cross-origin calls. On the server we talk
 * to the upstream directly.
 */
export const API_BASE_URL =
  typeof window === "undefined" ? `${API_ORIGIN.replace(/\/$/, "")}/api/v1` : "/api/proxy";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** Maps backend/transport failures to friendly, user-facing copy. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        // Show the server's own explanation (validation messages, field errors).
        if (error.message && !error.message.startsWith("Request failed")) return error.message;
        return "Some of the details you entered aren't valid. Please review the form.";
      case 401:
        return "Your session has expired. Please sign in again.";
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return "We couldn't find what you were looking for.";
      case 409:
        return "That conflicts with existing data — try a different value.";
      case 429:
        return "Too many attempts right now. Please wait a moment and try again.";
      case 0:
        return "The racing server is unreachable. Please try again in a moment.";
      default:
        return "Something went wrong on the racing server. Please try again.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something unexpected happened. Please try again.";
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

/**
 * Centralized request helper. Attaches the Supabase access token as
 * `Authorization: Bearer <token>` and normalizes failures into `ApiError`.
 * Network failures use status 0 so callers can fall back to local demo data.
 */
export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
    token?: string | null | undefined;
  } = {},
): Promise<T> {
  const token = options.token ?? (await getAccessToken());
  let response: Response;
  // The hosted server sleeps between visits, so give up quickly instead of hanging.
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 60000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      signal: options.signal ?? timeout,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new ApiError(0, "Network unreachable");
  }

  if (response.status === 401) {
    await supabase.auth.signOut().catch(() => undefined);
    onUnauthorized?.();
    throw new ApiError(401, "Unauthorized");
  }
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };
      if (payload?.message) message = payload.message;
      if (payload?.fieldErrors) {
        const details = Object.entries(payload.fieldErrors)
          .map(([field, reason]) => `${field}: ${reason}`)
          .join(" · ");
        if (details) message = `${message} (${details})`;
      }
    } catch {
      /* keep the default message */
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Spring pages come back as `{ content, page, size, ... }`. */
export function unwrapPage<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { content?: unknown }).content)) {
    return (payload as { content: T[] }).content;
  }
  return [];
}

const PAGE_QUERY = "?page=0&size=200";

export interface ProfileResponse {
  id?: number;
  fullName?: string;
  email?: string;
  role?: string;
  enabled?: boolean;
}

/** Thin, typed service layer mirroring the Spring Boot endpoints (`/api/v1`). */
export const api = {
  /** Creates (or returns) the app profile linked to the Supabase identity. */
  createProfile: (fullName: string, token?: string | null, role?: string | null) =>
    apiRequest<ProfileResponse>("/users/me", {
      method: "POST",
      body: role ? { fullName, role } : { fullName },
      token,
    }),
  /** Reads the app profile for the signed-in Supabase identity. */
  myProfile: (token?: string | null) => apiRequest<ProfileResponse>("/users/me", { token }),
  users: {
    list: () => apiRequest<unknown>(`/users${PAGE_QUERY}`),
    get: (id: number) => apiRequest<ProfileResponse>(`/users/${id}`),
    create: (body: unknown) => apiRequest<ProfileResponse>("/users", { method: "POST", body }),
    update: (id: number, body: unknown) =>
      apiRequest<ProfileResponse>(`/users/${id}`, { method: "PUT", body }),
    /** Enables/disables a user (logical delete on the backend). */
    setStatus: (id: number, enabled: boolean) =>
      apiRequest<ProfileResponse>(`/users/${id}/status`, { method: "PATCH", body: { enabled } }),
    remove: (id: number) => apiRequest<void>(`/users/${id}`, { method: "DELETE" }),
  },
  competitors: {
    list: () => apiRequest(`/competitors${PAGE_QUERY}`),
    get: (id: number) => apiRequest(`/competitors/${id}`),
    create: (body: unknown) => apiRequest("/competitors", { method: "POST", body }),
    update: (id: number, body: unknown) =>
      apiRequest(`/competitors/${id}`, { method: "PUT", body }),
    /** Logical delete on the backend: flips the competitor's status. */
    setStatus: (id: number, status: string) =>
      apiRequest(`/competitors/${id}/status`, { method: "PATCH", body: { status } }),
  },
  teams: {
    list: () => apiRequest(`/teams${PAGE_QUERY}`),
    get: (id: number) => apiRequest(`/teams/${id}`),
    create: (body: unknown) => apiRequest("/teams", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/teams/${id}`, { method: "PUT", body }),
    addCompetitor: (teamId: number, competitorId: number) =>
      apiRequest(`/teams/${teamId}/competitors/${competitorId}`, { method: "POST" }),
    removeCompetitor: (teamId: number, competitorId: number) =>
      apiRequest(`/teams/${teamId}/competitors/${competitorId}`, { method: "DELETE" }),
  },
  races: {
    list: () => apiRequest(`/races${PAGE_QUERY}`),
    get: (id: number) => apiRequest(`/races/${id}`),
    create: (body: unknown) => apiRequest("/races", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/races/${id}`, { method: "PUT", body }),
    /** Moves a race through its lifecycle (DRAFT → OPEN_FOR_REGISTRATION → …). */
    setStatus: (id: number, status: string) =>
      apiRequest(`/races/${id}/status`, { method: "PATCH", body: { status } }),
  },
  registrations: {
    list: () => apiRequest(`/registrations${PAGE_QUERY}`),
    create: (body: unknown) => apiRequest("/registrations", { method: "POST", body }),
    update: (id: number, body: unknown) =>
      apiRequest(`/registrations/${id}`, { method: "PUT", body }),
    decision: (id: number, body: unknown) =>
      apiRequest(`/registrations/${id}/decision`, { method: "PATCH", body }),
  },
  results: {
    list: () => apiRequest(`/results${PAGE_QUERY}`),
    create: (body: unknown) => apiRequest("/results", { method: "POST", body }),
    update: (id: number, body: unknown) => apiRequest(`/results/${id}`, { method: "PUT", body }),
  },
};
