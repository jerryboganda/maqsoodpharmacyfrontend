<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { accountingApi, cashierShiftApi, formatMoney, formatDateTime, ApiError, ApiNetworkError } from '../../api'
  import type { CashBankAccountRow, CashierShiftRow, CashierShiftStatus, CashierShiftZReportResult } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  // D4 (PKR-only) -- the exact fixed set common/authz-adjacent cashier-shift.service.ts's own
  // PKR_DENOMINATIONS validates against server-side; must match exactly or count() 422s.
  const PKR_DENOMINATIONS = ['5000.00', '1000.00', '500.00', '100.00', '50.00', '20.00', '10.00', '5.00', '2.00', '1.00']

  const STATUS_TONE: Record<CashierShiftStatus, 'warning' | 'info' | 'success'> = { open: 'warning', closed: 'info', approved: 'success' }

  // -----------------------------------------------------------------------------------------
  // List
  // -----------------------------------------------------------------------------------------
  let rows: CashierShiftRow[] = []
  let loading = true
  let loadError = ''
  let statusFilter: CashierShiftStatus | '' = ''

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await cashierShiftApi.list({ status: statusFilter || undefined, limit: 200 })
      rows = result.cashierShifts
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load cashier shifts.'
    } finally {
      loading = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Open a shift
  // -----------------------------------------------------------------------------------------
  let tills: CashBankAccountRow[] = []
  let openModalOpen = false
  let openSubmitting = false
  let openError = ''
  let openTillId = ''
  let openingFloat = ''

  async function loadTills(): Promise<void> {
    try {
      const [drawers, petty] = await Promise.all([
        accountingApi.listCashBankAccounts({ accountKind: 'cash_drawer', isActive: true, limit: 200 }),
        accountingApi.listCashBankAccounts({ accountKind: 'petty_cash', isActive: true, limit: 200 }),
      ])
      tills = [...drawers.cashBankAccounts, ...petty.cashBankAccounts]
    } catch {
      tills = []
    }
  }

  function openOpenModal(): void {
    openTillId = ''
    openingFloat = '0.00'
    openError = ''
    openModalOpen = true
  }
  function closeOpenModal(): void {
    if (openSubmitting) return
    openModalOpen = false
  }
  async function submitOpen(): Promise<void> {
    openError = ''
    const tillId = Number(openTillId)
    if (!Number.isInteger(tillId) || tillId <= 0) {
      openError = 'Select a till.'
      return
    }
    if (!openingFloat) {
      openError = 'Enter the opening float amount.'
      return
    }
    openSubmitting = true
    try {
      await cashierShiftApi.open({ cashBankAccountId: tillId, openingFloatAmount: openingFloat }, crypto.randomUUID())
      toast.success('Shift opened.')
      openModalOpen = false
      await load()
    } catch (err) {
      if (err instanceof ApiError) openError = err.detail || err.message
      else if (err instanceof ApiNetworkError) openError = err.message
      else openError = 'Could not open the shift.'
    } finally {
      openSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Count (blind)
  // -----------------------------------------------------------------------------------------
  let countModalOpen = false
  let countSubmitting = false
  let countError = ''
  let countTarget: CashierShiftRow | null = null
  let countValues: Record<string, number> = {}
  let countResult: { countedTotal: string; expectedCash: string; variance: string } | null = null

  function openCount(row: CashierShiftRow): void {
    countTarget = row
    countValues = Object.fromEntries(PKR_DENOMINATIONS.map((d) => [d, 0]))
    countResult = null
    countError = ''
    countModalOpen = true
  }
  function closeCountModal(): void {
    if (countSubmitting) return
    countModalOpen = false
    countTarget = null
  }
  async function submitCount(): Promise<void> {
    if (!countTarget) return
    countError = ''
    const counts = PKR_DENOMINATIONS.filter((d) => (countValues[d] ?? 0) > 0).map((d) => ({ denominationAmount: d, denominationCount: countValues[d] ?? 0 }))
    if (counts.length === 0) {
      countError = 'Enter at least one denomination count.'
      return
    }
    countSubmitting = true
    try {
      const result = await cashierShiftApi.count(countTarget.cashierShiftId, { counts }, crypto.randomUUID())
      countResult = result
      toast.success('Count recorded.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) countError = err.detail || err.message
      else if (err instanceof ApiNetworkError) countError = err.message
      else countError = 'Could not record the count.'
    } finally {
      countSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Close
  // -----------------------------------------------------------------------------------------
  let closeModalOpen = false
  let closeSubmitting = false
  let closeErrorMsg = ''
  let closeTarget: CashierShiftRow | null = null
  let closeReason = ''

  function openClose(row: CashierShiftRow): void {
    closeTarget = row
    closeReason = ''
    closeErrorMsg = ''
    closeModalOpen = true
  }
  function closeCloseModal(): void {
    if (closeSubmitting) return
    closeModalOpen = false
    closeTarget = null
  }
  async function submitClose(): Promise<void> {
    if (!closeTarget) return
    closeErrorMsg = ''
    closeSubmitting = true
    try {
      await cashierShiftApi.close(closeTarget.cashierShiftId, { varianceReason: closeReason.trim() || undefined }, crypto.randomUUID())
      toast.success('Shift closed.')
      closeModalOpen = false
      closeTarget = null
      await load()
    } catch (err) {
      if (err instanceof ApiError) closeErrorMsg = err.detail || err.message
      else if (err instanceof ApiNetworkError) closeErrorMsg = err.message
      else closeErrorMsg = 'Could not close the shift.'
    } finally {
      closeSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Approve
  // -----------------------------------------------------------------------------------------
  let approvingId: number | null = null
  async function approve(row: CashierShiftRow): Promise<void> {
    approvingId = row.cashierShiftId
    try {
      await cashierShiftApi.approve(row.cashierShiftId, {}, crypto.randomUUID())
      toast.success('Shift approved.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not approve the shift -- the cashier who opened it cannot approve their own closure.')
    } finally {
      approvingId = null
    }
  }

  // -----------------------------------------------------------------------------------------
  // Z-report
  // -----------------------------------------------------------------------------------------
  let zReportModalOpen = false
  let zReportLoading = false
  let zReport: CashierShiftZReportResult | null = null

  async function openZReport(row: CashierShiftRow): Promise<void> {
    zReportModalOpen = true
    zReportLoading = true
    zReport = null
    try {
      zReport = await cashierShiftApi.zReport(row.cashierShiftId)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else toast.error('Could not load the z-report.')
      zReportModalOpen = false
    } finally {
      zReportLoading = false
    }
  }

  onMount(() => {
    void loadTills()
    void load()
  })
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Cashier shifts</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Open a till, count it blind at end of shift, close, and get a supervisor sign-off. No GL entry is posted for the counted variance -- see the z-report for the honest figure.</p>
    </div>
    <button type="button" class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors" on:click={openOpenModal}>
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
      Open shift
    </button>
  </div>

  <div class="flex items-center gap-2">
    {#each [['', 'All'], ['open', 'Open'], ['closed', 'Closed'], ['approved', 'Approved']] as [value, label] (value)}
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors {statusFilter === value ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700'}"
        on:click={() => { statusFilter = value as CashierShiftStatus | ''; load() }}
      >
        {label}
      </button>
    {/each}
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">{loadError}</div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Cashier shifts table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Shift</th>
            <th class={`${headClass} py-3 px-4`}>Cashier</th>
            <th class={`${headClass} py-3 px-4`}>Opened</th>
            <th class={`${headClass} py-3 px-4`}>Status</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Variance</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No cashier shifts found.</td></tr>
          {:else}
            {#each rows as row (row.cashierShiftId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{row.docNumber}</td>
                <td class={cellClass}>User #{row.userId}</td>
                <td class={cellClass}>{formatDateTime(row.openedAt)}</td>
                <td class={cellClass}><Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge></td>
                <td class={`${cellClass} text-right`}>{row.varianceAmount !== null ? formatMoney(row.varianceAmount) : '—'}</td>
                <td class={`${cellClass} text-right`}>
                  <div class="inline-flex items-center gap-2">
                    {#if row.status === 'open'}
                      <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700" on:click={() => openCount(row)}>Count</button>
                      <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-primary text-white hover:opacity-90 disabled:opacity-50" disabled={row.countedCashAmount === null} on:click={() => openClose(row)}>Close</button>
                    {:else if row.status === 'closed'}
                      <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900 disabled:opacity-50" disabled={approvingId === row.cashierShiftId} on:click={() => approve(row)}>
                        {approvingId === row.cashierShiftId ? 'Approving…' : 'Approve'}
                      </button>
                    {/if}
                    <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700" on:click={() => openZReport(row)}>Z-report</button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Open shift -->
<Modal open={openModalOpen} title="Open a cashier shift" widthClass="max-w-lg" onClose={closeOpenModal}>
  <form id="open-shift-form" on:submit|preventDefault={submitOpen} class="space-y-4">
    <div>
      <label class={labelClass} for="open-till">Till <span class="text-danger-500">*</span></label>
      <select id="open-till" bind:value={openTillId} class={inputClass}>
        <option value="">Select…</option>
        {#each tills as t (t.cashBankAccountId)}
          <option value={t.cashBankAccountId}>{t.bankName ?? `Till #${t.cashBankAccountId}`} ({t.accountKind})</option>
        {/each}
      </select>
      <p class="mt-1 text-xs text-secondary-500">Only cash_drawer/petty_cash accounts can be opened as a shift till.</p>
    </div>
    <DecimalInput bind:value={openingFloat} label="Opening float" id="open-float" scale={2} prefix="Rs" required />
    {#if openError}<p class="text-xs text-danger-500">{openError}</p>{/if}
  </form>
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeOpenModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={openSubmitting}>Cancel</button>
    <button type="submit" form="open-shift-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={openSubmitting}>{openSubmitting ? 'Opening…' : 'Open shift'}</button>
  </svelte:fragment>
</Modal>

<!-- Blind count -->
<Modal open={countModalOpen} title={countTarget ? `Count shift ${countTarget.docNumber}` : 'Count'} widthClass="max-w-lg" onClose={closeCountModal}>
  {#if countTarget}
    <form id="count-form" on:submit|preventDefault={submitCount} class="space-y-3">
      <p class="text-xs text-secondary-500">Enter how many of each note/coin are in the till. The expected figure is only revealed once you submit this count.</p>
      <div class="grid grid-cols-2 gap-3">
        {#each PKR_DENOMINATIONS as d (d)}
          <div class="flex items-center gap-2">
            <span class="w-16 text-sm text-secondary-700 dark:text-secondary-300 shrink-0">Rs {Number(d)}</span>
            <input type="number" min="0" step="1" bind:value={countValues[d]} class={inputClass} />
          </div>
        {/each}
      </div>
      {#if countError}<p class="text-xs text-danger-500">{countError}</p>{/if}
      {#if countResult}
        <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 grid grid-cols-3 gap-2 text-center">
          <div><p class="text-xs text-secondary-500">Counted</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(countResult.countedTotal)}</p></div>
          <div><p class="text-xs text-secondary-500">Expected</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(countResult.expectedCash)}</p></div>
          <div><p class="text-xs text-secondary-500">Variance</p><p class="text-sm font-semibold {Number(countResult.variance) === 0 ? 'text-success-600' : 'text-danger-600'}">{formatMoney(countResult.variance)}</p></div>
        </div>
      {/if}
    </form>
  {/if}
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeCountModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={countSubmitting}>{countResult ? 'Done' : 'Cancel'}</button>
    {#if !countResult}
      <button type="submit" form="count-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={countSubmitting}>{countSubmitting ? 'Submitting…' : 'Submit count'}</button>
    {:else}
      <button type="button" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity" on:click={() => { countResult = null }}>Re-count</button>
    {/if}
  </svelte:fragment>
</Modal>

<!-- Close -->
<Modal open={closeModalOpen} title={closeTarget ? `Close shift ${closeTarget.docNumber}` : 'Close shift'} widthClass="max-w-md" onClose={closeCloseModal}>
  {#if closeTarget}
    <form id="close-form" on:submit|preventDefault={submitClose} class="space-y-4">
      {#if closeTarget.varianceAmount !== null && Number(closeTarget.varianceAmount) !== 0}
        <div class="rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 p-3 text-sm">
          This shift has a variance of {formatMoney(closeTarget.varianceAmount)} -- a reason is required to close it.
        </div>
      {/if}
      <div>
        <label class={labelClass} for="close-reason">Variance reason {#if closeTarget.varianceAmount !== null && Number(closeTarget.varianceAmount) !== 0}<span class="text-danger-500">*</span>{/if}</label>
        <textarea id="close-reason" bind:value={closeReason} rows="3" class={inputClass} placeholder="Explain any over/short amount"></textarea>
      </div>
      {#if closeErrorMsg}<p class="text-xs text-danger-500">{closeErrorMsg}</p>{/if}
    </form>
  {/if}
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeCloseModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={closeSubmitting}>Cancel</button>
    <button type="submit" form="close-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={closeSubmitting}>{closeSubmitting ? 'Closing…' : 'Close shift'}</button>
  </svelte:fragment>
</Modal>

<!-- Z-report -->
<Modal open={zReportModalOpen} title="Z-report" widthClass="max-w-xl" onClose={() => (zReportModalOpen = false)}>
  {#if zReportLoading}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if zReport}
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><p class="text-xs text-secondary-500">Opening float</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(zReport.openingFloat)}</p></div>
        <div><p class="text-xs text-secondary-500">Expected cash</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(zReport.expectedCash)}</p></div>
        <div><p class="text-xs text-secondary-500">Counted cash</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{zReport.countedCash !== null ? formatMoney(zReport.countedCash) : 'Not yet counted'}</p></div>
        <div><p class="text-xs text-secondary-500">Variance</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{zReport.variance !== null ? formatMoney(zReport.variance) : '—'}</p></div>
        <div><p class="text-xs text-secondary-500">Sale returns paid out</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(zReport.returns)}</p></div>
        <div><p class="text-xs text-secondary-500">Expenses paid</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(zReport.expensesPaid)}</p></div>
        <div><p class="text-xs text-secondary-500">Invoice count</p><p class="text-sm font-semibold text-secondary-900 dark:text-white">{zReport.invoiceCount}</p></div>
      </div>
      <div>
        <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide mb-2">Sales by payment method</p>
        {#if zReport.salesByMethod.length === 0}
          <p class="text-sm text-secondary-500">No sales settled into this till during the shift.</p>
        {:else}
          <table class="w-full text-sm">
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              {#each zReport.salesByMethod as m (m.paymentMethodId)}
                <tr><td class="py-1.5">Payment method #{m.paymentMethodId}</td><td class="py-1.5 text-right">{formatMoney(m.total)}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  {/if}
  <svelte:fragment slot="footer">
    <button type="button" on:click={() => (zReportModalOpen = false)} class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Close</button>
  </svelte:fragment>
</Modal>
