<script lang="ts">
  // Rule M: openingBalanceAmount/amount are decimal STRINGS end to end -- this page never offers
  // an openingBalanceAmount input at all (the server always forces "0.00" server-side, see
  // accounting.ts's createCashBankAccount doc comment) and DecimalInput owns the transfer amount.
  // Mirrors PurchaseReturnsPage.svelte's structure (list + two create-style Modals, Toast,
  // ApiError.fieldErrors) plus a third Modal (the book/ledger view) built on the shared
  // LedgerTable component this page and ChartOfAccountsPage both own.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import LedgerTable from './shared/LedgerTable.svelte'
  import { toast } from '../../stores/toast'
  import { accountingApi, api, ApiError, ApiNetworkError, formatDate, todayYmd } from '../../api'
  import type { CashBankAccountRow, GlAccountFlatRow, CashBankAccountKind, CreateCashBankAccountInput, CashBankBookResult } from '../../api'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  const KIND_LABELS: Record<CashBankAccountKind, string> = {
    cash_drawer: 'Cash drawer',
    petty_cash: 'Petty cash',
    bank: 'Bank',
    mobile_wallet: 'Mobile wallet',
    card_settlement: 'Card settlement',
  }
  const KIND_OPTIONS: CashBankAccountKind[] = ['cash_drawer', 'petty_cash', 'bank', 'mobile_wallet', 'card_settlement']

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let cashBankAccounts: CashBankAccountRow[] = []
  let glAccounts: GlAccountFlatRow[] = []
  $: glAccountMap = new Map(glAccounts.map((a) => [a.glAccountId, a]))
  // POST /cash-bank-accounts requires a postable, active leaf under a gl_account_sub with
  // subledgerKind='cash_bank' -- filtered client-side after fetching the flat, unfiltered list
  // (no server-side filter param exists for this).
  $: cashBankEligibleAccounts = glAccounts.filter((a) => a.subledgerKind === 'cash_bank' && a.isPostable && a.isActive)

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [accountsResult, glResult] = await Promise.all([
        accountingApi.listCashBankAccounts({ limit: 200 }),
        accountingApi.listAccountsFlat(),
      ])
      cashBankAccounts = accountsResult.cashBankAccounts
      glAccounts = glResult.data
    } catch (err) {
      loadError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load cash/bank accounts.'
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  // ---- create account modal ----------------------------------------------------------------
  let createOpen = false
  let createLoading = false
  let createError = ''
  let formErrors: Record<string, string> = {}
  let idempotencyKey = ''

  let accountKind: CashBankAccountKind | '' = ''
  let glAccountId: number | '' = ''
  let bankName = ''
  let branchName = ''
  let accountNo = ''
  let iban = ''
  let allowNegative = false
  let isDefaultForSales = false

  function openCreate(): void {
    createOpen = true
    createError = ''
    formErrors = {}
    accountKind = ''
    glAccountId = ''
    bankName = ''
    branchName = ''
    accountNo = ''
    iban = ''
    allowNegative = false
    isDefaultForSales = false
    idempotencyKey = api.newIdempotencyKey()
  }

  function closeCreate(): void {
    createOpen = false
  }

  function validateCreate(): boolean {
    const next: Record<string, string> = {}
    if (accountKind === '') next.accountKind = 'Select an account kind.'
    if (glAccountId === '') next.glAccountId = 'Select the GL account this cash/bank account is bound to.'
    formErrors = next
    return Object.keys(next).length === 0
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validateCreate()) return
    createLoading = true
    try {
      const input: CreateCashBankAccountInput = {
        glAccountId: glAccountId as number,
        accountKind: accountKind as CashBankAccountKind,
      }
      if (accountKind === 'bank') {
        if (bankName.trim()) input.bankName = bankName.trim()
        if (branchName.trim()) input.branchName = branchName.trim()
        if (accountNo.trim()) input.accountNo = accountNo.trim()
        if (iban.trim()) input.iban = iban.trim()
      }
      if (allowNegative) input.allowNegative = true
      if (isDefaultForSales) input.isDefaultForSales = true
      await accountingApi.createCashBankAccount(input, idempotencyKey)
      toast.success('Cash/bank account created.')
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
        createError = err instanceof ApiNetworkError ? err.message : 'Could not create this cash/bank account.'
      }
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }

  // ---- transfer modal -----------------------------------------------------------------------
  let transferOpen = false
  let transferLoading = false
  let transferError = ''
  let transferFormErrors: Record<string, string> = {}
  let transferIdempotencyKey = ''

  let fromCashBankAccountId: number | '' = ''
  let toCashBankAccountId: number | '' = ''
  let transferAmount = ''
  let transferDate = todayYmd()
  let transferMemo = ''

  function accountLabel(row: CashBankAccountRow): string {
    const gl = glAccountMap.get(row.glAccountId)
    const parts = [KIND_LABELS[row.accountKind]]
    if (row.bankName) parts.push(row.bankName)
    if (row.accountNo) parts.push(row.accountNo)
    if (gl) parts.push(`(${gl.code})`)
    return parts.join(' — ')
  }

  function openTransfer(): void {
    transferOpen = true
    transferError = ''
    transferFormErrors = {}
    fromCashBankAccountId = ''
    toCashBankAccountId = ''
    transferAmount = ''
    transferDate = todayYmd()
    transferMemo = ''
    transferIdempotencyKey = api.newIdempotencyKey()
  }

  function closeTransfer(): void {
    transferOpen = false
  }

  function validateTransfer(): boolean {
    const next: Record<string, string> = {}
    if (fromCashBankAccountId === '') next.fromCashBankAccountId = 'Select the source account.'
    if (toCashBankAccountId === '') next.toCashBankAccountId = 'Select the destination account.'
    if (fromCashBankAccountId !== '' && fromCashBankAccountId === toCashBankAccountId) {
      next.toCashBankAccountId = 'Must be different from the source account.'
    }
    if (!transferAmount.trim() || Number(transferAmount) <= 0) next.amount = 'Enter an amount greater than zero.'
    if (!transferDate) next.transferDate = 'Transfer date is required.'
    transferFormErrors = next
    return Object.keys(next).length === 0
  }

  async function submitTransfer(): Promise<void> {
    transferError = ''
    if (!validateTransfer()) return
    transferLoading = true
    try {
      const result = await accountingApi.createCashBankTransfer(
        {
          fromCashBankAccountId: fromCashBankAccountId as number,
          toCashBankAccountId: toCashBankAccountId as number,
          amount: transferAmount.trim(),
          transferDate,
          ...(transferMemo.trim() ? { memo: transferMemo.trim() } : {}),
        },
        transferIdempotencyKey,
      )
      toast.success('Transfer posted as journal entry ' + result.entry.entryNo + '.')
      closeTransfer()
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) {
        transferError = err.detail
        if (err.fieldErrors) {
          const next: Record<string, string> = {}
          for (const fe of err.fieldErrors) next[fe.path] = fe.message
          transferFormErrors = { ...transferFormErrors, ...next }
        }
      } else {
        transferError = err instanceof ApiNetworkError ? err.message : 'Could not post this transfer.'
      }
      toast.error(transferError)
    } finally {
      transferLoading = false
    }
  }

  // ---- book (ledger) modal -------------------------------------------------------------------
  let bookOpen = false
  let bookAccount: CashBankAccountRow | null = null
  let bookLoading = false
  let bookError = ''
  let bookResult: CashBankBookResult | null = null
  let bookFrom = ''
  let bookTo = ''

  async function loadBook(): Promise<void> {
    if (!bookAccount) return
    bookLoading = true
    bookError = ''
    try {
      const params: { cashBankAccountId: number; from?: string; to?: string; limit?: number } = {
        cashBankAccountId: bookAccount.cashBankAccountId,
        limit: 200,
      }
      if (bookFrom) params.from = bookFrom
      if (bookTo) params.to = bookTo
      bookResult = await accountingApi.getCashBankBook(params)
    } catch (err) {
      bookError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this account’s book.'
    } finally {
      bookLoading = false
    }
  }

  function openBook(row: CashBankAccountRow): void {
    bookAccount = row
    bookOpen = true
    bookResult = null
    bookError = ''
    bookFrom = ''
    bookTo = ''
    void loadBook()
  }

  function closeBook(): void {
    bookOpen = false
    bookAccount = null
    bookResult = null
    bookError = ''
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Cash &amp; bank accounts</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Cash drawers, petty cash, bank accounts, mobile wallets and card settlement accounts.</p>
    </div>
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        on:click={openTransfer}
      >
        <Icon icon={Icons.arrowRight} className="w-[18px] h-[18px]" />
        Transfer
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
        on:click={openCreate}
      >
        <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
        Add account
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
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Cash and bank accounts table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Kind</th>
            <th class={headClass}>Bank / Branch</th>
            <th class={headClass}>Account no</th>
            <th class={headClass}>GL account</th>
            <th class={headClass}>Active</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if cashBankAccounts.length === 0}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No cash/bank accounts yet.</td></tr>
          {:else}
            {#each cashBankAccounts as row (row.cashBankAccountId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer" on:click={() => openBook(row)}>
                <td class={cellClass}>{KIND_LABELS[row.accountKind]}</td>
                <td class={cellClass}>{row.bankName ?? '—'}{row.branchName ? ` / ${row.branchName}` : ''}</td>
                <td class={cellClass}>{row.accountNo ?? '—'}</td>
                <td class={cellClass}>{glAccountMap.get(row.glAccountId)?.code ?? `#${row.glAccountId}`}</td>
                <td class={cellClass}><Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td class={`${cellClass} text-right`}>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                    on:click|stopPropagation={() => openBook(row)}
                  >
                    View book
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<Modal open={createOpen} title="Add cash/bank account" widthClass="max-w-2xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="cb-kind">Account kind<span class="text-danger-500"> *</span></label>
        <select id="cb-kind" bind:value={accountKind} class={inputClass}>
          <option value="">Select kind…</option>
          {#each KIND_OPTIONS as kind}
            <option value={kind}>{KIND_LABELS[kind]}</option>
          {/each}
        </select>
        {#if formErrors.accountKind}<p class="text-xs text-danger-500 mt-1">{formErrors.accountKind}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="cb-gl-account">GL account<span class="text-danger-500"> *</span></label>
        <select id="cb-gl-account" bind:value={glAccountId} class={inputClass}>
          <option value="">Select GL account…</option>
          {#each cashBankEligibleAccounts as acct (acct.glAccountId)}
            <option value={acct.glAccountId}>{acct.code} — {acct.name}</option>
          {/each}
        </select>
        {#if formErrors.glAccountId}<p class="text-xs text-danger-500 mt-1">{formErrors.glAccountId}</p>{/if}
        {#if cashBankEligibleAccounts.length === 0}
          <p class="text-xs text-secondary-400 mt-1">No postable, active GL leaf under a "cash_bank" sub-ledger was found.</p>
        {/if}
      </div>
    </div>

    {#if accountKind === 'bank'}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class={labelClass} for="cb-bank-name">Bank name</label>
          <input id="cb-bank-name" type="text" bind:value={bankName} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="cb-branch-name">Branch name</label>
          <input id="cb-branch-name" type="text" bind:value={branchName} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="cb-account-no">Account no</label>
          <input id="cb-account-no" type="text" bind:value={accountNo} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="cb-iban">IBAN</label>
          <input id="cb-iban" type="text" bind:value={iban} class={inputClass} />
        </div>
      </div>
    {/if}

    <div class="flex items-center gap-6">
      <label class="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer">
        <input type="checkbox" bind:checked={allowNegative} />
        Allow negative balance
      </label>
      <label class="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer">
        <input type="checkbox" bind:checked={isDefaultForSales} />
        Default for sales
      </label>
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
      disabled={createLoading}
    >
      {createLoading ? 'Submitting…' : 'Submit'}
    </button>
  </svelte:fragment>
</Modal>

<Modal open={transferOpen} title="Transfer between cash/bank accounts" widthClass="max-w-2xl" onClose={closeTransfer}>
  {#if transferError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {transferError}
    </div>
  {/if}
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="cb-transfer-from">From account<span class="text-danger-500"> *</span></label>
        <select id="cb-transfer-from" bind:value={fromCashBankAccountId} class={inputClass}>
          <option value="">Select account…</option>
          {#each cashBankAccounts as row (row.cashBankAccountId)}
            <option value={row.cashBankAccountId}>{accountLabel(row)}</option>
          {/each}
        </select>
        {#if transferFormErrors.fromCashBankAccountId}<p class="text-xs text-danger-500 mt-1">{transferFormErrors.fromCashBankAccountId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="cb-transfer-to">To account<span class="text-danger-500"> *</span></label>
        <select id="cb-transfer-to" bind:value={toCashBankAccountId} class={inputClass}>
          <option value="">Select account…</option>
          {#each cashBankAccounts as row (row.cashBankAccountId)}
            <option value={row.cashBankAccountId}>{accountLabel(row)}</option>
          {/each}
        </select>
        {#if transferFormErrors.toCashBankAccountId}<p class="text-xs text-danger-500 mt-1">{transferFormErrors.toCashBankAccountId}</p>{/if}
      </div>
      <DecimalInput bind:value={transferAmount} label="Amount" id="cb-transfer-amount" scale={2} prefix="Rs" required error={transferFormErrors.amount} />
      <div>
        <label class={labelClass} for="cb-transfer-date">Transfer date<span class="text-danger-500"> *</span></label>
        <input id="cb-transfer-date" type="date" bind:value={transferDate} class={inputClass} />
        {#if transferFormErrors.transferDate}<p class="text-xs text-danger-500 mt-1">{transferFormErrors.transferDate}</p>{/if}
      </div>
      <div class="sm:col-span-2">
        <label class={labelClass} for="cb-transfer-memo">Memo</label>
        <input id="cb-transfer-memo" type="text" bind:value={transferMemo} class={inputClass} placeholder="Optional" />
      </div>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeTransfer}
      disabled={transferLoading}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      on:click={submitTransfer}
      disabled={transferLoading}
    >
      {transferLoading ? 'Submitting…' : 'Submit'}
    </button>
  </svelte:fragment>
</Modal>

<Modal open={bookOpen} title={bookAccount ? `Book — ${accountLabel(bookAccount)}` : 'Account book'} widthClass="max-w-4xl" onClose={closeBook}>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class={labelClass} for="cb-book-from">From</label>
        <input id="cb-book-from" type="date" bind:value={bookFrom} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="cb-book-to">To</label>
        <input id="cb-book-to" type="date" bind:value={bookTo} class={inputClass} />
      </div>
      <button
        type="button"
        class="px-4 py-2 rounded-lg text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        on:click={loadBook}
        disabled={bookLoading}
      >
        Apply
      </button>
      {#if bookFrom || bookTo}
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          on:click={() => { bookFrom = ''; bookTo = ''; loadBook() }}
          disabled={bookLoading}
        >
          Clear
        </button>
      {/if}
    </div>

    <LedgerTable
      lines={bookResult?.lines ?? []}
      openingBalance={bookResult?.openingBalance ?? '0.00'}
      closingBalance={bookResult?.closingBalance ?? '0.00'}
      loading={bookLoading}
      error={bookError}
    />
  </div>
</Modal>
