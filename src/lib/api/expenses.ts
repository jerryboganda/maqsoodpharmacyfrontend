// Expenses module: business expense entry (draft -> posted -> reversed lifecycle, or draft ->
// cancelled) plus its category taxonomy. Mirrors rebuild/apps/api/src/modules/expenses -- every
// response shape below is LIVE-VERIFIED (real curl calls against the running dev API, logged in
// against a freshly-created `accountant`-role user, not guessed from the task brief -- a couple of
// shapes differed from the brief, called out in the doc comments that follow).
//
// Rule M (rebuild/CLAUDE.md "Money and quantities"): `amount`/`totalAmount` are decimal STRINGS
// end to end, never numbers.
//
// `cashBankAccountId` on the create/edit form is picked from GET /cash-bank-accounts, fetched
// directly in this file (a small local duplicate of accountingApi.listCashBankAccounts's own
// fetch) rather than imported from the sibling accounting.ts module -- avoids a file-ordering race
// with whichever agent may be creating/editing that file concurrently. The *type*
// (CashBankAccountRow/CashBankAccountListResult) is still imported from the stable, pre-existing
// types.ts -- only the function call is duplicated, per the task brief's own instruction.
import { api } from "./client";
import type { CashBankAccountListResult, CashBankAccountRow } from "./types";

// ---------------------------------------------------------------------------------------------
// Expense categories -- the taxonomy every expense line is coded to; `glAccountId` drives which
// GL account is debited when the parent expense is posted.
// ---------------------------------------------------------------------------------------------
export interface ExpenseCategoryRow {
  expenseCategoryId: number;
  code: string;
  name: string;
  description: string | null;
  glAccountId: number;
  isEnabled: boolean;
  isDefault: boolean;
  /** true for the 6 seeded defaults (Rent/Utilities/Salaries & Wages/Repairs & Maintenance/Office
   *  Supplies/Miscellaneous) -- still editable (name/glAccountId/etc.), just flagged in the UI.
   *  Disabling one already referenced by an expense line 422s EXPENSE_CATEGORY.IN_USE. */
  isSystem: boolean;
  sortOrder: number;
  remarks: string | null;
}

/** GET /expense-categories -- LIVE-VERIFIED SURPRISE: wrapped in `{ expenseCategories: [...] }`,
 *  NOT a bare array as the task brief assumed. GET /expense-categories/:id, POST, and PATCH all
 *  return a bare `ExpenseCategoryRow` (no wrapper) -- only the list endpoint wraps. */
export interface ExpenseCategoryListResult {
  expenseCategories: ExpenseCategoryRow[];
}

export interface CreateExpenseCategoryInput {
  code: string;
  name: string;
  description?: string;
  glAccountId: number;
  isEnabled?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  remarks?: string;
}

/** PATCH /expense-categories/:id -- every field optional; `code` is immutable. LIVE-VERIFIED: the
 *  server doesn't just ignore a `code` in the body, it strips it before validating, so a request
 *  containing ONLY `{ code: "..." }` 422s VALIDATION.FAILED "at least one field must be provided"
 *  -- never send `code` on an update, and don't treat that particular 422 as a code-immutability
 *  error, it's a "you sent nothing else" error. */
export type UpdateExpenseCategoryInput = Partial<Omit<CreateExpenseCategoryInput, "code">>;

// ---------------------------------------------------------------------------------------------
// Expenses (header + lines). Status lifecycle: draft -> posted (Dr each line's expense-category
// GL account / Cr the cash-bank account's GL account) -> reversed, or draft -> cancelled.
// ---------------------------------------------------------------------------------------------
export type ExpenseStatus = "draft" | "posted" | "cancelled" | "reversed";

export interface ExpenseRow {
  expenseId: number;
  docNumber: string;
  /** Full ISO datetime string on the wire (e.g. "2026-08-04T00:00:00.000Z") even though only the
   *  date part is meaningful -- confirmed live, same convention as other doc-date fields
   *  elsewhere in this API. Format with formatDate() for display; never re-send it verbatim as an
   *  edit input, send the plain "YYYY-MM-DD" the user picked instead. */
  expenseDate: string;
  cashBankAccountId: number;
  totalAmount: string;
  description: string | null;
  status: ExpenseStatus;
  journalEntryId: number | null;
  postedAt: string | null;
}

export interface ExpenseLineRow {
  expenseLineId: number;
  lineNo: number;
  expenseCategoryId: number;
  amount: string;
  memo: string | null;
}

