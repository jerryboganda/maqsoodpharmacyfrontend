// Blueprint: rebuild/apps/api/src/modules/identity -- users.controller.ts, roles.controller.ts,
// permissions.controller.ts. User/role administration is owner/sys_admin only on the backend
// (RequirePermission("identity.user"/"identity.user_role"/"identity.role"/"identity.permission")).
import { api } from "./client";
import type { AdminUserRow, CreateUserInput, CreateUserResult, PermissionRow, RoleRow, UserResponse } from "./types";

export const identityApi = {
  me: () => api.get<UserResponse>("/identity/me"),

  listUsers: () => api.get<AdminUserRow[]>("/users"),
  /** Generates a random temporary password server-side (never caller-supplied), returned exactly
   *  once in the response -- there is no way to retrieve it again after this call returns. */
  createUser: (input: CreateUserInput, idempotencyKey?: string) =>
    api.post<CreateUserResult>("/users", input, idempotencyKey),
  /** Deactivate/reactivate. There is no hard-delete of a user. */
  setUserActive: (id: string | number, isActive: boolean, idempotencyKey?: string) =>
    api.patch<void>(`/users/${id}`, { isActive }, idempotencyKey),
  /** Replaces the user's entire role assignment (PUT, not a delta) -- must be a non-empty list. */
  replaceUserRoles: (id: string | number, roles: string[], idempotencyKey?: string) =>
    api.put<{ roles: string[] }>(`/users/${id}/roles`, { roles }, idempotencyKey),

  /** The seeded role catalogue -- what the role-assignment picker offers. */
  listRoles: () => api.get<RoleRow[]>("/roles"),
  /** The permission catalogue -- read-only, for audit/reference. */
  listPermissions: () => api.get<PermissionRow[]>("/permissions"),
};
