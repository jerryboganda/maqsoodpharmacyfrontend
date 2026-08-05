<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { accountingApi, formatMoney, formatDate, todayYmd, ApiError, ApiNetworkError } from '../../api'
  import type { CashBankAccountRow, CashBankReconciliationRow, ReconciliationCandidateLine } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  // -----------------------------------------------------------------------------------------
  // Step 1: pick a bank account + statement details, then start
  // -----------------------------------------------------------------------------------------
  let bankAccounts: CashBankAccountRow[] = []
  let accountsLoading = true
  let selectedAccountId = ''
  let statementDate = todayYmd()
  let statementClosingBalance = ''
  let startError = ''
  let starting = false

  async function loadAccounts(): Promise<void> {
    accountsLoading = true
    try {
      const result = await accountingApi.listCashBankAccounts({ accountKind: 'bank', isActive: true, limit: 200 })
      bankAccounts = result.cashBankAccounts
    } catch {
      bankAccounts = []
    } finally {
      accountsLoading = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Step 2: an in-progress reconciliation -- pick matching lines, then complete
  // -----------------------------------------------------------------------------------------
  let reconciliation: CashBankReconciliationRow | null = null
  let candidateLines: ReconciliationCandidateLine[] = []
  let selectedLineIds: number[] = []
  let completeReason = ''
  let completing = false
  let completeError = ''

  // A same-sign running total for on-screen feedback only (debit - credit, the normal-balance
  // sign every seeded "bank" account this feature targets uses) -- the server is the sole source
  // of truth for whether the matched set actually equals the statement balance.
  $: runningTotal = candidateLines
    .filter((l) => selectedLineIds.includes(l.journalLineId))
    .reduce((sum, l) => sum + (Number(l.debit) - Number(l.credit)), 0)

  async function startReconciliation(): Promise<void> {
    startError = ''
    const accountId = Number(selectedAccountId)
    if (!Number.isInteger(accountId) || accountId <= 0) {
      startError = 'Select a bank account.'
      return
    }
    if (!statementClosingBalance) {
      startError = 'Enter the statement closing balance.'
      return
    }
    starting = true
    try {
      const result = await accountingApi.startReconciliation(
        { cashBankAccountId: accountId, statementDate, statementClosingBalance },
        crypto.randomUUID(),
      )
      reconciliation = result.reconciliation
      candidateLines = result.unreconciledLines
      selectedLineIds = []
      completeReason = ''
      completeError = ''
      toast.success(`Reconciliation ${result.reconciliation.reconciliationId} started -- ${result.unreconciledLines.length} candidate line(s).`)
    } catch (err) {
      if (err instanceof ApiError) startError = err.detail || err.message
      else if (err instanceof ApiNetworkError) startError = err.message
      else startError = 'Could not start the reconciliation.'
    } finally {
      starting = false
    }
  }

  async function completeReconciliation(): Promise<void> {
    if (!reconciliation) return
    completeError = ''
    completing = true
    try {
      const result = await accountingApi.completeReconciliation(
        reconciliation.reconciliationId,
        { matchedLineIds: selectedLineIds, reason: completeReason.trim() || undefined },
        crypto.randomUUID(),
      )
      reconciliation = result.reconciliation
      toast.success('Reconciliation completed -- statement fully explained.')
    } catch (err) {
      if (err instanceof ApiError) completeError = err.detail || err.message
      else if (err instanceof ApiNetworkError) completeError = err.message
      else completeError = 'Could not complete the reconciliation.'
    } finally {
      completing = false
    }
  }

  function startAnother(): void {
    reconciliation = null
    candidateLines = []
    selectedLineIds = []
    statementClosingBalance = ''
  }

  onMount(() => {
    void loadAccounts()
  })
</script>

<div class="space-y-6">
  <div>
    <h1 class="heading-2">Cash &amp; bank reconciliation</h1>
    <p class="text-body-sm mt-1 text-secondary-500">Match posted journal lines against a bank statement. A reconciliation only completes when the matched lines' net effect exactly equals the statement's closing balance -- any difference must be re-explained by selecting different lines, never auto-adjusted.</p>
  </div>

  {#if !reconciliation}
    <div class="card p-6 max-w-xl space-y-4">
      <h2 class="heading-5">Start a reconciliation</h2>
      <div>
        <label class={labelClass} for="recon-account">Bank account <span class="text-danger-500">*</span></label>
        {#if accountsLoading}
          <p class="text-sm text-secondary-500">Loading accounts…</p>
        {:else}
          <select id="recon-account" bind:value={selectedAccountId} class={inputClass}>
            <option value="">Select…</option>
            {#each bankAccounts as acc (acc.cashBankAccountId)}
              <option value={acc.cashBankAccountId}>{acc.bankName ?? `Account #${acc.cashBankAccountId}`}{acc.accountNo ? ` — ${acc.accountNo}` : ''}</option>
            {/each}
          </select>
        {/if}
      </div>
      <div>
        <label class={labelClass} for="recon-date">Statement date <span class="text-danger-500">*</span></label>
        <input id="recon-date" type="date" bind:value={statementDate} class={inputClass} />
      </div>
      <DecimalInput bind:value={statementClosingBalance} label="Statement closing balance" id="recon-balance" scale={2} prefix="Rs" required allowNegative />
      {#if startError}<p class="text-xs text-danger-500">{startError}</p>{/if}
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        on:click={startReconciliation}
        disabled={starting}
      >
        {starting ? 'Starting…' : 'Start reconciliation'}
      </button>
    </div>
  {:else}
    <div class="card p-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <div>
          <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Reconciliation</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">#{reconciliation.reconciliationId}</p>
        </div>
        <div>
          <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Statement date</p>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{formatDate(reconciliation.statementDate)}</p>
        </div>
        <div>
          <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Closing balance</p>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{formatMoney(reconciliation.statementClosingBalance)}</p>
        </div>
        <div>
          <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Status</p>
          {#if reconciliation.status === 'completed'}<Badge tone="success">Completed</Badge>{:else}<Badge tone="warning">Open</Badge>{/if}
        </div>
        {#if reconciliation.differenceAmount !== null}
          <div>
            <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Difference</p>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{formatMoney(reconciliation.differenceAmount)}</p>
          </div>
        {/if}
      </div>
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={startAnother}>
        <Icon icon={Icons.plus} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Start another
      </button>
    </div>

    {#if reconciliation.status === 'open'}
      <div class="card rounded-xl p-0 overflow-hidden">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Candidate journal lines table">
          <table class="w-full">
            <thead class="bg-surface-50 dark:bg-surface-900/30">
              <tr>
                <th class={`${headClass} py-3 px-4`}></th>
                <th class={`${headClass} py-3 px-4`}>Entry</th>
                <th class={`${headClass} py-3 px-4`}>Date</th>
                <th class={`${headClass} py-3 px-4`}>Description</th>
                <th class={`${headClass} py-3 px-4 text-right`}>Debit</th>
                <th class={`${headClass} py-3 px-4 text-right`}>Credit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              {#if candidateLines.length === 0}
                <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No unreconciled lines on or before this statement date.</td></tr>
              {:else}
                {#each candidateLines as line (line.journalLineId)}
                  <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                    <td class={`${cellClass}`}><input type="checkbox" bind:group={selectedLineIds} value={line.journalLineId} class="rounded border-surface-300 dark:border-surface-700 text-theme-primary focus:ring-theme-primary/30" /></td>
                    <td class={cellClass}>{line.entryNo}</td>
                    <td class={cellClass}>{formatDate(line.entryDate)}</td>
                    <td class={cellClass}>{line.description}</td>
                    <td class={`${cellClass} text-right`}>{Number(line.debit) > 0 ? formatMoney(line.debit) : ''}</td>
                    <td class={`${cellClass} text-right`}>{Number(line.credit) > 0 ? formatMoney(line.credit) : ''}</td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-secondary-500">Selected lines' net effect</p>
            <p class="text-lg font-semibold text-secondary-900 dark:text-white">{formatMoney(runningTotal.toFixed(2))}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-secondary-500">Statement closing balance</p>
            <p class="text-lg font-semibold text-secondary-900 dark:text-white">{formatMoney(reconciliation.statementClosingBalance)}</p>
          </div>
        </div>
        <div>
          <label class={labelClass} for="complete-reason">Reason (optional)</label>
          <input id="complete-reason" bind:value={completeReason} class={inputClass} placeholder="Any notes for this reconciliation" />
        </div>
        {#if completeError}<p class="text-xs text-danger-500">{completeError}</p>{/if}
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          on:click={completeReconciliation}
          disabled={completing || selectedLineIds.length === 0}
        >
          {completing ? 'Completing…' : 'Complete reconciliation'}
        </button>
      </div>
    {:else}
      <div class="card border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 p-4 text-sm flex items-center gap-2">
        <Icon icon={Icons.circleCheck} className="w-5 h-5 shrink-0" />
        This reconciliation is complete -- the matched lines' net effect exactly equalled the statement closing balance.
      </div>
    {/if}
  {/if}
</div>