export interface ExpenseListResult {
  expenses: ExpenseRow[];
  offset: number;
  limit: number;
}

export interface GetExpenseResult {
  expense: ExpenseRow;
  lines: ExpenseLineRow[];
}

/** POST /expenses/:id/post response -- same `{ expense, lines }` shape as everything else in this
 *  module, plus `journalEntryId` duplicated at the top level (also present on `expense.journalEntryId`). */
export interface PostExpenseResult extends GetExpenseResult {
  journalEntryId: number;
}

export interface ExpenseLineInput {
  expenseCategoryId: number;
  amount: string;
  memo?: string;
}

export interface CreateExpenseInput {
  expenseDate: string;
  cashBankAccountId: number;
  description?: string;
  /** Min 1 line -- server 422s VALIDATION.TOO_SMALL on an empty array, confirmed live. */
  lines: ExpenseLineInput[];
}

/** PATCH /expenses/:id -- draft only (422 EXPENSE.NOT_DRAFT otherwise -- confirmed live against a
 *  REVERSED expense too, not just a posted one, so gate the Edit action on `status === 'draft'`
 *  exactly, not merely "not posted"). `lines` when present fully replaces the set. */
export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ReverseExpenseInput {
  reason: string;
}

export const expensesApi = {
  // ---- expense categories -----------------------------------------------------------------
  listExpenseCategories: () => api.get<ExpenseCategoryListResult>("/expense-categories"),
  getExpenseCategory: (id: number) => api.get<ExpenseCategoryRow>(`/expense-categories/${id}`),
  createExpenseCategory: (input: CreateExpenseCategoryInput, idempotencyKey?: string) =>
    api.post<ExpenseCategoryRow>("/expense-categories", input, idempotencyKey),
  /** 422s EXPENSE_CATEGORY.IN_USE disabling an isSystem category already referenced by an expense
   *  line -- confirmed live; `error.detail` already names the category, surface it verbatim. */
  updateExpenseCategory: (id: number, input: UpdateExpenseCategoryInput, idempotencyKey?: string) =>
    api.patch<ExpenseCategoryRow>(`/expense-categories/${id}`, input, idempotencyKey),

  // ---- expenses -----------------------------------------------------------------------------
  listExpenses: (
    params: {
      status?: ExpenseStatus;
      dateFrom?: string;
      dateTo?: string;
      cashBankAccountId?: number;
      offset?: number;
      limit?: number;
    } = {},
  ) => api.get<ExpenseListResult>("/expenses", params),
  getExpense: (id: number) => api.get<GetExpenseResult>(`/expenses/${id}`),
  /** Creates a DRAFT -- never posts. */
  createExpense: (input: CreateExpenseInput, idempotencyKey?: string) =>
    api.post<GetExpenseResult>("/expenses", input, idempotencyKey),
  updateExpense: (id: number, input: UpdateExpenseInput, idempotencyKey?: string) =>
    api.patch<GetExpenseResult>(`/expenses/${id}`, input, idempotencyKey),
  /** No body needed -- send `{}` (Fastify rejects a truly empty body when Content-Type is
   *  application/json). Posts Dr each line's category account / Cr the cash-bank account. */
  postExpense: (id: number, idempotencyKey?: string) => api.post<PostExpenseResult>(`/expenses/${id}/post`, {}, idempotencyKey),
  /** Draft only. No body needed -- send `{}`. */
  cancelExpense: (id: number, idempotencyKey?: string) => api.post<GetExpenseResult>(`/expenses/${id}/cancel`, {}, idempotencyKey),
  /** Posted only. LIVE-VERIFIED SURPRISE: the response is the SAME `{ expense, lines }` shape as
   *  everything else -- `expense.status` becomes "reversed" but `expense.journalEntryId` stays
   *  the ORIGINAL entry's id unchanged. There is no separate "reversing journal entry" object or
   *  id anywhere in this response, despite the task brief's "-> reversing journal entry" gloss --
   *  a new reversing entry is posted in the GL, but this endpoint doesn't hand back its id. */
  reverseExpense: (id: number, input: ReverseExpenseInput, idempotencyKey?: string) =>
    api.post<GetExpenseResult>(`/expenses/${id}/reverse`, input, idempotencyKey),

  // ---- cash/bank accounts (local duplicate of accountingApi.listCashBankAccounts's fetch --
  // see this file's header comment for why) ---------------------------------------------------
  listCashBankAccounts: () => api.get<CashBankAccountListResult>("/cash-bank-accounts"),
};

export type { CashBankAccountRow };
