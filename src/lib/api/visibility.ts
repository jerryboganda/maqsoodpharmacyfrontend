// Blueprint: rebuild/apps/api/src/modules/catalog -- visibility.controller.ts (Wave 10c,
// /admin/visibility/*, R1). Deliberately a separate file from catalog.ts -- this is a distinct
// curation surface (MGR/SYS/OWN/AUD), not part of the item CRUD catalog.ts already owns.
import { api } from "./client";
import type {
  BulkVisibilityInput,
  BulkVisibilityResult,
  EffectiveVisibilityResult,
  ItemVisibilityResult,
  SetItemVisibilityInput,
  UndoBulkVisibilityResult,
  VisibilityScope,
  VisibilityWorkbenchResult,
} from "./types";

export const visibilityApi = {
  /** GET /admin/visibility/items -- lists override rows only (not the whole item catalogue); most
   *  items have no row at all (default visible, R1.2). */
  workbench: (params: { scope?: VisibilityScope; source?: string; q?: string; offset?: number; limit?: number } = {}) =>
    api.get<VisibilityWorkbenchResult>("/admin/visibility/items", params),
  /** "Why is this item hidden (or visible)?" for one item + one scope. */
  effective: (itemId: number, scope: VisibilityScope) =>
    api.get<EffectiveVisibilityResult>(`/admin/visibility/effective/${itemId}`, { scope }),
  /** Set per-scope visibility for one item. `isVisible: true` clears the override (absence means
   *  visible, R1.2); `false` records a `manual` override. */
  setItemVisibility: (itemId: number, input: SetItemVisibilityInput, idempotencyKey?: string) =>
    api.put<ItemVisibilityResult>(`/items/${itemId}/visibility`, input, idempotencyKey),
  /** `dryRun: true` returns the live affected count and writes nothing (no `bulkOperationId`). */
  bulkApply: (input: BulkVisibilityInput, idempotencyKey?: string) =>
    api.post<BulkVisibilityResult>("/admin/visibility/bulk", input, idempotencyKey),
  /** Single-click undo (R1.4). `422 VISIBILITY.ALREADY_UNDONE` on a second attempt. */
  undoBulk: (bulkOperationId: number, reason?: string, idempotencyKey?: string) =>
    api.post<UndoBulkVisibilityResult>(`/admin/visibility/bulk/${bulkOperationId}/undo`, { reason }, idempotencyKey),
};
