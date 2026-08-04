// Option-list / option-item admin CRUD (Wave 7). Mirrors
// rebuild/apps/api/src/modules/settings/api/option-lists.controller.ts +
// dto/option-item.dto.ts verbatim -- read both fully before touching this file.
//
// This is the ADMIN-facing surface (`/option-lists/...`, sees disabled rows too). It is a
// DIFFERENT set of routes from the existing app-facing, enabled-only `GET /settings/options/:key`
// (lookupsApi.options(), OptionValueResponse in ./types) that SettingsOptionsPage.svelte used to
// be a stopgap viewer for -- that endpoint's shape (displayName/helpText naming) is untouched and
// unrelated; do not conflate the two.
//
// Deliberately NOT re-exported through the shared barrel (./index.ts) -- that file is a HARD
// BOUNDARY for this task (another process wires pages in afterward) and is also the "small shared
// registry" a concurrently-running agent may be appending to (expenses.ts/payments.ts's own header
// comments already establish this "new module = its own file, imported directly" precedent).
// Import `optionsApi` directly from this file, e.g. `import { optionsApi } from '../../api/options'`.
//
// No money/quantity fields anywhere in option_list/option_item (options.ts's own schema -- every
// column is a string/bool/int), so Rule M does not apply here; every field below is exactly what
// the wire sends, no decimal-string handling needed.
import { api } from "./client";

// ---------------------------------------------------------------------------------------------
// GET /option-lists -- every option list this tenant has, plus a computed item count.
// Mirrors OptionListSummary (options.repository.ts) column-for-column.
// ---------------------------------------------------------------------------------------------
export interface OptionListSummary {
  optionListId: number;
  listCode: string;
  name: string;
  description: string | null;
  /** P1.4: false = fixed/system-defined list -- `POST .../items` against it 422s
   *  OPTION_LIST.NOT_ADMIN_EXTENSIBLE. */
  isAdminExtensible: boolean;
  /** false = no item in this list can ever be disabled -- `PATCH .../items/:id` with
   *  `isEnabled: false` 422s OPTION_LIST.DISABLE_NOT_ALLOWED regardless of the item. */
  allowsDisable: boolean;
  itemCount: number;
}

// ---------------------------------------------------------------------------------------------
// GET /option-lists/:listCode/items -- every item in one list, including disabled ones (the
// admin view). Response shape is the raw `option_item` row (OptionItemRow = typeof
// optionItems.$inferSelect in options.repository.ts); only the business-relevant columns are
// typed here -- tenantId/legacyId/defaultListKey/createdAt+By+Source/updatedAt+By/rowVersion/
// deletedAt+By+Reason are internal bookkeeping this UI never reads or sends back, same convention
// PaymentMethodRow (types.ts) already uses for payment_method's equivalent audit columns.
// ---------------------------------------------------------------------------------------------
export interface OptionItemRow {
  optionItemId: number;
  optionListId: number;
  code: string;
  name: string;
  nameUr: string | null;
  description: string | null;
  groupLabel: string | null;
  minPermission: string | null;
  searchTerms: string | null;
  meta: Record<string, unknown> | null;
  isEnabled: boolean;
  /** At most one true per list -- enforced atomically server-side; flip it only via
   *  `setDefaultOptionItem`, never via `updateOptionItem`. */
  isDefault: boolean;
  /** Seed-only classification -- API-created items are always `false` (createOptionItem never
   *  accepts it as input). An `isSystem: true` row can never be disabled (PATCH `isEnabled:
   *  false` 422s OPTION_ITEM.SYSTEM_ITEM_CANNOT_BE_DISABLED regardless of the parent list's
   *  `allowsDisable`), but its cosmetic fields (name/description/groupLabel/sortOrder) stay
   *  editable. */
  isSystem: boolean;
  sortOrder: number;
}

/** POST /option-lists/:listCode/items body. `isDefault`/`isSystem` are deliberately absent --
 *  see CreateOptionItemSchema's own header comment (option-item.dto.ts) for why: isDefault has
 *  its own atomic set-default endpoint, isSystem is seed-only and never API-settable. `sortOrder`
 *  defaults server-side to 100, `isEnabled` to true, if omitted. */
