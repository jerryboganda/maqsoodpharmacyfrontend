<script lang="ts">
  import { onMount } from 'svelte'
  import DashboardStatCard from '../dashboard/DashboardStatCard.svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { session } from '../../stores/session'
  import { catalogApi, inventoryApi, salesApi, ApiNetworkError, formatMoney, formatDateTime, todayYmd } from '../../api'
  import type { StockRow, SaleInvoiceRow } from '../../api'

  // Rule M (17§6.7) explicitly bans client-side aggregation of money for charts/tables -- so
  // this dashboard shows plain row COUNTS (integer arithmetic, not decimal) rather than summing
  // invoice totals in the browser. A real "today's revenue" tile needs a server-side SUM
  // endpoint, which doesn't exist yet -- noted here rather than worked around.
  let loading = true
  let loadError = ''
  let itemCount = 0
  let itemCountIsFloor = false
  let zeroStockCount = 0
  let pendingApprovalCount = 0
  let todaysSaleCount = 0
  let recentSales: SaleInvoiceRow[] = []
  let lowStockRows: StockRow[] = []

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [items, stock, adjustments, sales] = await Promise.all([
        catalogApi.listItems({ isActive: true, limit: 500 }),
        inventoryApi.listStock({ includeZero: true, limit: 500 }),
        inventoryApi.listAdjustments({ status: 'draft', limit: 200 }),
        salesApi.listSaleInvoices({ dateFrom: todayYmd(), dateTo: todayYmd(), limit: 200 }),
      ])
      itemCount = items.items.length
      itemCountIsFloor = items.items.length >= 500
      zeroStockCount = stock.data.filter((row) => Number(row.qtyOnHand) <= 0).length
      lowStockRows = stock.data.filter((row) => Number(row.qtyOnHand) > 0 && Number(row.qtyOnHand) < 20).slice(0, 6)
      pendingApprovalCount = adjustments.data.filter((row) => row.requiresApproval && !row.approvedBy).length
      todaysSaleCount = sales.saleInvoices.length
      recentSales = sales.saleInvoices.slice(0, 6)
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load dashboard data.'
    } finally {
      loading = false
    }
  }

  onMount(load)
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Pharmacy dashboard</h1>
      <p class="text-body-sm mt-1 text-secondary-500">
        {#if $session.user}Signed in as {$session.user.displayName} ({$session.user.roles.join(', ')}){/if}
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

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <DashboardStatCard
      label="Active items"
      value={loading ? '…' : `${itemCount}${itemCountIsFloor ? '+' : ''}`}
      icon={Icons.package}
      iconBg="bg-info-100 dark:bg-info-900/40"
      iconColor="text-info-600 dark:text-info-400"
      showMenu={false}
    />
    <DashboardStatCard
      label="Out of stock"
      value={loading ? '…' : String(zeroStockCount)}
      icon={Icons.alertTriangle}
      iconBg="bg-danger-100 dark:bg-danger-900/40"
      iconColor="text-danger-600 dark:text-danger-400"
      showMenu={false}
    />
    <DashboardStatCard
      label="Adjustments awaiting approval"
      value={loading ? '…' : String(pendingApprovalCount)}
      icon={Icons.checklist}
      iconBg="bg-warning-100 dark:bg-warning-900/40"
      iconColor="text-warning-600 dark:text-warning-400"
      showMenu={false}
    />
    <DashboardStatCard
      label="Sale invoices today"
      value={loading ? '…' : String(todaysSaleCount)}
      icon={Icons.database}
      iconBg="bg-success-100 dark:bg-success-900/40"
      iconColor="text-success-600 dark:text-success-400"
      showMenu={false}
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="heading-5">Low stock (&lt; 20 units)</h2>
        <a href="/pharmacy/inventory" class="text-sm font-medium text-theme-primary hover:underline">View all</a>
      </div>
      {#if loading}
        <p class="text-sm text-secondary-500">Loading…</p>
      {:else if lowStockRows.length === 0}
        <p class="text-sm text-secondary-500">Nothing below the threshold right now.</p>
      {:else}
        <ul class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#each lowStockRows as row (row.itemId)}
            <li class="py-3 flex items-center justify-between">
              <span class="text-sm text-secondary-800 dark:text-secondary-200">{row.itemName}</span>
              <span class="text-sm font-semibold text-warning-600 dark:text-warning-400">{row.qtyOnHand} on hand</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="heading-5">Recent sales today</h2>
        <a href="/pharmacy/sales/invoices" class="text-sm font-medium text-theme-primary hover:underline">View all</a>
      </div>
      {#if loading}
        <p class="text-sm text-secondary-500">Loading…</p>
      {:else if recentSales.length === 0}
        <p class="text-sm text-secondary-500">No sales recorded yet today.</p>
      {:else}
        <ul class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#each recentSales as inv (inv.saleInvoiceId)}
            <li class="py-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-secondary-800 dark:text-secondary-200">{inv.docNumber}</p>
                <p class="text-xs text-secondary-500">{formatDateTime(inv.documentDate)}</p>
              </div>
              <span class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(inv.invoiceTotal)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <div class="card">
    <h2 class="heading-5 mb-4">Quick actions</h2>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <a href="/pharmacy/sales/invoices" class="flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-theme-primary transition-colors">
        <Icon icon={Icons.database} className="w-6 h-6 text-theme-primary" />
        <span class="text-sm font-medium text-secondary-800 dark:text-secondary-200">New sale</span>
      </a>
      <a href="/pharmacy/purchasing/invoices" class="flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-theme-primary transition-colors">
        <Icon icon={Icons.truck} className="w-6 h-6 text-theme-primary" />
        <span class="text-sm font-medium text-secondary-800 dark:text-secondary-200">New purchase</span>
      </a>
      <a href="/pharmacy/inventory/adjustments" class="flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-theme-primary transition-colors">
        <Icon icon={Icons.checklist} className="w-6 h-6 text-theme-primary" />
        <span class="text-sm font-medium text-secondary-800 dark:text-secondary-200">Stock adjustment</span>
      </a>
      <a href="/pharmacy/sales/customers" class="flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-theme-primary transition-colors">
        <Icon icon={Icons.contacts} className="w-6 h-6 text-theme-primary" />
        <span class="text-sm font-medium text-secondary-800 dark:text-secondary-200">Add customer</span>
      </a>
    </div>
  </div>
</div>
