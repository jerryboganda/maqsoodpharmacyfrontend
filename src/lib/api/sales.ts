import { api } from "./client";
import type {
  CreateCustomerInput,
  CreateSaleInvoiceInput,
  CreateSaleInvoiceResult,
  CustomerListResult,
  CustomerRow,
  GetSaleInvoiceResult,
  SaleInvoiceListResult,
} from "./types";

export const salesApi = {
  listCustomers: (params: { q?: string; isActive?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<CustomerListResult>("/customers", params),
  getCustomer: (id: number) => api.get<CustomerRow>(`/customers/${id}`),
  createCustomer: (input: CreateCustomerInput, idempotencyKey?: string) =>
    api.post<CustomerRow>("/customers", input, idempotencyKey),

  listSaleInvoices: (
    params: { customerId?: number; status?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number } = {},
  ) => api.get<SaleInvoiceListResult>("/sale-invoices", params),
  getSaleInvoice: (id: number) => api.get<GetSaleInvoiceResult>(`/sale-invoices/${id}`),
  createSaleInvoice: (input: CreateSaleInvoiceInput, idempotencyKey?: string) =>
    api.post<CreateSaleInvoiceResult>("/sale-invoices", input, idempotencyKey),
};
