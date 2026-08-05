// Branch admin CRUD (Wave 8, U-062/D18/R7). Mirrors
// rebuild/apps/api/src/modules/settings/api/settings.controller.ts's `GET /settings/branches` /
// `PATCH /settings/branches/:branchId` + dto/branch.dto.ts verbatim -- read both fully before
// touching this file. This is the first admin surface for a `branch` row anywhere in this
// codebase (D17 already called branch/tenant identity fields "admin-editable settings", but no
// endpoint existed to actually edit one before this wave).
//
// Not re-exported through the shared barrel (./index.ts) -- same reasoning options.ts's own
// header comment already establishes: import `branchesApi` directly,
// `import { branchesApi } from '../../api/branches'`.
//
// `drugLicenceExpiryDate` is a YYYY-MM-DD string (Rule M-adjacent: not money/qty, but the same
// "never a JS Date object across the wire" discipline) -- settings.service.ts's `toDateOnlyOrNull`
// formats it that way on every response.
import { api } from "./client";

export interface BranchRow {
  branchId: number;
  code: string;
  name: string;
  nameUr: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  drugSaleLicenceNo: string | null;
  drugLicenceExpiryDate: string | null;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * PATCH /settings/branches/:branchId body -- every field optional (server rejects an empty body,
 * same `.refine` convention as UpdateOptionItemSchema). `code`/`isDefault`/`isActive` are not
 * editable via this endpoint -- see branch.dto.ts's own header comment for why. `null` clears a
 * field (e.g. a lapsed licence whose new number isn't known yet); `undefined`/omitted leaves it
 * untouched.
 */
export interface UpdateBranchInput {
  name?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  drugSaleLicenceNo?: string | null;
  drugLicenceExpiryDate?: string | null;
}

export const branchesApi = {
  /** `GET /settings/branches` -- every branch for the caller's own tenant. Bare array response. */
  listBranches: () => api.get<BranchRow[]>("/settings/branches"),

  /** `PATCH /settings/branches/:branchId`. No `@RequireIdempotencyKey()` on this route (same
   *  convention as every other PATCH in this codebase). */
  updateBranch: (branchId: number, input: UpdateBranchInput, idempotencyKey?: string) =>
    api.patch<BranchRow>(`/settings/branches/${branchId}`, input, idempotencyKey),
};
