// Classic writable store (matches every other store in this codebase -- theme.ts/locale.ts, no
// Svelte 5 runes anywhere yet). Holds the signed-in actor resolved from the real backend.
//
// Real auth (see rebuild/apps/api/src/modules/auth/): POST /auth/login returns a bearer token +
// the actor's profile; every subsequent request must carry `Authorization: Bearer <token>`
// (src/lib/api/client.ts attaches it automatically once `setAuthToken` has been called, which
// this file is the only caller of). The token is kept in `sessionStorage`, not `localStorage` --
// it is cleared when the tab closes and is not shared across tabs, which shrinks the window a
// stolen token (XSS) stays usable, at the cost of not persisting a login across browser restarts.
// That tradeoff is deliberate for a pharmacy POS-style app.
import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { ApiError, ApiNetworkError, authApi, identityApi, setAuthToken, type UserResponse } from "../api";

const TOKEN_STORAGE_KEY = "pharmacy.session.token";

export interface SessionState {
  status: "idle" | "loading" | "authenticated" | "error";
  user: UserResponse | null;
  error: string | null;
  /** True immediately after a successful login whose account is flagged to change its password
   *  before continuing. This is NOT an unauthenticated state -- login already returned a real,
   *  usable session token -- it just gates the rest of the app behind POST /auth/password/change.
   *  Cleared by a successful `changePassword()` call. */
  mustChangePassword: boolean;
}

const LOGGED_OUT: SessionState = { status: "idle", user: null, error: null, mustChangePassword: false };

export const session = writable<SessionState>(LOGGED_OUT);

function readStoredToken(): string | null {
  if (!browser) return null;
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable (private-mode edge cases, etc.) -- treat as no stored session.
    return null;
  }
}

function storeToken(token: string): void {
  setAuthToken(token);
  if (!browser) return;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Best-effort persistence -- the in-memory token set above still makes the rest of this tab's
    // session work even if it can't survive a reload.
  }
}

function clearToken(): void {
  setAuthToken(null);
  if (!browser) return;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function userFromLoginResponse(result: {
  userId: string;
  username: string;
  displayName: string;
  roles: string[];
}): UserResponse {
  return {
    userId: result.userId,
    username: result.username,
    displayName: result.displayName,
    roles: result.roles,
    isActive: true,
  };
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError || err instanceof ApiNetworkError) return err.message;
  return fallback;
}

export interface LoginOutcome {
  user: UserResponse;
  mustChangePassword: boolean;
}

/** Real credential login against POST /auth/login. Throws `ApiError` (code
 *  `AUTH.INVALID_CREDENTIALS` for a wrong username/password, `AUTH.ACCOUNT_LOCKED` for a lockout)
 *  or `ApiNetworkError` (backend unreachable) -- callers (PharmacyLoginPage) branch on
 *  `err.code`/`err instanceof ApiNetworkError` to show the right message, so failures are thrown
 *  here rather than swallowed into `session.error`. */
export async function login(username: string, password: string): Promise<LoginOutcome> {
  session.update((s) => ({ ...s, status: "loading", error: null }));
  try {
    const result = await authApi.login(username, password);
    storeToken(result.token);
    const user = userFromLoginResponse(result);
    session.set({ status: "authenticated", user, error: null, mustChangePassword: result.mustChangePassword });
    return { user, mustChangePassword: result.mustChangePassword };
  } catch (err) {
    clearToken();
    session.set({ status: "error", user: null, error: messageFor(err, "Could not sign in."), mustChangePassword: false });
    throw err;
  }
}

/** Validates whatever token is sitting in sessionStorage (e.g. after a page reload) against the
 *  backend via GET /identity/me, instead of trusting its mere presence. A real 401 (expired,
 *  revoked, or otherwise rejected) clears it and reports logged-out. A network failure leaves the
 *  stored token alone (we can't confirm it's bad, so we don't throw it away over a transient
 *  blip) but still reports logged-out for THIS call -- an unverified token is never treated as an
 *  authenticated session. */
export async function restoreSession(): Promise<UserResponse | null> {
  const token = readStoredToken();
  if (!token) {
    session.set(LOGGED_OUT);
    return null;
  }
  setAuthToken(token);
  session.update((s) => ({ ...s, status: "loading", error: null }));
  try {
    const user = await identityApi.me();
    session.set({ status: "authenticated", user, error: null, mustChangePassword: false });
    return user;
  } catch (err) {
    if (err instanceof ApiNetworkError) {
      session.set({ status: "error", user: null, error: err.message, mustChangePassword: false });
      return null;
    }
    // Backend actually answered and rejected the token (expired/revoked/malformed) -- this is the
    // "invalid" case: clear it for real.
    clearToken();
    session.set(LOGGED_OUT);
    return null;
  }
}

/** Revokes the session server-side (POST /auth/logout) then clears all client-side state. The
 *  network call is best-effort: a failed revoke (already expired, backend unreachable) must not
 *  block clearing the local token, or the user would be stuck looking "logged in" locally holding
 *  a token the UI itself just tried to throw away. */
export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // best-effort -- local state is cleared unconditionally below regardless of outcome
  } finally {
    clearToken();
    session.set(LOGGED_OUT);
  }
}

/** POST /auth/password/change for the signed-in actor. Throws `ApiError` on a wrong current
 *  password (`AUTH.INVALID_CREDENTIALS`) or a `newPassword` that fails validation (422, field
 *  errors on `newPassword`) -- callers surface `err.detail`/`err.fieldErrors`. On success, clears
 *  `mustChangePassword` so the login flow can proceed to the dashboard. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await authApi.changePassword(currentPassword, newPassword);
  session.update((s) => ({ ...s, mustChangePassword: false }));
}
