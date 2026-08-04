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
export interface ItemListResult {
  items: ItemSummary[];
  offset: number;
  limit: number;
}
