<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money field on this page (line
  // `amount`, `totalAmount`, every DecimalInput value) is a decimal STRING end to end. The only
  // Number()/parseFloat() calls below are the labelled "live running total" preview in the
  // create/edit line forms (never sent back to the API -- the raw string the user typed is what
  // actually goes in the request body) and pure UI tone/zero checks, same convention as
  // JournalEntriesPage.svelte's own create-voucher form.
  //
  // Workflow shape mirrors StockTakesPage.svelte: a filterable list that opens into a single
  // detail Modal per expense, which is a state-machine view (which section/buttons render is
  // driven entirely by `detail.expense.status`) rather than a wizard. The reverse action's inline
  // reason-textarea reveal mirrors JournalEntriesPage.svelte's own reverse flow.
  //
  // expensesApi is imported directly from './api/expenses' rather than re-exported through the
  // './api' barrel (src/lib/api/index.ts) -- this task's brief asked for new files only, and
  // index.ts is a small shared registry another concurrently-running agent may also be appending
  // an export line to; importing the module file directly sidesteps that collision risk entirely
  // (see expenses.ts's own header comment for the same reasoning applied to cash-bank-accounts).
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { api, ApiError, ApiNetworkError, formatMoney, formatDate, todayYmd } from '../../api'
  import { expensesApi } from '../../api/expenses'
  import type {
    ExpenseRow,
    ExpenseLineRow,
    ExpenseStatus,
    ExpenseCategoryRow,
    CashBankAccountRow,
    GetExpenseResult,
    CreateExpenseInput,
    UpdateExpenseInput,
  } from '../../api/expenses'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  function toastApiError(err: unknown, fallback: string): void {
    if (err instanceof ApiError) toast.error(err.detail)
    else if (err instanceof ApiNetworkError) toast.error(err.message)
    else toast.error(fallback)
  }

  function statusTone(status: ExpenseStatus): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    return 'info' // reversed
  }

  /** The wire returns a full ISO datetime for expenseDate (e.g. "2026-08-04T00:00:00.000Z") --
   *  see expenses.ts's own doc comment. Slices to the plain YYYY-MM-DD a `<input type="date">`
   *  needs; never re-sends the ISO string verbatim as an edit input. */
  function toDateInputValue(iso: string): string {
    return iso.length >= 10 ? iso.slice(0, 10) : iso
  }

  // ---------------------------------------------------------------------------------------------
  // Shared lookups -- cash/bank accounts (for the filter + form selects) and expense categories
  // (for the line-item picker, filtered to isEnabled).
  // ---------------------------------------------------------------------------------------------
  let cashBankAccounts: CashBankAccountRow[] = []
  let categories: ExpenseCategoryRow[] = []
  $: cashBankAccountMap = new Map(cashBankAccounts.map((a) => [a.cashBankAccountId, a]))
  $: categoryMap = new Map(categories.map((c) => [c.expenseCategoryId, c]))
  $: enabledCategories = categories.filter((c) => c.isEnabled)

  // Reactive ($:) function BINDINGS, not plain `function` declarations -- a plain function closing
  // over `cashBankAccountMap`/`categoryMap` looks correct but is a real Svelte trap: the template
  // calls (e.g. `{cashBankAccountLabel(row.cashBankAccountId)}`) only cite the function's NAME and
  // `row`, so Svelte's compile-time dependency tracker never associates that text node with
  // `cashBankAccountMap` -- it only re-renders when the enclosing `#each rows` block's own `rows`
  // reassigns. Confirmed live: after lookups resolved (async, in parallel with the expense list)
  // the already-rendered table rows kept showing the "Account #N" fallback until the next explicit
  // Refresh reassigned `rows`. Reassigning the function itself inside a `$:` block, so the template
  // reference is to a variable Svelte DOES track, fixes it -- verified live after the fix.
  $: cashBankAccountLabel = (id: number): string => {
    const a = cashBankAccountMap.get(id)
    if (!a) return `Account #${id}`
    return a.bankName ? `${a.bankName} (${a.accountKind})` : `${a.accountKind} #${a.cashBankAccountId}`
  }

  $: categoryLabel = (id: number): string => categoryMap.get(id)?.name ?? `Category #${id}`

  async function loadLookups(): Promise<void> {
    try {
      const [cbResult, catResult] = await Promise.all([expensesApi.listCashBankAccounts(), expensesApi.listExpenseCategories()])
      cashBankAccounts = cbResult.cashBankAccounts
      categories = catResult.expenseCategories
    } catch {
      cashBankAccounts = []
      categories = []
    }
  }

  // ---------------------------------------------------------------------------------------------
  // List state
  // ---------------------------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let rows: ExpenseRow[] = []

  let filterStatus: 'all' | ExpenseStatus = 'all'
  let filterFrom = ''
  let filterTo = ''
  let filterCashBankAccountId: number | '' = ''

  $: totalCount = rows.length
  $: draftCount = rows.filter((r) => r.status === 'draft').length
  $: postedCount = rows.filter((r) => r.status === 'posted').length
  $: postedTotal = rows.filter((r) => r.status === 'posted').reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0)

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const params: { status?: ExpenseStatus; dateFrom?: string; dateTo?: string; cashBankAccountId?: number; limit?: number } = { limit: 100 }
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterFrom) params.dateFrom = filterFrom
      if (filterTo) params.dateTo = filterTo
      if (filterCashBankAccountId !== '') params.cashBankAccountId = filterCashBankAccountId
      const result = await expensesApi.listExpenses(params)
      rows = result.expenses
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : err instanceof ApiError ? err.detail : 'Could not load expenses.'
    } finally {
      loading = false
    }
  }

  function resetFilters(): void {
    filterStatus = 'all'
    filterFrom = ''
    filterTo = ''
    filterCashBankAccountId = ''
    void loadList()
  }

  onMount(() => {
    void loadList()
    void loadLookups()
  })

  // ---------------------------------------------------------------------------------------------
  // Create / edit line-form shape, shared by both modals.
  // ---------------------------------------------------------------------------------------------
  type LineForm = { expenseCategoryId: number | ''; amount: string; memo: string }
  function emptyLine(): LineForm {
    return { expenseCategoryId: '', amount: '', memo: '' }
  }
  function amountNumber(value: string): number {
    return Number(value) || 0
  }

  // ---- create modal ---------------------------------------------------------------------------
  let createOpen = false
  let createSubmitting = false
  let createError = ''
  let createFormErrors: Record<string, string> = {}
  let createDate = todayYmd()
  let createCashBankAccountId: number | '' = ''
  let createDescription = ''
  let createLines: LineForm[] = [emptyLine()]
  let createIdempotencyKey = ''

  $: createTotal = createLines.reduce((sum, l) => sum + amountNumber(l.amount), 0)

  function openCreate(): void {
    createOpen = true
    createError = ''
    createFormErrors = {}
    createDate = todayYmd()
    createCashBankAccountId = cashBankAccounts[0]?.cashBankAccountId ?? ''
    createDescription = ''
    createLines = [emptyLine()]
    createIdempotencyKey = api.newIdempotencyKey()
    if (cashBankAccounts.length === 0 || categories.length === 0) void loadLookups()
  }

  function closeCreate(): void {
    if (createSubmitting) return
    createOpen = false
  }

  function addCreateLine(): void {
    createLines = [...createLines, emptyLine()]
  }
  function removeCreateLine(index: number): void {
    if (createLines.length <= 1) return
    createLines = createLines.filter((_, i) => i !== index)
  }

  function validateLines(lines: LineForm[], errors: Record<string, string>): boolean {
    let ok = true
    lines.forEach((line, index) => {
      if (line.expenseCategoryId === '') {
        errors[`lines.${index}.expenseCategoryId`] = 'Select a category.'
        ok = false
      }
      const amt = line.amount.trim()
      if (!amt || Number(amt) <= 0) {
        errors[`lines.${index}.amount`] = 'Enter an amount greater than zero.'
        ok = false
      }
    })
    return ok
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    const errors: Record<string, string> = {}
    if (createCashBankAccountId === '') errors.cashBankAccountId = 'Select a cash/bank account.'
    if (!createDate) errors.expenseDate = 'Expense date is required.'
    const linesOk = validateLines(createLines, errors)
    createFormErrors = errors
    if (Object.keys(errors).length > 0 || !linesOk) return

    const input: CreateExpenseInput = {
      expenseDate: createDate,
      cashBankAccountId: createCashBankAccountId as number,
      description: createDescription.trim() || undefined,
      lines: createLines.map((l) => ({
        expenseCategoryId: l.expenseCategoryId as number,
        amount: l.amount.trim(),
        memo: l.memo.trim() || undefined,
      })),
    }
    createSubmitting = true
    try {
      const result = await expensesApi.createExpense(input, createIdempotencyKey)
      toast.success(`Expense ${result.expense.docNumber} created as draft.`)
      createOpen = false
      await loadList()
      await openDetail(result.expense)
    } catch (err) {
      if (err instanceof ApiError) {
        createError = err.detail
        if (err.fieldErrors) for (const fe of err.fieldErrors) createFormErrors[fe.path] = fe.message
      } else {
        createError = err instanceof ApiNetworkError ? err.message : 'Could not create this expense.'
      }
      toast.error(createError)
    } finally {
      createSubmitting = false
    }
  }

  // ---- detail modal -----------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detail: GetExpenseResult | null = null

  let reverseFormOpen = false
  let reverseReason = ''
  let reverseSubmitting = false
  let reverseError = ''

  let postSubmitting = false
  let cancelSubmitting = false

  async function openDetail(row: { expenseId: number }): Promise<void> {
    detailOpen = true
    detailError = ''
    detail = null
    reverseFormOpen = false
    reverseReason = ''
    reverseError = ''
    await refreshDetail(row.expenseId)
  }

  function closeDetail(): void {
    detailOpen = false
    detail = null
    editOpen = false
  }

  async function refreshDetail(expenseId: number): Promise<void> {
    detailLoading = true
    try {
      detail = await expensesApi.getExpense(expenseId)
    } catch (err) {
      detailError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this expense.'
    } finally {
      detailLoading = false
    }
  }

  async function performPost(): Promise<void> {
    if (!detail) return
    postSubmitting = true
    try {
      await expensesApi.postExpense(detail.expense.expenseId, api.newIdempotencyKey())
      toast.success(`Expense ${detail.expense.docNumber} posted.`)
      await refreshDetail(detail.expense.expenseId)
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not post this expense.')
    } finally {
      postSubmitting = false
    }
  }

  async function performCancel(): Promise<void> {
    if (!detail) return
    cancelSubmitting = true
    try {
      await expensesApi.cancelExpense(detail.expense.expenseId, api.newIdempotencyKey())
      toast.success(`Expense ${detail.expense.docNumber} cancelled.`)
      await refreshDetail(detail.expense.expenseId)
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not cancel this expense.')
    } finally {
      cancelSubmitting = false
    }
  }

  async function submitReverse(): Promise<void> {
    if (!detail) return
    reverseError = ''
    if (!reverseReason.trim()) {
      reverseError = 'A reason is required to reverse this expense.'
      return
    }
    reverseSubmitting = true
    try {
      await expensesApi.reverseExpense(detail.expense.expenseId, { reason: reverseReason.trim() }, api.newIdempotencyKey())
      toast.success(`Expense ${detail.expense.docNumber} reversed.`)
      reverseFormOpen = false
      await refreshDetail(detail.expense.expenseId)
      await loadList()
    } catch (err) {
      reverseError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not reverse this expense.'
      toast.error(reverseError)
    } finally {
      reverseSubmitting = false
    }
  }

  // ---- edit modal (draft only) -------------------------------------------------------------
  let editOpen = false
  let editSubmitting = false
  let editError = ''
  let editFormErrors: Record<string, string> = {}
  let editDate = todayYmd()
  let editCashBankAccountId: number | '' = ''
  let editDescription = ''
  let editLines: LineForm[] = [emptyLine()]
  let editIdempotencyKey = ''

  $: editTotal = editLines.reduce((sum, l) => sum + amountNumber(l.amount), 0)

  function openEdit(): void {
    if (!detail) return
    editOpen = true
    editError = ''
    editFormErrors = {}
    editDate = toDateInputValue(detail.expense.expenseDate)
    editCashBankAccountId = detail.expense.cashBankAccountId
    editDescription = detail.expense.description ?? ''
    editLines = detail.lines.map((l) => ({ expenseCategoryId: l.expenseCategoryId, amount: l.amount, memo: l.memo ?? '' }))
    editIdempotencyKey = api.newIdempotencyKey()
  }

  function closeEdit(): void {
    if (editSubmitting) return
    editOpen = false
  }

  function addEditLine(): void {
    editLines = [...editLines, emptyLine()]
  }
  function removeEditLine(index: number): void {
    if (editLines.length <= 1) return
    editLines = editLines.filter((_, i) => i !== index)
  }

  async function submitEdit(): Promise<void> {
    if (!detail) return
    editError = ''
    const errors: Record<string, string> = {}
    if (editCashBankAccountId === '') errors.cashBankAccountId = 'Select a cash/bank account.'
    if (!editDate) errors.expenseDate = 'Expense date is required.'
    const linesOk = validateLines(editLines, errors)
    editFormErrors = errors
    if (Object.keys(errors).length > 0 || !linesOk) return

    const input: UpdateExpenseInput = {
      expenseDate: editDate,
      cashBankAccountId: editCashBankAccountId as number,
      description: editDescription.trim() || undefined,
      lines: editLines.map((l) => ({
        expenseCategoryId: l.expenseCategoryId as number,
        amount: l.amount.trim(),
        memo: l.memo.trim() || undefined,
      })),
    }
    editSubmitting = true
    try {
      const result = await expensesApi.updateExpense(detail.expense.expenseId, input, editIdempotencyKey)
      toast.success(`Expense ${result.expense.docNumber} updated.`)
      editOpen = false
      detail = result
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) {
        editError = err.detail
        if (err.fieldErrors) for (const fe of err.fieldErrors) editFormErrors[fe.path] = fe.message
      } else {
        editError = err instanceof ApiNetworkError ? err.message : 'Could not update this expense.'
      }
      toast.error(editError)
    } finally {
      editSubmitting = false
    }
  }

  function lineFieldError(errors: Record<string, string>, index: number, field: string): string {
    return errors[`lines.${index}.${field}`] ?? ''
  }
