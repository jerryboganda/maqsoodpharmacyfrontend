import { api } from "./client";
import type {
  CreatePurchaseInvoiceInput,
  CreatePurchaseInvoiceResult,
  CreateSupplierInput,
  GetPurchaseInvoiceResult,
  PurchaseInvoiceListResult,
  SupplierLedgerResult,
  SupplierListResult,
  SupplierRow,
  UpdateSupplierInput,
} from "./types";

export const purchasingApi = {
  listSuppliers: (params: { q?: string; isActive?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<SupplierListResult>("/suppliers", params),
  getSupplier: (id: number) => api.get<SupplierRow>(`/suppliers/${id}`),
  createSupplier: (input: CreateSupplierInput, idempotencyKey?: string) =>
    api.post<SupplierRow>("/suppliers", input, idempotencyKey),
  /** Edits the supplier's own editable fields only -- never `glAccountId`/`isActive` (its own
   *  endpoint below). No `@RequireIdempotencyKey` on the backend route, but a key is harmless
   *  to pass through for consistency with the rest of this client. */
  updateSupplier: (id: number, input: UpdateSupplierInput, idempotencyKey?: string) =>
    api.patch<SupplierRow>(`/suppliers/${id}`, input, idempotencyKey),
  /** One-way: retires the supplier. There is no reactivate endpoint on the backend (documented
   *  simplification -- see SupplierService.deactivate's doc comment), so none is offered here. */
  deactivateSupplier: (id: number, reason: string | undefined, idempotencyKey?: string) =>
    api.post<SupplierRow>(`/suppliers/${id}/deactivate`, reason ? { reason } : {}, idempotencyKey),
  /** The supplier's AP sub-ledger, oldest first, with a running balance already folded in. */
  getSupplierLedger: (id: number, params: { dateFrom?: string; dateTo?: string; offset?: number; limit?: number } = {}) =>
    api.get<SupplierLedgerResult>(`/suppliers/${id}/ledger`, params),

  listPurchaseInvoices: (
    params: {
      supplierId?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => api.get<PurchaseInvoiceListResult>("/purchase-invoices", params),
  getPurchaseInvoice: (id: number) => api.get<GetPurchaseInvoiceResult>(`/purchase-invoices/${id}`),
  createPurchaseInvoice: (input: CreatePurchaseInvoiceInput, idempotencyKey?: string) =>
    api.post<CreatePurchaseInvoiceResult>("/purchase-invoices", input, idempotencyKey),
};
