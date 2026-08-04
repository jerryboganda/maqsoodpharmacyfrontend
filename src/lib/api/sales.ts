import { api } from "./client";
import type {
  CreateCustomerInput,
  CreateSaleInvoiceInput,
  CreateSaleInvoiceResult,
  CreateSaleReturnInput,
  CreateSaleReturnResult,
  CustomerLedgerResult,
  CustomerListResult,
  CustomerRow,
  GetSaleInvoiceResult,
  GetSaleReturnResult,
  SaleInvoiceListResult,
  SaleInvoiceLineRow,
  SaleInvoiceRow,
  SaleReturnListResult,
  UpdateCustomerInput,
} from "./types";

// ---------------------------------------------------------------------------------------------
// Wave 7 lifecycle actions (preview/cancel/reverse/print/reprint on sale-invoices, lookup-invoice/
// cancel/reverse on sale-returns) -- request/response shapes read directly from
// rebuild/apps/api/src/modules/sales/api/dto/sale-invoice.dto.ts, sale-return.dto.ts, and
// application/sale-invoices.service.ts's SaleInvoicePreviewResult/SaleInvoicePrintResult exports.
// Local to this file, not added to types.ts (this client's own "local minimal duplicate instead
// of touching a shared file" precedent -- see payments.ts's own header comment for the same
// reasoning, applied here to the same shared-file-collision-avoidance end).
// ---------------------------------------------------------------------------------------------
export interface CancelSaleInvoiceInput {
  cancelReasonId?: number;
  reason?: string;
}
export interface ReverseSaleInvoiceInput {
  reason?: string;
}

export interface SaleInvoicePreviewAllocation {
  stockLotId: number;
  qty: string;
  batchNo: string | null;
  expiryDate: string | null;
}
export interface SaleInvoicePreviewLine {
  lineNo: number;
  itemId: number;
  itemName: string;
  qty: string;
  unitSalePrice: string;
  lineGrossAmount: string;
  lineCostAmount: string;
  allocations: SaleInvoicePreviewAllocation[];
}
export interface SaleInvoicePreviewResult {
  customerId: number;
  customerName: string;
  saleCategoryId: number;
  lines: SaleInvoicePreviewLine[];
  grossAmount: string;
  netAmount: string;
  cogsAmount: string;
  invoiceTotal: string;
  totalQty: string;
  paidTotal: string;
  changeAmount: string;
}

/** `SaleInvoicesService.print`'s `SaleInvoicePrintResult` -- Date columns (documentDate/
 *  postingDate) serialize to ISO strings over the wire, typed `string` here like every other
 *  Date-column field elsewhere in this client. */
export interface SaleInvoicePrintResult {
  printFormat: "standard_receipt";
  header: {
    saleInvoiceId: number;
    docNumber: string;
    documentDate: string;
    postingDate: string;
    status: string;
    tenantName: string | null;
    branchName: string | null;
    customer: { customerId: number; name: string | null };
  };
  lines: {
    lineNo: number;
    itemId: number;
    itemName: string;
    itemCode: string;
    qty: string;
    unitSalePrice: string;
    itemFlatDiscount: string;
    discountPercent: string;
    lineDiscountAmount: string;
    lineGrossAmount: string;
    lineNetAmount: string;
    lineTaxAmount: string;
  }[];
  taxBreakdown: { salesTaxAmount: string; advanceIncomeTaxAmount: string; fbrPosFeeAmount: string };
  grossAmount: string;
  lineDiscountAmount: string;
  invoiceDiscountAmount: string;
  netAmount: string;
  roundingAmount: string;
  invoiceTotal: string;
  payments: {
    sequenceNo: number;
    paymentMethodId: number;
    methodName: string;
    amount: string;
    referenceNo: string | null;
    cardLast4: string | null;
  }[];
  changeAmount: string;
}

export interface CancelSaleReturnInput {
  cancelReasonId?: number;
  reason?: string;
}
export interface ReverseSaleReturnInput {
  reason?: string;
}

/** One line of `SaleReturnsService.lookupInvoice`'s response -- the referenced invoice's own
 *  `sale_invoice_line` row (same fields `SaleInvoiceLineRow` already types) plus the two fields
 *  that make this endpoint worth calling: how much of this line is already returned vs still
 *  returnable, as of right now (best-effort -- `createSaleReturn`'s own locked re-check is what is
 *  actually authoritative at submit time, see that service method's own doc comment). */
