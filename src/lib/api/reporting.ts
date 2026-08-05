// Reporting module client (Wave 6, +1 report in Wave 8) -- GET /reports (the static report
// registry) and POST /reports/{reportId}/run (dispatches to one of the 9 report handlers). Also wires
// GET /metrics/definitions, a small static catalogue the page surfaces as descriptive text near
// the report picker.
//
// Rule M: every money/quantity field below (netAmount, qty, stockValue, avgUnitCost, qtyOnHand,
// reorderQty, the aging bucket amounts, thresholdQty) is the decimal STRING the wire returns --
// never a JS number. `invoiceCount`/`lotCount`/`horizonDays`/`totalLotCount` ARE plain numbers on
// the wire (reports.service.ts explicitly `Number(...)`-coerces mysql2's string COUNT(*) before
// it ever reaches the response), so those stay `number` here, not strings.
//
// `filters` is an open bag on the wire (api/dto/report.dto.ts) -- each report interprets its own
// shape server-side (application/report-filters.ts). The per-report filter interfaces below match
// those Zod schemas field-for-field. `runReport` is overloaded on the literal `reportId` so a
// caller passing "sales-summary" gets `SalesSummaryFilters` + `SalesSummaryRow` typed back, not a
// generic bag -- see report-registry.ts for the 9 reportIds this switches on.
//
// Not re-exported through ./index.ts's barrel (same reasoning as expenses.ts's own header
// comment): index.ts is a small shared registry another concurrently-running agent may also be
// appending an export line to, so pages import this module directly
// (`import { reportingApi } from '../../api/reporting'`).
import { api } from "./client";

// ---------------------------------------------------------------------------------------------
// GET /reports -- the static registry (report-registry.ts).
// ---------------------------------------------------------------------------------------------
export type ReportGroup = "sales" | "purchase" | "inventory" | "finance";

export interface ReportDefinition {
  readonly reportId: string;
  readonly title: string;
  readonly description: string;
  readonly group: ReportGroup;
}

// ---------------------------------------------------------------------------------------------
// GET /metrics/definitions -- metric-definitions.ts's static catalogue, surfaced as descriptive
// text near the report picker.
// ---------------------------------------------------------------------------------------------
export interface MetricDefinition {
  readonly key: string;
  readonly title: string;
  readonly definition: string;
}

// ---------------------------------------------------------------------------------------------
// Shared response envelope -- every report handler goes through report-helpers.ts's `paginate()`
// (except expiry-report, which has no SQL page but still returns this same meta shape with the
// full fixed bucket list as one "page").
// ---------------------------------------------------------------------------------------------
export interface ReportMeta {
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly hasMore: boolean;
}

export interface RunReportResult<TRow, TMeta extends ReportMeta = ReportMeta> {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly data: readonly TRow[];
  readonly meta: TMeta;
}

export interface RunReportBody<F> {
  filters?: F;
  offset?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------------------------
// sales-summary -- reports.service.ts#runSalesSummary. `qty` only appears when groupBy="item"
// (the item-grouped query is the only one that selects it); `label` is a YYYY-MM-DD date string
// when groupBy="date" (the default) and a customer/item name otherwise.
// ---------------------------------------------------------------------------------------------
export interface SalesSummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  /** Default "date" server-side if omitted. */
  groupBy?: "date" | "item" | "customer";
  customerId?: number;
  /** Only accepted when groupBy="item" -- otherwise a 422 REPORT.FILTER_INVALID. */
  itemId?: number;
}
export interface SalesSummaryRow {
  key: string;
  label: string;
  netAmount: string;
  qty?: string;
  invoiceCount: number;
}

// ---------------------------------------------------------------------------------------------
// purchase-summary -- reports.service.ts#runPurchaseSummary. Same shape as sales-summary, mirrored
// against purchase invoices/suppliers instead of sale invoices/customers.
// ---------------------------------------------------------------------------------------------
export interface PurchaseSummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: "date" | "item" | "supplier";
  supplierId?: number;
  /** Only accepted when groupBy="item". */
  itemId?: number;
}
export interface PurchaseSummaryRow {
  key: string;
  label: string;
  netAmount: string;
  qty?: string;
  invoiceCount: number;
}