</script>

<div class="space-y-6 animate-fade-in">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="heading-2 text-secondary-900 dark:text-white">Expenses</h1>
        {#if loadError}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Demo Preview
          </span>
        {:else}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Live API
          </span>
        {/if}
      </div>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">
        Record and post business expenses -- each posted expense debits the line's expense category account and credits the cash/bank account.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
        on:click={loadList}
        disabled={loading}
      >
        <Icon icon={Icons.refresh} className={`w-4 h-4 text-secondary-500 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        on:click={openCreate}
      >
        <Icon icon={Icons.plus} className="w-4 h-4" />
        New Expense
      </button>
    </div>
  </div>

  {#if loadError}
    <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
          <Icon icon={Icons.alertTriangle} className="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-200">Session Notice</h3>
          <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{loadError}</p>
        </div>
      </div>
      <button type="button" on:click={loadList} class="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors flex-shrink-0">
        Retry
      </button>
    </div>
  {/if}

  <!-- Summary Metric Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
          <Icon icon={Icons.wallet} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600">This Page</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Expenses</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : totalCount}</p>
    </div>

    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 flex items-center justify-center">
          <Icon icon={Icons.clock} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-50 dark:bg-secondary-800/50 text-secondary-600">Not Yet Posted</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Draft</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : draftCount}</p>
    </div>

    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-success-100 dark:bg-success-900/40 text-success-600 dark:text-success-400 flex items-center justify-center">
          <Icon icon={Icons.circleCheck} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-50 dark:bg-success-900/20 text-success-600">In the GL</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Posted</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : postedCount}</p>
    </div>

    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-info-100 dark:bg-info-900/40 text-info-600 dark:text-info-400 flex items-center justify-center">
          <Icon icon={Icons.currencyDollar} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-info-50 dark:bg-info-900/20 text-info-600">Posted Total</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Amount</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : formatMoney(postedTotal.toFixed(2))}</p>
    </div>
  </div>

  <!-- Filter Toolbar -->
  <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
    <div class="flex flex-col gap-4 mb-6">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-secondary-500 dark:text-secondary-400">Status:</span>
        <div class="inline-flex flex-wrap p-1 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
          {#each [['all', 'All'], ['draft', 'Draft'], ['posted', 'Posted'], ['cancelled', 'Cancelled'], ['reversed', 'Reversed']] as [value, label] (value)}
            <button
              type="button"
              on:click={() => (filterStatus = value as typeof filterStatus)}
              class={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterStatus === value ? 'bg-white dark:bg-surface-700 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-900 dark:hover:text-white'}`}
            >
              {label}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class={labelClass} for="exp-filter-from">From</label>
          <input id="exp-filter-from" type="date" bind:value={filterFrom} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="exp-filter-to">To</label>
          <input id="exp-filter-to" type="date" bind:value={filterTo} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="exp-filter-account">Cash/bank account</label>
          <select id="exp-filter-account" bind:value={filterCashBankAccountId} class={inputClass}>
            <option value="">All accounts</option>
            {#each cashBankAccounts as a (a.cashBankAccountId)}
              <option value={a.cashBankAccountId}>{cashBankAccountLabel(a.cashBankAccountId)}</option>
            {/each}
          </select>
        </div>
        <button type="button" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity" on:click={loadList}>
          Apply
        </button>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          on:click={resetFilters}
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Expenses Table -->
    <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto scrollbar-thin" tabindex="0" role="region" aria-label="Expenses table">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-800/80 border-b border-surface-200 dark:border-surface-700">
            <tr>
              <th class={headClass}>Doc Number</th>
              <th class={headClass}>Date</th>
              <th class={headClass}>Cash/Bank Account</th>
              <th class={`${headClass} text-right`}>Total</th>
              <th class={headClass}>Status</th>
              <th class={`${headClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
            {#if loading}
              <tr><td colspan="6" class="py-12 px-4 text-center text-sm text-secondary-500">Loading expenses…</td></tr>
            {:else}
              {#each rows as row (row.expenseId)}
                <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors group cursor-pointer" on:click={() => openDetail(row)}>
                  <td class={cellClass}>
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg bg-theme-primary/10 text-theme-primary flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                        EX
                      </div>
                      <span class="font-mono font-bold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">
                        {row.docNumber}
                      </span>
                    </div>
                  </td>
                  <td class={cellClass}>
                    <div class="flex items-center gap-1.5 text-xs">
                      <Icon icon={Icons.calendar} className="w-3.5 h-3.5 text-secondary-400" />
                      <span class="font-mono text-secondary-800 dark:text-secondary-200">{formatDate(row.expenseDate)}</span>
                    </div>
                  </td>
                  <td class={cellClass}>
                    <span class="px-2.5 py-1 text-xs rounded-lg bg-surface-100 dark:bg-surface-800 font-semibold text-secondary-700 dark:text-secondary-300">
                      {cashBankAccountLabel(row.cashBankAccountId)}
                    </span>
                  </td>
                  <td class={`${cellClass} text-right font-semibold text-secondary-900 dark:text-white`}>{formatMoney(row.totalAmount)}</td>
                  <td class={cellClass}>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td class={`${cellClass} text-right`}>
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-xs font-semibold text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      on:click|stopPropagation={() => openDetail(row)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              {/each}

              {#if !rows.length}
                <tr>
                  <td colspan="6" class="py-12 px-4 text-center">
                    <Icon icon={Icons.search} className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                    <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">No expenses match your filter.</p>
                  </td>
                </tr>
              {/if}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- New expense -->
<Modal open={createOpen} title="New expense" widthClass="max-w-3xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="exp-create-date">Expense date <span class="text-danger-500">*</span></label>
        <input id="exp-create-date" type="date" class={inputClass} bind:value={createDate} required />
        {#if createFormErrors.expenseDate}<p class="text-xs text-danger-500 mt-1">{createFormErrors.expenseDate}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="exp-create-account">Cash/bank account <span class="text-danger-500">*</span></label>
        <select id="exp-create-account" class={inputClass} bind:value={createCashBankAccountId}>
          <option value="">Select account…</option>
          {#each cashBankAccounts as a (a.cashBankAccountId)}
            <option value={a.cashBankAccountId}>{cashBankAccountLabel(a.cashBankAccountId)}</option>
          {/each}
        </select>
        {#if createFormErrors.cashBankAccountId}<p class="text-xs text-danger-500 mt-1">{createFormErrors.cashBankAccountId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="exp-create-desc">Description</label>
        <input id="exp-create-desc" type="text" class={inputClass} bind:value={createDescription} placeholder="Optional" />
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Lines</h3>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
          on:click={addCreateLine}
        >
          <Icon icon={Icons.plus} className="w-4 h-4" />
          Add line
        </button>
      </div>

      <div class="space-y-3">
        {#each createLines as line, index (index)}
          <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div class="sm:col-span-5">
                <label class={labelClass} for={`exp-create-line-cat-${index}`}>Category <span class="text-danger-500">*</span></label>
                <select id={`exp-create-line-cat-${index}`} bind:value={line.expenseCategoryId} class={inputClass}>
                  <option value="">Select category…</option>
                  {#each enabledCategories as c (c.expenseCategoryId)}
                    <option value={c.expenseCategoryId}>{c.name}</option>
                  {/each}
                </select>
                {#if lineFieldError(createFormErrors, index, 'expenseCategoryId')}<p class="text-xs text-danger-500 mt-1">{lineFieldError(createFormErrors, index, 'expenseCategoryId')}</p>{/if}
              </div>
              <div class="sm:col-span-3">
                <DecimalInput bind:value={line.amount} label="Amount" id={`exp-create-line-amount-${index}`} scale={2} prefix="Rs" required error={lineFieldError(createFormErrors, index, 'amount')} />
              </div>
              <div class="sm:col-span-4">
                <label class={labelClass} for={`exp-create-line-memo-${index}`}>Memo</label>
                <input id={`exp-create-line-memo-${index}`} type="text" bind:value={line.memo} class={inputClass} placeholder="Optional" />
              </div>
              <div class="sm:col-span-12 flex justify-end">
                {#if createLines.length > 1}
                  <button type="button" class="text-xs font-medium text-danger-500 hover:text-danger-600" on:click={() => removeCreateLine(index)}>
                    Remove line
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-secondary-200 dark:border-secondary-700">
      <p class="text-xs text-secondary-400">Creates as a draft -- post it separately once reviewed.</p>
      <p class="text-sm font-semibold text-secondary-900 dark:text-white">Total: {formatMoney(createTotal.toFixed(2))}</p>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeCreate}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={createSubmitting}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={createSubmitting}
      on:click={submitCreate}
    >
      {createSubmitting ? 'Creating…' : 'Create expense'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Detail -->
<Modal open={detailOpen} title={detail ? `Expense ${detail.expense.docNumber}` : 'Expense'} widthClass="max-w-4xl" onClose={closeDetail}>
  {#if detailLoading && !detail}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if detailError}
    <div class="rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {detailError}
    </div>
  {:else if detail}
    <div class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(detail.expense.status)}>{detail.expense.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Expense date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detail.expense.expenseDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Cash/bank account</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{cashBankAccountLabel(detail.expense.cashBankAccountId)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Total</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detail.expense.totalAmount)}</p>
        </div>
        {#if detail.expense.description}
          <div class="sm:col-span-4">
            <p class="text-xs text-secondary-500">Description</p>
            <p class="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap">{detail.expense.description}</p>
          </div>
        {/if}
        {#if detail.expense.journalEntryId}
          <div>
            <p class="text-xs text-secondary-500">Journal entry</p>
            <p class="text-sm font-medium text-secondary-900 dark:text-white">#{detail.expense.journalEntryId}</p>
          </div>
        {/if}
        {#if detail.expense.postedAt}
          <div>
            <p class="text-xs text-secondary-500">Posted at</p>
            <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detail.expense.postedAt)}</p>
          </div>
        {/if}
      </div>

      <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Expense lines table">
          <table class="w-full">
            <thead class="bg-surface-50 dark:bg-surface-900/30">
              <tr>
                <th class={headClass}>Category</th>
                <th class={`${headClass} text-right`}>Amount</th>
                <th class={headClass}>Memo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              {#each detail.lines as line (line.expenseLineId)}
                <tr>
                  <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{categoryLabel(line.expenseCategoryId)}</td>
                  <td class={`${cellClass} text-right`}>{formatMoney(line.amount)}</td>
                  <td class={cellClass}>{line.memo ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2 border-t border-surface-200 dark:border-surface-700">
        {#if detail.expense.status === 'draft'}
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl text-sm font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            on:click={openEdit}
          >
            Edit
          </button>
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl text-sm font-medium border border-danger-300 dark:border-danger-700 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors disabled:opacity-50"
            disabled={cancelSubmitting}
            on:click={performCancel}
          >
            {cancelSubmitting ? 'Cancelling…' : 'Cancel expense'}
          </button>
          <button
            type="button"
            class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            disabled={postSubmitting}
            on:click={performPost}
          >
            {postSubmitting ? 'Posting…' : 'Post expense'}
          </button>
        {:else if detail.expense.status === 'posted'}
          {#if !reverseFormOpen}
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-sm font-medium border border-danger-300 dark:border-danger-700 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
              on:click={() => (reverseFormOpen = true)}
            >
              Reverse expense
            </button>
          {:else}
            <div class="w-full space-y-3 text-left">
              <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Reverse expense {detail.expense.docNumber}</h3>
              {#if reverseError}<p class="text-xs text-danger-500">{reverseError}</p>{/if}
              <div>
                <label class={labelClass} for="exp-reverse-reason">Reason <span class="text-danger-500">*</span></label>
                <textarea id="exp-reverse-reason" bind:value={reverseReason} rows="2" class={inputClass} placeholder="Why is this expense being reversed?"></textarea>
              </div>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-sm font-medium bg-danger-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  on:click={submitReverse}
                  disabled={reverseSubmitting}
                >
                  {reverseSubmitting ? 'Reversing…' : 'Confirm reversal'}
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  on:click={() => (reverseFormOpen = false)}
                  disabled={reverseSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}
        {:else}
          <p class="text-xs text-secondary-500">
            {detail.expense.status === 'cancelled' ? 'This expense was cancelled while still a draft.' : 'This expense was reversed -- it is now read-only.'}
          </p>
        {/if}
      </div>
    </div>
  {/if}
</Modal>

<!-- Edit (draft only) -->
<Modal open={editOpen} title={detail ? `Edit ${detail.expense.docNumber}` : 'Edit expense'} widthClass="max-w-3xl" onClose={closeEdit}>
  {#if editError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {editError}
    </div>
  {/if}
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="exp-edit-date">Expense date <span class="text-danger-500">*</span></label>
        <input id="exp-edit-date" type="date" class={inputClass} bind:value={editDate} required />
        {#if editFormErrors.expenseDate}<p class="text-xs text-danger-500 mt-1">{editFormErrors.expenseDate}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="exp-edit-account">Cash/bank account <span class="text-danger-500">*</span></label>
        <select id="exp-edit-account" class={inputClass} bind:value={editCashBankAccountId}>
          <option value="">Select account…</option>
          {#each cashBankAccounts as a (a.cashBankAccountId)}
            <option value={a.cashBankAccountId}>{cashBankAccountLabel(a.cashBankAccountId)}</option>
          {/each}
        </select>
        {#if editFormErrors.cashBankAccountId}<p class="text-xs text-danger-500 mt-1">{editFormErrors.cashBankAccountId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="exp-edit-desc">Description</label>
        <input id="exp-edit-desc" type="text" class={inputClass} bind:value={editDescription} placeholder="Optional" />
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Lines</h3>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
          on:click={addEditLine}
        >
          <Icon icon={Icons.plus} className="w-4 h-4" />
          Add line
        </button>
      </div>

      <div class="space-y-3">
        {#each editLines as line, index (index)}
          <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div class="sm:col-span-5">
                <label class={labelClass} for={`exp-edit-line-cat-${index}`}>Category <span class="text-danger-500">*</span></label>
                <select id={`exp-edit-line-cat-${index}`} bind:value={line.expenseCategoryId} class={inputClass}>
                  <option value="">Select category…</option>
                  {#each enabledCategories as c (c.expenseCategoryId)}
                    <option value={c.expenseCategoryId}>{c.name}</option>
                  {/each}
                </select>
                {#if lineFieldError(editFormErrors, index, 'expenseCategoryId')}<p class="text-xs text-danger-500 mt-1">{lineFieldError(editFormErrors, index, 'expenseCategoryId')}</p>{/if}
              </div>
              <div class="sm:col-span-3">
                <DecimalInput bind:value={line.amount} label="Amount" id={`exp-edit-line-amount-${index}`} scale={2} prefix="Rs" required error={lineFieldError(editFormErrors, index, 'amount')} />
              </div>
              <div class="sm:col-span-4">
                <label class={labelClass} for={`exp-edit-line-memo-${index}`}>Memo</label>
                <input id={`exp-edit-line-memo-${index}`} type="text" bind:value={line.memo} class={inputClass} placeholder="Optional" />
              </div>
              <div class="sm:col-span-12 flex justify-end">
                {#if editLines.length > 1}
                  <button type="button" class="text-xs font-medium text-danger-500 hover:text-danger-600" on:click={() => removeEditLine(index)}>
                    Remove line
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-secondary-200 dark:border-secondary-700">
      <p class="text-xs text-secondary-400">Lines fully replace the existing set on save.</p>
      <p class="text-sm font-semibold text-secondary-900 dark:text-white">Total: {formatMoney(editTotal.toFixed(2))}</p>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeEdit}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={editSubmitting}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={editSubmitting}
      on:click={submitEdit}
    >
      {editSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>
