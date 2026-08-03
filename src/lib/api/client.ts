// Thin fetch wrapper for the pharmacy-platform NestJS API. There is no existing API-client
// convention in this theme to match (confirmed: zero fetch()/axios usage anywhere in src/ before
// this file) -- this is the one place a request actually leaves the browser.
//
// Rule M (rebuild/CLAUDE.md "Money and quantities: never plain JavaScript numbers, anywhere"):
// every function in src/lib/api/*.ts accepts/returns money and quantity fields as the exact
// decimal STRING the wire uses. This client never parses a numeric field into a JS number --
// only src/lib/api/format.ts does that, and only for display.
import { PUBLIC_API_BASE_URL } from "$env/static/public";
import type { ApiProblemDetails } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly fieldErrors: ApiProblemDetails["errors"];

  constructor(problem: ApiProblemDetails) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.fieldErrors = problem.errors;
  }
}

/** A network-level failure (server unreachable, DNS, CORS) -- distinct from a 4xx/5xx response. */
export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super("Could not reach the pharmacy API. Is it running?");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, PUBLIC_API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Idempotency-Key (17§7.5): minted once per logical write attempt, a client UUIDv7-shaped id.
 *  `crypto.randomUUID()` yields v4, which is fine here -- the backend only requires uniqueness
 *  per (key, endpoint), not the v7 time-ordering property. */
function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  opts: {
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (method !== "GET") {
    headers["Idempotency-Key"] = opts.idempotencyKey ?? newIdempotencyKey();
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body });
  } catch (cause) {
    throw new ApiNetworkError(cause);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text.length > 0 ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const problem: ApiProblemDetails =
      json && typeof json === "object" && "code" in json
        ? (json as ApiProblemDetails)
        : {
            type: "about:blank",
            title: res.statusText,
            status: res.status,
            code: "UNKNOWN",
            detail: `Request failed with status ${res.status}.`,
            instance: path,
            traceId: "",
          };
    throw new ApiError(problem);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    request<T>("GET", path, { query }),
  /** `idempotencyKey`: pass the SAME key across retries of the same logical action (17§7.5 --
   *  minted once when the form opens, not per click). Omit to mint a fresh one-shot key. */
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) => request<T>("POST", path, { body, idempotencyKey }),
  newIdempotencyKey,
};
