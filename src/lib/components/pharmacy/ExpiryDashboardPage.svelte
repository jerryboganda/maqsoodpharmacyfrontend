<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import { inventoryApi, ApiNetworkError, ApiError, formatQty, formatDate } from '../../api'
  import type { ExpiryDashboardRow } from '../../api'

  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  type Bucket = 'expired' | '30' | '60' | '90'
  const bucketOrder: Bucket[] = ['expired', '30', '60', '90']
  const bucketMeta: Record<Bucket, { tone: 'danger' | 'warning' | 'info'; heading: string; badgeLabel: string }> = {
    expired: { tone: 'danger', heading: 'Already expired', badgeLabel: 'Expired' },
    '30': { tone: 'danger', heading: 'Expiring within 30 days', badgeLabel: '≤ 30 days' },
    '60': { tone: 'warning', heading: 'Expiring in 31–60 days', badgeLabel: '31–60 days' },
    '90': { tone: 'info', heading: 'Expiring in 61–90 days', badgeLabel: '61–90 days' },
  }

  let loading = true
  let loadError = ''
  let rows: ExpiryDashboardRow[] = []
  let asOfDate = ''

  $: groupedRows = bucketOrder.map((bucket) => ({
    bucket,
    meta: bucketMeta[bucket],
    rows: rows.filter((row) => row.bucket === bucket),
  }))

  function lotStatusTone(status: ExpiryDashboardRow['lotStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
    if (status === 'available') return 'success'
    if (status === 'quarantined') return 'warning'
    if (status === 'expired' || status === 'recalled') return 'danger'
    return 'neutral'
  }

  function daysLabel(row: ExpiryDashboardRow): string {
    if (row.daysToExpiry < 0) return `Expired ${Math.abs(row.daysToExpiry)}d ago`
    if (row.daysToExpiry === 0) return 'Expires today'
    return `${row.daysToExpiry}d left`
  }

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await inventoryApi.getExpiryDashboard()
      rows = result.data
      asOfDate = result.meta.asOfDate
    } catch (err) {
      if (err instanceof ApiNetworkError) loadError = err.message
      else if (err instanceof ApiError) loadError = err.detail || err.message
      else loadError = 'Could not load the expiry dashboard.'
    } finally {
      loading = false
    }
  }

  onMount(load)
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Expiry dashboard</h1>
      <p class="text-body-sm mt-1 text-secondary-500">
        Stock lots on hand expiring within 90 days{asOfDate ? `, as of ${formatDate(asOfDate)}` : ''}.
      </p>
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

  {#if loading}
    <div class="card rounded-xl p-10 text-center text-sm text-secondary-500">Loading expiry dashboard…</div>
  {:else}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {#each groupedRows as group (group.bucket)}
        <div class="card rounded-xl p-4">
          <div class="flex items-center gap-2">
            <Badge tone={group.meta.tone}>{group.meta.badgeLabel}</Badge>
          </div>
          <p class="mt-3 text-2xl font-semibold text-secondary-900 dark:text-white">{group.rows.length}</p>
          <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{group.meta.heading}</p>
        </div>
      {/each}
    </div>

    {#if rows.length === 0}
      <div class="card rounded-xl p-10 text-center text-sm text-secondary-500">
        No stock lots on hand are expiring within the next 90 days.
      </div>
    {:else}
      {#each groupedRows as group (group.bucket)}
        {#if group.rows.length > 0}
          <div class="card rounded-xl p-6">
            <div class="flex items-center gap-2 mb-4">
              <Badge tone={group.meta.tone}>{group.meta.badgeLabel}</Badge>
              <h2 class="text-sm font-semibold text-secondary-800 dark:text-secondary-200">{group.meta.heading}</h2>
              <span class="text-xs text-secondary-500 dark:text-secondary-400">({group.rows.length})</span>
            </div>

            <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <div class="overflow-x-auto" tabindex="0" role="region" aria-label={`${group.meta.heading} table`}>
                <table class="w-full">
                  <thead class="bg-surface-50 dark:bg-surface-900/30">
                    <tr>
                      <th class={`${headClass} py-3 px-4`}>Item</th>
                      <th class={`${headClass} py-3 px-4`}>Batch no</th>
                      <th class={`${headClass} py-3 px-4`}>Expiry date</th>
                      <th class={`${headClass} py-3 px-4`}>Days to expiry</th>
                      <th class={`${headClass} py-3 px-4`}>Qty on hand</th>
                      <th class={`${headClass} py-3 px-4`}>Lot status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                    {#each group.rows as row (row.stockLotId)}
                      <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                        <td class={cellClass}>
                          <div class="font-medium text-secondary-900 dark:text-white">{row.itemName}</div>
                        </td>
                        <td class={cellClass}>{row.batchNo ?? '—'}</td>
                        <td class={cellClass}>{formatDate(row.expiryDate)}</td>
                        <td class={cellClass}>
                          <Badge tone={group.meta.tone}>{daysLabel(row)}</Badge>
                        </td>
                        <td class={cellClass}>{formatQty(row.qtyOnHand)}</td>
                        <td class={cellClass}><Badge tone={lotStatusTone(row.lotStatus)}>{row.lotStatus}</Badge></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  {/if}
</div>
