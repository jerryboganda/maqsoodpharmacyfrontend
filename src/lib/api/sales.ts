import { api } from "./client";
import type {
  CreateCustomerInput,
  CreateSaleInvoiceInput,
  CreateSaleInvoiceResult,
  CustomerLedgerResult,
  CustomerListResult,
  CustomerRow,
  GetSaleInvoiceResult,
  SaleInvoiceListResult,
  UpdateCustomerInput,
} from "./types";

export const salesApi = {
  listCustomers: (params: { q?: string; isActive?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<CustomerListResult>("/customers", params),
  getCustomer: (id: number) => api.get<CustomerRow>(`/customers/${id}`),
  createCustomer: (input: CreateCustomerInput, idempotencyKey?: string) =>
    api.post<CustomerRow>("/customers", input, idempotencyKey),
  /** Edits the customer's own editable fields only -- never `glAccountId`/`isActive` (its own
   *  endpoint below). No `@RequireIdempotencyKey` on the backend route, but a key is harmless
   *  to pass through for consistency with the rest of this client. */
  updateCustomer: (id: number, input: UpdateCustomerInput, idempotencyKey?: string) =>
    api.patch<CustomerRow>(`/customers/${id}`, input, idempotencyKey),
  /** One-way: retires the customer. There is no reactivate endpoint on the backend (same
   *  documented simplification as suppliers -- see CustomersService.deactivate's doc comment). */
  deactivateCustomer: (id: number, reason: string | undefined, idempotencyKey?: string) =>
    api.post<CustomerRow>(`/customers/${id}/deactivate`, reason ? { reason } : {}, idempotencyKey),
  /** The customer's AR sub-ledger, oldest first, with a running balance already folded in. */
  getCustomerLedger: (id: number, params: { dateFrom?: string; dateTo?: string; offset?: number; limit?: number } = {}) =>
    api.get<CustomerLedgerResult>(`/customers/${id}/ledger`, params),

  listSaleInvoices: (
    params: { customerId?: number; status?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number } = {},
  ) => api.get<SaleInvoiceListResult>("/sale-invoices", params),
  getSaleInvoice: (id: number) => api.get<GetSaleInvoiceResult>(`/sale-invoices/${id}`),
  createSaleInvoice: (input: CreateSaleInvoiceInput, idempotencyKey?: string) =>
    api.post<CreateSaleInvoiceResult>("/sale-invoices", input, idempotencyKey),
};
