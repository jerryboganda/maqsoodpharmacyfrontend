<script lang="ts">
  // Wave 6 "Reports" page -- a report picker (grouped sales/purchase/inventory/finance, matching
  // report-registry.ts's `group` field) + a filter form appropriate to whichever of the 8 reports
  // is selected + Run + a results table rendering that report's real columns + an offset/limit
  // pager for the reports that are lists (all but expiry-report, which is always a fixed 4-bucket
  // set -- report-helpers.ts's `paginate` is never called for it).
  //
  // Structure mirrors ExpensesPage.svelte's list+filter+table shape (loading/error/empty states,
  // toastApiError helper, Live API/Demo Preview badge) but with no create/edit modal -- this page
  // has no write actions, only GET /reports and POST /reports/{id}/run (reports.controller.ts's
  // own header comment: "both are pure reads, never a write").
  //
  // Rule M: every money field (netAmount, stockValue, avgUnitCost, the aging bucket amounts,
  // total) goes through formatMoney; every quantity field (qty, qtyOnHand, reorderQty,
  // thresholdQty) goes through formatQty; every date goes through formatDate. Filter values typed
  // into the date/number inputs are sent back to the API as the raw string/number the user
  // entered -- never round-tripped through formatMoney/formatQty first.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { toast } from '../../stores/toast'
  import { ApiError, ApiNetworkError, formatMoney, formatQty, formatDate, todayYmd, catalogApi, purchasingApi, salesApi } from '../../api'
  import type { ItemSummary, SupplierRow, CustomerRow } from '../../api'
  import { reportingApi } from '../../api/reporting'
  import type {
    ReportDefinition,
    ReportGroup,
    MetricDefinition,
    ReportMeta,
    AnyRunReportResult,
    AnyReportRow,
    SalesSummaryFilters,
    SalesSummaryRow,
    PurchaseSummaryFilters,
    PurchaseSummaryRow,
    StockValuationFilters,
    StockValuationRow,
    ExpiryReportFilters,
    ExpiryBucketRow,
    ExpiryBucketKey,
    ExpiryReportMeta,
    ReorderLevelFilters,
    ReorderLevelRow,
    ApAgingFilters,
    ArAgingFilters,
    AgingRow,
    AgingBucketKey,
    LowStockFilters,
    LowStockRow,
    ControlledDrugRegisterFilters,
    ControlledDrugRegisterRow,
  } from '../../api/reporting'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4 whitespace-nowrap'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200 whitespace-nowrap'

  function toastApiError(err: unknown, fallback: string): string {
    const message = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : fallback
    toast.error(message)
    return message
  }

  // ---------------------------------------------------------------------------------------------
  // Report registry (GET /reports) + metric definitions (GET /metrics/definitions, optional
  // descriptive text near the picker).
  // ---------------------------------------------------------------------------------------------
  let definitions: ReportDefinition[] = []
  let defsLoading = true
  let defsError = ''
  let metricDefs: MetricDefinition[] = []
  let showMetricDefs = false

  const GROUPS: { value: 'all' | ReportGroup; label: string }[] = [
    { value: 'all', label: 'All reports' },
    { value: 'sales', label: 'Sales' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'finance', label: 'Finance' },
  ]
  const GROUP_ICONS: Record<ReportGroup, string> = {
    sales: Icons.chartLine,
    purchase: Icons.shoppingBag,
    inventory: Icons.package,
    finance: Icons.currencyDollar,
  }

  let groupFilter: 'all' | ReportGroup = 'all'
  $: visibleDefinitions = groupFilter === 'all' ? definitions : definitions.filter((d) => d.group === groupFilter)

  async function loadDefinitions(): Promise<void> {
    defsLoading = true
    defsError = ''
    try {
      definitions = await reportingApi.listReports()
    } catch (err) {
      defsError = err instanceof ApiNetworkError ? err.message : err instanceof ApiError ? err.detail : 'Could not load the report list.'
      definitions = []
    } finally {
      defsLoading = false
    }
  }

  async function loadMetricDefs(): Promise<void> {
    try {
      metricDefs = await reportingApi.listMetricDefinitions()
    } catch {
      metricDefs = []
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Lookups for the itemId/customerId/supplierId filter selects.
  // ---------------------------------------------------------------------------------------------
  let items: ItemSummary[] = []
  let customers: CustomerRow[] = []
  let suppliers: SupplierRow[] = []

  async function loadLookups(): Promise<void> {
    try {
      const [itemsResult, customersResult, suppliersResult] = await Promise.all([
        catalogApi.listItems({ isActive: true, limit: 200 }),
        salesApi.listCustomers({ isActive: true, limit: 200 }),
        purchasingApi.listSuppliers({ isActive: true, limit: 200 }),
      ])
      items = itemsResult.items
      customers = customersResult.customers
      suppliers = suppliersResult.suppliers
    } catch {
      items = []
      customers = []
      suppliers = []
    }
  }

  onMount(() => {
    void loadDefinitions()
    void loadMetricDefs()
    void loadLookups()
  })

  // ---------------------------------------------------------------------------------------------
  // Selected report + filter form state (one shared set of fields, shown/hidden per report --
  // see the `show*` reactive flags below).
  // ---------------------------------------------------------------------------------------------
  let selected: ReportDefinition | null = null

  let dateFrom = ''
  let dateTo = ''
  let groupBy = ''
  let customerId: number | '' = ''
  let supplierId: number | '' = ''
  let itemId: number | '' = ''
  let asOfDate = ''
  let thresholdQty = ''

  let offset = 0
  let limit = 50

  function selectReport(def: ReportDefinition): void {
    selected = def
    dateFrom = ''
    dateTo = ''
    customerId = ''
    supplierId = ''
    itemId = ''
    asOfDate = ''
    thresholdQty = ''
    offset = 0
    limit = 50
    hasRun = false
    rows = []
    meta = null
    extra = null
    runError = ''
    groupBy =
      def.reportId === 'sales-summary' || def.reportId === 'purchase-summary'
        ? 'date'
        : def.reportId === 'stock-valuation'
          ? 'item'
          : ''
  }

  $: groupByOptions =
    selected?.reportId === 'sales-summary'
      ? ([
          ['date', 'Date'],
          ['item', 'Item'],
          ['customer', 'Customer'],
        ] as const)
      : selected?.reportId === 'purchase-summary'
        ? ([
            ['date', 'Date'],
            ['item', 'Item'],
            ['supplier', 'Supplier'],
          ] as const)
        : selected?.reportId === 'stock-valuation'
          ? ([
              ['item', 'Item'],
              ['branch', 'Branch'],
            ] as const)
          : null

  $: showDateRange = selected?.reportId === 'sales-summary' || selected?.reportId === 'purchase-summary' || selected?.reportId === 'controlled-drug-register'
  $: showGroupBy = groupByOptions !== null
  $: showCustomer = selected?.reportId === 'sales-summary' || selected?.reportId === 'ar-aging'
  $: showSupplier = selected?.reportId === 'purchase-summary' || selected?.reportId === 'ap-aging'
  $: itemFilterableByGroupBy = selected?.reportId === 'sales-summary' || selected?.reportId === 'purchase-summary' || selected?.reportId === 'stock-valuation'
  $: showItem =
    selected?.reportId === 'expiry-report' ||
    selected?.reportId === 'reorder-level' ||
    selected?.reportId === 'low-stock' ||
    selected?.reportId === 'controlled-drug-register' ||
    (itemFilterableByGroupBy && groupBy === 'item')
  $: showAsOfDate = selected?.reportId === 'ap-aging' || selected?.reportId === 'ar-aging'
  $: showThreshold = selected?.reportId === 'low-stock'
  $: showPager = selected?.reportId !== 'expiry-report'

  // itemId only applies server-side when groupBy="item" for sales-summary/purchase-summary (a
  // 422 REPORT.FILTER_INVALID otherwise) -- clear it the moment groupBy moves away from "item" so
  // a stale value never gets silently sent (and rejected) on the next Run.
  $: if (itemFilterableByGroupBy && groupBy !== 'item' && itemId !== '') itemId = ''

  $: itemLabel = (id: number): string => items.find((i) => i.itemId === id)?.name ?? `Item #${id}`
  $: customerLabel = (id: number): string => customers.find((c) => c.customerId === id)?.name ?? `Customer #${id}`
  $: supplierLabel = (id: number): string => suppliers.find((s) => s.supplierId === id)?.name ?? `Supplier #${id}`

  // ---------------------------------------------------------------------------------------------
  // Run the selected report.
  // ---------------------------------------------------------------------------------------------
  let running = false
  let hasRun = false
  let runError = ''
  let rows: AnyReportRow[] = []
  let meta: ReportMeta | ExpiryReportMeta | null = null
  let extra: AnyRunReportResult | null = null

  $: extraAsOfDate = extra?.asOfDate
  $: extraThresholdQty = extra?.thresholdQty
  $: expiryMeta = selected?.reportId === 'expiry-report' && meta && 'asOfDate' in meta ? (meta as ExpiryReportMeta) : null

  function salesSummaryFilters(): SalesSummaryFilters {
    const f: SalesSummaryFilters = {}
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo
    if (groupBy) f.groupBy = groupBy as SalesSummaryFilters['groupBy']
    if (customerId !== '') f.customerId = customerId
    if (itemId !== '' && groupBy === 'item') f.itemId = itemId
    return f
  }
  function purchaseSummaryFilters(): PurchaseSummaryFilters {
    const f: PurchaseSummaryFilters = {}
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo
    if (groupBy) f.groupBy = groupBy as PurchaseSummaryFilters['groupBy']
    if (supplierId !== '') f.supplierId = supplierId
    if (itemId !== '' && groupBy === 'item') f.itemId = itemId
    return f
  }
  function stockValuationFilters(): StockValuationFilters {
    const f: StockValuationFilters = {}
    if (groupBy) f.groupBy = groupBy as StockValuationFilters['groupBy']
    if (itemId !== '' && groupBy === 'item') f.itemId = itemId
    return f
  }
  function expiryReportFilters(): ExpiryReportFilters {
    const f: ExpiryReportFilters = {}
    if (itemId !== '') f.itemId = itemId
    return f
  }
  function reorderLevelFilters(): ReorderLevelFilters {
    const f: ReorderLevelFilters = {}
    if (itemId !== '') f.itemId = itemId
    return f
  }
  function apAgingFilters(): ApAgingFilters {
    const f: ApAgingFilters = {}
    if (supplierId !== '') f.supplierId = supplierId
    if (asOfDate) f.asOfDate = asOfDate
    return f
  }
  function arAgingFilters(): ArAgingFilters {
    const f: ArAgingFilters = {}
    if (customerId !== '') f.customerId = customerId
    if (asOfDate) f.asOfDate = asOfDate
    return f
  }
  function lowStockFilters(): LowStockFilters {
    const f: LowStockFilters = {}
    if (itemId !== '') f.itemId = itemId
    if (thresholdQty.trim()) f.thresholdQty = thresholdQty.trim()
    return f
  }
  function controlledDrugRegisterFilters(): ControlledDrugRegisterFilters {
    const f: ControlledDrugRegisterFilters = {}
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo
    if (itemId !== '') f.itemId = itemId
    return f
  }

  async function runSelected(resetOffset: boolean): Promise<void> {
    if (!selected) return
    if (resetOffset) offset = 0
    runError = ''
    running = true
    const page = { offset, limit }
    try {
      let res: AnyRunReportResult
      switch (selected.reportId) {
        case 'sales-summary':
          res = (await reportingApi.runReport('sales-summary', { filters: salesSummaryFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'purchase-summary':
          res = (await reportingApi.runReport('purchase-summary', { filters: purchaseSummaryFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'stock-valuation':
          res = (await reportingApi.runReport('stock-valuation', { filters: stockValuationFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'expiry-report':
          res = (await reportingApi.runReport('expiry-report', { filters: expiryReportFilters() })) as unknown as AnyRunReportResult
          break
        case 'reorder-level':
          res = (await reportingApi.runReport('reorder-level', { filters: reorderLevelFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'ap-aging':
          res = (await reportingApi.runReport('ap-aging', { filters: apAgingFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'ar-aging':
          res = (await reportingApi.runReport('ar-aging', { filters: arAgingFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'low-stock':
          res = (await reportingApi.runReport('low-stock', { filters: lowStockFilters(), ...page })) as unknown as AnyRunReportResult
          break
        case 'controlled-drug-register':
          res = (await reportingApi.runReport('controlled-drug-register', { filters: controlledDrugRegisterFilters(), ...page })) as unknown as AnyRunReportResult
          break
        default:
          return
      }
      rows = [...res.data]
      meta = res.meta
      extra = res
      hasRun = true
    } catch (err) {
      runError = toastApiError(err, 'Could not run this report.')
      rows = []
      meta = null
      extra = null
    } finally {
      running = false
    }
  }

  function goPrevPage(): void {
    if (offset <= 0 || running) return
    offset = Math.max(0, offset - limit)
    void runSelected(false)
  }
  function goNextPage(): void {
    if (!meta?.hasMore || running) return
    offset = offset + limit
    void runSelected(false)
  }

  // ---------------------------------------------------------------------------------------------
  // Column helpers -- each report family gets its own small set of typed accessors rather than
  // `as` casts sprinkled through the markup.
  // ---------------------------------------------------------------------------------------------
  $: showQtyColumn = (selected?.reportId === 'sales-summary' || selected?.reportId === 'purchase-summary') && groupBy === 'item'
  $: showAvgCostColumn = selected?.reportId === 'stock-valuation' && groupBy === 'item'
  $: dateGrouped = (selected?.reportId === 'sales-summary' || selected?.reportId === 'purchase-summary') && groupBy === 'date'

  function summaryRow(row: AnyReportRow): SalesSummaryRow | PurchaseSummaryRow {
    return row as SalesSummaryRow | PurchaseSummaryRow
  }
  function stockRow(row: AnyReportRow): StockValuationRow {
    return row as StockValuationRow
  }
  function expiryRow(row: AnyReportRow): ExpiryBucketRow {
    return row as ExpiryBucketRow
  }
  function reorderRow(row: AnyReportRow): ReorderLevelRow {
    return row as ReorderLevelRow
  }
  function agingRow(row: AnyReportRow): AgingRow {
    return row as AgingRow
  }
  function lowStockRow(row: AnyReportRow): LowStockRow {
    return row as LowStockRow
  }
  function controlledDrugRow(row: AnyReportRow): ControlledDrugRegisterRow {
    return row as ControlledDrugRegisterRow
  }

  const EXPIRY_BUCKET_LABELS: Record<ExpiryBucketKey, string> = {
    expired: 'Expired',
    d0to30: '0–30 days',
    d30to60: '30–60 days',
    d60to90: '60–90 days',
  }
  const AGING_BUCKET_LABELS: Record<AgingBucketKey, string> = {
    current: 'Current',
    days1to30: '1–30 days',
    days31to60: '31–60 days',
    days61to90: '61–90 days',
    days90plus: '90+ days',
  }
  const AGING_BUCKET_ORDER: AgingBucketKey[] = ['current', 'days1to30', 'days31to60', 'days61to90', 'days90plus']

  function partyLabel(row: AgingRow): string {
    if (selected?.reportId === 'ap-aging') return supplierLabel(row.partyId)
    if (selected?.reportId === 'ar-aging') return customerLabel(row.partyId)
    return row.partyName
  }
</script>

<div class="space-y-6 animate-fade-in">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="heading-2 text-secondary-900 dark:text-white">Reports</h1>
        {#if defsError}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Demo Preview
          </span>
        {:else}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Live API
          </span>
        {/if}
      </div>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">
        Pick a report, set its filters, and run it against posted data -- every report here is a read-only query, nothing here writes to the ledger.
      </p>
    </div>

    <button
      type="button"
      class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
      on:click={loadDefinitions}
      disabled={defsLoading}
    >
      <Icon icon={Icons.refresh} className={`w-4 h-4 text-secondary-500 ${defsLoading ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  </div>

  {#if defsError}
    <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
          <Icon icon={Icons.alertTriangle} className="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-200">Session Notice</h3>
          <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{defsError}</p>
        </div>
      </div>
      <button type="button" on:click={loadDefinitions} class="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white hover:opacity-90 rounded-lg transition-colors flex-shrink-0">
        Retry
      </button>
    </div>
  {/if}

  <!-- Report picker -->
  <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-xs font-medium text-secondary-500 dark:text-secondary-400">Group:</span>
      <div class="inline-flex flex-wrap p-1 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        {#each GROUPS as g (g.value)}
          <button
            type="button"
            on:click={() => (groupFilter = g.value)}
            class={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${groupFilter === g.value ? 'bg-white dark:bg-surface-700 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-900 dark:hover:text-white'}`}
          >
            {g.label}
          </button>
        {/each}
      </div>
    </div>

    {#if defsLoading}
      <p class="text-sm text-secondary-500 py-6 text-center">Loading reports…</p>
    {:else if !visibleDefinitions.length}
      <p class="text-sm text-secondary-500 py-6 text-center">No reports in this group.</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {#each visibleDefinitions as def (def.reportId)}
          <button
            type="button"
            on:click={() => selectReport(def)}
            class={`text-left rounded-xl border p-4 transition-colors ${selected?.reportId === def.reportId ? 'border-theme-primary bg-theme-primary/5 ring-1 ring-theme-primary' : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
          >
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg bg-theme-primary/10 text-theme-primary flex items-center justify-center flex-shrink-0">
                <Icon icon={GROUP_ICONS[def.group]} className="w-4 h-4" />
              </div>
              <span class="text-sm font-semibold text-secondary-900 dark:text-white">{def.title}</span>
            </div>
            <p class="text-xs text-secondary-500 dark:text-secondary-400">{def.description}</p>
          </button>
        {/each}
      </div>
    {/if}

    {#if metricDefs.length}
      <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-theme-primary hover:opacity-80"
          on:click={() => (showMetricDefs = !showMetricDefs)}
        >
          <Icon icon={Icons.infoCircle} className="w-4 h-4" />
          {showMetricDefs ? 'Hide' : 'What do these numbers mean?'}
        </button>
        {#if showMetricDefs}
          <dl class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each metricDefs as m (m.key)}
              <div class="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-3">
                <dt class="text-xs font-semibold text-secondary-900 dark:text-white">{m.title}</dt>
                <dd class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{m.definition}</dd>
              </div>
            {/each}
          </dl>
        {/if}
      </div>
    {/if}
  </div>

  {#if selected}
    <!-- Filter form -->
    <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-secondary-900 dark:text-white">{selected.title}</h2>
      </div>

      <div class="flex flex-wrap items-end gap-3 mb-4">
        {#if showDateRange}
          <div>
            <label class={labelClass} for="rpt-from">From</label>
            <input id="rpt-from" type="date" bind:value={dateFrom} class={inputClass} />
          </div>
          <div>
            <label class={labelClass} for="rpt-to">To</label>
            <input id="rpt-to" type="date" bind:value={dateTo} class={inputClass} />
          </div>
        {/if}

        {#if showAsOfDate}
          <div>
            <label class={labelClass} for="rpt-asof">As of date</label>
            <input id="rpt-asof" type="date" bind:value={asOfDate} class={inputClass} placeholder={todayYmd()} />
          </div>
        {/if}

        {#if showGroupBy && groupByOptions}
          <div>
            <label class={labelClass} for="rpt-groupby">Group by</label>
            <select id="rpt-groupby" bind:value={groupBy} class={inputClass}>
              {#each groupByOptions as [value, label] (value)}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if showCustomer}
          <div>
            <label class={labelClass} for="rpt-customer">Customer</label>
            <select id="rpt-customer" bind:value={customerId} class={inputClass}>
              <option value="">All customers</option>
              {#each customers as c (c.customerId)}
                <option value={c.customerId}>{c.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if showSupplier}
          <div>
            <label class={labelClass} for="rpt-supplier">Supplier</label>
            <select id="rpt-supplier" bind:value={supplierId} class={inputClass}>
              <option value="">All suppliers</option>
              {#each suppliers as s (s.supplierId)}
                <option value={s.supplierId}>{s.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if showItem}
          <div>
            <label class={labelClass} for="rpt-item">Item</label>
            <select id="rpt-item" bind:value={itemId} class={inputClass}>
              <option value="">All items</option>
              {#each items as i (i.itemId)}
                <option value={i.itemId}>{i.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if showThreshold}
          <div>
            <label class={labelClass} for="rpt-threshold">Threshold qty</label>
            <input id="rpt-threshold" type="text" inputmode="decimal" bind:value={thresholdQty} class={inputClass} placeholder="20.0000" />
          </div>
        {/if}

        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-semibold bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          on:click={() => runSelected(true)}
          disabled={running}
        >
          <Icon icon={Icons.chartBar} className="w-4 h-4" />
          {running ? 'Running…' : 'Run report'}
        </button>
      </div>

      {#if runError}
        <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
          {runError}
        </div>
      {/if}

      {#if hasRun}
        <!-- Result summary strip -->
        {#if selected.reportId === 'ap-aging' || selected.reportId === 'ar-aging'}
          {#if extraAsOfDate}
            <p class="text-xs text-secondary-500 mb-3">As of {formatDate(extraAsOfDate)}</p>
          {/if}
        {:else if selected.reportId === 'low-stock'}
          {#if extraThresholdQty}
            <p class="text-xs text-secondary-500 mb-3">Threshold: below {formatQty(extraThresholdQty)} units on hand</p>
          {/if}
        {:else if selected.reportId === 'expiry-report' && expiryMeta}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-3">
              <p class="text-xs text-secondary-500">As of</p>
              <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatDate(expiryMeta.asOfDate)}</p>
            </div>
            <div class="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-3">
              <p class="text-xs text-secondary-500">Horizon</p>
              <p class="text-sm font-semibold text-secondary-900 dark:text-white">{expiryMeta.horizonDays} days</p>
            </div>
            <div class="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-3">
              <p class="text-xs text-secondary-500">Total value at risk</p>
              <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(expiryMeta.totalValue)}</p>
            </div>
            <div class="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-3">
              <p class="text-xs text-secondary-500">Lots</p>
              <p class="text-sm font-semibold text-secondary-900 dark:text-white">{expiryMeta.totalLotCount}</p>
            </div>
          </div>
          {#if expiryMeta.unsupportedBuckets.length}
            <p class="text-xs text-amber-600 dark:text-amber-400 mb-3">
              Note: the {expiryMeta.unsupportedBuckets.join(', ')} bucket is not available yet.
            </p>
          {/if}
        {/if}

        <!-- Results table -->
        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto scrollbar-thin" tabindex="0" role="region" aria-label="Report results table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-800/80 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  {#if selected.reportId === 'sales-summary' || selected.reportId === 'purchase-summary'}
                    <th class={headClass}>{dateGrouped ? 'Date' : selected.reportId === 'sales-summary' ? (groupBy === 'customer' ? 'Customer' : 'Item') : groupBy === 'supplier' ? 'Supplier' : 'Item'}</th>
                    <th class={`${headClass} text-right`}>Net Amount</th>
                    {#if showQtyColumn}<th class={`${headClass} text-right`}>Qty</th>{/if}
                    <th class={`${headClass} text-right`}>Invoices</th>
                  {:else if selected.reportId === 'stock-valuation'}
                    <th class={headClass}>{groupBy === 'branch' ? 'Branch' : 'Item'}</th>
                    <th class={`${headClass} text-right`}>Qty On Hand</th>
                    {#if showAvgCostColumn}<th class={`${headClass} text-right`}>Avg Unit Cost</th>{/if}
                    <th class={`${headClass} text-right`}>Stock Value</th>
                  {:else if selected.reportId === 'expiry-report'}
                    <th class={headClass}>Bucket</th>
                    <th class={`${headClass} text-right`}>Lots</th>
                    <th class={`${headClass} text-right`}>Qty</th>
                    <th class={`${headClass} text-right`}>Value</th>
                  {:else if selected.reportId === 'reorder-level'}
                    <th class={headClass}>Item</th>
                    <th class={`${headClass} text-right`}>Qty On Hand</th>
                    <th class={`${headClass} text-right`}>Reorder Qty</th>
                  {:else if selected.reportId === 'ap-aging' || selected.reportId === 'ar-aging'}
                    <th class={headClass}>{selected.reportId === 'ap-aging' ? 'Supplier' : 'Customer'}</th>
                    {#each AGING_BUCKET_ORDER as key (key)}
                      <th class={`${headClass} text-right`}>{AGING_BUCKET_LABELS[key]}</th>
                    {/each}
                    <th class={`${headClass} text-right`}>Total</th>
                    <th class={`${headClass} text-right`}>Invoices</th>
                  {:else if selected.reportId === 'low-stock'}
                    <th class={headClass}>Item</th>
                    <th class={`${headClass} text-right`}>Qty On Hand</th>
                  {:else if selected.reportId === 'controlled-drug-register'}
                    <th class={headClass}>Date</th>
                    <th class={headClass}>Invoice</th>
                    <th class={headClass}>Item</th>
                    <th class={headClass}>Batch</th>
                    <th class={`${headClass} text-right`}>Qty</th>
                    <th class={headClass}>Dispensing note</th>
                    <th class={headClass}>Dispensed by</th>
                  {/if}
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#if running}
                  <tr><td colspan="8" class="py-12 px-4 text-center text-sm text-secondary-500">Running report…</td></tr>
                {:else if !rows.length}
                  <tr>
                    <td colspan="8" class="py-12 px-4 text-center">
                      <Icon icon={Icons.search} className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                      <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">No rows matched these filters.</p>
                    </td>
                  </tr>
                {:else if selected.reportId === 'sales-summary' || selected.reportId === 'purchase-summary'}
                  {#each rows as row (summaryRow(row).key)}
                    {@const r = summaryRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{dateGrouped ? formatDate(r.label) : r.label}</td>
                      <td class={`${cellClass} text-right font-semibold`}>{formatMoney(r.netAmount)}</td>
                      {#if showQtyColumn}<td class={`${cellClass} text-right`}>{formatQty(r.qty)}</td>{/if}
                      <td class={`${cellClass} text-right`}>{r.invoiceCount}</td>
                    </tr>
                  {/each}
                {:else if selected.reportId === 'stock-valuation'}
                  {#each rows as row (stockRow(row).key)}
                    {@const r = stockRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{r.label}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(r.qtyOnHand)}</td>
                      {#if showAvgCostColumn}<td class={`${cellClass} text-right`}>{formatMoney(r.avgUnitCost)}</td>{/if}
                      <td class={`${cellClass} text-right font-semibold`}>{formatMoney(r.stockValue)}</td>
                    </tr>
                  {/each}
                {:else if selected.reportId === 'expiry-report'}
                  {#each rows as row (expiryRow(row).bucket)}
                    {@const r = expiryRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{EXPIRY_BUCKET_LABELS[r.bucket]}</td>
                      <td class={`${cellClass} text-right`}>{r.lotCount}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(r.qty)}</td>
                      <td class={`${cellClass} text-right font-semibold`}>{formatMoney(r.value)}</td>
                    </tr>
                  {/each}
                {:else if selected.reportId === 'reorder-level'}
                  {#each rows as row (reorderRow(row).key)}
                    {@const r = reorderRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{r.label}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(r.qtyOnHand)}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(r.reorderQty)}</td>
                    </tr>
                  {/each}
                {:else if selected.reportId === 'ap-aging' || selected.reportId === 'ar-aging'}
                  {#each rows as row (agingRow(row).partyId)}
                    {@const r = agingRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{partyLabel(r)}</td>
                      {#each AGING_BUCKET_ORDER as key (key)}
                        <td class={`${cellClass} text-right`}>{formatMoney(r.buckets[key])}</td>
                      {/each}
                      <td class={`${cellClass} text-right font-semibold`}>{formatMoney(r.total)}</td>
                      <td class={`${cellClass} text-right`}>{r.invoiceCount}</td>
                    </tr>
                  {/each}
                {:else if selected.reportId === 'low-stock'}
                  {#each rows as row (lowStockRow(row).key)}
                    {@const r = lowStockRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{r.label}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(r.qtyOnHand)}</td>
                    </tr>
                  {/each}
                {:else if selected.reportId === 'controlled-drug-register'}
                  {#each rows as row (controlledDrugRow(row).key)}
                    {@const r = controlledDrugRow(row)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                      <td class={cellClass}>{formatDate(r.postingDate)}</td>
                      <td class={`${cellClass} font-mono`}>{r.docNumber}</td>
                      <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{r.itemName}</td>
                      <td class={cellClass}>{r.batchNo ?? '—'}</td>
                      <td class={`${cellClass} text-right`}>{formatQty(r.qty)}</td>
                      <td class={cellClass}>{r.dispensingNote ?? '—'}</td>
                      <td class={cellClass}>{r.dispensedByName ?? '—'}</td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>

          {#if showPager && meta}
            <div class="flex items-center justify-between px-4 py-3 border-t border-surface-200 dark:border-surface-700 text-xs text-secondary-500 dark:text-secondary-400">
              <span>
                {#if rows.length}
                  Showing {meta.offset + 1}–{meta.offset + rows.length} of {meta.total}
                {:else}
                  0 rows
                {/if}
              </span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40"
                  on:click={goPrevPage}
                  disabled={offset <= 0 || running}
                >
                  Previous
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40"
                  on:click={goNextPage}
                  disabled={!meta.hasMore || running}
                >
                  Next
                </button>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-sm text-secondary-500 py-8 text-center">Set your filters and click "Run report" to see results.</p>
      {/if}
    </div>
  {:else if !defsLoading && visibleDefinitions.length}
    <div class="card rounded-xl p-10 text-center">
      <Icon icon={Icons.chartBar} className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
      <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">Pick a report above to get started.</p>
    </div>
  {/if}
</div>
