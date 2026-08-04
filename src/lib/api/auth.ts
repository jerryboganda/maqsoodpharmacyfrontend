// Real credential auth against POST /auth/login, /auth/logout, /auth/password/change -- see
// rebuild/apps/api/src/modules/auth/api/auth.controller.ts (+ dto/auth.dto.ts) for the
// source-of-truth contract this mirrors. Session lifecycle (token storage, restoreSession) lives
// in src/lib/stores/session.ts; this module is just the three wire calls.
import { api } from "./client";
import type { LoginResponse } from "./types";

export const authApi = {
  login: (username: string, password: string) => api.post<LoginResponse>("/auth/login", { username, password }),
  /** 204 No Content -- revokes only the caller's own session (the token just used to call it). */
  logout: () => api.post<void>("/auth/logout"),
  /** 204 No Content. Backend enforces `newPassword` >= 12 chars and "must differ from current"
   *  (ChangePasswordSchema, auth.dto.ts) -- violations come back as an ApiError with fieldErrors,
   *  not re-validated client-side beyond the input's own `minlength`/`required`. */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>("/auth/password/change", { currentPassword, newPassword }),
};
