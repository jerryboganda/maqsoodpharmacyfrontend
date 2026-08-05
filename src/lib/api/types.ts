// Verbatim contract types for the pharmacy-platform NestJS API (sibling repo `rebuild/apps/api`).
// Every money/quantity field is a decimal STRING, never a number -- the backend rejects a JSON
// number on these fields outright (Rule M, see rebuild/CLAUDE.md "Money and quantities"). Never
// call Number()/parseFloat() on these except inside src/lib/api/format.ts's display-only helpers.

export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance: string;
  traceId: string;
  errors?: { path: string; code: string; message: string }[];
}

// ---------------------------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------------------------
export interface UserResponse {
  userId: string;
  username: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
}

// ---------------------------------------------------------------------------------------------
// Identity -- user/role administration (owner/sys_admin only)
// ---------------------------------------------------------------------------------------------
export interface AdminUserRow {
  userId: string;
  username: string;
  displayName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: string[];
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  /** At least one role -- the backend rejects an empty array (a zero-role user could never
   *  reach any permission-gated route, including its own self-service ones). */
  roles: string[];
}

export interface CreateUserResult extends AdminUserRow {
  /** Shown exactly once, in this response only -- cannot be retrieved again. */
  temporaryPassword: string;
}

export interface RoleRow {
  roleId: number;
  roleKey: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
}

export interface PermissionRow {
  permissionId: number;
  code: string;
  name: string;
  description: string | null;
  permissionKind: string;
  isSensitive: boolean;
}

// ---------------------------------------------------------------------------------------------
// Auth (mirrors rebuild/apps/api/src/modules/auth/api/dto/auth.dto.ts -- the source of truth)
// ---------------------------------------------------------------------------------------------
export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: string;
  username: string;
  displayName: string;
  roles: string[];
  /** true when the account must change its password before continuing -- the login itself still
   *  succeeded (a real, usable session token is returned), this only gates the rest of the app. */
  mustChangePassword: boolean;
}

