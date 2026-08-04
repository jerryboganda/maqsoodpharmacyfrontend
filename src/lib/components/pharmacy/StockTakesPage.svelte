<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money/qty field on this page is a
  // decimal STRING end to end. The only Number()/parseFloat() calls below are pure UI tone/compare
  // checks (e.g. "is this line's variance positive, negative, or zero") that never feed back into
  // a request body -- the actual PUT .../lines payload sends the raw string the user typed into a
  // DecimalInput, same convention as StockAdjustmentsPage.svelte / PurchaseOrdersPage.svelte.
  //
  // Workflow shape: a list of stock takes (status badges + quick actions for the two single-click
  // transitions -- generate count sheet from draft, close from reviewed) that opens into a single
  // detail modal per take. The detail modal is a state-machine view, not a wizard with its own
  // steps: which section renders (the "generate count sheet" prompt, the editable counting table,
  // the generate-adjustments panel, the close button) is entirely driven by `detail.status` plus
  // the freshly-fetched variance totals, mirroring StockAdjustmentsPage/PurchaseOrdersPage's own
  // "no button offers a transition the server would reject" convention.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { inventoryApi, lookupsApi, catalogApi, api, ApiError, ApiNetworkError, formatMoney, formatQty, formatDate, formatDateTime, todayYmd } from '../../api'
  import type {
    StockTakeRow,
    StockTakeDetail,
    StockTakeVarianceResult,
    StockTakeVarianceLine,
    ItemSummary,
    StockLotRow,
    AdjustmentReason,
    CreateStockTakeInput,
    RecordStockTakeCountLineInput,
    GenerateStockTakeAdjustmentsInput,
    StockAdjustmentRow,
  } from '../../api'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  function toastApiError(err: unknown, fallback: string): void {
    if (err instanceof ApiError) toast.error(err.detail)
    else if (err instanceof ApiNetworkError) toast.error(err.message)
    else toast.error(fallback)
  }

  function statusTone(status: StockTakeRow['status']): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
    if (status === 'draft') return 'neutral'
    if (status === 'counting') return 'info'
    if (status === 'reviewed') return 'warning'
    if (status === 'closed') return 'success'
    return 'danger' // cancelled
  }

  function adjustmentStatusTone(status: StockAdjustmentRow['status']): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled' || status === 'reversed') return 'danger'
    return 'info'
  }

  // Positive variance (found more than expected) reads as "warning" -- unexpected, worth a look,
  // same tone StockAdjustmentsPage gives a manual decrease. Negative variance (found less --
  // shrinkage) reads as "danger", the more concerning direction. Zero/uncounted stay neutral.
  function varianceTone(qtyVariance: string | null): 'neutral' | 'warning' | 'danger' {
    if (qtyVariance === null) return 'neutral'
    const n = Number(qtyVariance)
    if (n === 0) return 'neutral'
    return n > 0 ? 'warning' : 'danger'
  }

  function varianceRowClass(qtyVariance: string | null): string {
    if (qtyVariance === null) return ''
    const n = Number(qtyVariance)
    if (n === 0) return ''
    return n > 0 ? 'bg-warning-50/60 dark:bg-warning-950/20' : 'bg-danger-50/60 dark:bg-danger-950/20'
  }

  // ---------------------------------------------------------------------------------------------
  // Shared item lookup -- used by both the create form's scope selector and the line item names in
  // the detail view's counting/variance table.
  // ---------------------------------------------------------------------------------------------
  let items: ItemSummary[] = []
  $: itemMap = new Map(items.map((i) => [i.itemId, i]))

  async function loadItems(): Promise<void> {
    try {
      const result = await catalogApi.listItems({ isActive: true, limit: 500 })
      items = result.items
    } catch {
      items = []
    }
  }

  // ---------------------------------------------------------------------------------------------
  // List state
  // ---------------------------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let rows: StockTakeRow[] = []
  let rowActionLoading: Record<number, 'sheet' | 'close' | undefined> = {}
  let searchQuery = ''
  let statusFilter: 'all' | StockTakeRow['status'] = 'all'
  const statusFilterOptions: Array<{ value: 'all' | StockTakeRow['status']; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'counting', label: 'Counting' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'closed', label: 'Closed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  // Client-side filters over already-fetched rows -- search matches doc number or scope (item
  // name / "All items"), same "no new API call" convention as ItemsPage/SuppliersPage's status
  // filters. Referencing `itemMap` directly (rather than via the `scopeLabel` helper) keeps it a
  // tracked dependency of this reactive statement.
  $: filteredRows = rows.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return true
    const scopeText = row.scopeItemId === null ? 'all items' : (itemMap.get(row.scopeItemId)?.name ?? '').toLowerCase()
    return row.docNumber.toLowerCase().includes(needle) || scopeText.includes(needle)
  })

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await inventoryApi.listStockTakes({ limit: 100 })
      rows = result.data
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load stock takes.'
    } finally {
      loading = false
    }
  }

  onMount(() => {
    void loadList()
    void loadItems()
  })

  // Row-action eligibility mirrors stock-take.service.ts's own status guards (only reachable
  // draft -> counting and reviewed -> closed transitions get a one-click row button; everything
  // else needs the detail view, since it needs freshly-fetched variance totals to gate correctly).
  function canGenerateSheet(row: StockTakeRow): boolean {
    return row.status === 'draft'
  }
  function canCloseDirect(row: StockTakeRow): boolean {
    return row.status === 'reviewed'
  }

  async function performGenerateSheet(stockTakeId: number, docNumber: string): Promise<void> {
    await inventoryApi.generateCountSheet(stockTakeId, api.newIdempotencyKey())
    toast.success(`Count sheet generated for ${docNumber}.`)
    await loadList()
    if (detailOpen && detail?.stockTakeId === stockTakeId) await refreshDetail(stockTakeId)
  }

  async function performClose(stockTakeId: number, docNumber: string): Promise<void> {
    await inventoryApi.closeStockTake(stockTakeId, undefined, api.newIdempotencyKey())
    toast.success(`Stock take ${docNumber} closed.`)
    await loadList()
    if (detailOpen && detail?.stockTakeId === stockTakeId) await refreshDetail(stockTakeId)
  }

  async function quickGenerateSheet(row: StockTakeRow): Promise<void> {
    rowActionLoading = { ...rowActionLoading, [row.stockTakeId]: 'sheet' }
    try {
      await performGenerateSheet(row.stockTakeId, row.docNumber)
    } catch (err) {
      toastApiError(err, 'Could not generate the count sheet.')
    } finally {
      const next = { ...rowActionLoading }
      delete next[row.stockTakeId]
      rowActionLoading = next
    }
  }

  async function quickClose(row: StockTakeRow): Promise<void> {
    rowActionLoading = { ...rowActionLoading, [row.stockTakeId]: 'close' }
    try {
      await performClose(row.stockTakeId, row.docNumber)
    } catch (err) {
      toastApiError(err, 'Could not close the stock take.')
    } finally {
      const next = { ...rowActionLoading }
      delete next[row.stockTakeId]
      rowActionLoading = next
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Create form state
  // ---------------------------------------------------------------------------------------------
  let createOpen = false
  let createSubmitting = false
  let createError = ''
  let createDocumentDate = todayYmd()
  let createScopeItemId: number | '' = ''
  let createNotes = ''
  let createIdempotencyKey = ''

  function openCreate(): void {
    createOpen = true
    createError = ''
    createDocumentDate = todayYmd()
    createScopeItemId = ''
    createNotes = ''
    createSubmitting = false
    createIdempotencyKey = api.newIdempotencyKey()
    if (items.length === 0) void loadItems()
  }

  function closeCreate(): void {
    createOpen = false
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    const input: CreateStockTakeInput = {
      documentDate: createDocumentDate,
      scopeItemId: createScopeItemId === '' ? undefined : (createScopeItemId as number),
      notes: createNotes.trim() !== '' ? createNotes.trim() : undefined,
    }
    createSubmitting = true
    try {
      const created = await inventoryApi.createStockTake(input, createIdempotencyKey)
      toast.success(`Stock take ${created.docNumber} created.`)
      createOpen = false
      await loadList()
      await openDetail(created)
    } catch (err) {
      createError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not create the stock take.'
      toast.error(createError)
    } finally {
      createSubmitting = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Detail state -- the whole count-sheet -> counting -> variance -> generate-adjustments -> close
  // workflow lives inside this one modal, gated section-by-section on `detail.status`.
  // ---------------------------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detail: StockTakeDetail | null = null
  let varianceResult: StockTakeVarianceResult | null = null
  let lotMap = new Map<number, StockLotRow>()
  let linkedAdjustments: { increase: StockAdjustmentRow | null; decrease: StockAdjustmentRow | null } = {
    increase: null,
    decrease: null,
  }

  // Every line needing a defined variance must be counted first (an uncounted line has no
  // variance, not a zero one) -- mirrors generateAdjustments()'s STOCKTAKE.LINES_NOT_COUNTED guard.
  $: allCounted = varianceResult !== null && varianceResult.totals.totalLines > 0 && varianceResult.totals.pendingLines === 0
  $: hasVariance = varianceResult !== null && varianceResult.totals.varianceLines > 0
  $: canRecordCounts = detail?.status === 'counting'
  $: canGenerateAdjustments = detail?.status === 'counting' && allCounted
  $: canCloseFromCounting = detail?.status === 'counting' && allCounted && !hasVariance
  $: canCloseFromReviewed = detail?.status === 'reviewed'

  async function openDetail(row: { stockTakeId: number }): Promise<void> {
    detailOpen = true
    detailError = ''
    detail = null
    varianceResult = null
    lotMap = new Map()
    linkedAdjustments = { increase: null, decrease: null }
    countsError = ''
    genError = ''
    genReasonId = ''
    genPostingDate = todayYmd()
    genNotes = ''
    await refreshDetail(row.stockTakeId)
  }

  function closeDetail(): void {
    detailOpen = false
    detail = null
    varianceResult = null
  }

  async function refreshDetail(stockTakeId: number): Promise<void> {
    detailLoading = true
    try {
      const [head, variance] = await Promise.all([
        inventoryApi.getStockTake(stockTakeId),
        inventoryApi.getStockTakeVariance(stockTakeId),
      ])
      detail = head
      varianceResult = variance
      resetCountInputs()
      await loadLotsForLines(variance.lines)

      if (head.status === 'counting' && reasons.length === 0 && !reasonsLoading) void loadReasons()

      if (head.increaseAdjustmentId !== null || head.decreaseAdjustmentId !== null) {
        const [increase, decrease] = await Promise.all([
          head.increaseAdjustmentId !== null ? inventoryApi.getAdjustment(head.increaseAdjustmentId).catch(() => null) : Promise.resolve(null),
          head.decreaseAdjustmentId !== null ? inventoryApi.getAdjustment(head.decreaseAdjustmentId).catch(() => null) : Promise.resolve(null),
        ])
        linkedAdjustments = { increase, decrease }
      } else {
        linkedAdjustments = { increase: null, decrease: null }
      }
    } catch (err) {
      detailError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this stock take.'
    } finally {
      detailLoading = false
    }
  }

  // Lot detail (batch/expiry) isn't projected onto stock_take_line itself -- resolved client-side
  // per unique item, the same shape StockAdjustmentsPage's own line-lot picker already fetches.
  async function loadLotsForLines(lines: StockTakeVarianceLine[]): Promise<void> {
    const itemIds = [...new Set(lines.map((l) => l.itemId))]
    if (itemIds.length === 0) {
      lotMap = new Map()
      return
    }
    const results = await Promise.all(
      itemIds.map((itemId) => inventoryApi.listLots({ itemId, limit: 200 }).catch(() => ({ data: [] as StockLotRow[] }))),
    )
    const map = new Map<number, StockLotRow>()
    for (const result of results) {
      for (const lot of result.data) map.set(lot.stockLotId, lot)
    }
    lotMap = map
  }

  function scopeLabel(row: { scopeItemId: number | null }): string {
    if (row.scopeItemId === null) return 'All items'
    return itemMap.get(row.scopeItemId)?.name ?? `Item #${row.scopeItemId}`
  }

  // ---- generate count sheet (from the detail view) --------------------------------------------
  let sheetSubmitting = false
  async function generateSheetFromDetail(): Promise<void> {
    if (!detail) return
    sheetSubmitting = true
    try {
      await performGenerateSheet(detail.stockTakeId, detail.docNumber)
    } catch (err) {
      toastApiError(err, 'Could not generate the count sheet.')
    } finally {
      sheetSubmitting = false
    }
  }

  // ---- counting -----------------------------------------------------------------------------
  let countInputs: Record<number, string> = {}
  let countsSubmitting = false
  let countsError = ''

  function resetCountInputs(): void {
    const next: Record<number, string> = {}
    for (const line of varianceResult?.lines ?? []) next[line.lineId] = line.qtyCounted ?? ''
    countInputs = next
  }

  async function saveCounts(): Promise<void> {
    countsError = ''
    if (!detail || !varianceResult) return
    const payload: RecordStockTakeCountLineInput[] = varianceResult.lines
      .filter((line) => (countInputs[line.lineId] ?? '').trim() !== '')
      .map((line) => ({ itemId: line.itemId, stockLotId: line.stockLotId, qtyCounted: countInputs[line.lineId].trim() }))
    if (payload.length === 0) {
      countsError = 'Enter at least one counted quantity.'
      return
    }
    countsSubmitting = true
    try {
      const result = await inventoryApi.recordStockTakeCounts(detail.stockTakeId, payload, api.newIdempotencyKey())
      toast.success(
        result.varianceSummary.varianceLines > 0
          ? `${result.acceptedCount} count(s) saved -- ${result.varianceSummary.varianceLines} line(s) show variance.`
          : `${result.acceptedCount} count(s) saved.`,
      )
      await refreshDetail(detail.stockTakeId)
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not save counts.')
    } finally {
      countsSubmitting = false
    }
  }

  // ---- generate adjustments -------------------------------------------------------------------
  let reasons: AdjustmentReason[] = []
  let reasonsLoading = false
  let genReasonId: number | '' = ''
  let genPostingDate = todayYmd()
  let genNotes = ''
  let genSubmitting = false
  let genError = ''

  async function loadReasons(): Promise<void> {
    reasonsLoading = true
    try {
      reasons = await lookupsApi.adjustmentReasons()
    } catch {
      reasons = []
    } finally {
      reasonsLoading = false
    }
  }

  async function submitGenerateAdjustments(): Promise<void> {
    genError = ''
    if (!detail) return
    if (genReasonId === '') {
      genError = 'Select an adjustment reason.'
      return
    }
    const input: GenerateStockTakeAdjustmentsInput = {
      adjustmentReasonId: genReasonId as number,
      postingDate: genPostingDate.trim() !== '' ? genPostingDate : undefined,
      notes: genNotes.trim() !== '' ? genNotes.trim() : undefined,
    }
    genSubmitting = true
    try {
      const result = await inventoryApi.generateStockTakeAdjustments(detail.stockTakeId, input, api.newIdempotencyKey())
      const parts = [
        result.increaseAdjustment ? `increase ${result.increaseAdjustment.docNumber}` : null,
        result.decreaseAdjustment ? `decrease ${result.decreaseAdjustment.docNumber}` : null,
      ].filter((p): p is string => p !== null)
      toast.success(parts.length > 0 ? `Adjustments generated: ${parts.join(', ')}.` : 'No variance to adjust -- stock take reviewed.')
      await refreshDetail(detail.stockTakeId)
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not generate adjustments.')
    } finally {
      genSubmitting = false
    }
  }

  // ---- close --------------------------------------------------------------------------------
  let closeSubmitting = false
  async function closeFromDetail(): Promise<void> {
    if (!detail) return
    closeSubmitting = true
    try {
      await performClose(detail.stockTakeId, detail.docNumber)
    } catch (err) {
      toastApiError(err, 'Could not close the stock take.')
    } finally {
      closeSubmitting = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Stock takes</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Physical inventory counts -- generate a count sheet, record counts, and turn variance into posted adjustments.</p>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={loadList} disabled={loading}>
        <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Refresh
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
        on:click={openCreate}
      >
        <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
        New stock take
      </button>
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
    <div class="relative max-w-md w-full">
      <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
      <input
        bind:value={searchQuery}
        class={`${inputClass} pl-10`}
        placeholder="Search by doc number or scope…"
        aria-label="Search stock takes"
      />
    </div>

    <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800 overflow-x-auto shrink-0">
      {#each statusFilterOptions as option (option.value)}
        <button
          type="button"
          class={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === option.value ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'}`}
          on:click={() => (statusFilter = option.value)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Stock takes table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Doc number</th>
            <th class={headClass}>Status</th>
            <th class={headClass}>Document date</th>
            <th class={headClass}>Scope</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">Loading stock takes…</td></tr>
          {:else if filteredRows.length === 0}
            <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">{rows.length === 0 ? 'No stock takes yet.' : 'No stock takes match your search or filter.'}</td></tr>
          {:else}
            {#each filteredRows as row (row.stockTakeId)}
              {@const showSheet = canGenerateSheet(row)}
              {@const showClose = canCloseDirect(row)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white cursor-pointer`} on:click={() => openDetail(row)}>
                  {row.docNumber}
                </td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}>{scopeLabel(row)}</td>
                <td class={`${cellClass} text-right`}>
                  <div class="inline-flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                      on:click={() => openDetail(row)}
                    >
                      View
                    </button>
                    {#if showSheet}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-primary text-white hover:opacity-90 disabled:opacity-50"
                        disabled={rowActionLoading[row.stockTakeId] !== undefined}
                        on:click={() => quickGenerateSheet(row)}
                      >
                        {rowActionLoading[row.stockTakeId] === 'sheet' ? 'Generating…' : 'Generate count sheet'}
                      </button>
                    {/if}
                    {#if showClose}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900 disabled:opacity-50"
                        disabled={rowActionLoading[row.stockTakeId] !== undefined}
                        on:click={() => quickClose(row)}
                      >
                        {rowActionLoading[row.stockTakeId] === 'close' ? 'Closing…' : 'Close'}
                      </button>
                    {/if}
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

<Modal open={createOpen} title="New stock take" widthClass="max-w-xl" onClose={closeCreate}>
  <form id="stock-take-create-form" on:submit|preventDefault={submitCreate} class="space-y-4">
    <div>
      <label class={labelClass} for="stk-date">Document date <span class="text-danger-500">*</span></label>
      <input id="stk-date" type="date" class={inputClass} bind:value={createDocumentDate} required />
    </div>
    <div>
      <label class={labelClass} for="stk-scope">Scope</label>
      <select id="stk-scope" class={inputClass} bind:value={createScopeItemId}>
        <option value="">All items (whole branch)</option>
        {#each items as item (item.itemId)}
          <option value={item.itemId}>{item.name} ({item.customCode})</option>
        {/each}
      </select>
      <p class="mt-1 text-xs text-secondary-500">Leave as "All items" to count the whole branch, or narrow the count sheet to one item.</p>
    </div>
    <div>
      <label class={labelClass} for="stk-notes">Notes</label>
      <textarea id="stk-notes" bind:value={createNotes} rows="2" class={inputClass} placeholder="Optional notes for this count session"></textarea>
    </div>
    {#if createError}
      <p class="text-xs text-danger-500">{createError}</p>
    {/if}
  </form>

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
      type="submit"
      form="stock-take-create-form"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={createSubmitting}
    >
      {createSubmitting ? 'Creating…' : 'Create stock take'}
    </button>
  </svelte:fragment>
</Modal>

<Modal open={detailOpen} title={detail ? `Stock take ${detail.docNumber}` : 'Stock take'} widthClass="max-w-5xl" onClose={closeDetail}>
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
          <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Document date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detail.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Scope</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{scopeLabel(detail)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Count sheet generated</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{detail.countSheetGeneratedAt ? formatDateTime(detail.countSheetGeneratedAt) : '—'}</p>
        </div>
        {#if detail.notes}
          <div class="sm:col-span-4">
            <p class="text-xs text-secondary-500">Notes</p>
            <p class="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap">{detail.notes}</p>
          </div>
        {/if}
      </div>

      {#if detail.status === 'draft'}
        <div class="rounded-xl border border-dashed border-surface-300 dark:border-surface-700 p-8 text-center space-y-3">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">No count sheet yet. Generating it snapshots current stock balances into frozen lines for counting -- it can only be done once.</p>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            disabled={sheetSubmitting}
            on:click={generateSheetFromDetail}
          >
            {sheetSubmitting ? 'Generating…' : 'Generate count sheet'}
          </button>
        </div>
      {:else}
        {#if varianceResult}
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <p class="text-xs text-secondary-500">Lines</p>
              <p class="text-lg font-semibold text-secondary-900 dark:text-white">{varianceResult.totals.totalLines}</p>
            </div>
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <p class="text-xs text-secondary-500">Counted</p>
              <p class="text-lg font-semibold text-secondary-900 dark:text-white">{varianceResult.totals.countedLines}</p>
            </div>
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <p class="text-xs text-secondary-500">Pending</p>
              <p class={`text-lg font-semibold ${varianceResult.totals.pendingLines > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-secondary-900 dark:text-white'}`}>{varianceResult.totals.pendingLines}</p>
            </div>
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <p class="text-xs text-secondary-500">Variance lines</p>
              <p class={`text-lg font-semibold ${varianceResult.totals.varianceLines > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-secondary-900 dark:text-white'}`}>{varianceResult.totals.varianceLines}</p>
            </div>
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <p class="text-xs text-secondary-500">Net cost impact</p>
              <p class="text-lg font-semibold text-secondary-900 dark:text-white">{formatMoney(varianceResult.totals.netCostImpact)}</p>
            </div>
          </div>
        {/if}

        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Stock take lines table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Item</th>
                  <th class={headClass}>Lot</th>
                  <th class={headClass}>Qty system</th>
                  <th class={headClass}>Qty counted</th>
                  <th class={headClass}>Variance</th>
                  <th class={headClass}>Cost impact</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#if varianceResult && varianceResult.lines.length > 0}
                  {#each varianceResult.lines as line (line.lineId)}
                    {@const lot = lotMap.get(line.stockLotId)}
                    <tr class={varianceRowClass(line.qtyVariance)}>
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}</td>
                      <td class={cellClass}>{lot?.batchNo ?? 'No batch'} · exp {formatDate(lot?.expiryDate)}</td>
                      <td class={cellClass}>{formatQty(line.qtySystem)}</td>
                      <td class={cellClass}>
                        {#if canRecordCounts}
                          <DecimalInput bind:value={countInputs[line.lineId]} id={`count-${line.lineId}`} scale={4} placeholder="0.0000" />
                        {:else}
                          {formatQty(line.qtyCounted)}
                        {/if}
                      </td>
                      <td class={cellClass}>
                        {#if line.qtyVariance === null}
                          <Badge tone="neutral">Pending</Badge>
                        {:else}
                          <Badge tone={varianceTone(line.qtyVariance)}>{formatQty(line.qtyVariance)}</Badge>
                        {/if}
                      </td>
                      <td class={cellClass}>{formatMoney(line.costImpact)}</td>
                    </tr>
                  {/each}
                {:else}
                  <tr><td colspan="6" class="py-6 px-4 text-center text-sm text-secondary-500">No lines.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        {#if canRecordCounts}
          <div class="flex items-center justify-between gap-4">
            {#if countsError}
              <p class="text-xs text-danger-500">{countsError}</p>
            {:else}
              <p class="text-xs text-secondary-500">Only rows with a counted quantity entered are saved -- recount and re-save as many times as needed while counting is in progress.</p>
            {/if}
            <button
              type="button"
              class="shrink-0 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={countsSubmitting}
              on:click={saveCounts}
            >
              {countsSubmitting ? 'Saving…' : 'Save counts'}
            </button>
          </div>
        {/if}

        {#if detail.status === 'counting'}
          <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3">
            <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Generate adjustments</h3>
            {#if !allCounted}
              <p class="text-xs text-secondary-500">Every line must be counted before adjustments can be generated.</p>
            {/if}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class={labelClass} for="stk-gen-reason">Reason <span class="text-danger-500">*</span></label>
                <select id="stk-gen-reason" class={inputClass} bind:value={genReasonId} disabled={reasonsLoading || !canGenerateAdjustments}>
                  <option value="">{reasonsLoading ? 'Loading reasons…' : 'Select a reason…'}</option>
                  {#each reasons as reason (reason.adjustmentReasonId)}
                    <option value={reason.adjustmentReasonId}>{reason.name}{reason.direction === 'both' ? '' : ` (${reason.direction} only)`}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label class={labelClass} for="stk-gen-date">Posting date</label>
                <input id="stk-gen-date" type="date" class={inputClass} bind:value={genPostingDate} disabled={!canGenerateAdjustments} />
              </div>
              <div>
                <label class={labelClass} for="stk-gen-notes">Notes</label>
                <input id="stk-gen-notes" type="text" class={inputClass} bind:value={genNotes} placeholder="Optional" disabled={!canGenerateAdjustments} />
              </div>
            </div>
            {#if genError}
              <p class="text-xs text-danger-500">{genError}</p>
            {/if}
            <button
              type="button"
              class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={!canGenerateAdjustments || genSubmitting}
              on:click={submitGenerateAdjustments}
            >
              {genSubmitting ? 'Generating…' : 'Generate adjustments'}
            </button>
          </div>
        {/if}

        {#if detail.status === 'reviewed' || detail.status === 'closed'}
          <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-2">
            <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Resulting adjustments</h3>
            {#if linkedAdjustments.increase}
              <p class="text-sm text-secondary-700 dark:text-secondary-300">
                Increase: <span class="font-medium text-secondary-900 dark:text-white">{linkedAdjustments.increase.docNumber}</span>
                <Badge tone={adjustmentStatusTone(linkedAdjustments.increase.status)}>{linkedAdjustments.increase.status}</Badge>
              </p>
            {/if}
            {#if linkedAdjustments.decrease}
              <p class="text-sm text-secondary-700 dark:text-secondary-300">
                Decrease: <span class="font-medium text-secondary-900 dark:text-white">{linkedAdjustments.decrease.docNumber}</span>
                <Badge tone={adjustmentStatusTone(linkedAdjustments.decrease.status)}>{linkedAdjustments.decrease.status}</Badge>
              </p>
            {/if}
            {#if !linkedAdjustments.increase && !linkedAdjustments.decrease}
              <p class="text-sm text-secondary-500">No variance -- reviewed/closed with a zero-variance count.</p>
            {/if}
          </div>
        {/if}

        <div class="flex items-center justify-end gap-3 pt-2 border-t border-surface-200 dark:border-surface-700">
          {#if canCloseFromReviewed}
            <button
              type="button"
              class="px-4 py-2.5 bg-success-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={closeSubmitting}
              on:click={closeFromDetail}
            >
              {closeSubmitting ? 'Closing…' : 'Close stock take'}
            </button>
          {:else if canCloseFromCounting}
            <button
              type="button"
              class="px-4 py-2.5 bg-success-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={closeSubmitting}
              on:click={closeFromDetail}
            >
              {closeSubmitting ? 'Closing…' : 'Close (zero variance)'}
            </button>
          {:else if detail.status === 'counting' && allCounted && hasVariance}
            <p class="text-xs text-secondary-500">This take has variance -- generate adjustments before closing.</p>
          {:else if detail.status === 'counting' && !allCounted}
            <p class="text-xs text-secondary-500">Count every line before closing or generating adjustments.</p>
          {:else if detail.status === 'closed'}
            <p class="text-xs text-secondary-500">Closed {formatDateTime(detail.closedAt)}.</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Modal>
