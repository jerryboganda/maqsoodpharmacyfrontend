<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { inventoryApi, lookupsApi, catalogApi, api, ApiError, ApiNetworkError, formatMoney, formatQty, formatDate, todayYmd } from '../../api'
  import type { StockAdjustmentRow, AdjustmentReason, ItemSummary, StockLotRow, CreateStockAdjustmentInput, StockAdjustmentLineInput } from '../../api'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  type LineFormRow = {
    id: number
    itemId: number | ''
    stockLotId: number | ''
    qty: string
    unitCost: string
    lots: StockLotRow[]
    lotsLoading: boolean
  }

  // ---------------------------------------------------------------------------------------------
  // List state
  // ---------------------------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let rows: StockAdjustmentRow[] = []
  let actionLoading: Record<number, 'approve' | 'post' | undefined> = {}

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await inventoryApi.listAdjustments({ limit: 100 })
      rows = result.data
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load stock adjustments.'
    } finally {
      loading = false
    }
  }

  function directionTone(direction: StockAdjustmentRow['direction']): 'success' | 'warning' {
    return direction === 'increase' ? 'success' : 'warning'
  }

  function statusTone(status: StockAdjustmentRow['status']): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    return 'info'
  }

  async function approve(row: StockAdjustmentRow): Promise<void> {
    actionLoading = { ...actionLoading, [row.stockAdjustmentId]: 'approve' }
    try {
      await inventoryApi.approveAdjustment(row.stockAdjustmentId, undefined, api.newIdempotencyKey())
      toast.success('Adjustment approved.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not approve the adjustment.')
    } finally {
      const next = { ...actionLoading }
      delete next[row.stockAdjustmentId]
      actionLoading = next
    }
  }

  async function post(row: StockAdjustmentRow): Promise<void> {
    actionLoading = { ...actionLoading, [row.stockAdjustmentId]: 'post' }
    try {
      await inventoryApi.postAdjustment(row.stockAdjustmentId, undefined, api.newIdempotencyKey())
      toast.success('Adjustment posted.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not post the adjustment.')
    } finally {
      const next = { ...actionLoading }
      delete next[row.stockAdjustmentId]
      actionLoading = next
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Create form state
  // ---------------------------------------------------------------------------------------------
  let modalOpen = false
  let submitting = false
  let formError = ''

  let direction: 'increase' | 'decrease' = 'increase'
  let adjustmentReasonId: number | '' = ''
  let documentDate = todayYmd()
  let updateAvgCost = false

  let reasons: AdjustmentReason[] = []
  let reasonsLoading = false

  let items: ItemSummary[] = []
  let itemsLoading = false

  let lineIdSeq = 0
  let lines: LineFormRow[] = []

  $: selectedReason = reasons.find((r) => r.adjustmentReasonId === adjustmentReasonId) ?? null

  function emptyLine(): LineFormRow {
    lineIdSeq += 1
    return { id: lineIdSeq, itemId: '', stockLotId: '', qty: '', unitCost: '', lots: [], lotsLoading: false }
  }

  async function loadItems(): Promise<void> {
    itemsLoading = true
    try {
      const result = await catalogApi.listItems({ isActive: true, limit: 500 })
      items = result.items
    } catch {
      items = []
    } finally {
      itemsLoading = false
    }
  }

  async function loadReasons(): Promise<void> {
    reasonsLoading = true
    try {
      reasons = await lookupsApi.adjustmentReasons(direction)
    } catch {
      reasons = []
    } finally {
      reasonsLoading = false
    }
  }

  function onDirectionChange(): void {
    adjustmentReasonId = ''
    if (direction === 'decrease') updateAvgCost = false
    void loadReasons()
  }

  function openCreate(): void {
    direction = 'increase'
    adjustmentReasonId = ''
    documentDate = todayYmd()
    updateAvgCost = false
    lines = [emptyLine()]
    formError = ''
    submitting = false
    modalOpen = true
    void loadItems()
    void loadReasons()
  }

  function closeModal(): void {
    modalOpen = false
  }

  function addLine(): void {
    lines = [...lines, emptyLine()]
  }

  function removeLine(index: number): void {
    lines = lines.filter((_, i) => i !== index)
  }

  async function handleItemChange(index: number): Promise<void> {
    const line = lines[index]
    line.stockLotId = ''
    line.lots = []
    lines = lines
    if (line.itemId === '') return
    line.lotsLoading = true
    lines = lines
    try {
      const result = await inventoryApi.listLots({ itemId: line.itemId, lotStatus: 'available', limit: 200 })
      line.lots = result.data
    } catch {
      line.lots = []
    } finally {
      line.lotsLoading = false
      lines = lines
    }
  }

  function buildLines(): StockAdjustmentLineInput[] {
    return lines
      .filter((line) => line.itemId !== '' && line.stockLotId !== '' && line.qty.trim() !== '')
      .map((line) => ({
        itemId: line.itemId as number,
        stockLotId: line.stockLotId as number,
        qty: line.qty,
        unitCost: line.unitCost.trim() !== '' ? line.unitCost : undefined,
      }))
  }

  async function submitCreate(): Promise<void> {
    formError = ''
    if (adjustmentReasonId === '') {
      formError = 'Select an adjustment reason.'
      return
    }
    const payloadLines = buildLines()
    if (payloadLines.length === 0) {
      formError = 'Add at least one line with an item, lot, and quantity.'
      return
    }

    const input: CreateStockAdjustmentInput = {
      direction,
      adjustmentReasonId: adjustmentReasonId as number,
      documentDate,
      updateAvgCost: direction === 'increase' ? updateAvgCost : undefined,
      lines: payloadLines,
    }

    submitting = true
    try {
      await inventoryApi.createAdjustment(input, api.newIdempotencyKey())
      toast.success('Stock adjustment created.')
      modalOpen = false
      lines = [emptyLine()]
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not create the adjustment.')
    } finally {
      submitting = false
    }
  }

  onMount(load)
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Stock adjustments</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Create, approve, and post inventory corrections.</p>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={load} disabled={loading}>
        <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Refresh
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
        on:click={openCreate}
      >
        <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
        New adjustment
      </button>
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Doc number</th>
            <th class={`${headClass} py-3 px-4`}>Direction</th>
            <th class={`${headClass} py-3 px-4`}>Document date</th>
            <th class={`${headClass} py-3 px-4`}>Total qty</th>
            <th class={`${headClass} py-3 px-4`}>Total cost</th>
            <th class={`${headClass} py-3 px-4`}>Status</th>
            <th class={`${headClass} py-3 px-4`}>Approval</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">Loading stock adjustments…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">No stock adjustments yet.</td></tr>
          {:else}
            {#each rows as row (row.stockAdjustmentId)}
              {@const showApprove = row.status === 'draft' && row.requiresApproval && !row.approvedBy}
              {@const showPost = row.status === 'draft'}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{row.docNumber}</td>
                <td class={cellClass}>
                  <Badge tone={directionTone(row.direction)}>{row.direction === 'increase' ? 'Increase' : 'Decrease'}</Badge>
                </td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}>{formatQty(row.totalQty)}</td>
                <td class={cellClass}>{formatMoney(row.totalCostAmount)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td class={cellClass}>
                  {#if row.requiresApproval}
                    {#if row.approvedBy}
                      <Badge tone="success">Approved</Badge>
                    {:else}
                      <Badge tone="warning">Needs approval</Badge>
                    {/if}
                  {:else}
                    <span class="text-secondary-400">—</span>
                  {/if}
                </td>
                <td class={`${cellClass} text-right`}>
                  <div class="inline-flex flex-col items-end gap-1">
                    <div class="inline-flex items-center gap-2">
                      {#if showApprove}
                        <button
                          type="button"
                          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 hover:bg-warning-100 dark:hover:bg-warning-900 disabled:opacity-50"
                          disabled={actionLoading[row.stockAdjustmentId] !== undefined}
                          on:click={() => approve(row)}
                        >
                          {actionLoading[row.stockAdjustmentId] === 'approve' ? 'Approving…' : 'Approve'}
                        </button>
                      {/if}
                      {#if showPost}
                        <button
                          type="button"
                          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-primary text-white hover:opacity-90 disabled:opacity-50"
                          disabled={actionLoading[row.stockAdjustmentId] !== undefined}
                          on:click={() => post(row)}
                        >
                          {actionLoading[row.stockAdjustmentId] === 'post' ? 'Posting…' : 'Post'}
                        </button>
                      {/if}
                    </div>
                    {#if showApprove}
                      <span class="text-[11px] text-secondary-400">Requires approval first</span>
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

<Modal open={modalOpen} title="New stock adjustment" widthClass="max-w-3xl" onClose={closeModal}>
  <form id="stock-adjustment-form" on:submit|preventDefault={submitCreate} class="space-y-5">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="adj-direction">Direction <span class="text-danger-500">*</span></label>
        <select id="adj-direction" class={inputClass} bind:value={direction} on:change={onDirectionChange}>
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
        </select>
      </div>
      <div>
        <label class={labelClass} for="adj-reason">Reason <span class="text-danger-500">*</span></label>
        <select id="adj-reason" class={inputClass} bind:value={adjustmentReasonId} disabled={reasonsLoading}>
          <option value="">{reasonsLoading ? 'Loading reasons…' : 'Select a reason…'}</option>
          {#each reasons as reason (reason.adjustmentReasonId)}
            <option value={reason.adjustmentReasonId}>{reason.name}</option>
          {/each}
        </select>
        {#if selectedReason?.requiresApproval}
          <p class="mt-1 text-xs text-warning-600 dark:text-warning-400">This reason requires approval before posting.</p>
        {/if}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="adj-date">Document date <span class="text-danger-500">*</span></label>
        <input id="adj-date" type="date" class={inputClass} bind:value={documentDate} />
      </div>
      <div class="flex items-end pb-2.5">
        <label class={`inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 ${direction === 'decrease' ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            bind:checked={updateAvgCost}
            disabled={direction === 'decrease'}
            class="rounded border-surface-300 dark:border-surface-700 text-theme-primary focus:ring-theme-primary/30"
          />
          Update average cost
        </label>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-secondary-800 dark:text-secondary-200">Line items</h3>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-theme-primary hover:underline"
          on:click={addLine}
        >
          <Icon icon={Icons.plus} width={16} height={16} />
          Add line
        </button>
      </div>

      {#each lines as line, i (line.id)}
        <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wide text-secondary-500">Line {i + 1}</span>
            {#if lines.length > 1}
              <button
                type="button"
                class="inline-flex items-center gap-1 text-sm text-danger-600 hover:text-danger-700"
                on:click={() => removeLine(i)}
                aria-label={`Remove line ${i + 1}`}
              >
                <Icon icon={Icons.trash} width={16} height={16} />
                Remove
              </button>
            {/if}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class={labelClass} for={`line-item-${line.id}`}>Item <span class="text-danger-500">*</span></label>
              <select
                id={`line-item-${line.id}`}
                class={inputClass}
                bind:value={line.itemId}
                on:change={() => handleItemChange(i)}
                disabled={itemsLoading}
              >
                <option value="">{itemsLoading ? 'Loading items…' : 'Select item…'}</option>
                {#each items as item (item.itemId)}
                  <option value={item.itemId}>{item.name} ({item.customCode})</option>
                {/each}
              </select>
            </div>
            <div>
              <label class={labelClass} for={`line-lot-${line.id}`}>Stock lot <span class="text-danger-500">*</span></label>
              <select
                id={`line-lot-${line.id}`}
                class={inputClass}
                bind:value={line.stockLotId}
                disabled={line.itemId === '' || line.lotsLoading}
              >
                <option value="">
                  {line.lotsLoading ? 'Loading lots…' : line.itemId === '' ? 'Select an item first' : 'Select lot…'}
                </option>
                {#each line.lots as lot (lot.stockLotId)}
                  <option value={lot.stockLotId}>{lot.batchNo ?? 'No batch'} · exp {formatDate(lot.expiryDate)} · qty {formatQty(lot.qtyOnHand)}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DecimalInput bind:value={line.qty} label="Qty" id={`line-qty-${line.id}`} scale={4} required placeholder="0.0000" />
            <DecimalInput bind:value={line.unitCost} label="Unit cost (optional)" id={`line-cost-${line.id}`} scale={5} placeholder="0.00000" prefix="Rs" />
          </div>
        </div>
      {/each}

      {#if formError}
        <p class="text-xs text-danger-500">{formError}</p>
      {/if}
    </div>
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeModal}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={submitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="stock-adjustment-form"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={submitting}
    >
      {submitting ? 'Creating…' : 'Create adjustment'}
    </button>
  </svelte:fragment>
</Modal>
