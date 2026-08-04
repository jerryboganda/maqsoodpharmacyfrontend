<script lang="ts">
  // Sourced from ONE real backend aggregate (GET /dashboards/summary, dashboard.service.ts) for
  // the stat-card row -- Rule M forbids composing money totals client-side from several list
  // endpoints, so every money field in `summary` below is a decimal STRING computed server-side
  // by a real SQL SUM, and every count field is a real server-side COUNT(*). This page never adds
  // or sums money fields together itself.
  //
  // src/lib/api/reporting.ts already exists (Wave 6) but has no dashboard-summary call of its own
  // -- per this task's instructions, that shared file is not edited here (another agent may be
  // appending to it concurrently). `getDashboardSummary()` below is a small local call directly in
  // this page's own <script> block, the same "local minimal fetch" pattern PaymentsPage.svelte
  // uses for cash/bank accounts (see payments.ts's own header comment) and ExpensesPage.svelte
  // uses for expensesApi -- importing a module directly rather than routing through the shared
  // ./api barrel avoids a file-ordering collision with concurrently-running agents.
  //
  // The two charts and the "Recent Sales"/"Low Stock" lists have no single-call backend source yet.
  // The lists stay wired to the same real list endpoints (inventoryApi.listStock,
  // salesApi.listSaleInvoices) this page always used -- only the old mock FALLBACK was fake, not
  // these primary fetches. The sales-trend chart is re-pointed at reportingApi's existing
  // "sales-summary" report (groupBy: "date"), whose `netAmount` is itself a real server-side SUM
  // per day -- plotting that decimal string on a chart's Y axis (a presentation-only Number()
  // conversion that never feeds back into a request body, the same exception format.ts's own
  // formatMoney relies on) is not client-side aggregation, since no addition happens here, only a
  // one-value parse of an already-final server total. The old "Inventory Breakdown" doughnut had no
  // real source at all (its percentages were hardcoded) and is removed rather than faked further.
  import { onMount } from 'svelte'
  import DashboardStatCard from '../dashboard/DashboardStatCard.svelte'
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { session } from '../../stores/session'
  import { api, ApiError, ApiNetworkError, inventoryApi, salesApi, formatMoney, formatQty, formatDate, formatDateTime, todayYmd } from '../../api'
  import type { StockRow, SaleInvoiceRow, CustomerRow } from '../../api'
  import { reportingApi } from '../../api/reporting'
  import type { SalesSummaryRow } from '../../api/reporting'
  import { auditApi } from '../../api/audit'
  import type { AuditEventRow } from '../../api/audit'

  // ---------------------------------------------------------------------------------------------
  // GET /dashboards/summary -- wire shape read directly from dashboard.service.ts's return value.
  // ---------------------------------------------------------------------------------------------
  interface CashBankBalanceRow {
    cashBankAccountId: number
    label: string
    balance: string
  }
  interface DashboardSummary {
    todaysSalesTotal: string
    todaysSaleCount: number
    outstandingApTotal: string
    outstandingArTotal: string
    cashBankBalances: CashBankBalanceRow[]
    pendingPurchaseOrderCount: number
    lowStockCount: number
    expiryValueAtRisk: string
    adjustmentsAwaitingApprovalCount: number
  }
  async function getDashboardSummary(): Promise<DashboardSummary> {
    return api.get<DashboardSummary>('/dashboards/summary')
  }

  function daysAgoYmd(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  function apiErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) return err.detail
    if (err instanceof ApiNetworkError) return err.message
    return fallback
  }

  // ---------------------------------------------------------------------------------------------
  // Stat-card summary -- the one real aggregate call.
  // ---------------------------------------------------------------------------------------------
  let summary: DashboardSummary | null = null
  let summaryLoading = true
  let summaryError = ''

  async function loadSummary(): Promise<void> {
    summaryLoading = true
    summaryError = ''
    try {
      summary = await getDashboardSummary()
    } catch (err) {
      summary = null
      summaryError = apiErrorMessage(err, 'Could not load the dashboard summary.')
    } finally {
      summaryLoading = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Low stock alerts + recent sales today -- real list endpoints, unchanged from before (only the
  // mock fallback on failure was the problem, not these fetches).
  // ---------------------------------------------------------------------------------------------
  let lowStockRows: StockRow[] = []
  let recentSales: SaleInvoiceRow[] = []
  let customers: CustomerRow[] = []
  let listsLoading = true
  let listsError = ''

  // Reactive ($:) BINDING, not a plain `function` -- same Svelte trap ExpensesPage.svelte's own
  // cashBankAccountLabel documents: a plain function closing over `customerMap` never gets
  // re-tracked when only `customers` (not the template's own iteration source) changes.
  $: customerMap = new Map(customers.map((c) => [c.customerId, c]))
  $: customerLabel = (customerId: number): string => {
    const c = customerMap.get(customerId)
    if (!c) return `Customer #${customerId}`
    return c.isWalkIn ? 'Walk-in Customer' : c.name
  }

  async function loadLists(): Promise<void> {
    listsLoading = true
    listsError = ''
    try {
      const [stock, sales, customerList] = await Promise.all([
        inventoryApi.listStock({ includeZero: false, limit: 500 }),
        salesApi.listSaleInvoices({ dateFrom: todayYmd(), dateTo: todayYmd(), limit: 200 }),
        salesApi.listCustomers({ limit: 200 }),
      ])
      // Qty comparison for pure UI filtering (Rule M exception) -- never fed back into a request.
      // Threshold matches dashboard.service.ts's own DEFAULT_LOW_STOCK_THRESHOLD (20 units).
      lowStockRows = stock.data.filter((row) => Number(row.qtyOnHand) < 20).slice(0, 5)
      recentSales = sales.saleInvoices.slice(0, 5)
      customers = customerList.customers
    } catch (err) {
      lowStockRows = []
      recentSales = []
      listsError = apiErrorMessage(err, 'Could not load stock and sales data.')
    } finally {
      listsLoading = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Sales trend (last 7 days) -- reportingApi's real "sales-summary" report, groupBy "date".
  // ---------------------------------------------------------------------------------------------
  let trendRows: SalesSummaryRow[] = []
  let trendLoading = true
  let trendError = ''

  async function loadTrend(): Promise<void> {
    trendLoading = true
    trendError = ''
    try {
      const result = await reportingApi.runReport('sales-summary', {
        filters: { groupBy: 'date', dateFrom: daysAgoYmd(6), dateTo: todayYmd() },
      })
      trendRows = [...result.data]
    } catch (err) {
      trendRows = []
      trendError = apiErrorMessage(err, 'Could not load the sales trend.')
    } finally {
      trendLoading = false
    }
  }

  $: trendChartData = {
    labels: trendRows.map((r) => {
      const d = new Date(r.label)
      return Number.isNaN(d.getTime()) ? r.label : d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Net Sales',
        data: trendRows.map((r) => Number(r.netAmount)),
        fill: true,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
      },
    ],
  } as any

  // ---------------------------------------------------------------------------------------------
  // Recent system activity -- real audit log rows (GET /audit/events?limit=5).
  // ---------------------------------------------------------------------------------------------
  let activityRows: AuditEventRow[] = []
  let activityLoading = true
  let activityError = ''

  async function loadActivity(): Promise<void> {
    activityLoading = true
    activityError = ''
    try {
      const result = await auditApi.listAuditEvents({ limit: 5 })
      activityRows = result.events
    } catch (err) {
      activityRows = []
      activityError = apiErrorMessage(err, 'Could not load recent activity.')
    } finally {
      activityLoading = false
    }
  }

  function activityIcon(action: string): string {
    const a = action.toLowerCase()
    if (a.includes('cancel') || a.includes('revers')) return Icons.alertTriangle
    if (a.includes('post') || a.includes('create') || a.includes('approve')) return Icons.circleCheck
    if (a.includes('login') || a.includes('logout') || a.includes('grant') || a.includes('revoke')) return Icons.shield
    return Icons.database
  }
  function activityIconBg(action: string): string {
    const a = action.toLowerCase()
    if (a.includes('cancel') || a.includes('revers')) return 'bg-danger-100 dark:bg-danger-900/40 text-danger-600'
    if (a.includes('post') || a.includes('create') || a.includes('approve')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
    if (a.includes('login') || a.includes('logout') || a.includes('grant') || a.includes('revoke')) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-600'
    return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
  }
  function activityTitle(ev: AuditEventRow): string {
    const target = ev.entityLabel || (ev.entityId ? `#${ev.entityId}` : '')
    return `${ev.entityType}${target ? ` ${target}` : ''} — ${ev.action}`
  }

  // ---------------------------------------------------------------------------------------------
  $: loading = summaryLoading || listsLoading || trendLoading || activityLoading

  function load(): void {
    void loadSummary()
    void loadLists()
    void loadTrend()
    void loadActivity()
  }

  onMount(load)
</script>

<div class="space-y-6 animate-fade-in">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">Pharmacy Dashboard</h1>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">
        {#if $session.user}
          Welcome back, <span class="font-medium text-secondary-800 dark:text-secondary-200">{$session.user.displayName}</span> ({$session.user.roles.join(', ')})
        {:else}
          Real-time operational summary of inventory, sales dispensing, and stock alerts.
        {/if}
      </p>
    </div>

    <button
      type="button"
      class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
      on:click={load}
      disabled={loading}
    >
      <Icon icon={Icons.refresh} className={`w-4 h-4 text-secondary-500 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  </div>

  <!-- Stat Cards (real data from GET /dashboards/summary) -->
  {#if summaryError}
    <div class="bg-danger-500/10 border border-danger-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="p-2 bg-danger-500/20 rounded-lg text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5">
          <Icon icon={Icons.alertTriangle} className="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-danger-900 dark:text-danger-200">Could not load dashboard summary</h3>
          <p class="text-xs text-danger-700 dark:text-danger-400 mt-0.5">{summaryError}</p>
        </div>
      </div>
      <button type="button" on:click={loadSummary} class="px-3 py-1.5 text-xs font-medium bg-danger-600 text-white hover:bg-danger-700 rounded-lg transition-colors flex-shrink-0">
        Retry
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DashboardStatCard
        label="Today's Sales"
        value={summaryLoading ? '…' : formatMoney(summary?.todaysSalesTotal ?? null)}
        change={summaryLoading ? '' : `${summary?.todaysSaleCount ?? 0} invoice${(summary?.todaysSaleCount ?? 0) === 1 ? '' : 's'} today`}
        isPositive={true}
        icon={Icons.currencyDollar}
        iconBg="bg-success-100 dark:bg-success-900/40"
        iconColor="text-success-600 dark:text-success-400"
        showMenu={false}
      />
      <DashboardStatCard
        label="Low Stock Items"
        value={summaryLoading ? '…' : String(summary?.lowStockCount ?? 0)}
        change="Below reorder threshold"
        isPositive={false}
        icon={Icons.alertTriangle}
        iconBg="bg-danger-100 dark:bg-danger-900/40"
        iconColor="text-danger-600 dark:text-danger-400"
        showMenu={false}
      />
      <DashboardStatCard
        label="Adjustments Awaiting Approval"
        value={summaryLoading ? '…' : String(summary?.adjustmentsAwaitingApprovalCount ?? 0)}
        change="Requires review"
        isPositive={true}
        icon={Icons.checklist}
        iconBg="bg-warning-100 dark:bg-warning-900/40"
        iconColor="text-warning-600 dark:text-warning-400"
        showMenu={false}
      />
      <DashboardStatCard
        label="Outstanding Receivables"
        value={summaryLoading ? '…' : formatMoney(summary?.outstandingArTotal ?? null)}
        change="Owed by customers"
        isPositive={true}
        icon={Icons.wallet}
        iconBg="bg-info-100 dark:bg-info-900/40"
        iconColor="text-info-600 dark:text-info-400"
        showMenu={false}
      />
      <DashboardStatCard
        label="Outstanding Payables"
        value={summaryLoading ? '…' : formatMoney(summary?.outstandingApTotal ?? null)}
        change="Owed to suppliers"
        isPositive={false}
        icon={Icons.truck}
        iconBg="bg-primary-100 dark:bg-primary-900/40"
        iconColor="text-primary-600 dark:text-primary-400"
        showMenu={false}
      />
      <DashboardStatCard
        label="Expiry Value at Risk"
        value={summaryLoading ? '…' : formatMoney(summary?.expiryValueAtRisk ?? null)}
        change="Within 90 days"
        isPositive={false}
        icon={Icons.clock}
        iconBg="bg-danger-100 dark:bg-danger-900/40"
        iconColor="text-danger-600 dark:text-danger-400"
        showMenu={false}
      />
    </div>
  {/if}

  <!-- Sales Trend Chart (real: reportingApi "sales-summary" report, groupBy date) -->
  <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Sales Trend (Last 7 Days)</h3>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">Net posted sales per day</p>
      </div>
    </div>
    {#if trendLoading}
      <div class="h-72 flex items-center justify-center text-sm text-secondary-500">Loading sales trend…</div>
    {:else if trendError}
      <div class="h-72 flex flex-col items-center justify-center gap-2 text-center">
        <Icon icon={Icons.alertTriangle} className="w-6 h-6 text-danger-500" />
        <p class="text-sm text-secondary-600 dark:text-secondary-300">{trendError}</p>
        <button type="button" on:click={loadTrend} class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white hover:opacity-90 rounded-lg transition-opacity">
          Retry
        </button>
      </div>
    {:else if trendRows.length === 0}
      <div class="h-72 flex items-center justify-center text-sm text-secondary-500">No posted sales in the last 7 days.</div>
    {:else}
      <div class="h-72">
        <ChartCanvas type="line" data={trendChartData} height={288} showLegend={false} />
      </div>
    {/if}
  </div>

  <!-- Low Stock Alerts & Recent Sales Data Cards -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Low Stock Alerts Table -->
    <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-secondary-900 dark:text-white">Low Stock Alerts (&lt; 20 units)</h2>
          <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Items needing urgent purchase replenishment</p>
        </div>
        <a href="/pharmacy/inventory" class="text-xs font-semibold text-theme-primary hover:underline bg-theme-primary/10 px-3 py-1.5 rounded-lg">
          View Inventory &rarr;
        </a>
      </div>

      {#if listsLoading}
        <div class="py-8 text-center text-sm text-secondary-500">Loading stock status...</div>
      {:else if listsError}
        <div class="py-8 text-center">
          <Icon icon={Icons.alertTriangle} className="w-6 h-6 text-danger-500 mx-auto mb-2" />
          <p class="text-sm text-secondary-600 dark:text-secondary-300 mb-3">{listsError}</p>
          <button type="button" on:click={loadLists} class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white hover:opacity-90 rounded-lg transition-opacity">
            Retry
          </button>
        </div>
      {:else if lowStockRows.length === 0}
        <div class="py-8 text-center text-sm text-secondary-500">No items currently below the reorder threshold.</div>
      {:else}
        <div class="divide-y divide-surface-200 dark:divide-surface-700">
          {#each lowStockRows as row (row.itemId)}
            <div class="py-3.5 flex items-center justify-between gap-3 group">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-danger-100 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {row.itemName.slice(0, 2).toUpperCase()}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-secondary-900 dark:text-white truncate group-hover:text-theme-primary transition-colors">
                    {row.itemName}
                  </p>
                  <p class="text-xs text-secondary-500 font-mono mt-0.5">
                    {row.nearestExpiry ? `Nearest expiry: ${formatDate(row.nearestExpiry)}` : `${row.lotCount} lot(s) on hand`}
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300">
                  <Icon icon={Icons.alertTriangle} className="w-3 h-3" />
                  {formatQty(row.qtyOnHand)} remaining
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Sales Today Table -->
    <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-secondary-900 dark:text-white">Recent Sales Today</h2>
          <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Latest sales POS invoices issued</p>
        </div>
        <a href="/pharmacy/sales/invoices" class="text-xs font-semibold text-theme-primary hover:underline bg-theme-primary/10 px-3 py-1.5 rounded-lg">
          View All Invoices &rarr;
        </a>
      </div>

      {#if listsLoading}
        <div class="py-8 text-center text-sm text-secondary-500">Loading recent sales...</div>
      {:else if listsError}
        <div class="py-8 text-center">
          <Icon icon={Icons.alertTriangle} className="w-6 h-6 text-danger-500 mx-auto mb-2" />
          <p class="text-sm text-secondary-600 dark:text-secondary-300 mb-3">{listsError}</p>
          <button type="button" on:click={loadLists} class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white hover:opacity-90 rounded-lg transition-opacity">
            Retry
          </button>
        </div>
      {:else if recentSales.length === 0}
        <div class="py-8 text-center text-sm text-secondary-500">No sales invoices issued today yet.</div>
      {:else}
        <div class="divide-y divide-surface-200 dark:divide-surface-700">
          {#each recentSales as inv (inv.saleInvoiceId || inv.docNumber)}
            <div class="py-3.5 flex items-center justify-between gap-3 group">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/40 text-success-600 dark:text-success-400 flex items-center justify-center flex-shrink-0">
                  <Icon icon={Icons.database} className="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-secondary-900 dark:text-white truncate group-hover:text-theme-primary transition-colors">
                    {inv.docNumber}
                  </p>
                  <p class="text-xs text-secondary-500 mt-0.5">
                    {customerLabel(inv.customerId)} • {formatDateTime(inv.documentDate)}
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm font-bold text-secondary-900 dark:text-white">
                  {formatMoney(inv.invoiceTotal)}
                </p>
                <span class="inline-block text-ui-2xs font-semibold text-secondary-400 uppercase tracking-wider mt-0.5">
                  {inv.status}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Quick Actions & System Activity Row -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Quick Action Cards Grid (Col 2) -->
    <div class="lg:col-span-2 card rounded-xl p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-secondary-900 dark:text-white">Quick Actions</h2>
          <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Frequently used pharmacy workflows and entry tasks</p>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/pharmacy/sales/invoices"
          class="group p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-theme-primary dark:hover:border-theme-primary bg-surface-50 dark:bg-surface-800/40 hover:bg-white dark:hover:bg-surface-800 transition-all duration-200 flex items-start gap-4"
        >
          <div class="w-12 h-12 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center flex-shrink-0 group-hover:bg-theme-primary group-hover:text-white transition-colors">
            <Icon icon={Icons.database} className="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">New Sale Invoice</h4>
            <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Issue POS sale, record payment & dispense items</p>
          </div>
        </a>

        <a
          href="/pharmacy/purchasing/invoices"
          class="group p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-theme-primary dark:hover:border-theme-primary bg-surface-50 dark:bg-surface-800/40 hover:bg-white dark:hover:bg-surface-800 transition-all duration-200 flex items-start gap-4"
        >
          <div class="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-600 group-hover:text-white transition-colors">
            <Icon icon={Icons.truck} className="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">New Purchase Invoice</h4>
            <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Receive stock batches & supplier invoices</p>
          </div>
        </a>

        <a
          href="/pharmacy/inventory/adjustments"
          class="group p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-theme-primary dark:hover:border-theme-primary bg-surface-50 dark:bg-surface-800/40 hover:bg-white dark:hover:bg-surface-800 transition-all duration-200 flex items-start gap-4"
        >
          <div class="w-12 h-12 rounded-xl bg-warning-100 text-warning-600 dark:bg-warning-900/40 dark:text-warning-400 flex items-center justify-center flex-shrink-0 group-hover:bg-warning-600 group-hover:text-white transition-colors">
            <Icon icon={Icons.checklist} className="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">Stock Adjustment</h4>
            <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Reconcile counts, damages or batch write-offs</p>
          </div>
        </a>

        <a
          href="/pharmacy/sales/customers"
          class="group p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-theme-primary dark:hover:border-theme-primary bg-surface-50 dark:bg-surface-800/40 hover:bg-white dark:hover:bg-surface-800 transition-all duration-200 flex items-start gap-4"
        >
          <div class="w-12 h-12 rounded-xl bg-success-100 text-success-600 dark:bg-success-900/40 dark:text-success-400 flex items-center justify-center flex-shrink-0 group-hover:bg-success-600 group-hover:text-white transition-colors">
            <Icon icon={Icons.contacts} className="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">Add Customer Account</h4>
            <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Register new patient profiles & clinic accounts</p>
          </div>
        </a>
      </div>
    </div>

    <!-- Recent Activity Timeline (Col 1) -- real GET /audit/events?limit=5 -->
    <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Recent System Activity</h3>
        <span class="text-xs text-secondary-400">Audit log</span>
      </div>
      {#if activityLoading}
        <div class="py-6 text-center text-sm text-secondary-500">Loading activity…</div>
      {:else if activityError}
        <div class="py-6 text-center">
          <p class="text-xs text-secondary-500 mb-2">{activityError}</p>
          <button type="button" on:click={loadActivity} class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white hover:opacity-90 rounded-lg transition-opacity">
            Retry
          </button>
        </div>
      {:else if activityRows.length === 0}
        <div class="py-6 text-center text-sm text-secondary-500">No recent activity recorded.</div>
      {:else}
        <div class="space-y-4">
          {#each activityRows as ev (ev.auditLogId)}
            <div class="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors">
              <div class={`w-9 h-9 rounded-xl ${activityIconBg(ev.action)} flex items-center justify-center flex-shrink-0`}>
                <Icon icon={activityIcon(ev.action)} className="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-secondary-900 dark:text-white truncate">{activityTitle(ev)}</p>
                <p class="text-ui-xs text-secondary-500 dark:text-secondary-400 mt-0.5">by {ev.actorUsername}</p>
              </div>
              <span class="text-ui-xs text-secondary-400 flex-shrink-0">{formatDateTime(ev.occurredAt)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