export interface CreateOptionItemInput {
  code: string;
  name: string;
  nameUr?: string;
  description?: string;
  groupLabel?: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

/** PATCH /option-lists/:listCode/items/:optionItemId body -- every field optional (server
 *  rejects an empty body: UpdateOptionItemSchema's `.refine`, "at least one field must be
 *  provided"). `code` is immutable via this endpoint (never renamed once created -- see
 *  UpdateOptionItemSchema's own header comment); `isDefault`/`isSystem` are excluded for the same
 *  reason as create. Sending `isEnabled: false` 422s if the item `isSystem` or the parent list
 *  has `allowsDisable: false` -- see SettingsService.updateOptionItem's own comment for the exact
 *  two independent checks; SettingsOptionsPage mirrors both client-side before ever submitting. */
export interface UpdateOptionItemInput {
  name?: string;
  nameUr?: string | null;
  description?: string | null;
  groupLabel?: string | null;
  sortOrder?: number;
  isEnabled?: boolean;
}

export const optionsApi = {
  /** `GET /option-lists`. Bare array response (no wrapper object) -- settings.service.ts's
   *  `listOptionLists` returns `readonly OptionListSummary[]` directly and the controller passes
   *  it straight through. */
  listOptionLists: () => api.get<OptionListSummary[]>("/option-lists"),

  /** `GET /option-lists/:listCode/items`. Bare array response, same reasoning as above. Includes
   *  disabled rows -- this is the admin view, unlike the app-facing enabled-only
   *  `GET /settings/options/:key` (lookupsApi.options). */
  listOptionItems: (listCode: string) => api.get<OptionItemRow[]>(`/option-lists/${encodeURIComponent(listCode)}/items`),

  /** `POST /option-lists/:listCode/items`. 422 `OPTION_LIST.NOT_ADMIN_EXTENSIBLE` if the parent
   *  list isn't admin-extensible -- SettingsOptionsPage disables the "Add item" action client-side
   *  for such lists rather than relying solely on this 422, but the check still applies server-side
   *  regardless (e.g. a stale UI state). Carries a real Idempotency-Key
   *  (`@RequireIdempotencyKey()` on this route, option-lists.controller.ts) -- mint one with
   *  `api.newIdempotencyKey()` once per form-open, same convention as every other create-with-body
   *  POST in this codebase. */
  createOptionItem: (listCode: string, input: CreateOptionItemInput, idempotencyKey: string) =>
    api.post<OptionItemRow>(`/option-lists/${encodeURIComponent(listCode)}/items`, input, idempotencyKey),

  /** `PATCH /option-lists/:listCode/items/:optionItemId`. No `@RequireIdempotencyKey()` on this
   *  route (same convention as every other PATCH in this codebase -- payment-methods.controller.ts,
   *  expense-categories.controller.ts), but `idempotencyKey` is still accepted here so callers can
   *  pass one for consistency with `api.patch`'s own signature; it's simply not required
   *  server-side. */
  updateOptionItem: (listCode: string, optionItemId: number, input: UpdateOptionItemInput, idempotencyKey?: string) =>
    api.patch<OptionItemRow>(`/option-lists/${encodeURIComponent(listCode)}/items/${optionItemId}`, input, idempotencyKey),

  /** `POST /option-lists/:listCode/items/:optionItemId/set-default`. No body, and deliberately no
   *  Idempotency-Key argument here -- this route carries no `@RequireIdempotencyKey()` (see the
   *  controller handler's own comment: a bodyless POST would make `IdempotencyInterceptor`
   *  canonicalize `undefined` and previously crashed the route; hashing a request.body only ever
   *  happens once `@RequireIdempotencyKey()` is present -- confirmed against
   *  idempotency.interceptor.ts's own `if (!required) return next.handle()` early-out). `api.post`
   *  still attaches a fresh auto-minted Idempotency-Key header (src/lib/api/client.ts always does,
   *  for every non-GET call) -- harmless here since the interceptor never reads it for this route.
   *  422s `OPTION_ITEM.CANNOT_DEFAULT_DISABLED` if the target is disabled -- SettingsOptionsPage
   *  disables this action client-side for disabled rows rather than relying solely on that 422. */
  setDefaultOptionItem: (listCode: string, optionItemId: number) =>
    api.post<OptionItemRow>(`/option-lists/${encodeURIComponent(listCode)}/items/${optionItemId}/set-default`),
};