// ---------------------------------------------------------------------------------------------
// stock-valuation -- reports.service.ts#runStockValuation. `avgUnitCost` only appears when
// groupBy="item" (the branch-grouped row is a single aggregate total with no per-item cost).
// ---------------------------------------------------------------------------------------------
export interface StockValuationFilters {
  /** Default "item" server-side if omitted. */
  groupBy?: "item" | "branch";
  itemId?: number;
}
export interface StockValuationRow {
  key: string;
  label: string;
  qtyOnHand: string;
  avgUnitCost?: string;
  stockValue: string;
}

// ---------------------------------------------------------------------------------------------
// expiry-report -- reports.service.ts#runExpiryReport / report-queries.ts#computeExpiryBuckets.
// No offset/limit on the wire (always the fixed 4-bucket list); the extra fields live inside
// `meta`, not as siblings of `data`/`meta`.
// ---------------------------------------------------------------------------------------------
export interface ExpiryReportFilters {
  itemId?: number;
}
export const EXPIRY_BUCKET_KEYS = ["expired", "d0to30", "d30to60", "d60to90"] as const;
export type ExpiryBucketKey = (typeof EXPIRY_BUCKET_KEYS)[number];
export interface ExpiryBucketRow {
  bucket: ExpiryBucketKey;
  lotCount: number;
  qty: string;
  value: string;
}
export interface ExpiryReportMeta extends ReportMeta {
  asOfDate: string;
  horizonDays: number;
  totalValue: string;
  totalQty: string;
  totalLotCount: number;
  /** Documented gap: the requested "90-180" bucket cannot be populated -- see report-queries.ts's
   *  own doc comment. Always `["90-180"]` today. */
  unsupportedBuckets: readonly string[];
}

// ---------------------------------------------------------------------------------------------
// reorder-level -- reports.service.ts#runReorderLevel. `reorderQty` is `items.reorder_qty`
// (nullable per item, but this report only ever includes items where it IS set).
// ---------------------------------------------------------------------------------------------
export interface ReorderLevelFilters {
  itemId?: number;
}
export interface ReorderLevelRow {
  key: string;
  label: string;
  qtyOnHand: string;
  reorderQty: string;
}

// ---------------------------------------------------------------------------------------------
// ap-aging / ar-aging -- reports.service.ts#runApAging / #runArAging, pivoted per party by
// `pivotAgingRows`. `asOfDate` is a sibling of `data`/`meta` at the top level of the run() result
// (echoes the resolved as-of date, defaulting to today when the filter is omitted).
// ---------------------------------------------------------------------------------------------
export interface ApAgingFilters {
  supplierId?: number;
  /** Overrides "today" for the overdue-days computation. */
  asOfDate?: string;
}
export interface ArAgingFilters {
  customerId?: number;
  asOfDate?: string;
}
export const AGING_BUCKET_KEYS = ["current", "days1to30", "days31to60", "days61to90", "days90plus"] as const;
export type AgingBucketKey = (typeof AGING_BUCKET_KEYS)[number];
export interface AgingRow {
  partyId: number;
  partyName: string;
  invoiceCount: number;
  buckets: Record<AgingBucketKey, string>;
  total: string;
}
export interface AgingRunReportResult extends RunReportResult<AgingRow> {
  readonly asOfDate: string;
}

// ---------------------------------------------------------------------------------------------
// low-stock -- reports.service.ts#runLowStock. `thresholdQty` is a sibling of `data`/`meta` at
// the top level, echoing the resolved threshold (defaults to "20.0000" when the filter is
// omitted -- report-queries.ts's DEFAULT_LOW_STOCK_THRESHOLD).
// ---------------------------------------------------------------------------------------------
export interface LowStockFilters {
  itemId?: number;
  /** Decimal STRING (Rule M) -- e.g. "20.0000". */
  thresholdQty?: string;
}
export interface LowStockRow {
  key: string;
  label: string;
  qtyOnHand: string;
}
export interface LowStockRunReportResult extends RunReportResult<LowStockRow> {
  readonly thresholdQty: string;
}

// ---------------------------------------------------------------------------------------------
// controlled-drug-register -- reports.service.ts#runControlledDrugRegister (Wave 8, U-062/D18/R7).
// One row per posted sale line for a controlled-drug item. `dispensingNote` is the free-text field
// captured optionally at POS checkout (POSCheckoutPage.svelte); `dispensedByUserId`/
// `dispensedByName` are who posted the sale, not necessarily a licensed dispensing pharmacist --
// this report shows what the system already captures, it does not assert legal compliance.
// ---------------------------------------------------------------------------------------------
export interface ControlledDrugRegisterFilters {
  dateFrom?: string;
  dateTo?: string;
  itemId?: number;
}
export interface ControlledDrugRegisterRow {
  key: string;
  docNumber: string;
  postingDate: string;
  itemId: number;
  itemName: string;
  batchNo: string | null;
  qty: string;
  dispensingNote: string | null;
  dispensedByUserId: number | null;
  dispensedByName: string | null;
}

