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
  phone: string | null;
  mobile: string | null;
  email: string | null;
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
  email: string | null;
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
