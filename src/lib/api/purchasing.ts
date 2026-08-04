import { api } from "./client";
import type {
  CreatePurchaseInvoiceInput,
  CreatePurchaseInvoiceResult,
  CreatePurchaseOrderInput,
  CreatePurchaseReturnInput,
  CreatePurchaseReturnResult,
  CreateSupplierInput,
  GetPurchaseInvoiceResult,
  GetPurchaseOrderResult,
  GetPurchaseReturnResult,
  PurchaseInvoiceListResult,
  PurchaseOrderListResult,
  PurchaseReturnListResult,
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

  // ---- Purchase orders (commitment/intent documents -- never touch stock or the GL) -----------
  listPurchaseOrders: (
    params: {
      supplierId?: number;
      status?: string;
      orderStatus?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => api.get<PurchaseOrderListResult>("/purchase-orders", params),
  getPurchaseOrder: (id: number) => api.get<GetPurchaseOrderResult>(`/purchase-orders/${id}`),
  createPurchaseOrder: (input: CreatePurchaseOrderInput, idempotencyKey?: string) =>
    api.post<GetPurchaseOrderResult>("/purchase-orders", input, idempotencyKey),
  /** draft -> confirmed (the schema's stand-in for "approved"). Self-approval-forbidden is
   *  enforced server-side (creator cannot approve their own order). */
  approvePurchaseOrder: (id: number, reason: string | undefined, idempotencyKey?: string) =>
    api.post<GetPurchaseOrderResult>(`/purchase-orders/${id}/approve`, reason ? { reason } : {}, idempotencyKey),
  /** confirmed -> orderStatus 'closed' (terminal). Requires the order to be approved first. */
  closePurchaseOrder: (id: number, reason: string | undefined, idempotencyKey?: string) =>
    api.post<GetPurchaseOrderResult>(`/purchase-orders/${id}/close`, reason ? { reason } : {}, idempotencyKey),
  /** draft|confirmed -> status 'cancelled' (terminal), orderStatus kept in sync. */
  cancelPurchaseOrder: (
    id: number,
    input: { cancelReasonId?: number; reason?: string } = {},
    idempotencyKey?: string,
  ) => api.post<GetPurchaseOrderResult>(`/purchase-orders/${id}/cancel`, input, idempotencyKey),

  // ---- Purchase returns (reverse-direction sibling of a purchase invoice; create+post in one
  // transaction, same as a purchase invoice) --------------------------------------------------
  listPurchaseReturns: (
    params: {
      supplierId?: number;
      purchaseInvoiceId?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => api.get<PurchaseReturnListResult>("/purchase-returns", params),
  getPurchaseReturn: (id: number) => api.get<GetPurchaseReturnResult>(`/purchase-returns/${id}`),
  createPurchaseReturn: (input: CreatePurchaseReturnInput, idempotencyKey?: string) =>
    api.post<CreatePurchaseReturnResult>("/purchase-returns", input, idempotencyKey),
};
