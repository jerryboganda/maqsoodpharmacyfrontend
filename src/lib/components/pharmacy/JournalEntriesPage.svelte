<script lang="ts">
  // Rule M: every money field (totalDebit/totalCredit, debitAmount/creditAmount, DecimalInput
  // values) is a decimal STRING end to end. The only Number()/parseFloat() calls below are the
  // labelled "live running total" preview in the create-voucher form (never leaves the browser,
  // and per this task's own instruction is UX only -- the server is the source of truth for
  // whether a voucher actually balances) and pure UI zero/tone checks.
  //
  // Mirrors PurchaseReturnsPage.svelte's structure (list + detail Modal + create Modal, Toast,
  // ApiError.fieldErrors). Two DIFFERENT journal-line shapes are in play here -- see
  // src/lib/api/types.ts's "Accounting" section header comment -- this page only ever touches
  // `JournalEntryLineRow` (glAccountId/debitAmount/creditAmount), never `GlLedgerLine`.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { accountingApi, api, ApiError, ApiNetworkError, formatMoney, formatDate, todayYmd } from '../../api'
  import type {
    JournalEntryRow,
    GetJournalEntryResult,
    GlAccountFlatRow,
    VoucherCategoryOption,
    CreateJournalEntryInput,
    CreateJournalEntryLineInput,
  } from '../../api'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  // Document type codes a journal_entry.document_type_code column can hold (ledger.ts's own
  // column comment -- there is no lookup endpoint for this list, it is not a seeded option set).
  const DOCUMENT_TYPE_CODES = ['SV', 'SR', 'PV', 'PR', 'SPAY', 'EXP', 'CBT', 'ADJ', 'CSHIFT', 'JV', 'OPEN']

  function statusTone(status: string): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'posted') return 'success'
    if (status === 'reversed') return 'danger'
    return 'neutral'
  }

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let entries: JournalEntryRow[] = []
  let accounts: GlAccountFlatRow[] = []
  $: accountMap = new Map(accounts.map((a) => [a.glAccountId, a]))
  $: postableActiveAccounts = accounts.filter((a) => a.isPostable && a.isActive)

  let filterDocType = ''
  let filterStatus = ''
  let filterFrom = ''
  let filterTo = ''

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const params: { documentTypeCode?: string; status?: 'draft' | 'posted' | 'reversed'; dateFrom?: string; dateTo?: string; limit?: number } = {
        limit: 200,
      }
      if (filterDocType) params.documentTypeCode = filterDocType
      if (filterStatus) params.status = filterStatus as 'draft' | 'posted' | 'reversed'
      if (filterFrom) params.dateFrom = filterFrom
      if (filterTo) params.dateTo = filterTo
      const result = await accountingApi.listJournalEntries(params)
      entries = result.journalEntries
    } catch (err) {
      loadError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load journal entries.'
    } finally {
      loading = false
    }
  }

  function resetFilters(): void {
    filterDocType = ''
    filterStatus = ''
    filterFrom = ''
    filterTo = ''
    void loadList()
  }

  onMount(async () => {
    await Promise.all([
      loadList(),
      accountingApi
        .listAccountsFlat()
        .then((r) => (accounts = r.data))
        .catch(() => {
          /* Non-fatal: only degrades account-name display to a bare id in the detail modal. */
        }),
    ])
  })

  // ---- detail modal + reverse -------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detailResult: GetJournalEntryResult | null = null

  let reverseFormOpen = false
  let reverseReason = ''
  let reversePostingDate = todayYmd()
  let reverseLoading = false
  let reverseError = ''

  async function openDetail(row: JournalEntryRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detailResult = null
    reverseFormOpen = false
    reverseReason = ''
    reverseError = ''
    reversePostingDate = todayYmd()
    try {
      detailResult = await accountingApi.getJournalEntry(row.journalEntryId)
    } catch (err) {
      detailError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this journal entry.'
    } finally {
      detailLoading = false
    }
  }

  function closeDetail(): void {
    detailOpen = false
    detailResult = null
    detailError = ''
    reverseFormOpen = false
  }

  async function submitReverse(): Promise<void> {
    if (!detailResult) return
    reverseError = ''
    if (!reverseReason.trim()) {
      reverseError = 'A reason is required to reverse this entry.'
      return
    }
    if (!reversePostingDate) {
      reverseError = 'A posting date is required.'
      return
    }
    reverseLoading = true
    try {
      const result = await accountingApi.reverseJournalEntry(detailResult.entry.journalEntryId, {
        reason: reverseReason.trim(),
        postingDate: reversePostingDate,
      })
      toast.success('Journal entry ' + result.original.entryNo + ' reversed as ' + result.reversal.entryNo + '.')
      reverseFormOpen = false
      await Promise.all([loadList(), openDetail(result.original)])
    } catch (err) {
      reverseError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not reverse this entry.'
      toast.error(reverseError)
    } finally {
      reverseLoading = false
    }
  }

  // ---- create voucher modal ----------------------------------------------------------------
  type VoucherLineForm = { glAccountId: number | ''; side: 'debit' | 'credit'; amount: string; memo: string }

  let createOpen = false
  let createDataLoading = false
  let createLoading = false
  let createError = ''
  let formErrors: Record<string, string> = {}
  let idempotencyKey = ''

  let voucherCategories: VoucherCategoryOption[] = []
  let voucherCategoryId: string | number = ''
  let narration = ''
  let documentDate = todayYmd()
  let postingDate = todayYmd()
  let lines: VoucherLineForm[] = []

  function emptyLine(side: 'debit' | 'credit'): VoucherLineForm {
    return { glAccountId: '', side, amount: '', memo: '' }
  }

  async function openCreate(): Promise<void> {
    createOpen = true
    createError = ''
    formErrors = {}
    voucherCategoryId = ''
    narration = ''
    documentDate = todayYmd()
    postingDate = todayYmd()
    lines = [emptyLine('debit'), emptyLine('credit')]
    idempotencyKey = api.newIdempotencyKey()
    if (accounts.length === 0) {
      createDataLoading = true
      try {
        accounts = (await accountingApi.listAccountsFlat()).data
      } catch (err) {
        createError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load GL accounts.'
      } finally {
        createDataLoading = false
      }
    }
    if (voucherCategories.length === 0) {
      createDataLoading = true
      try {
        voucherCategories = await accountingApi.voucherCategories()
      } catch (err) {
        createError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load voucher categories.'
      } finally {
        createDataLoading = false
      }
    }
  }

  function closeCreate(): void {
    createOpen = false
  }

  function addLine(): void {
    lines = [...lines, emptyLine('debit')]
  }

  function removeLine(index: number): void {
    if (lines.length <= 2) return
    lines = lines.filter((_, i) => i !== index)
  }

  function setLineAccount(index: number, value: string): void {
    lines = lines.map((line, i) => (i === index ? { ...line, glAccountId: value ? Number(value) : '' } : line))
  }

  function setLineSide(index: number, side: 'debit' | 'credit'): void {
    lines = lines.map((line, i) => (i === index ? { ...line, side } : line))
  }

  // Pure UI running-total preview -- never sent to the API (the raw per-line amount strings in
  // `lines` are sent untouched by buildLineInput below). The server is the real balance check.
  function amountNumber(value: string): number {
    return Number(value) || 0
  }
  $: totalDebit = lines.reduce((sum, l) => sum + (l.side === 'debit' ? amountNumber(l.amount) : 0), 0)
  $: totalCredit = lines.reduce((sum, l) => sum + (l.side === 'credit' ? amountNumber(l.amount) : 0), 0)
  $: linesBalance = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 1e-9

  function lineFieldError(index: number, field: string): string {
    return formErrors[`lines.${index}.${field}`] ?? ''
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (voucherCategoryId === '') next.voucherCategoryId = 'Select a voucher category.'
    if (!documentDate) next.documentDate = 'Document date is required.'
    if (!postingDate) next.postingDate = 'Posting date is required.'
    if (!narration.trim()) next.narration = 'Narration is required.'
    lines.forEach((line, index) => {
      if (line.glAccountId === '') next[`lines.${index}.glAccountId`] = 'Select an account.'
      const amt = line.amount.trim()
      if (!amt || Number(amt) <= 0) next[`lines.${index}.amount`] = 'Enter an amount greater than zero.'
    })
    formErrors = next
    return Object.keys(next).length === 0
  }

  function buildLineInput(line: VoucherLineForm): CreateJournalEntryLineInput {
    const input: CreateJournalEntryLineInput = { glAccountId: line.glAccountId as number }
    if (line.side === 'debit') input.debit = line.amount.trim()
    else input.credit = line.amount.trim()
    if (line.memo.trim()) input.memo = line.memo.trim()
    return input
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validate()) return
    createLoading = true
    try {
      const input: CreateJournalEntryInput = {
        voucherCategoryId: voucherCategoryId as number,
        documentDate,
        postingDate,
        narration: narration.trim(),
        lines: lines.map(buildLineInput),
      }
      const result = await accountingApi.createJournalEntry(input, idempotencyKey)
      toast.success('Voucher ' + result.entry.entryNo + ' posted.')
      closeCreate()
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) {
        createError = err.detail
        if (err.fieldErrors) {
          const next: Record<string, string> = {}
          for (const fe of err.fieldErrors) next[fe.path] = fe.message
          formErrors = { ...formErrors, ...next }
        }
      } else {
        createError = err instanceof ApiNetworkError ? err.message : 'Could not create this voucher.'
      }
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Journal entries</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Every posted GL entry, plus manual JV/CP/CR/BP/BR vouchers.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
      Create voucher
    </button>
  </div>

  <div class="card rounded-xl p-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class={labelClass} for="je-filter-doctype">Document type</label>
        <select id="je-filter-doctype" bind:value={filterDocType} class={inputClass}>
          <option value="">All</option>
          {#each DOCUMENT_TYPE_CODES as code}
            <option value={code}>{code}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class={labelClass} for="je-filter-status">Status</label>
        <select id="je-filter-status" bind:value={filterStatus} class={inputClass}>
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>
      <div>
        <label class={labelClass} for="je-filter-from">From</label>
        <input id="je-filter-from" type="date" bind:value={filterFrom} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="je-filter-to">To</label>
        <input id="je-filter-to" type="date" bind:value={filterTo} class={inputClass} />
      </div>
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity"
        on:click={loadList}
      >
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

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Journal entries table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Entry no</th>
            <th class={headClass}>Date</th>
            <th class={headClass}>Doc type</th>
            <th class={headClass}>Description</th>
            <th class={`${headClass} text-right`}>Total</th>
            <th class={headClass}>Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if entries.length === 0}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No journal entries match this filter.</td></tr>
          {:else}
            {#each entries as row (row.journalEntryId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer" on:click={() => openDetail(row)}>
                <td class={cellClass}>{row.entryNo}</td>
                <td class={cellClass}>{formatDate(row.entryDate)}</td>
                <td class={cellClass}>{row.documentTypeCode}</td>
                <td class={cellClass}>{row.description}</td>
                <td class={`${cellClass} text-right font-medium text-secondary-900 dark:text-white`}>{formatMoney(row.totalDebit)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<Modal open={detailOpen} title={detailResult ? `Journal entry ${detailResult.entry.entryNo}` : 'Journal entry'} widthClass="max-w-3xl" onClose={closeDetail}>
  {#if detailLoading}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if detailError}
    <div class="rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {detailError}
    </div>
  {:else if detailResult}
    <div class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-secondary-500">Date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detailResult.entry.entryDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Doc type</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{detailResult.entry.documentTypeCode}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(detailResult.entry.status)}>{detailResult.entry.status}</Badge>
        </div>
        <div class="col-span-2 sm:col-span-3">
          <p class="text-xs text-secondary-500">Description</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{detailResult.entry.description}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Total debit</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detailResult.entry.totalDebit)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Total credit</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detailResult.entry.totalCredit)}</p>
        </div>
        {#if detailResult.entry.reversalOfJournalId}
          <div>
            <p class="text-xs text-secondary-500">Reversal of</p>
            <p class="text-sm font-medium text-secondary-900 dark:text-white">Journal entry #{detailResult.entry.reversalOfJournalId}</p>
          </div>
        {/if}
      </div>

      {#if detailResult.manualVoucher}
        <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-1">
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">
            Manual voucher — {detailResult.manualVoucher.categoryCode} ({detailResult.manualVoucher.categoryName})
          </p>
          <p class="text-sm text-secondary-600 dark:text-secondary-300">{detailResult.manualVoucher.narration}</p>
        </div>
      {/if}

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Legs</h3>
        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Journal entry legs table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Account</th>
                  <th class={`${headClass} text-right`}>Debit</th>
                  <th class={`${headClass} text-right`}>Credit</th>
                  <th class={headClass}>Memo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#each detailResult.lines as line (line.journalLineId)}
                  <tr>
                    <td class={cellClass}>
                      {accountMap.get(line.glAccountId) ? `${accountMap.get(line.glAccountId)?.code} — ${accountMap.get(line.glAccountId)?.name}` : `Account #${line.glAccountId}`}
                    </td>
                    <td class={`${cellClass} text-right`}>{Number(line.debitAmount) === 0 ? '—' : formatMoney(line.debitAmount)}</td>
                    <td class={`${cellClass} text-right`}>{Number(line.creditAmount) === 0 ? '—' : formatMoney(line.creditAmount)}</td>
                    <td class={cellClass}>{line.memo ?? '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {#if detailResult.entry.status === 'posted'}
        <div class="pt-2 border-t border-secondary-200 dark:border-secondary-700">
          {#if !reverseFormOpen}
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-sm font-medium border border-danger-300 dark:border-danger-700 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
              on:click={() => (reverseFormOpen = true)}
            >
              Reverse this entry
            </button>
          {:else}
            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Reverse journal entry {detailResult.entry.entryNo}</h3>
              {#if reverseError}<p class="text-xs text-danger-500">{reverseError}</p>{/if}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class={labelClass} for="je-reverse-reason">Reason<span class="text-danger-500"> *</span></label>
                  <textarea id="je-reverse-reason" bind:value={reverseReason} rows="2" class={inputClass} placeholder="Why is this entry being reversed?"></textarea>
                </div>
                <div>
                  <label class={labelClass} for="je-reverse-posting-date">Posting date<span class="text-danger-500"> *</span></label>
                  <input id="je-reverse-posting-date" type="date" bind:value={reversePostingDate} class={inputClass} />
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-sm font-medium bg-danger-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  on:click={submitReverse}
                  disabled={reverseLoading}
                >
                  {reverseLoading ? 'Reversing…' : 'Confirm reversal'}
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  on:click={() => (reverseFormOpen = false)}
                  disabled={reverseLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Modal>

<Modal open={createOpen} title="Create voucher" widthClass="max-w-4xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}

  {#if createDataLoading}
    <p class="text-sm text-secondary-500 mb-4">Loading voucher categories and accounts…</p>
  {/if}

  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label class={labelClass} for="je-category">Voucher category<span class="text-danger-500"> *</span></label>
        <select id="je-category" bind:value={voucherCategoryId} class={inputClass}>
          <option value="">Select category…</option>
          {#each voucherCategories as c (c.optionValueId)}
            <option value={Number(c.optionValueId)}>{c.code} — {c.displayName}</option>
          {/each}
        </select>
        {#if formErrors.voucherCategoryId}<p class="text-xs text-danger-500 mt-1">{formErrors.voucherCategoryId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="je-document-date">Document date<span class="text-danger-500"> *</span></label>
        <input id="je-document-date" type="date" bind:value={documentDate} class={inputClass} />
        {#if formErrors.documentDate}<p class="text-xs text-danger-500 mt-1">{formErrors.documentDate}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="je-posting-date">Posting date<span class="text-danger-500"> *</span></label>
        <input id="je-posting-date" type="date" bind:value={postingDate} class={inputClass} />
        {#if formErrors.postingDate}<p class="text-xs text-danger-500 mt-1">{formErrors.postingDate}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="je-narration">Narration<span class="text-danger-500"> *</span></label>
        <input id="je-narration" type="text" bind:value={narration} class={inputClass} placeholder="What is this voucher for?" />
        {#if formErrors.narration}<p class="text-xs text-danger-500 mt-1">{formErrors.narration}</p>{/if}
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Lines</h3>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
          on:click={addLine}
        >
          <Icon icon={Icons.plus} className="w-4 h-4" />
          Add line
        </button>
      </div>

      <div class="space-y-3">
        {#each lines as line, index (index)}
          <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div class="sm:col-span-5">
                <label class={labelClass} for={`je-line-account-${index}`}>Account<span class="text-danger-500"> *</span></label>
                <select
                  id={`je-line-account-${index}`}
                  value={line.glAccountId}
                  on:change={(e) => setLineAccount(index, (e.currentTarget as HTMLSelectElement).value)}
                  class={inputClass}
                >
                  <option value="">Select account…</option>
                  {#each postableActiveAccounts as acct (acct.glAccountId)}
                    <option value={acct.glAccountId}>{acct.code} — {acct.name}</option>
                  {/each}
                </select>
                {#if lineFieldError(index, 'glAccountId')}<p class="text-xs text-danger-500 mt-1">{lineFieldError(index, 'glAccountId')}</p>{/if}
              </div>
              <div class="sm:col-span-2">
                <span class={labelClass}>Side</span>
                <div class="flex rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                  <button
                    type="button"
                    class={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${line.side === 'debit' ? 'bg-theme-primary text-white' : 'bg-surface-50 dark:bg-surface-800 text-secondary-600 dark:text-secondary-300'}`}
                    on:click={() => setLineSide(index, 'debit')}
                  >
                    Dr
                  </button>
                  <button
                    type="button"
                    class={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${line.side === 'credit' ? 'bg-theme-primary text-white' : 'bg-surface-50 dark:bg-surface-800 text-secondary-600 dark:text-secondary-300'}`}
                    on:click={() => setLineSide(index, 'credit')}
                  >
                    Cr
                  </button>
                </div>
              </div>
              <div class="sm:col-span-2">
                <DecimalInput bind:value={line.amount} label="Amount" id={`je-line-amount-${index}`} scale={2} prefix="Rs" required error={lineFieldError(index, 'amount') || lineFieldError(index, 'debit') || lineFieldError(index, 'credit')} />
              </div>
              <div class="sm:col-span-3">
                <label class={labelClass} for={`je-line-memo-${index}`}>Memo</label>
                <input id={`je-line-memo-${index}`} type="text" bind:value={line.memo} class={inputClass} placeholder="Optional" />
              </div>
              <div class="sm:col-span-12 flex justify-end">
                {#if lines.length > 2}
                  <button type="button" class="text-xs font-medium text-danger-500 hover:text-danger-600" on:click={() => removeLine(index)}>
                    Remove line
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
      {#if formErrors.lines}<p class="text-xs text-danger-500 mt-2">{formErrors.lines}</p>{/if}
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-secondary-200 dark:border-secondary-700">
      <p class="text-xs text-secondary-400">Live totals (the server is the source of truth for whether this balances)</p>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-secondary-600 dark:text-secondary-300">Dr {formatMoney(totalDebit.toFixed(2))}</span>
        <span class="text-secondary-600 dark:text-secondary-300">Cr {formatMoney(totalCredit.toFixed(2))}</span>
        <Badge tone={linesBalance ? 'success' : 'warning'}>{linesBalance ? 'Balanced' : 'Not balanced'}</Badge>
      </div>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeCreate}
      disabled={createLoading}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      on:click={submitCreate}
      disabled={createLoading || createDataLoading}
    >
      {createLoading ? 'Submitting…' : 'Submit'}
    </button>
  </svelte:fragment>
</Modal>
