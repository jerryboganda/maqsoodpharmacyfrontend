// Classic writable store (matches every other store in this codebase -- theme.ts/locale.ts,
// no Svelte 5 runes anywhere yet). Holds the signed-in actor resolved from the real backend.
//
// Honesty note (see rebuild/apps/api/src/common/auth/session.guard.ts): the backend has no real
// credential check yet -- every request resolves to the same seeded `dev.owner` actor regardless
// of what's typed into the login form. `login()` below still calls the real `/identity/me`
// endpoint (so the signed-in user/roles you see are genuinely read from MySQL, not mock data),
// but it cannot fail on a wrong password because the backend doesn't check one yet. The login
// page surfaces this plainly instead of pretending otherwise.
import { writable } from "svelte/store";
import { ApiNetworkError, identityApi, type UserResponse } from "../api";

export interface SessionState {
  status: "idle" | "loading" | "authenticated" | "error";
  user: UserResponse | null;
  error: string | null;
}

export const session = writable<SessionState>({ status: "idle", user: null, error: null });

async function resolve(): Promise<UserResponse> {
  session.update((s) => ({ ...s, status: "loading", error: null }));
  try {
    const user = await identityApi.me();
    session.set({ status: "authenticated", user, error: null });
    return user;
  } catch (err) {
    const message = err instanceof ApiNetworkError ? err.message : "Could not sign in.";
    session.set({ status: "error", user: null, error: message });
    throw err;
  }
}

/** Dev-mode "login": the form fields are collected for UX realism but not sent anywhere --
 *  the backend has no login endpoint yet, only a session-scoped /identity/me. */
export async function login(): Promise<UserResponse> {
  return resolve();
}

export async function restoreSession(): Promise<UserResponse | null> {
  try {
    return await resolve();
  } catch {
    return null;
  }
}

export function logout(): void {
  session.set({ status: "idle", user: null, error: null });
}
