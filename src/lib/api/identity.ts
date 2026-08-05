// Blueprint: rebuild/apps/api/src/modules/identity -- users.controller.ts, roles.controller.ts,
// permissions.controller.ts. User/role administration is owner/sys_admin only on the backend
// (RequirePermission("identity.user"/"identity.user_role"/"identity.role"/"identity.permission")).
import { api } from "./client";
import type {
  AdminUserRow,
  CreateRoleInput,
  CreateUserInput,
  CreateUserResult,
  PermissionRow,
  RoleLimitList,
  RoleRow,
  RoleScopeList,
  UpdateRoleInput,
  UserResponse,
} from "./types";

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

  // ---- Wave 10b: POST/PATCH /roles (sys_admin only) -------------------------------------------
  /** Create a custom, platform-wide role. `422 ROLE.KEY_TAKEN` on a duplicate key,
   *  `422 ROLE.CLONE_SOURCE_NOT_FOUND` on an unresolvable `clonedFromRoleKey`. */
  createRole: (input: CreateRoleInput, idempotencyKey?: string) => api.post<RoleRow>("/roles", input, idempotencyKey),
  /** Rename/describe/enable/disable. `isEnabled: false` is the real "remove a role" action (P1.3)
   *  -- `422 ROLE.SYSTEM_ROLE_PROTECTED` against a seeded system role. */
  updateRole: (roleKey: string, input: UpdateRoleInput, idempotencyKey?: string) => api.patch<RoleRow>(`/roles/${roleKey}`, input, idempotencyKey),

  // ---- Wave 10e/10f: role_scope / role_limit (R-007 CRITICAL) --------------------------------
  getRoleScopes: (roleKey: string) => api.get<RoleScopeList>(`/roles/${roleKey}/scopes`),
  /** Replaces only the SUPPLIED scopeTypes' whole value set -- an omitted scopeType is left
   *  untouched, never cleared. Pass `scopeValues: []` for a scopeType to explicitly clear it. */
  putRoleScopes: (roleKey: string, scopes: RoleScopeList, idempotencyKey?: string) =>
    api.put<RoleScopeList>(`/roles/${roleKey}/scopes`, { scopes }, idempotencyKey),
  getRoleLimits: (roleKey: string) => api.get<RoleLimitList>(`/roles/${roleKey}/limits`),
  /** Full replace of the role's entire limit set (unlike scopes' per-scopeType replace). */
  putRoleLimits: (roleKey: string, limits: RoleLimitList, idempotencyKey?: string) =>
    api.put<RoleLimitList>(`/roles/${roleKey}/limits`, { limits }, idempotencyKey),
};
