// Accounting module: chart of accounts (GL), journal entries / manual vouchers (JV/CP/CR/BP/BR),
// cash & bank accounts + transfers. Mirrors rebuild/apps/api/src/modules/accounting -- see
// types.ts's "Accounting" section header comment for the two distinct journal-line shapes this
// module deals with (GlLedgerLine vs JournalEntryLineRow) before touching either endpoint group.
import { api } from "./client";
import type {
  CashBankAccountListResult,
  CashBankAccountRow,
  CashBankBookResult,
  CreateCashBankAccountInput,
  CreateCashBankTransferInput,
  CreateCashBankTransferResult,
  CreateJournalEntryInput,
  CreateJournalEntryResult,
  GetGlAccountResult,
  GetJournalEntryResult,
  GlAccountLedgerResult,
  GlAccountListResult,
  GlAccountTreeResult,
  JournalEntryListResult,
  ReverseJournalEntryInput,
  ReverseJournalEntryResult,
  VoucherCategoryOption,
} from "./types";

export const accountingApi = {
  // ---- GL accounts (chart of accounts) --------------------------------------------------
  /** The 4-level hierarchy (main > category > sub > leaf accounts) for the tree view. */
  getAccountTree: () => api.get<GlAccountTreeResult>("/gl/accounts", { tree: true }),
  /** Flat, unpaginated leaf-account list, each pre-joined to its own sub/category/main. */
  listAccountsFlat: (params: { isPostable?: boolean; isActive?: boolean; q?: string } = {}) =>
    api.get<GlAccountListResult>("/gl/accounts", params),
  getAccount: (id: number) => api.get<GetGlAccountResult>(`/gl/accounts/${id}`),
  /** NOTE (live-verified against the running dev server): this route requires permission
   *  `gl.ledger:view_ledger`, which is not currently granted to any seeded role (only
   *  `gl.ledger:list`/`gl.ledger:view` are) -- the controller's own comment documents this as a
   *  known gap, so this call 403s for every user until a follow-up seed update adds the grant. */
  getAccountLedger: (id: number, params: { from?: string; to?: string; offset?: number; limit?: number } = {}) =>
    api.get<GlAccountLedgerResult>(`/gl/accounts/${id}/ledger`, params),

  // ---- Journal entries / manual vouchers -------------------------------------------------
  listJournalEntries: (
    params: {
      documentTypeCode?: string;
      status?: "draft" | "posted" | "reversed";
      dateFrom?: string;
      dateTo?: string;
      offset?: number;
      limit?: number;
    } = {},
  ) => api.get<JournalEntryListResult>("/gl/journal-entries", params),
  getJournalEntry: (id: number) => api.get<GetJournalEntryResult>(`/gl/journal-entries/${id}`),
  /** Creates AND posts a manual voucher (JV/CP/CR/BP/BR, chosen by `voucherCategoryId`) in one
   *  transaction -- no separate draft/approve/post workflow. */
  createJournalEntry: (input: CreateJournalEntryInput, idempotencyKey?: string) =>
    api.post<CreateJournalEntryResult>("/gl/journal-entries", input, idempotencyKey),
  /** A posted, non-reversed entry only -- 422 LEDGER.ALREADY_REVERSED / LEDGER.NOT_POSTED /
   *  LEDGER.REVERSAL_UNSUPPORTED (no sourceDocumentId, e.g. a cash/bank transfer) otherwise. */
  reverseJournalEntry: (id: number, input: ReverseJournalEntryInput, idempotencyKey?: string) =>
    api.post<ReverseJournalEntryResult>(`/gl/journal-entries/${id}/reverse`, input, idempotencyKey),

  /** The 5 seeded voucher categories (JV/CP/CR/BP/BR) for the create-voucher dropdown. */
  voucherCategories: () => api.get<VoucherCategoryOption[]>("/settings/options/accounting.voucher_category"),

  // ---- Cash & bank accounts ---------------------------------------------------------------
  listCashBankAccounts: (
    params: { accountKind?: string; isActive?: boolean; offset?: number; limit?: number } = {},
  ) => api.get<CashBankAccountListResult>("/cash-bank-accounts", params),
  getCashBankAccount: (id: number) => api.get<CashBankAccountRow>(`/cash-bank-accounts/${id}`),
  /** `openingBalanceAmount` is intentionally not an accepted input field -- the server always
   *  forces "0.00" server-side regardless of anything sent, so this client never offers it. */
  createCashBankAccount: (input: CreateCashBankAccountInput, idempotencyKey?: string) =>
    api.post<CashBankAccountRow>("/cash-bank-accounts", input, idempotencyKey),
  /** Same running-balance shape as `getAccountLedger`, but flat `cashBankAccountId`/`glAccountId`
   *  fields instead of a nested `account` object -- see `CashBankBookResult`'s doc comment. */
  getCashBankBook: (params: { cashBankAccountId: number; from?: string; to?: string; offset?: number; limit?: number }) =>
    api.get<CashBankBookResult>("/cash-bank/book", params),
  createCashBankTransfer: (input: CreateCashBankTransferInput, idempotencyKey?: string) =>
    api.post<CreateCashBankTransferResult>("/cash-bank/transfers", input, idempotencyKey),
};
