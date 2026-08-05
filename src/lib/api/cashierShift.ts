// Blueprint: rebuild/apps/api/src/modules/payments -- cashier-shift.controller.ts (Wave 10g,
// R2.4, /cashier-shifts/*). Deliberately a separate file from payments.ts -- a distinct
// open/count/close/approve/z-report lifecycle, not part of the payment-record CRUD that file owns.
import { api } from "./client";
import type {
  ApproveCashierShiftInput,
  CashierShiftListResult,
  CashierShiftRow,
  CashierShiftZReportResult,
  CloseCashierShiftInput,
  CloseCashierShiftResult,
  CountCashierShiftInput,
  CountCashierShiftResult,
  OpenCashierShiftInput,
} from "./types";

export const cashierShiftApi = {
  /** A bare sales_officer only ever sees their own shifts here -- shift_incharge/pharmacy_manager/
   *  accountant/auditor/owner see every shift (enforced service-side, not by this call). */
  list: (params: { status?: "open" | "closed" | "approved"; offset?: number; limit?: number } = {}) =>
    api.get<CashierShiftListResult>("/cashier-shifts", params),
  getById: (id: number) => api.get<CashierShiftRow>(`/cashier-shifts/${id}`),
  /** `409 SHIFT.ALREADY_OPEN` if this actor already has an open shift on this same till.
   *  `422 SHIFT.NOT_A_TILL` if the account isn't a cash_drawer/petty_cash kind. */
  open: (input: OpenCashierShiftInput, idempotencyKey?: string) => api.post<CashierShiftRow>("/cashier-shifts", input, idempotencyKey),
  /** The blind denomination count -- `expectedCash` is computed and returned HERE, alongside
   *  `countedTotal`/`variance`, the first and only moment it's ever exposed to the caller.
   *  Replaces the shift's whole count set on each call (a re-submission is a correction, not an
   *  addition). `422 SHIFT.INVALID_DENOMINATION` on any value that isn't a real PKR denomination. */
  count: (id: number, input: CountCashierShiftInput, idempotencyKey?: string) => api.post<CountCashierShiftResult>(`/cashier-shifts/${id}/count`, input, idempotencyKey),
  /** Requires a count already submitted (`422 SHIFT.COUNT_REQUIRED` otherwise).
   *  `varianceReason` is mandatory whenever the persisted variance is non-zero
   *  (`422 SHIFT.VARIANCE_REASON_REQUIRED`). Never posts a GL entry for the variance -- see
   *  `CloseCashierShiftResult`'s own doc comment. */
  close: (id: number, input: CloseCashierShiftInput, idempotencyKey?: string) => api.post<CloseCashierShiftResult>(`/cashier-shifts/${id}/close`, input, idempotencyKey),
  /** Supervisor sign-off -- the cashier who opened the shift can never approve their own closure
   *  (`422 APPROVAL.SELF_APPROVAL_FORBIDDEN`). */
  approve: (id: number, input: ApproveCashierShiftInput, idempotencyKey?: string) => api.post<CashierShiftRow>(`/cashier-shifts/${id}/approve`, input, idempotencyKey),
  zReport: (id: number) => api.get<CashierShiftZReportResult>(`/cashier-shifts/${id}/z-report`),
};
