// Payments module client (payment methods admin CRUD + payment record/allocate/reverse/cancel).
// Rule M: amount/allocatedAmount/unallocatedAmount/totalAmount/outstandingAmount are decimal
// STRINGS end to end, exactly like every other client in this directory.
//
// GET/POST/PATCH bodies mirror payment.dto.ts / payment-method.dto.ts in the sibling `rebuild`
// repo verbatim (confirmed against a live dev server -- see this task's own report for the exact
// shapes and the one live-verification gap: `dev.owner`'s seeded "owner" role currently has
// payment:list/view and payment_method:list/view but NOT the create/edit/cancel/reverse grants,
// so the write endpoints below are wired from the DTOs/service source, not a live 2xx response).
import { api } from "./client";
import type {
  AddPaymentAllocationsInput,
  AllocationCandidatesResult,
  CancelPaymentInput,
  CreatePaymentInput,
  CreatePaymentMethodInput,
  GetPaymentResult,
  PaymentDirection,
  PaymentListResult,
  PaymentMethodListResult,
  PaymentMethodRow,
  PaymentPartyKind,
  PaymentStatus,
  UpdatePaymentMethodInput,
} from "./types";

// ---- Cash/bank accounts: deliberately a small LOCAL duplicate of the fetch + shape, not an
// import from a sibling accounting.ts client another agent may be building concurrently (avoids
// a file-ordering race across the two shared files this task's instructions call out). Only the
// fields this page actually needs for a picker dropdown are typed here.
export interface PaymentCashBankAccountRow {
  cashBankAccountId: number;
  glAccountId: number;
  accountKind: string; // e.g. "cash_drawer" | "bank" | "petty_cash" | "mobile_wallet" | "card_settlement"
  bankName: string | null;
  branchName: string | null;
  accountNo: string | null;
  isActive: boolean;
}
interface PaymentCashBankAccountListResult {
  cashBankAccounts: PaymentCashBankAccountRow[];
  offset: number;
  limit: number;
}

export const paymentsApi = {
  // ---- Payment methods (admin CRUD) --------------------------------------------------------
  listPaymentMethods: (params: { includeDisabled?: boolean } = {}) =>
    api.get<PaymentMethodListResult>("/payment-methods", params),
  getPaymentMethod: (id: number) => api.get<PaymentMethodRow>(`/payment-methods/${id}`),
  createPaymentMethod: (input: CreatePaymentMethodInput, idempotencyKey?: string) =>
    api.post<PaymentMethodRow>("/payment-methods", input, idempotencyKey),
  /** `code` is immutable -- omitted from `UpdatePaymentMethodInput` entirely, not just optional. */
  updatePaymentMethod: (id: number, input: UpdatePaymentMethodInput, idempotencyKey?: string) =>
    api.patch<PaymentMethodRow>(`/payment-methods/${id}`, input, idempotencyKey),

  // ---- Payments -----------------------------------------------------------------------------
  listPayments: (
    params: {
      direction?: PaymentDirection;
      partyKind?: PaymentPartyKind;
      supplierId?: number;
      customerId?: number;
      status?: PaymentStatus;
      dateFrom?: string;
      dateTo?: string;
      offset?: number;
      limit?: number;
    } = {},
  ) => api.get<PaymentListResult>("/payments", params),
  getPayment: (id: number) => api.get<GetPaymentResult>(`/payments/${id}`),
  /** Exactly one of supplierId/customerId -- the caller (PaymentsPage) enforces that, mirroring
   *  AllocationCandidatesQuerySchema's own refine on the backend. Gated on `payment:create`
   *  server-side (browsing candidates is a sub-step of creating a payment), not `payment:list`. */
  getAllocationCandidates: (params: { supplierId?: number; customerId?: number }) =>
    api.get<AllocationCandidatesResult>("/payments/allocation-candidates", params),
  /** Creates AND posts in one transaction -- Dr supplier/Cr cash for direction "out", Dr cash/Cr
   *  customer for direction "in". Returns the same `{ payment, allocations }` shape as
   *  `getPayment` (payment.service.ts's createAndPost returns `this.getById(...)`). */
  createPayment: (input: CreatePaymentInput, idempotencyKey?: string) =>
    api.post<GetPaymentResult>("/payments", input, idempotencyKey),
  addAllocations: (paymentId: number, input: AddPaymentAllocationsInput, idempotencyKey?: string) =>
    api.post<GetPaymentResult>(`/payments/${paymentId}/allocations`, input, idempotencyKey),
  /** No idempotency key on this route by design (payments.controller.ts's own header comment):
   *  a retry 422s as PAYMENT.ALLOCATION_ALREADY_REVERSED instead of double-applying. */
  reverseAllocation: (paymentId: number, allocationId: number) =>
    api.post<GetPaymentResult>(`/payments/${paymentId}/allocations/${allocationId}/reverse`),
  /** Only reachable with zero active allocations -- 422s PAYMENT.HAS_ACTIVE_ALLOCATIONS
   *  otherwise. PaymentsPage disables the action client-side rather than relying on that 422 as
   *  the only signal (per this task's own instruction). No idempotency key, same reasoning as
   *  reverseAllocation above (a retry 422s as PAYMENT.ALREADY_CANCELLED). */
  cancelPayment: (paymentId: number, input: CancelPaymentInput = {}) =>
    api.post<GetPaymentResult>(`/payments/${paymentId}/cancel`, input),

  // ---- Cash/bank accounts (local minimal fetch -- see header comment) -----------------------
  listCashBankAccounts: () => api.get<PaymentCashBankAccountListResult>("/cash-bank-accounts", { limit: 200 }),
};
