<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import Modal from './shared/Modal.svelte'
  import { toast } from '../../stores/toast'
  import { catalogApi, inventoryApi, api, ApiNetworkError, ApiError, formatMoney, formatQty, formatDate, formatDateTime } from '../../api'
  import type { StockRow, StockLotRow, StockLotDetail } from '../../api'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const pageSize = 15

  let activeTab: 'stock' | 'lots' = 'stock'
  let loading = true
  let loadError = ''
  let stockRows: StockRow[] = []
  let lotRows: StockLotRow[] = []
  let itemNameById = new Map<number, string>()
  let stockQuery = ''
  let stockPage = 1
  let lotPage = 1

  $: filteredStockRows = stockRows.filter((row) => {
    const needle = stockQuery.trim().toLowerCase()
    return !needle || row.itemName.toLowerCase().includes(needle)
  })
  $: stockTotalPages = Math.max(1, Math.ceil(filteredStockRows.length / pageSize))
  $: stockPage = Math.min(stockPage, stockTotalPages)
  $: pagedStockRows = filteredStockRows.slice((stockPage - 1) * pageSize, stockPage * pageSize)

  $: lotTotalPages = Math.max(1, Math.ceil(lotRows.length / pageSize))
  $: lotPage = Math.min(lotPage, lotTotalPages)
  $: pagedLotRows = lotRows.slice((lotPage - 1) * pageSize, lotPage * pageSize)

  function stockStatus(row: StockRow): { tone: 'success' | 'warning' | 'danger'; label: string } {
    const qty = Number(row.qtyOnHand)
    if (qty <= 0) return { tone: 'danger', label: 'Out of stock' }
    if (qty > 0 && qty < 20) return { tone: 'warning', label: 'Low' }
    return { tone: 'success', label: 'OK' }
  }

  function lotStatusMeta(status: StockLotRow['lotStatus']): { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string } {
    if (status === 'available') return { tone: 'success', label: 'Available' }
    if (status === 'quarantined') return { tone: 'warning', label: 'Quarantined' }
    if (status === 'expired') return { tone: 'danger', label: 'Expired' }
    if (status === 'recalled') return { tone: 'danger', label: 'Recalled' }
    return { tone: 'neutral', label: 'Consumed' }
  }

  function itemName(itemId: number): string {
    return itemNameById.get(itemId) ?? `Item #${itemId}`
  }

  // ---------------------------------------------------------------------------------------------
  // Stock lot actions -- hold / release / view
  // ---------------------------------------------------------------------------------------------
  let lotActionLoading: Record<number, 'hold' | 'release' | undefined> = {}

  async function holdLot(row: StockLotRow): Promise<void> {
    lotActionLoading = { ...lotActionLoading, [row.stockLotId]: 'hold' }
    try {
      await inventoryApi.holdStockLot(row.stockLotId, {}, api.newIdempotencyKey())
      toast.success('Stock lot put on hold.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not hold the stock lot.')
    } finally {
      const next = { ...lotActionLoading }
      delete next[row.stockLotId]
      lotActionLoading = next
    }
  }

  async function releaseLot(row: StockLotRow): Promise<void> {
    lotActionLoading = { ...lotActionLoading, [row.stockLotId]: 'release' }
    try {
      await inventoryApi.releaseStockLot(row.stockLotId, {}, api.newIdempotencyKey())
      toast.success('Stock lot released.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not release the stock lot.')
    } finally {
      const next = { ...lotActionLoading }
      delete next[row.stockLotId]
      lotActionLoading = next
    }
  }

  let viewLotModalOpen = false
  let viewLotLoading = false
  let viewLotError = ''
  let viewLotTarget: StockLotDetail | null = null

  async function openViewLot(row: StockLotRow): Promise<void> {
    viewLotTarget = null
    viewLotError = ''
    viewLotModalOpen = true
    viewLotLoading = true
    try {
      viewLotTarget = await inventoryApi.getStockLot(row.stockLotId)
    } catch (err) {
      if (err instanceof ApiError) viewLotError = err.detail
      else if (err instanceof ApiNetworkError) viewLotError = err.message
      else viewLotError = 'Could not load the stock lot.'
    } finally {
      viewLotLoading = false
    }
  }

  function closeViewLot(): void {
    viewLotModalOpen = false
    viewLotTarget = null
  }

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [stock, lots, items] = await Promise.all([
        inventoryApi.listStock({ includeZero: true, limit: 200 }),
        inventoryApi.listLots({ limit: 200 }),
        catalogApi.listItems({ limit: 500 }),
      ])
      stockRows = stock.data
      lotRows = lots.data
      itemNameById = new Map(items.items.map((item) => [item.itemId, item.name]))
    } catch (err) {
      if (err instanceof ApiNetworkError) loadError = err.message
      else if (err instanceof ApiError) loadError = err.detail || err.message
      else loadError = 'Could not load inventory data.'
    } finally {
      loading = false
    }
  }

  onMount(load)
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Inventory</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Read-only view of stock levels and stock lots across the catalog.</p>
    </div>
    <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={load} disabled={loading}>
      <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
      Refresh
    </button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800">
    <button
      type="button"
      class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stock' ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'}`}
      on:click={() => (activeTab = 'stock')}
    >
      Stock levels
    </button>
    <button
      type="button"
      class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'lots' ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'}`}
      on:click={() => (activeTab = 'lots')}
    >
      Stock lots
    </button>
  </div>

  {#if activeTab === 'stock'}
    <div class="card rounded-xl p-6">
      <div class="relative max-w-md">
        <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
        <input
          bind:value={stockQuery}
          on:input={() => (stockPage = 1)}
          class={`${inputClass} pl-10`}
          placeholder="Search by item name"
          aria-label="Search by item name"
        />
      </div>

      <div class="mt-5 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Stock levels table">
          <table class="w-full">
            <thead class="bg-surface-50 dark:bg-surface-900/30">
              <tr>
                <th class={`${headClass} py-3 px-4`}>Item name</th>
                <th class={`${headClass} py-3 px-4`}>Qty on hand</th>
                <th class={`${headClass} py-3 px-4`}>Lot count</th>
                <th class={`${headClass} py-3 px-4`}>Nearest expiry</th>
                <th class={`${headClass} py-3 px-4`}>Avg cost</th>
                <th class={`${headClass} py-3 px-4`}>Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              {#if loading}
                <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
              {:else}
                {#each pagedStockRows as row (row.itemId)}
                  {@const status = stockStatus(row)}
                  <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                    <td class={cellClass}>
                      <div class="font-medium text-secondary-900 dark:text-white">{row.itemName}</div>
                    </td>
                    <td class={cellClass}>{formatQty(row.qtyOnHand)}</td>
                    <td class={cellClass}>{row.lotCount}</td>
                    <td class={cellClass}>{formatDate(row.nearestExpiry)}</td>
                    <td class={cellClass}>{formatMoney(row.avgCost)}</td>
                    <td class={cellClass}><Badge tone={status.tone}>{status.label}</Badge></td>
                  </tr>
                {/each}
                {#if !pagedStockRows.length}
                  <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No stock rows match your search.</td></tr>
                {/if}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p class="text-sm text-secondary-500 dark:text-secondary-400">Showing {pagedStockRows.length} of {filteredStockRows.length} rows</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={() => (stockPage = Math.max(1, stockPage - 1))}
            disabled={stockPage <= 1}
            class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span class="px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300">Page {Math.min(stockPage, stockTotalPages)} of {stockTotalPages}</span>
          <button
            type="button"
            on:click={() => (stockPage = Math.min(stockTotalPages, stockPage + 1))}
            disabled={stockPage >= stockTotalPages}
            class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="card rounded-xl p-6">
      <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Stock lots table">
          <table class="w-full">
            <thead class="bg-surface-50 dark:bg-surface-900/30">
              <tr>
                <th class={`${headClass} py-3 px-4`}>Item</th>
                <th class={`${headClass} py-3 px-4`}>Batch no</th>
                <th class={`${headClass} py-3 px-4`}>Expiry date</th>
                <th class={`${headClass} py-3 px-4`}>Qty on hand</th>
                <th class={`${headClass} py-3 px-4`}>Status</th>
                <th class={`${headClass} py-3 px-4`}>Priority</th>
                <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              {#if loading}
                <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
              {:else}
                {#each pagedLotRows as row (row.stockLotId)}
                  {@const status = lotStatusMeta(row.lotStatus)}
                  <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                    <td class={cellClass}>
                      <div class="font-medium text-secondary-900 dark:text-white">{itemName(row.itemId)}</div>
                    </td>
                    <td class={cellClass}>{row.batchNo ?? '—'}</td>
                    <td class={cellClass}>{row.expiryDate ? formatDate(row.expiryDate) : '—'}</td>
                    <td class={cellClass}>{formatQty(row.qtyOnHand)}</td>
                    <td class={cellClass}><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td class={cellClass}>{row.priority}</td>
                    <td class={`${cellClass} text-right`}>
                      <div class="inline-flex items-center gap-2">
                        <button
                          type="button"
                          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                          on:click={() => openViewLot(row)}
                        >
                          <Icon icon={Icons.eye} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                          View
                        </button>
                        {#if row.lotStatus === 'available'}
                          <button
                            type="button"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 hover:bg-warning-100 dark:hover:bg-warning-900 disabled:opacity-50"
                            disabled={lotActionLoading[row.stockLotId] !== undefined}
                            on:click={() => holdLot(row)}
                          >
                            <Icon icon={Icons.lock} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            {lotActionLoading[row.stockLotId] === 'hold' ? 'Holding…' : 'Hold'}
                          </button>
                        {:else if row.lotStatus === 'quarantined'}
                          <button
                            type="button"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900 disabled:opacity-50"
                            disabled={lotActionLoading[row.stockLotId] !== undefined}
                            on:click={() => releaseLot(row)}
                          >
                            <Icon icon={Icons.unlock} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            {lotActionLoading[row.stockLotId] === 'release' ? 'Releasing…' : 'Release'}
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
                {#if !pagedLotRows.length}
                  <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">No stock lots found.</td></tr>
                {/if}
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p class="text-sm text-secondary-500 dark:text-secondary-400">Showing {pagedLotRows.length} of {lotRows.length} rows</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={() => (lotPage = Math.max(1, lotPage - 1))}
            disabled={lotPage <= 1}
            class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span class="px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300">Page {Math.min(lotPage, lotTotalPages)} of {lotTotalPages}</span>
          <button
            type="button"
            on:click={() => (lotPage = Math.min(lotTotalPages, lotPage + 1))}
            disabled={lotPage >= lotTotalPages}
            class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<Modal open={viewLotModalOpen} title={viewLotTarget ? `${itemName(viewLotTarget.itemId)} — lot detail` : 'Stock lot'} widthClass="max-w-3xl" onClose={closeViewLot}>
  {#if viewLotError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm mb-4">
      {viewLotError}
    </div>
  {/if}

  {#if viewLotLoading && !viewLotTarget}
    <p class="py-8 text-center text-sm text-secondary-500">Loading stock lot…</p>
  {:else if viewLotTarget}
    {@const status = lotStatusMeta(viewLotTarget.lotStatus)}
    <div class="space-y-5">
      <div class="flex items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <span class={labelClass}>Batch no</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.batchNo ?? '—'}</p>
        </div>
        <div>
          <span class={labelClass}>Qty on hand</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{formatQty(viewLotTarget.qtyOnHand)}</p>
        </div>
        <div>
          <span class={labelClass}>Expiry date</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.expiryDate ? formatDate(viewLotTarget.expiryDate) : '—'}</p>
        </div>
        <div>
          <span class={labelClass}>Expiry status</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200 capitalize">{viewLotTarget.expiryStatus}</p>
        </div>
        <div>
          <span class={labelClass}>Manufactured on</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.manufacturedOn ? formatDate(viewLotTarget.manufacturedOn) : '—'}</p>
        </div>
        <div>
          <span class={labelClass}>Received on</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.receivedOn ? formatDate(viewLotTarget.receivedOn) : '—'}</p>
        </div>
        <div>
          <span class={labelClass}>Receipt unit cost</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{formatMoney(viewLotTarget.receiptUnitCost)}</p>
        </div>
        <div>
          <span class={labelClass}>Priority (FEFO rank)</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.priority}</p>
        </div>
        <div>
          <span class={labelClass}>Supplier</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.supplierId !== null ? `Supplier #${viewLotTarget.supplierId}` : '—'}</p>
        </div>
        <div>
          <span class={labelClass}>Hold reason</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewLotTarget.holdReasonId !== null ? `#${viewLotTarget.holdReasonId}` : '—'}</p>
        </div>
        <div>
          <span class={labelClass}>Source document</span>
          <p class="text-sm text-secondary-800 dark:text-secondary-200">
            {viewLotTarget.sourceDocumentId !== null ? `Doc #${viewLotTarget.sourceDocumentId} (type #${viewLotTarget.sourceDocumentTypeId})` : '—'}
          </p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-800 dark:text-secondary-200 mb-2">Recent movements</h3>
        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto max-h-72 overflow-y-auto" tabindex="0" role="region" aria-label="Stock lot movements table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30 sticky top-0">
                <tr>
                  <th class={`${headClass} py-2.5 px-4`}>Date</th>
                  <th class={`${headClass} py-2.5 px-4`}>Direction</th>
                  <th class={`${headClass} py-2.5 px-4 text-right`}>Qty Δ</th>
                  <th class={`${headClass} py-2.5 px-4 text-right`}>Qty after</th>
                  <th class={`${headClass} py-2.5 px-4 text-right`}>Unit cost</th>
                  <th class={`${headClass} py-2.5 px-4 text-right`}>Cost amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#if viewLotTarget.movements.length === 0}
                  <tr><td colspan="6" class="py-8 px-4 text-center text-sm text-secondary-500">No movements recorded for this lot yet.</td></tr>
                {:else}
                  {#each viewLotTarget.movements as movement (movement.stockMovementId)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                      <td class={cellClass}>{formatDateTime(movement.occurredAt)}</td>
                      <td class={cellClass}>
                        <Badge tone={movement.direction === 'in' ? 'success' : 'warning'}>{movement.direction === 'in' ? 'In' : 'Out'}</Badge>
                      </td>
                      <td class={`${cellClass} text-right`}>{formatQty(movement.qtyDelta)}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(movement.qtyAfter)}</td>
                      <td class={`${cellClass} text-right`}>{formatMoney(movement.unitCost)}</td>
                      <td class={`${cellClass} text-right`}>{formatMoney(movement.costAmount)}</td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeViewLot}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
    >
      Close
    </button>
  </svelte:fragment>
</Modal>
