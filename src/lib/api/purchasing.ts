import { api } from "./client";
import type {
  CreatePurchaseInvoiceInput,
  CreatePurchaseInvoiceResult,
  CreateSupplierInput,
  GetPurchaseInvoiceResult,
  PurchaseInvoiceListResult,
  SupplierListResult,
  SupplierRow,
} from "./types";

export const purchasingApi = {
  listSuppliers: (params: { q?: string; isActive?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<SupplierListResult>("/suppliers", params),
  getSupplier: (id: number) => api.get<SupplierRow>(`/suppliers/${id}`),
  createSupplier: (input: CreateSupplierInput, idempotencyKey?: string) =>
    api.post<SupplierRow>("/suppliers", input, idempotencyKey),

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