export interface LookupSaleReturnInvoiceLine extends SaleInvoiceLineRow {
  qtyAlreadyReturned: string;
  qtyReturnable: string;
}
export interface LookupSaleReturnInvoiceResult {
  invoice: SaleInvoiceRow;
  lines: LookupSaleReturnInvoiceLine[];
}

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
  /** Dry run of createSaleInvoice's own validation/pricing/FEFO/payment logic -- zero writes,
   *  `sale.cash:view`, no idempotency key (nothing to de-duplicate). */
  previewSaleInvoice: (input: CreateSaleInvoiceInput) =>
    api.post<SaleInvoicePreviewResult>("/sale-invoices/preview", input),
  /** Void a posted invoice -- 422 `SALES.HAS_ACTIVE_RETURNS` (with a real `detail` message) if an
   *  active sale_return still references it; reverse or cancel the return first. */
  cancelSaleInvoice: (id: number, input: CancelSaleInvoiceInput, idempotencyKey?: string) =>
    api.post<GetSaleInvoiceResult>(`/sale-invoices/${id}/cancel`, input, idempotencyKey),
  /** An unconditional compensating entry -- but as of this wave ALSO 422s
   *  `SALES.HAS_ACTIVE_RETURNS` while an active sale_return references the invoice
   *  (sale-invoices.service.ts's `reverse` doc comment: a live bug fix, not a doc-only note) --
   *  same guard cancelSaleInvoice enforces; reverse or cancel the return first either way. */
  reverseSaleInvoice: (id: number, input: ReverseSaleInvoiceInput, idempotencyKey?: string) =>
    api.post<GetSaleInvoiceResult>(`/sale-invoices/${id}/reverse`, input, idempotencyKey),
  /** Read-only structured JSON receipt (`printFormat: "standard_receipt"`), no idempotency key. */
  printSaleInvoice: (id: number) => api.get<SaleInvoicePrintResult>(`/sale-invoices/${id}/print`),
  /** Same rendering as printSaleInvoice, but POST so the global AuditInterceptor (mutating methods
   *  only) records the reprint -- no `@RequireIdempotencyKey` on this route
   *  (sale-invoices.controller.ts), so the key is optional/harmless here, not required. */
  reprintSaleInvoice: (id: number, idempotencyKey?: string) =>
    api.post<SaleInvoicePrintResult>(`/sale-invoices/${id}/reprint`, {}, idempotencyKey),

  // ---- Sale returns (create+post in one transaction, mirrors purchase returns) ----------------
  listSaleReturns: (
    params: {
      customerId?: number;
      saleInvoiceId?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => api.get<SaleReturnListResult>("/sale-returns", params),
  getSaleReturn: (id: number) => api.get<GetSaleReturnResult>(`/sale-returns/${id}`),
  createSaleReturn: (input: CreateSaleReturnInput, idempotencyKey?: string) =>
    api.post<CreateSaleReturnResult>("/sale-returns", input, idempotencyKey),
  /** Find the original posted sale invoice to build a return form against -- header + lines, each
   *  with `qtyAlreadyReturned`/`qtyReturnable`. Read-only, gated on `sale.return:create` (a
   *  sub-step of creating a return, not `:list` -- see the controller's own comment), no
   *  idempotency key. */
  lookupSaleReturnInvoice: (docNumber: string) =>
    api.post<LookupSaleReturnInvoiceResult>("/sale-returns/lookup-invoice", { docNumber }),
  /** Void a posted return -- 422 `SALE_RETURN.STOCK_ALREADY_MOVED` if the stock lot(s) it added to
   *  are no longer untouched since it posted (use reverseSaleReturn instead). */
  cancelSaleReturn: (id: number, input: CancelSaleReturnInput, idempotencyKey?: string) =>
    api.post<GetSaleReturnResult>(`/sale-returns/${id}/cancel`, input, idempotencyKey),
  /** An unconditional (w.r.t. cancel's own stock-untouched guard) compensating entry -- can still
   *  422 `INVENTORY.INSUFFICIENT_STOCK` if the returned stock has genuinely since been consumed. */
  reverseSaleReturn: (id: number, input: ReverseSaleReturnInput, idempotencyKey?: string) =>
    api.post<GetSaleReturnResult>(`/sale-returns/${id}/reverse`, input, idempotencyKey),
};