// ---------------------------------------------------------------------------------------------
// Settings (generic P1 option lists -- keyed lookups like "supplier_payment.method")
// ---------------------------------------------------------------------------------------------
export interface OptionValueResponse {
  optionValueId: string;
  setKey: string;
  code: string;
  displayName: string;
  helpText: string | null;
  groupLabel: string | null;
  sortOrder: number;
  isDefault: boolean;
  meta: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------------------------
export interface ItemSummary {
  itemId: number;
  customCode: string;
  name: string;
  nameLocal: string | null;
  packUnits: number;
  allowDecimalQty: boolean;
  salePrice: string;
  purchasePrice: string;
  avgUnitCost: string;
  hasExpiry: boolean;
  expiryCaptureMode: "required" | "prompt" | "off";
  isControlledDrug: boolean;
  isActive: boolean;
}

/** GET /items/:id -- the raw `item` row (catalog.ts schema in the sibling `rebuild` repo), a
 *  superset of `ItemSummary` with the fields the list endpoint doesn't project (registrationNo,
 *  minQty/maxQty/reorderQty, shelfLifeDays, storageLocation, notes). Mirrors only the columns this
 *  frontend actually consumes -- `tenantId`/`attributesJson`/`legacyId`/audit+soft-delete columns
 *  are real response fields too but nothing here reads them. */
export interface ItemDetail extends ItemSummary {
  registrationNo: string | null;
  minQty: string | null;
  maxQty: string | null;
  reorderQty: string | null;
  shelfLifeDays: number | null;
  storageLocation: string | null;
  notes: string | null;
}

/**
 * PATCH /items/:id body (item.dto.ts's `PatchItemSchema`, the source of truth). Every field
 * optional, but the backend rejects an empty body -- send only the fields that actually changed.
 * Money/quantity fields are Rule M decimal strings; `packUnits`/`shelfLifeDays` are plain integer
 * counts (the schema itself types them as `number`, not a decimal-string archetype).
 */
export interface PatchItemInput {
  customCode?: string;
  name?: string;
  nameLocal?: string;
  registrationNo?: string;
  packUnits?: number;
  allowDecimalQty?: boolean;
  salePrice?: string;
  purchasePrice?: string;
  minQty?: string;
  maxQty?: string;
  reorderQty?: string;
  hasExpiry?: boolean;
  expiryCaptureMode?: "required" | "prompt" | "off";
  shelfLifeDays?: number;
  storageLocation?: string;
  isControlledDrug?: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------------------------
// Lookup lists
// ---------------------------------------------------------------------------------------------
export interface AdjustmentReason {
  adjustmentReasonId: number;
  code: string;
  name: string;
  description: string | null;
  direction: "increase" | "decrease" | "both";
  isDefault: boolean;
  requiresApproval: boolean;
  requiresNote: boolean;
  sortOrder: number;
}

export interface PurchaseCategory {
  purchaseCategoryId: number;
  code: string;
  name: string;
  description: string | null;
  qtyBasis: "pack" | "loose";
  counterparty: "supplier" | "equity" | "customer";
  isReturn: boolean;
  isOpening: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface SaleCategory {
  saleCategoryId: number;
  code: string;
  name: string;
  description: string | null;
  counterparty: "cash" | "customer_account";
  isReturn: boolean;
  affectsStock: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface PaymentMethod {
  paymentMethodId: number;
  code: string;
  name: string;
  description: string | null;
  isCounterMethod: boolean;
  requiresReference: boolean;
  requiresChequeDetails: boolean;
  isDefault: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------------------------
// Inventory -- stock, lots, movements
// ---------------------------------------------------------------------------------------------
export interface StockRow {
  itemId: number;
  itemName: string;
  qtyOnHand: string;
  lotCount: string;
  nearestExpiry: string | null;
  avgCost: string;
}

export interface StockMovementRow {
  stockMovementId: number;
  occurredAt: string;
  postingDate: string;
  itemId: number;
  stockLotId: number;
  direction: "in" | "out";
  qtyDelta: string;
  unitCost: string;
  costAmount: string;
  qtyBefore: string;
  qtyAfter: string;
  documentTypeId: number;
  sourceDocumentId: number;
  sourceLineId: number | null;
  reasonId: number | null;
}

export interface StockLotRow {
  stockLotId: number;
  itemId: number;
  batchNo: string | null;
  expiryDate: string | null;
  lotStatus: "available" | "quarantined" | "expired" | "recalled" | "consumed";
  priority: number;
  receiptUnitCost: string | null;
  qtyOnHand: string;
}

/** GET /stock-lots/:id -- full lot detail (StockQueryService.getLotById): the listLots fields
 *  plus the soft-ref/audit columns that endpoint additionally selects, and the lot's last 100
 *  stock movements. `sourceDocumentTypeId`/`sourceDocumentId`/`supplierId`/`holdReasonId` are
 *  unresolved soft refs (ids only) -- the backend doesn't join them to a name yet. */
export interface StockLotDetail {
  stockLotId: number;
  itemId: number;
  batchNo: string | null;
  expiryDate: string | null;
  expiryStatus: "known" | "unknown" | "not_applicable";
  manufacturedOn: string | null;
  supplierId: number | null;
  sourceDocumentTypeId: number | null;
  sourceDocumentId: number | null;
  receivedOn: string | null;
  receiptUnitCost: string | null;
  lotStatus: "available" | "quarantined" | "expired" | "recalled" | "consumed";
  holdReasonId: number | null;
  priority: number;
  qtyOnHand: string;
  movements: StockMovementRow[];
}

/** POST /stock-lots/:id/hold body (HoldStockLotDto). */
export interface HoldStockLotInput {
  holdReasonId?: number;
  reason?: string;
}

/** POST /stock-lots/:id/release body (ReleaseStockLotDto). */
export interface ReleaseStockLotInput {
  reason?: string;
}

/** GET /inventory/expiry-dashboard row -- StockQueryService.expiryDashboard's flat, soonest-first
 *  shape (not the api-plan doc's 3-array-of-buckets shape -- see that method's header comment). */
export interface ExpiryDashboardRow {
  stockLotId: number;
  itemId: number;
  itemName: string;
  batchNo: string | null;
  expiryDate: string;
  lotStatus: "available" | "quarantined" | "expired" | "recalled" | "consumed";
  qtyOnHand: string;
  daysToExpiry: number;
  bucket: "expired" | "30" | "60" | "90";
}

export interface ExpiryDashboardResult {
  data: ExpiryDashboardRow[];
  meta: { asOfDate: string };
}

// ---------------------------------------------------------------------------------------------
// Inventory -- stock adjustments
// ---------------------------------------------------------------------------------------------
export interface StockAdjustmentLineInput {
  itemId: number;
  stockLotId: number;
  qty: string;
  unitCost?: string;
  notes?: string;
}

export interface CreateStockAdjustmentInput {
  direction: "increase" | "decrease";
  adjustmentReasonId: number;
  documentDate: string;
  updateAvgCost?: boolean;
  notes?: string;
  lines: StockAdjustmentLineInput[];
}

export interface StockAdjustmentLineRow {
  lineId: number;
  itemId: number;
  stockLotId: number;
  qty: string;
  unitCost: string;
  costAmount: string;
  notes: string | null;
}

export interface StockAdjustmentRow {
  stockAdjustmentId: number;
  docNumber: string;
  status: "draft" | "confirmed" | "posted" | "cancelled" | "reversed";
  documentDate: string;
  postingDate: string;
  direction: "increase" | "decrease";
  adjustmentReasonId: number;
  totalQty: string;
  totalCostAmount: string;
  updateAvgCost: boolean;
  requiresApproval: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
  postedAt: string | null;
  lines?: StockAdjustmentLineRow[];
}

// ---------------------------------------------------------------------------------------------
// Inventory -- stock takes (physical counts)
//
// Status lifecycle (mirrors packages/db/schema/inventory.ts's stockTakes doc comment): draft
// (header only) -> counting (count sheet generated, staff entering counts) -> reviewed (variance
// turned into adjustment(s), or explicitly zero everywhere) -> closed (terminal). `cancelled` is
// reserved for a future /cancel endpoint this frontend has nothing to call yet -- no cancel action
// is offered anywhere below.
// ---------------------------------------------------------------------------------------------
export type StockTakeStatus = "draft" | "counting" | "reviewed" | "closed" | "cancelled";

/** POST /stock-takes body. `scopeCategoryId` is deliberately NOT exposed here -- `item_category`
 *  doesn't exist yet in the backend package (its own DTO comment documents the same deferral), so
 *  there is no lookup this frontend could offer for it. */
export interface CreateStockTakeInput {
  documentDate: string;
  scopeItemId?: number;
  notes?: string;
}

/** GET /stock-takes row shape, and the header portion of GET /stock-takes/:id -- the raw
 *  `stock_take` row (packages/db/schema/inventory.ts), camelCase per column. Only the columns this
 *  frontend actually reads are typed; the rest of the audit/doc pack (createdBy, rowVersion, etc.)
 *  is a real response field too but nothing here consumes it. */
export interface StockTakeRow {
  stockTakeId: number;
  docNumber: string;
  status: StockTakeStatus;
  documentDate: string;
  postingDate: string;
  scopeItemId: number | null;
  scopeCategoryId: number | null;
  notes: string | null;
  countSheetGeneratedAt: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  closedBy: number | null;
  closedAt: string | null;
  increaseAdjustmentId: number | null;
  decreaseAdjustmentId: number | null;
}

/** A `stock_take_line` row as returned inside GET /stock-takes/:id. `qtyVariance` is a DB-generated
 *  column (`qtyCounted - qtySystem`), NULL until the line is counted. */
export interface StockTakeLineRow {
  lineId: number;
  lineNo: number;
  itemId: number;
  stockLotId: number;
  qtySystem: string;
  qtyCounted: string | null;
  qtyVariance: string | null;
  unitCostSnapshot: string;
  capturedBatchNo: string | null;
  capturedExpiryDate: string | null;
  countedBy: number | null;
  countedAt: string | null;
  adjustmentLineId: number | null;
  notes: string | null;
}

export interface StockTakeDetail extends StockTakeRow {
  lines: StockTakeLineRow[];
}

export interface StockTakeListResult {
  data: StockTakeRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
}

/** PUT /stock-takes/:id/lines line input. Matched server-side by (itemId, stockLotId) against the
 *  frozen count sheet -- there is no lot-less counting in this module. Submitting a subset of the
 *  sheet's lines is fine; the endpoint is callable repeatedly (each call just overwrites whichever
 *  lines it includes), which is what lets a bulk-save button submit only the rows the user actually
 *  typed a count into. */
export interface RecordStockTakeCountLineInput {
  itemId: number;
  stockLotId: number;
  qtyCounted: string;
  capturedBatchNo?: string;
  capturedExpiryDate?: string;
  notes?: string;
}

export interface StockTakeVarianceTotals {
  totalLines: number;
  countedLines: number;
  pendingLines: number;
  varianceLines: number;
  netCostImpact: string;
}

/** PUT /stock-takes/:id/lines response -- summary only (not the full line set), matching what the
 *  service actually returns. */
export interface RecordStockTakeCountsResult {
  acceptedCount: number;
  varianceSummary: StockTakeVarianceTotals;
}

/** GET /stock-takes/:id/variance line shape -- same fields as `StockTakeLineRow`'s count columns
 *  plus a computed `costImpact` (signed: positive = found more than expected) that the plain
 *  GET /stock-takes/:id line rows don't carry. */
export interface StockTakeVarianceLine {
  lineId: number;
  itemId: number;
  stockLotId: number;
  qtySystem: string;
  qtyCounted: string | null;
  qtyVariance: string | null;
  unitCostSnapshot: string;
  costImpact: string | null;
}

export interface StockTakeVarianceResult {
  lines: StockTakeVarianceLine[];
  totals: StockTakeVarianceTotals;
}

/** POST /stock-takes/:id/generate-adjustments body. `adjustmentReasonId` should normally be a
 *  direction `'both'` reason -- a take with variance in both directions produces one increase AND
 *  one decrease document sharing this same reason id (see the service's own doc comment). */
export interface GenerateStockTakeAdjustmentsInput {
  adjustmentReasonId: number;
  postingDate?: string;
  notes?: string;
}

export interface GenerateStockTakeAdjustmentsResult {
  stockTake: StockTakeDetail;
  increaseAdjustment: StockAdjustmentRow | null;
  decreaseAdjustment: StockAdjustmentRow | null;
}

// ---------------------------------------------------------------------------------------------
// Purchasing
// ---------------------------------------------------------------------------------------------
export interface SupplierRow {
  supplierId: number;
  code: string;
  name: string;
  nameUr: string | null;
  glAccountId: number;
  ntnNo: string | null;
  strnNo: string | null;
  cnicNo: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  creditDays: number | null;
  leadTimeDays: number | null;
  specialInstructions: string | null;
  isActive: boolean;
}

export interface CreateSupplierInput {
  name: string;
  code?: string;
  nameUr?: string;
  ntnNo?: string;
  strnNo?: string;
  cnicNo?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  creditDays?: number;
  leadTimeDays?: number;
  specialInstructions?: string;
}

/** PATCH /suppliers/:id -- every field optional (server rejects an empty body), never
 *  `glAccountId`/`isActive` (see UpdateSupplierSchema's doc comment on the backend). */
export type UpdateSupplierInput = Partial<CreateSupplierInput>;

/** One `journal_line` posted against the supplier's own GL control account, joined to its
 *  parent `journal_entry`, plus the running balance SupplierService.getLedger folds in. */
export interface SupplierLedgerLineRow {
  journalLineId: number;
  lineNo: number;
  debitAmount: string;
  creditAmount: string;
  legRole: string;
  memo: string | null;
  journalEntryId: number;
  entryNo: string;
  entryDate: string;
  documentTypeCode: string;
  sourceDocumentId: number | null;
  description: string | null;
  status: string;
  /** Running balance after this line (credit-minus-debit fold; see backend doc comment). */
  balance: string;
}

export interface SupplierLedgerResult {
  supplierId: number;
  glAccountId: number;
  openingBalance: string;
  lines: SupplierLedgerLineRow[];
  closingBalance: string;
  offset: number;
  limit: number;
  total: number;
}

export interface PurchaseInvoiceLineInput {
  itemId: number;
  qtyPack: string;
  qtyLoose?: string;
  qtyBonus?: string;
  unitPurchasePrice: string;
  netRate?: string;
  unitSalePrice?: string;
  batchNo?: string;
  expiryDate?: string;
  expiryStatus?: "known" | "unknown" | "not_applicable";
  discountPercent?: string;
}

export interface CreatePurchaseInvoiceInput {
  supplierId: number;
  purchaseCategoryId?: number;
  supplierInvoiceNo?: string;
  documentDate: string;
  costBasis?: "net_rate" | "gross_price";
  lines: PurchaseInvoiceLineInput[];
  notes?: string;
}

export interface PurchaseInvoiceRow {
  purchaseInvoiceId: number;
  docNumber: string;
  status: string;
  documentDate: string;
  supplierId: number;
  supplierInvoiceNo: string | null;
  grossAmount: string;
  lineDiscountAmount: string;
  netAmount: string;
  invoiceTotal: string;
  paidAmount: string;
  balanceAmount: string;
  costBasis: "net_rate" | "gross_price";
  totalQty: string;
  journalEntryId: number | null;
}

export interface PurchaseInvoiceLineRow {
  purchaseInvoiceLineId: number;
  lineNo: number;
  itemId: number;
  stockLotId: number;
  qtyPack: string;
  qtyLoose: string;
  qtyBonus: string;
  packUnitsAtTxn: number;
  qtyBase: string;
  unitPurchasePrice: string;
  netRate: string;
  unitCostIn: string;
  lineGrossAmount: string;
  lineDiscountAmount: string;
  lineNetAmount: string;
  avgCostBefore: string;
  avgCostAfter: string;
  batchNoCaptured: string | null;
  expiryDateCaptured: string | null;
}

export interface GetPurchaseInvoiceResult {
  purchaseInvoice: PurchaseInvoiceRow;
  lines: PurchaseInvoiceLineRow[];
}

export interface CreatePurchaseInvoiceResult {
  purchaseInvoice: PurchaseInvoiceRow;
  lines: PurchaseInvoiceLineRow[];
  journalEntryId: number;
  newAvgCosts: { itemId: number; avgCostBefore: string; avgCostAfter: string }[];
}

// ---------------------------------------------------------------------------------------------
// Purchasing -- purchase orders (commitment/intent documents; never touch stock or the GL, see
// purchase-order.dto.ts's header comment in the sibling `rebuild` repo). Two independent status
// axes on every row: `status` (docColumns() pack -- draft/confirmed/posted/cancelled/reversed;
// approve moves draft -> confirmed, the schema's real stand-in for "approved") and `orderStatus`
// (the PO-specific receiving-progress axis -- open/partial/received/closed/cancelled).
// ---------------------------------------------------------------------------------------------
export interface PurchaseOrderLineInput {
  itemId: number;
  /** Loose/base units committed to -- no pack/bonus breakdown (purchase-invoice-only concept). */
  qtyOrdered: string;
  /** Per PACK, matching purchase_order_line.unit_price. */
  unitPrice: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: number;
  documentDate: string;
  expectedDate?: string;
  lines: PurchaseOrderLineInput[];
  notes?: string;
}

export interface PurchaseOrderRow {
  purchaseOrderId: number;
  docNumber: string;
  status: "draft" | "confirmed" | "posted" | "cancelled" | "reversed";
  documentDate: string;
  postingDate: string;
  supplierId: number;
  expectedDate: string | null;
  orderStatus: "open" | "partial" | "received" | "closed" | "cancelled";
  totalAmount: string;
  notes: string | null;
  createdBy: number | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  cancelReasonId: number | null;
}

export interface PurchaseOrderLineRow {
  purchaseOrderLineId: number;
  lineNo: number;
  itemId: number;
  qtyOrdered: string;
  qtyReceived: string;
  qtyOutstanding: string;
  unitPrice: string | null;
  expectedDate: string | null;
}

/** Shared shape for GET /purchase-orders/:id and the POST create/approve/close/cancel
 *  responses -- every mutating action on this service returns `this.getById(...)` (see
 *  purchase-order.service.ts), so one result type covers all of them. */
export interface GetPurchaseOrderResult {
  purchaseOrder: PurchaseOrderRow;
  lines: PurchaseOrderLineRow[];
}

// ---------------------------------------------------------------------------------------------
// Purchasing -- purchase returns (reverse-direction sibling of a purchase invoice; posts stock
// OUT of a named lot and reverses the invoice's own AP/Inventory GL legs -- see
// purchase-return.service.ts's header comment in the sibling `rebuild` repo). Create+post happen
// in one transaction, same as a purchase invoice -- no separate draft/approve/post workflow.
// ---------------------------------------------------------------------------------------------
export interface PurchaseReturnLineInput {
  itemId: number;
  /** Which stock lot the returned goods come out of -- not a fresh lot, must match a line
   *  actually received on `purchaseInvoiceId`. */
  stockLotId: number;
  returnQty: string;
  /** Defaults server-side to the original invoice line's own unit_cost_in when omitted. */
  unitCost?: string;
}

export interface CreatePurchaseReturnInput {
  supplierId: number;
  /** The original goods-receipt document being returned against; must belong to `supplierId`
   *  and be posted. */
  purchaseInvoiceId: number;
  /** No return category is marked default in the seed this increment, so omitting this is
   *  expected to 422 -- the form always sends an explicit isReturn-flagged category. */
  purchaseCategoryId?: number;
  /** Soft ref -> option_item list `purchase_return_reason`; not validated server-side this
   *  increment, and there is no seeded lookup for it yet, so this client never sends it. */
  reasonId?: number;
  documentDate: string;
  lines: PurchaseReturnLineInput[];
  notes?: string;
}

export interface PurchaseReturnRow {
  purchaseReturnId: number;
  docNumber: string;
  status: "draft" | "confirmed" | "posted" | "cancelled" | "reversed";
  documentDate: string;
  postingDate: string;
  supplierId: number;
  purchaseInvoiceId: number | null;
  purchaseCategoryId: number;
  reasonId: number | null;
  grossAmount: string;
  lineDiscountAmount: string;
  netAmount: string;
  salesTaxAmount: string;
  returnTotal: string;
  totalQty: string;
  notes: string | null;
  journalEntryId: number | null;
}

export interface PurchaseReturnLineRow {
  purchaseReturnLineId: number;
  purchaseReturnId: number;
  purchaseInvoiceLineId: number | null;
  lineNo: number;
  itemId: number;
  stockLotId: number;
  qtyPack: string;
  qtyLoose: string;
  qtyBonus: string;
  packUnitsAtTxn: number;
  qtyBase: string;
  unitPurchasePrice: string;
  netRate: string;
  unitCostIn: string;
  discountPercent: string;
  lineGrossAmount: string;
  lineDiscountAmount: string;
  lineNetAmount: string;
  avgCostBefore: string;
  avgCostAfter: string;
  batchNoCaptured: string | null;
  expiryDateCaptured: string | null;
}

/** Shared shape for GET /purchase-returns/:id and the POST create response (createAndPost
 *  returns { purchaseReturn, lines, journalEntryId } -- one extra field over getById). */
export interface GetPurchaseReturnResult {
  purchaseReturn: PurchaseReturnRow;
  lines: PurchaseReturnLineRow[];
}

export interface CreatePurchaseReturnResult {
  purchaseReturn: PurchaseReturnRow;
  lines: PurchaseReturnLineRow[];
  journalEntryId: number;
}

export interface PurchaseReturnListResult {
  purchaseReturns: PurchaseReturnRow[];
  offset: number;
  limit: number;
}

// ---------------------------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------------------------
export interface CustomerRow {
  customerId: number;
  code: string;
  name: string;
  nameUr: string | null;
  glAccountId: number;
  isWalkIn: boolean;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  ntnNo: string | null;
  /** Column exists on `customer` but is not settable via Create/UpdateCustomerSchema -- always
   *  null in practice today, see customer.dto.ts's field lists. Kept here for parity with the
   *  raw row shape (CustomerRow = typeof customers.$inferSelect on the backend). */
  strnNo: string | null;
  cnicNo: string | null;
  creditLimitAmount: string | null;
  creditDays: number | null;
  isActive: boolean;
}

export interface CreateCustomerInput {
  code: string;
  name: string;
  nameUr?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  ntnNo?: string;
  cnicNo?: string;
  creditLimitAmount?: string;
  creditDays?: number;
}

/** PATCH /customers/:id -- every field optional (server rejects an empty body), never
 *  `glAccountId`/`isActive` (see UpdateCustomerSchema's doc comment on the backend). */
export type UpdateCustomerInput = Partial<CreateCustomerInput>;

/** One `journal_line` posted against the customer's own GL control account, joined to its
 *  parent `journal_entry`, plus the running balance CustomersService.getLedger folds in. */
export interface CustomerLedgerLineRow {
  journalLineId: number;
  lineNo: number;
  debitAmount: string;
  creditAmount: string;
  legRole: string;
  memo: string | null;
  journalEntryId: number;
  entryNo: string;
  entryDate: string;
  documentTypeCode: string;
  sourceDocumentId: number | null;
  description: string | null;
  status: string;
  /** Running balance after this line (debit-minus-credit fold; asset/debit-normal, the mirror
   *  image of SupplierLedgerLineRow's balance -- see backend doc comment). */
  balance: string;
}

export interface CustomerLedgerResult {
  customerId: number;
  glAccountId: number;
  openingBalance: string;
  lines: CustomerLedgerLineRow[];
  closingBalance: string;
  offset: number;
  limit: number;
  total: number;
}

export interface SaleLineInput {
  itemId: number;
  qty: string;
  unitSalePrice?: string;
  /** U-062/D18/R7 (Wave 8): one free-text field, sent only when the cashier actually typed
   *  something -- POSCheckoutPage.svelte shows this input for any cart line whose item is
   *  `isControlledDrug`, but the backend accepts (and never requires) it on any line. */
  dispensingNote?: string;
}

export interface SalePaymentInput {
  paymentMethodId: number;
  amount: string;
  referenceNo?: string;
}

export interface CreateSaleInvoiceInput {
  customerId?: number;
  saleCategoryId?: number;
  documentDate: string;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
  notes?: string;
}

export interface SaleInvoiceRow {
  saleInvoiceId: number;
  docNumber: string;
  status: string;
  documentDate: string;
  customerId: number;
  grossAmount: string;
  netAmount: string;
  salesTaxAmount: string;
  invoiceTotal: string;
  paidAmount: string;
  changeAmount: string;
  balanceAmount: string;
  totalQty: string;
  cogsAmount: string;
  journalEntryId: number | null;
}

export interface SaleInvoiceLineRow {
  saleInvoiceLineId: number;
  lineNo: number;
  itemId: number;
  stockLotId: number;
  qtyBase: string;
  unitSalePrice: string;
  lineGrossAmount: string;
  lineNetAmount: string;
  unitCost: string;
  lineCostAmount: string;
  lineMarginAmount: string;
  expiryAtSale: string | null;
  /** U-062/D18/R7 (Wave 8) -- null unless the cashier entered one for this line. */
  dispensingNote: string | null;
}

export interface SaleInvoicePaymentRow {
  saleInvoicePaymentId: number;
  paymentMethodId: number;
  amount: string;
  sequenceNo: number;
}

export interface FefoAllocationRow {
  stockLotId: number;
  qty: string;
  batchNo: string | null;
  expiryDate: string | null;
  itemId: number;
}

export interface CreateSaleInvoiceResult {
  saleInvoice: SaleInvoiceRow;
  lines: SaleInvoiceLineRow[];
  allocations: FefoAllocationRow[];
  changeAmount: string;
  journalEntryId: number;
}

export interface GetSaleInvoiceResult {
  saleInvoice: SaleInvoiceRow;
  lines: SaleInvoiceLineRow[];
  payments: SaleInvoicePaymentRow[];
}

// ---------------------------------------------------------------------------------------------
// Sale returns -- mirrors sale-return.dto.ts (rebuild/apps/api). Create+post in one transaction,
// like a sale invoice; no per-line stockLotId/unitSalePrice on input -- the backend resolves
// which of the referenced invoice's own lines/lots each returnQty slices from, and freezes cost
// at the original line's own unit_cost (see sale-returns.service.ts's header comment).
// ---------------------------------------------------------------------------------------------
export interface SaleReturnLineInput {
  itemId: number;
  returnQty: string;
}

export interface CreateSaleReturnInput {
  customerId: number;
  saleInvoiceId: number;
  documentDate: string;
  lines: SaleReturnLineInput[];
  notes?: string;
}

export interface SaleReturnRow {
  saleReturnId: number;
  docNumber: string;
  status: string;
  documentDate: string;
  saleInvoiceId: number | null;
  customerId: number;
  grossAmount: string;
  netAmount: string;
  salesTaxAmount: string;
  returnTotal: string;
  cogsAmount: string;
  journalEntryId: number | null;
}

export interface SaleReturnLineRow {
  saleReturnLineId: number;
  lineNo: number;
  itemId: number;
  stockLotId: number;
  saleInvoiceLineId: number | null;
  costBasis: string;
  qtyBase: string;
  unitSalePrice: string;
  lineGrossAmount: string;
  lineNetAmount: string;
  unitCost: string;
  lineCostAmount: string;
  lineMarginAmount: string;
  expiryAtSale: string | null;
}

export interface CreateSaleReturnResult {
  saleReturn: SaleReturnRow;
  lines: SaleReturnLineRow[];
  journalEntryId: number;
}

export interface GetSaleReturnResult {
  saleReturn: SaleReturnRow;
  lines: SaleReturnLineRow[];
}

// ---------------------------------------------------------------------------------------------
// List envelopes -- each list endpoint's actual (slightly inconsistent across modules) shape.
// ---------------------------------------------------------------------------------------------
export interface StockListResult {
  data: StockRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
}
export interface StockMovementListResult {
  data: StockMovementRow[];
  meta: { limit: number; hasMore: boolean; nextAfterId: number | null };
}
export interface StockLotListResult {
  data: StockLotRow[];
  meta: { limit: number; offset: number };
}
export interface StockAdjustmentListResult {
  data: StockAdjustmentRow[];
  meta: { limit: number; offset: number };
}
export interface SupplierListResult {
  suppliers: SupplierRow[];
  offset: number;
  limit: number;
}
export interface PurchaseInvoiceListResult {
  purchaseInvoices: PurchaseInvoiceRow[];
  offset: number;
  limit: number;
}
export interface PurchaseOrderListResult {
  purchaseOrders: PurchaseOrderRow[];
  offset: number;
  limit: number;
}
export interface CustomerListResult {
  customers: CustomerRow[];
  limit: number;
  offset: number;
}
export interface SaleInvoiceListResult {
  saleInvoices: SaleInvoiceRow[];
  limit: number;
  offset: number;
}
export interface SaleReturnListResult {
  saleReturns: SaleReturnRow[];
  limit: number;
  offset: number;
}
export interface ItemListResult {
  items: ItemSummary[];
  offset: number;
  limit: number;
}

// ---------------------------------------------------------------------------------------------
// Accounting -- chart of accounts, journal entries / manual vouchers, cash & bank
// (mirrors rebuild/apps/api/src/modules/accounting -- the source of truth). Two DIFFERENT line
// shapes exist server-side and this file keeps them distinct, not aliased to each other:
//  - `GlLedgerLine` (LedgerQueryService, shared by GET /gl/accounts/:id/ledger and
//    GET /cash-bank/book): a journal_line INNER JOINed to its parent journal_entry, with the
//    signed amounts folded into named `debit`/`credit` fields and a computed `runningBalance`.
//  - `JournalEntryLineRow` (JournalEntryService#getById/createManualVoucher/reverse): a PLAIN
//    `journal_line` table row, unjoined -- field names are `debitAmount`/`creditAmount` (not
//    `debit`/`credit`), there is no `runningBalance`, and there is no per-line entryNo/entryDate/
//    documentTypeCode/description (those live on the parent `entry` object instead, not on each
//    line) -- confirmed by reading ledger-query.service.ts vs journal-entry.service.ts directly,
//    NOT the same shape "minus runningBalance" a first read of the endpoint list might suggest.
// ---------------------------------------------------------------------------------------------

// ---- GL accounts (chart of accounts) -----------------------------------------------------
export interface GlAccountTreeLeaf {
  glAccountId: number;
  code: string;
  name: string;
  accountNature: string;
  normalBalance: "debit" | "credit";
  isContra: boolean;
  isPostable: boolean;
  isActive: boolean;
}
export interface GlAccountTreeSub {
  glAccountSubId: number;
  code: string;
  name: string;
  subledgerKind: string | null;
  isControlAccount: boolean;
  accounts: GlAccountTreeLeaf[];
}
export interface GlAccountTreeCategory {
  glAccountCategoryId: number;
  code: string;
  name: string;
  statementSection: string;
  subs: GlAccountTreeSub[];
}
export interface GlAccountTreeMain {
  glAccountMainId: number;
  code: string;
  name: string;
  accountNature: string;
  normalBalance: "debit" | "credit";
  categories: GlAccountTreeCategory[];
}
export interface GlAccountTreeResult {
  data: GlAccountTreeMain[];
}

/** GET /gl/accounts (flat, no `tree` param) row -- one leaf account pre-joined to its own
 *  sub/category/main ancestry (gl-account.service.ts#getFlat). No `limit`/`offset` -- this
 *  endpoint returns every leaf for the tenant, unpaginated (confirmed: no such query params on
 *  ListGlAccountsQuerySchema). */
export interface GlAccountFlatRow {
  glAccountId: number;
  code: string;
  name: string;
  nameUr: string | null;
  accountNature: string;
  normalBalance: "debit" | "credit";
  isContra: boolean;
  isPostable: boolean;
  isSystem: boolean;
  isActive: boolean;
  glAccountSubId: number;
  subCode: string;
  subName: string;
  subledgerKind: string | null;
  glAccountCategoryId: number;
  categoryCode: string;
  categoryName: string;
  glAccountMainId: number;
  mainCode: string;
  mainName: string;
}
export interface GlAccountListResult {
  data: GlAccountFlatRow[];
}

/** GET /gl/accounts/:id -- each of the 4 objects is the FULL raw table row for its level
 *  (gl-account.service.ts#getById selects `glAccounts`/`glAccountSubs`/`glAccountCategories`/
 *  `glAccountMains` wholesale, not a curated projection) -- only the fields this frontend
 *  actually reads are typed below; extra real response fields (tenantId, sortOrder, ...) exist
 *  but are simply not accessed. */
export interface GetGlAccountResult {
  account: GlAccountTreeLeaf & { glAccountSubId: number };
  sub: { glAccountSubId: number; code: string; name: string; subledgerKind: string | null; isControlAccount: boolean };
  category: { glAccountCategoryId: number; code: string; name: string; statementSection: string };
  main: { glAccountMainId: number; code: string; name: string; accountNature: string; normalBalance: "debit" | "credit" };
}

/** One `journal_line` INNER JOINed to its parent `journal_entry` with a computed running
 *  balance (LedgerQueryService.getAccountLedger) -- shared verbatim by GET /gl/accounts/:id/ledger
 *  and GET /cash-bank/book. */
export interface GlLedgerLine {
  journalLineId: number;
  lineNo: number;
  journalEntryId: number;
  entryNo: string;
  entryDate: string;
  postedAt: string | null;
  documentTypeCode: string;
  sourceDocumentId: number | null;
  description: string | null;
  memo: string | null;
  legRole: string;
  supplierId: number | null;
  customerId: number | null;
  debit: string;
  credit: string;
  runningBalance: string;
}
export interface GlAccountLedgerResult {
  account: { glAccountId: number; code: string; name: string; normalBalance: "debit" | "credit" };
  openingBalance: string;
  lines: GlLedgerLine[];
  closingBalance: string;
  offset: number;
  limit: number;
  total: number;
}

// ---- Journal entries / manual vouchers (JV/CP/CR/BP/BR) --------------------------------------
/** Fields common to the list row and the `entry`/`original`/`reversal` objects returned by the
 *  detail/create/reverse endpoints -- all of these are the raw `journal_entry` table row
 *  (journal-entry.service.ts selects it wholesale throughout), so `JournalEntryRow` below is a
 *  safe superset for every one of those call sites even though a couple of extra real columns
 *  (tenantId, branchId, reversalSeq, postedBy, reversalReason, ...) go untyped here. */
export interface JournalEntryRow {
  journalEntryId: number;
  entryNo: string;
  entryDate: string;
  documentTypeCode: string;
  sourceDocumentId: number | null;
  description: string;
  totalDebit: string;
  totalCredit: string;
  lineCount: number;
  status: "draft" | "posted" | "reversed";
  postedAt: string | null;
  reversalOfJournalId: number | null;
}
export interface JournalEntryListResult {
  journalEntries: JournalEntryRow[];
  offset: number;
  limit: number;
}

/** A raw `journal_line` table row, UNJOINED -- returned by GET /gl/journal-entries/:id,
 *  POST /gl/journal-entries, POST /gl/journal-entries/:id/reverse, and POST /cash-bank/transfers.
 *  See this section's header comment: field names are `debitAmount`/`creditAmount` (not
 *  `debit`/`credit`), and there is no entryNo/entryDate/documentTypeCode/description here --
 *  those live only on the sibling `entry` object each of those responses also returns. */
export interface JournalEntryLineRow {
  journalLineId: number;
  journalEntryId: number;
  lineNo: number;
  glAccountId: number;
  debitAmount: string;
  creditAmount: string;
  analysisAccountId: number | null;
  supplierId: number | null;
  customerId: number | null;
  itemId: number | null;
  legRole: string;
  memo: string | null;
}

export interface ManualVoucherInfo {
  manualVoucherId: number;
  voucherCategoryId: number;
  narration: string;
  categoryCode: string;
  categoryName: string;
}

export interface GetJournalEntryResult {
  entry: JournalEntryRow;
  lines: JournalEntryLineRow[];
  manualVoucher: ManualVoucherInfo | null;
}

export interface CreateJournalEntryLineInput {
  glAccountId: number;
  /** Exactly one of debit/credit per line -- never both, never neither (server re-validates). */
  debit?: string;
  credit?: string;
  supplierId?: number;
  customerId?: number;
  memo?: string;
}
export interface CreateJournalEntryInput {
  voucherCategoryId: number;
  documentDate: string;
  postingDate: string;
  narration: string;
  lines: CreateJournalEntryLineInput[];
}
/** Always carries a non-null `manualVoucher` in practice (POST /gl/journal-entries always creates
 *  one) -- typed nullable only for structural parity with `GetJournalEntryResult`. */
export interface CreateJournalEntryResult {
  entry: JournalEntryRow;
  lines: JournalEntryLineRow[];
  manualVoucher: ManualVoucherInfo | null;
}

export interface ReverseJournalEntryInput {
  reason: string;
  postingDate: string;
}
export interface ReverseJournalEntryResult {
  original: JournalEntryRow;
  reversal: JournalEntryRow;
  reversalLines: JournalEntryLineRow[];
}

/** GET /settings/options/accounting.voucher_category row meta (seed.ts's VOUCHER_CATEGORIES).
 *  `requiredCashBankAccountKind` is an ARRAY of kinds (e.g. `["cash_drawer","petty_cash"]` for
 *  CP/CR, `["bank"]` for BP/BR), not a single kind -- JV's is `null` (no cash/bank leg required
 *  at all). */
export interface VoucherCategoryMeta {
  headerSide: "debit" | "credit" | null;
  detailSide: "debit" | "credit" | null;
  requiredCashBankAccountKind: string[] | null;
}
export type VoucherCategoryOption = Omit<OptionValueResponse, "meta"> & {
  meta: VoucherCategoryMeta | null;
};

// ---- Cash & bank accounts ----------------------------------------------------------------
export type CashBankAccountKind = "cash_drawer" | "petty_cash" | "bank" | "mobile_wallet" | "card_settlement";

export interface CashBankAccountRow {
  cashBankAccountId: number;
  glAccountId: number;
  accountKind: CashBankAccountKind;
  bankName: string | null;
  branchName: string | null;
  accountNo: string | null;
  iban: string | null;
  openingBalanceAmount: string;
  allowNegative: boolean;
  isDefaultForSales: boolean;
  isActive: boolean;
}
export interface CashBankAccountListResult {
  cashBankAccounts: CashBankAccountRow[];
  offset: number;
  limit: number;
}
/** POST /cash-bank-accounts body -- `openingBalanceAmount` is deliberately not a field here; the
 *  server always forces it to "0.00" regardless of anything sent (cash-bank.service.ts#create). */
export interface CreateCashBankAccountInput {
  glAccountId: number;
  accountKind: CashBankAccountKind;
  bankName?: string;
  branchName?: string;
  accountNo?: string;
  iban?: string;
  allowNegative?: boolean;
  isDefaultForSales?: boolean;
}

/** GET /cash-bank/book -- NOT the same shape as `GlAccountLedgerResult`: cash-bank.service.ts#book
 *  spreads the ledger result next to flat `cashBankAccountId`/`glAccountId` fields, there is no
 *  nested `account: { code, name, normalBalance }` object here (the caller already has the
 *  account's code/name from the cash-bank-accounts list it fetched to build this view). */
export interface CashBankBookResult {
  cashBankAccountId: number;
  glAccountId: number;
  openingBalance: string;
  lines: GlLedgerLine[];
  closingBalance: string;
  offset: number;
  limit: number;
  total: number;
}

export interface CreateCashBankTransferInput {
  fromCashBankAccountId: number;
  toCashBankAccountId: number;
  amount: string;
  transferDate: string;
  memo?: string;
}
/** `from`/`to` are NOT full `CashBankAccountRow`s -- cash-bank.service.ts#transfer's own
 *  `assertActiveAccount` helper selects only these 3 columns. */
export interface CashBankTransferParty {
  cashBankAccountId: number;
  glAccountId: number;
  isActive: boolean;
}
export interface CreateCashBankTransferResult {
  entry: JournalEntryRow;
  lines: JournalEntryLineRow[];
  from: CashBankTransferParty;
  to: CashBankTransferParty;
  amount: string;
}

// ---------------------------------------------------------------------------------------------
// Payments (module `payments` -- src/lib/api/payments.ts). Note: `PaymentMethod` above (line
// ~200) is the pre-existing lightweight shape `lookupsApi.paymentMethods()` uses for picker
// dropdowns elsewhere (invoices/sale forms); `PaymentMethodRow` here is the fuller admin-CRUD
// shape confirmed live against GET/POST/PATCH /payment-methods -- deliberately a separate type,
// not a rename of the existing one, to avoid touching call sites outside this task's scope.
// ---------------------------------------------------------------------------------------------
export interface PaymentMethodRow {
  paymentMethodId: number;
  code: string;
  name: string;
  description: string | null;
  directionAllowed: "in" | "out" | "both";
  defaultCashBankAccountId: number | null;
  requiresReference: boolean;
  requiresBankAccount: boolean;
  requiresChequeDetails: boolean;
  settlementLagDays: number;
  isCounterMethod: boolean;
  minPermissionId: number | null;
  isDefault: boolean;
  isEnabled: boolean;
  sortOrder: number;
}
export interface PaymentMethodListResult {
  paymentMethods: PaymentMethodRow[];
}
export interface CreatePaymentMethodInput {
  code: string;
  name: string;
  description?: string;
  directionAllowed: "in" | "out" | "both";
  defaultCashBankAccountId?: number;
  requiresReference: boolean;
  requiresBankAccount: boolean;
  requiresChequeDetails: boolean;
  settlementLagDays: number;
  isCounterMethod: boolean;
  minPermissionId?: number;
  isDefault: boolean;
  isEnabled: boolean;
  sortOrder: number;
}
/** PATCH /payment-methods/:id -- every field optional; `code` is immutable via this endpoint
 *  (payment-method.dto.ts's own doc comment -- it's what doc-number/lookup keys off). */
export type UpdatePaymentMethodInput = Partial<Omit<CreatePaymentMethodInput, "code">>;

export type PaymentDirection = "out" | "in";
export type PaymentPartyKind = "supplier" | "customer" | "employee" | "other";
export type PaymentStatus = "draft" | "confirmed" | "posted" | "cancelled" | "reversed";
/** Stored/reported only this wave -- `createAndPost` never auto-allocates regardless of this
 *  value (confirmed against payment.service.ts's own createAndPost: only an explicit
 *  `allocations` array is ever applied). The UI derives this from what the user actually did
 *  ("specific" if allocations were picked, "on_account" otherwise) rather than offering
 *  "oldest_first" as a real auto-allocate choice. */
export type PaymentAllocationMode = "specific" | "oldest_first" | "on_account";

export interface PaymentRow {
  paymentId: number;
  branchId: number;
  docNumber: string;
  documentDate: string;
  postingDate: string;
  fiscalPeriodId: number;
  status: PaymentStatus;
  postedAt: string | null;
  postedBy: number | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  cancelReasonId: number | null;
  reversalOfId: number | null;
  notes: string | null;
  direction: PaymentDirection;
  partyKind: PaymentPartyKind;
  supplierId: number | null;
  customerId: number | null;
  otherPartyName: string | null;
  paymentMethodId: number;
  cashBankAccountId: number;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  allocationMode: PaymentAllocationMode;
  referenceNo: string | null;
  chequeNo: string | null;
  chequeDate: string | null;
  chequeStatus: string | null;
  journalEntryId: number | null;
}
export interface PaymentAllocationRow {
  paymentAllocationId: number;
  paymentId: number;
  targetDocumentTypeId: number;
  targetDocumentId: number;
  allocatedAmount: string;
  allocatedAt: string;
  allocatedBy: number | null;
  isAuto: boolean;
  reversedAt: string | null;
  reversalOfId: number | null;
}
export interface PaymentListResult {
  payments: PaymentRow[];
  offset: number;
  limit: number;
}
export interface GetPaymentResult {
  payment: PaymentRow;
  allocations: PaymentAllocationRow[];
}

/** One open document (invoice/return) available to allocate a payment against -- returned by
 *  GET /payments/allocation-candidates (payment.service.ts's `AllocationCandidate`).
 *  `targetDocumentKind` is display-only context; what actually gets sent back on create/allocate
 *  is `targetDocumentTypeId` + `targetDocumentId` verbatim. */
export interface PaymentAllocationCandidate {
  targetDocumentTypeId: number;
  targetDocumentKind: "PURCHASE" | "PURCHASE_RETURN" | "SALE" | "SALE_RETURN";
  targetDocumentId: number;
  docNumber: string;
  documentDate: string;
  totalAmount: string;
  outstandingAmount: string;
}
export interface AllocationCandidatesResult {
  candidates: PaymentAllocationCandidate[];
}

export interface PaymentAllocationInput {
  targetDocumentTypeId: number;
  targetDocumentId: number;
  allocatedAmount: string;
}
/** POST /payments. This wave only supports (direction=out, partyKind=supplier) and
 *  (direction=in, partyKind=customer) -- payment.service.ts's `assertSupportedDirectionParty`
 *  422s anything else as `PAYMENT.UNSUPPORTED_DIRECTION_PARTY`. The UI never constructs the
 *  unsupported combinations (employee/other, or the two crossed pairs), so `partyKind` is
 *  derived from `direction` client-side rather than offered as an independent choice. */
export interface CreatePaymentInput {
  direction: PaymentDirection;
  partyKind: PaymentPartyKind;
  supplierId?: number;
  customerId?: number;
  otherPartyName?: string;
  paymentMethodId: number;
  cashBankAccountId: number;
  amount: string;
  referenceNo?: string;
  chequeNo?: string;
  chequeDate?: string;
  documentDate: string;
  allocationMode?: PaymentAllocationMode;
  allocations?: PaymentAllocationInput[];
  notes?: string;
}
export interface AddPaymentAllocationsInput {
  allocations: PaymentAllocationInput[];
}
export interface CancelPaymentInput {
  cancelReasonId?: number;
  reason?: string;
}