/** Union of every report's row shape -- for UI code (ReportsPage.svelte) that renders whichever
 *  report the user picked and narrows by `reportId` before reading shape-specific fields. */
export type AnyReportRow =
  | SalesSummaryRow
  | PurchaseSummaryRow
  | StockValuationRow
  | ExpiryBucketRow
  | ReorderLevelRow
  | AgingRow
  | LowStockRow
  | ControlledDrugRegisterRow;

/** Loosened result shape `runReport`'s dispatcher normalizes every typed overload result into --
 *  see ReportsPage.svelte's `runSelected` for why a single report-picker UI needs one common
 *  result type to hold in state across 8 differently-shaped reports. Each individual `runReport`
 *  overload below still returns the precise, real per-report type to any caller that invokes it
 *  directly with a literal reportId. */
export interface AnyRunReportResult {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly data: readonly AnyReportRow[];
  readonly meta: ReportMeta | ExpiryReportMeta;
  readonly asOfDate?: string;
  readonly thresholdQty?: string;
}

function runReport(reportId: "sales-summary", body?: RunReportBody<SalesSummaryFilters>): Promise<RunReportResult<SalesSummaryRow>>;
function runReport(reportId: "purchase-summary", body?: RunReportBody<PurchaseSummaryFilters>): Promise<RunReportResult<PurchaseSummaryRow>>;
function runReport(reportId: "stock-valuation", body?: RunReportBody<StockValuationFilters>): Promise<RunReportResult<StockValuationRow>>;
function runReport(reportId: "expiry-report", body?: RunReportBody<ExpiryReportFilters>): Promise<RunReportResult<ExpiryBucketRow, ExpiryReportMeta>>;
function runReport(reportId: "reorder-level", body?: RunReportBody<ReorderLevelFilters>): Promise<RunReportResult<ReorderLevelRow>>;
function runReport(reportId: "ap-aging", body?: RunReportBody<ApAgingFilters>): Promise<AgingRunReportResult>;
function runReport(reportId: "ar-aging", body?: RunReportBody<ArAgingFilters>): Promise<AgingRunReportResult>;
function runReport(reportId: "low-stock", body?: RunReportBody<LowStockFilters>): Promise<LowStockRunReportResult>;
function runReport(
  reportId: "controlled-drug-register",
  body?: RunReportBody<ControlledDrugRegisterFilters>,
): Promise<RunReportResult<ControlledDrugRegisterRow>>;
function runReport(reportId: string, body?: RunReportBody<Record<string, unknown>>): Promise<AnyRunReportResult>;
// Implementation signature only -- never seen by callers (the 9 overloads above are the entire
// public surface). Typed loosely with `any` deliberately: each overload's `RunReportBody<F>` (F a
// plain filter interface, no index signature) is not structurally assignable to
// `RunReportBody<Record<string, unknown>>` without one, which is the one place a stricter
// implementation signature would fight the overload set instead of dispatching for it.
function runReport(reportId: string, body: RunReportBody<any> = {}): Promise<any> {
  return api.post(`/reports/${reportId}/run`, {
    filters: body.filters ?? {},
    offset: body.offset,
    limit: body.limit,
  });
}

export const reportingApi = {
  /** GET /reports -- unwraps the `{ data: [...] }` envelope, same convention as
   *  lookupsApi.adjustmentReasons/purchaseCategories/etc. */
  listReports: () => api.get<{ data: ReportDefinition[] }>("/reports").then((r) => r.data),
  /** GET /metrics/definitions -- optional descriptive text for the report picker. */
  listMetricDefinitions: () => api.get<{ data: MetricDefinition[] }>("/metrics/definitions").then((r) => r.data),
  /** POST /reports/{reportId}/run. Overloaded on the literal reportId (see the 8 signatures
   *  above) -- call with a literal string ("sales-summary", etc.) for a precisely-typed result,
   *  or a plain `string` variable for the loosened `AnyRunReportResult` a generic report-picker
   *  UI needs. */
  runReport,
};
