<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money/qty field on this page is a
  // decimal STRING end to end. The only Number()/parseFloat() calls below are the labelled
  // "estimated total" preview in the create form (never leaves the browser) and pure UI
  // tone/comparison checks -- everything actually sent to the API is the raw string a
  // DecimalInput produced, untouched.
  //
  // Mirrors PurchaseReturnsPage.svelte's structure throughout (list table, detail modal, create
  // modal) and, for the detail view specifically, SaleInvoicesPage.svelte's field layout. A sale
  // return is the reverse-direction sibling of a sale invoice (sale-returns.service.ts's header
  // comment in the sibling `rebuild` repo): it creates AND posts in one transaction, no separate
  // draft/approve/post workflow -- so this page has no status-transition actions either.
  //
  // One deliberate divergence from PurchaseReturnsPage's line form: sale-return.dto.ts's line
  // shape is narrower than purchase-return.dto.ts's -- only { itemId, returnQty }, no
  // stockLotId/unitCost. The backend resolves which of the original invoice's own lines/lots each
  // returnQty slices from and freezes cost at that line's own unit_cost (see
  // sale-returns.service.ts's header comment) -- so this form never asks for a lot or a cost, only
  // which original line and how much of it to return.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { salesApi, catalogApi, api, ApiError, ApiNetworkError, formatMoney, formatQty, formatDate, todayYmd } from '../../api'
  import type {
    SaleReturnRow,
    GetSaleReturnResult,
    CustomerRow,
    SaleInvoiceRow,
    SaleInvoiceLineRow,
    ItemSummary,
    CreateSaleReturnInput,
    SaleReturnLineInput,
  } from '../../api'

  // One row per line on the original invoice, pre-filled from it -- `include` decides whether it
  // is actually sent as a return line. `soldQty` is display-only (what the invoice line carried);
  // `returnQty` is the editable, pre-filled decimal string.
  type ReturnLineForm = {
    saleInvoiceLineId: number
    itemId: number
    stockLotId: number
    soldQty: string
    unitSalePrice: string
    include: boolean
    returnQty: string
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  function statusTone(status: string): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    return 'info'
  }

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let returns: SaleReturnRow[] = []
  let customers: CustomerRow[] = []
  let invoices: SaleInvoiceRow[] = []
  $: customerMap = new Map(customers.map((c) => [c.customerId, c.name]))
  $: invoiceDocMap = new Map(invoices.map((inv) => [inv.saleInvoiceId, inv.docNumber]))

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [customerResult, invoiceResult, returnResult] = await Promise.all([
        salesApi.listCustomers({ limit: 200 }), // ListCustomersQuerySchema caps limit at 200
        salesApi.listSaleInvoices({ limit: 200 }),
        salesApi.listSaleReturns({ limit: 100 }),
      ])
      customers = customerResult.customers
      invoices = invoiceResult.saleInvoices
      returns = returnResult.saleReturns
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load sale returns.'
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  // ---- detail modal ------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detailResult: GetSaleReturnResult | null = null

  async function openDetail(row: SaleReturnRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detailResult = null
    try {
      detailResult = await salesApi.getSaleReturn(row.saleReturnId)
    } catch (err) {
      detailError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this sale return.'
    } finally {
      detailLoading = false
    }
  }

  function closeDetail(): void {
    detailOpen = false
    detailResult = null
    detailError = ''
  }

  // ---- create modal ------------------------------------------------------------------------
  let createOpen = false
  let createDataLoading = false
  let createLoading = false
  let createError = ''
  let formErrors: Record<string, string> = {}
  let idempotencyKey = ''

  let items: ItemSummary[] = []
  $: itemMap = new Map(items.map((item) => [item.itemId, item]))

  let customerId: number | '' = ''
  let documentDate = todayYmd()
  let notes = ''

  let customerInvoices: SaleInvoiceRow[] = []
  let customerInvoicesLoading = false
  let saleInvoiceId: number | '' = ''

  let invoiceLines: ReturnLineForm[] = []
  let invoiceLinesLoading = false
  let invoiceLinesError = ''

  async function openCreate(): Promise<void> {
    createOpen = true
    createError = ''
    formErrors = {}
    customerId = ''
    documentDate = todayYmd()
    notes = ''
    customerInvoices = []
    saleInvoiceId = ''
    invoiceLines = []
    invoiceLinesError = ''
    idempotencyKey = api.newIdempotencyKey()
    createDataLoading = true
    try {
      const itemResult = await catalogApi.listItems({ isActive: true, limit: 500 })
      items = itemResult.items
    } catch (err) {
      createError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load form data.'
    } finally {
      createDataLoading = false
    }
  }

  function closeCreate(): void {
    createOpen = false
  }

  async function handleCustomerChange(value: string): Promise<void> {
    customerId = value ? Number(value) : ''
    saleInvoiceId = ''
    invoiceLines = []
    invoiceLinesError = ''
    customerInvoices = []
    if (customerId === '') return
    customerInvoicesLoading = true
    try {
      // Only a POSTED invoice can be returned against (sale-returns.service.ts).
      const result = await salesApi.listSaleInvoices({ customerId, status: 'posted', limit: 200 })
      customerInvoices = result.saleInvoices
    } catch (err) {
      invoiceLinesError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this customer’s invoices.'
    } finally {
      customerInvoicesLoading = false
    }
  }

  async function handleInvoiceChange(value: string): Promise<void> {
    saleInvoiceId = value ? Number(value) : ''
    invoiceLines = []
    invoiceLinesError = ''
    if (saleInvoiceId === '') return
    invoiceLinesLoading = true
    try {
      const result = await salesApi.getSaleInvoice(saleInvoiceId)
      invoiceLines = result.lines.map((line: SaleInvoiceLineRow) => ({
        saleInvoiceLineId: line.saleInvoiceLineId,
        itemId: line.itemId,
        stockLotId: line.stockLotId,
        soldQty: line.qtyBase,
        unitSalePrice: line.unitSalePrice,
        include: false,
        returnQty: line.qtyBase,
      }))
    } catch (err) {
      invoiceLinesError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this invoice’s lines.'
    } finally {
      invoiceLinesLoading = false
    }
  }

  function toggleLine(index: number, include: boolean): void {
    invoiceLines = invoiceLines.map((line, i) => (i === index ? { ...line, include } : line))
  }

  // A qty string counts as "zero or empty" without ever converting it to a Number for the actual
  // submission -- only used to decide whether the client-side validation message fires.
  function isZeroOrEmpty(value: string): boolean {
    const trimmed = value.trim()
    if (trimmed === '') return true
    return /^0+(\.0+)?$/.test(trimmed)
  }

  // Display-only estimate for the in-progress form. Never sent to the API -- the API receives
  // the raw per-line returnQty strings collected in `invoiceLines` untouched (see buildLineInput
  // below); unitSalePrice here is the ORIGINAL line's own price, carried only for this estimate.
  function lineEstimate(line: ReturnLineForm): number {
    if (!line.include) return 0
    return (Number(line.returnQty) || 0) * (Number(line.unitSalePrice) || 0)
  }
  $: estimatedTotal = invoiceLines.reduce((sum, line) => sum + lineEstimate(line), 0)
  $: selectedLines = invoiceLines.filter((line) => line.include)

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (customerId === '') nextErrors.customerId = 'Select a customer.'
    if (saleInvoiceId === '') nextErrors.saleInvoiceId = 'Select the invoice being returned against.'
    if (!documentDate) nextErrors.documentDate = 'Document date is required.'
    if (selectedLines.length === 0) {
      nextErrors.lines = 'Include at least one line to return.'
    } else {
      for (const line of selectedLines) {
        if (isZeroOrEmpty(line.returnQty)) {
          nextErrors.lines = 'Each included line needs a return quantity greater than zero.'
          break
        }
      }
    }
    formErrors = nextErrors
    return Object.keys(nextErrors).length === 0
  }

  function buildLineInput(line: ReturnLineForm): SaleReturnLineInput {
    return { itemId: line.itemId, returnQty: line.returnQty.trim() }
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validate()) return
    createLoading = true
    try {
      const input: CreateSaleReturnInput = {
        customerId: customerId as number,
        saleInvoiceId: saleInvoiceId as number,
        documentDate,
        lines: selectedLines.map(buildLineInput),
      }
      if (notes.trim()) input.notes = notes.trim()
      const result = await salesApi.createSaleReturn(input, idempotencyKey)
      toast.success('Sale return ' + result.saleReturn.docNumber + ' posted.')
      closeCreate()
      await loadList()
    } catch (err) {
      createError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not create the sale return.'
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Sale returns</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Return goods against a posted sale invoice -- stock and the customer refund are handled automatically.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
      New sale return
    </button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Sale returns table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Doc number</th>
            <th class={headClass}>Customer</th>
            <th class={headClass}>Against invoice</th>
            <th class={headClass}>Date</th>
            <th class={headClass}>Status</th>
            <th class={headClass}>Return total</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if returns.length === 0}
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">No sale returns yet.</td></tr>
          {:else}
            {#each returns as row (row.saleReturnId)}
              <tr
                class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer"
                on:click={() => openDetail(row)}
              >
                <td class={cellClass}>{row.docNumber}</td>
                <td class={cellClass}>{customerMap.get(row.customerId) ?? `Customer #${row.customerId}`}</td>
                <td class={cellClass}>
                  {row.saleInvoiceId ? (invoiceDocMap.get(row.saleInvoiceId) ?? `Invoice #${row.saleInvoiceId}`) : '—'}
                </td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(row.returnTotal)}</td>
                <td class={`${cellClass} text-right`}>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                    on:click|stopPropagation={() => openDetail(row)}
                  >
                    View
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<Modal open={detailOpen} title={detailResult ? `Sale return ${detailResult.saleReturn.docNumber}` : 'Sale return'} widthClass="max-w-3xl" onClose={closeDetail}>
  {#if detailLoading}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if detailError}
    <div class="rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {detailError}
    </div>
  {:else if detailResult}
    <div class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-secondary-500">Customer</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">
            {customerMap.get(detailResult.saleReturn.customerId) ?? `Customer #${detailResult.saleReturn.customerId}`}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Against invoice</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">
            {detailResult.saleReturn.saleInvoiceId
              ? (invoiceDocMap.get(detailResult.saleReturn.saleInvoiceId) ?? `Invoice #${detailResult.saleReturn.saleInvoiceId}`)
              : '—'}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detailResult.saleReturn.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(detailResult.saleReturn.status)}>{detailResult.saleReturn.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Gross</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.grossAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Net</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.netAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Sales tax</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.salesTaxAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Return total</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.returnTotal)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">COGS</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.cogsAmount)}</p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">GL effect</h3>
        <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-secondary-600 dark:text-secondary-300">Dr &nbsp;Sales (4000)</span>
            <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.netAmount)}</span>
          </div>
          {#if Number(detailResult.saleReturn.cogsAmount) > 0}
            <div class="flex items-center justify-between text-sm">
              <span class="text-secondary-600 dark:text-secondary-300">Dr &nbsp;Inventory (1200)</span>
              <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.cogsAmount)}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-secondary-600 dark:text-secondary-300">Cr &nbsp;COGS (5200)</span>
              <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.cogsAmount)}</span>
            </div>
          {/if}
          <div class="flex items-center justify-between text-sm">
            <span class="text-secondary-600 dark:text-secondary-300">Cr &nbsp;Refund account</span>
            <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.saleReturn.returnTotal)}</span>
          </div>
          <p class="text-xs text-secondary-400 pt-1">
            Reduces recognized revenue, puts the cost back on the books, and refunds the customer via the original invoice's own
            payment method.
            {#if detailResult.saleReturn.journalEntryId}Journal entry #{detailResult.saleReturn.journalEntryId}.{/if}
          </p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Line items &amp; stock effect</h3>
        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Sale return line items table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Item</th>
                  <th class={headClass}>Lot</th>
                  <th class={headClass}>Qty returned</th>
                  <th class={headClass}>Unit price</th>
                  <th class={headClass}>Line net</th>
                  <th class={headClass}>Stock effect</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#each detailResult.lines as line (line.saleReturnLineId)}
                  <tr>
                    <td class={cellClass}>{itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}</td>
                    <td class={cellClass}>#{line.stockLotId}</td>
                    <td class={cellClass}>{formatQty(line.qtyBase)}</td>
                    <td class={cellClass}>{formatMoney(line.unitSalePrice)}</td>
                    <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(line.lineNetAmount)}</td>
                    <td class={`${cellClass} text-success-600 dark:text-success-400`}>+{formatQty(line.qtyBase)} (lot #{line.stockLotId})</td>
                  </tr>
                {/each}
                {#if !detailResult.lines.length}
                  <tr><td colspan="6" class="py-6 px-4 text-center text-sm text-secondary-500">No lines.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Modal>

<Modal open={createOpen} title="New sale return" widthClass="max-w-4xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}

  {#if createDataLoading}
    <p class="text-sm text-secondary-500 mb-4">Loading item catalog…</p>
  {/if}

  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="sr-customer">Customer<span class="text-danger-500"> *</span></label>
        <select
          id="sr-customer"
          value={customerId}
          on:change={(e) => handleCustomerChange((e.currentTarget as HTMLSelectElement).value)}
          class={inputClass}
        >
          <option value="">Select customer…</option>
          {#each customers as c (c.customerId)}
            <option value={c.customerId}>{c.name}{c.isWalkIn ? ' (Walk-in)' : ''}</option>
          {/each}
        </select>
        {#if formErrors.customerId}<p class="text-xs text-danger-500 mt-1">{formErrors.customerId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="sr-invoice">Against invoice<span class="text-danger-500"> *</span></label>
        <select
          id="sr-invoice"
          value={saleInvoiceId}
          on:change={(e) => handleInvoiceChange((e.currentTarget as HTMLSelectElement).value)}
          class={inputClass}
          disabled={customerId === '' || customerInvoicesLoading}
        >
          <option value="">{customerInvoicesLoading ? 'Loading…' : 'Select invoice…'}</option>
          {#each customerInvoices as inv (inv.saleInvoiceId)}
            <option value={inv.saleInvoiceId}>{inv.docNumber} — {formatDate(inv.documentDate)}</option>
          {/each}
        </select>
        {#if customerId !== '' && !customerInvoicesLoading && customerInvoices.length === 0}
          <p class="text-xs text-secondary-400 mt-1">No posted invoices for this customer.</p>
        {/if}
        {#if formErrors.saleInvoiceId}<p class="text-xs text-danger-500 mt-1">{formErrors.saleInvoiceId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="sr-document-date">Document date<span class="text-danger-500"> *</span></label>
        <input id="sr-document-date" type="date" bind:value={documentDate} class={inputClass} />
        {#if formErrors.documentDate}<p class="text-xs text-danger-500 mt-1">{formErrors.documentDate}</p>{/if}
      </div>
    </div>

    <div>
      <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Lines to return</h3>

      {#if invoiceLinesError}
        <p class="text-xs text-danger-500 mb-3">{invoiceLinesError}</p>
      {/if}
      {#if formErrors.lines}<p class="text-xs text-danger-500 mb-3">{formErrors.lines}</p>{/if}

      {#if invoiceLinesLoading}
        <p class="text-sm text-secondary-500">Loading invoice lines…</p>
      {:else if saleInvoiceId === ''}
        <p class="text-sm text-secondary-500">Select a customer and an invoice to list its lines.</p>
      {:else if invoiceLines.length === 0}
        <p class="text-sm text-secondary-500">This invoice has no lines.</p>
      {:else}
        <div class="space-y-3">
          {#each invoiceLines as line, index (line.saleInvoiceLineId)}
            <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  class="mt-1"
                  checked={line.include}
                  on:change={(e) => toggleLine(index, (e.currentTarget as HTMLInputElement).checked)}
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-secondary-900 dark:text-white">
                    {itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}
                  </p>
                  <p class="text-xs text-secondary-500">Lot #{line.stockLotId} · sold {formatQty(line.soldQty)}</p>
                </div>
              </label>

              {#if line.include}
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-7">
                  <DecimalInput bind:value={line.returnQty} label="Return qty" id={`sr-line-qty-${index}`} required />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div>
      <label class={labelClass} for="sr-notes">Notes</label>
      <textarea id="sr-notes" bind:value={notes} rows="2" class={inputClass} placeholder="Optional notes for this sale return"></textarea>
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-secondary-200 dark:border-secondary-700">
      <p class="text-xs text-secondary-400">Estimated total (final total is calculated by the server)</p>
      <p class="text-sm font-semibold text-secondary-700 dark:text-secondary-300">{formatMoney(estimatedTotal.toFixed(2))}</p>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeCreate}
      disabled={createLoading}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      on:click={submitCreate}
      disabled={createLoading || createDataLoading}
    >
      {createLoading ? 'Submitting…' : 'Submit'}
    </button>
  </svelte:fragment>
</Modal>
