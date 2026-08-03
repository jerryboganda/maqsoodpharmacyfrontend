<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import { catalogApi, inventoryApi, ApiNetworkError, ApiError, formatMoney, formatQty, formatDate } from '../../api'
  import type { StockRow, StockLotRow } from '../../api'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
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
        <div class="overflow-x-auto">
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
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-surface-50 dark:bg-surface-900/30">
              <tr>
                <th class={`${headClass} py-3 px-4`}>Item</th>
                <th class={`${headClass} py-3 px-4`}>Batch no</th>
                <th class={`${headClass} py-3 px-4`}>Expiry date</th>
                <th class={`${headClass} py-3 px-4`}>Qty on hand</th>
                <th class={`${headClass} py-3 px-4`}>Status</th>
                <th class={`${headClass} py-3 px-4`}>Priority</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              {#if loading}
                <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
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
                  </tr>
                {/each}
                {#if !pagedLotRows.length}
                  <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No stock lots found.</td></tr>
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
