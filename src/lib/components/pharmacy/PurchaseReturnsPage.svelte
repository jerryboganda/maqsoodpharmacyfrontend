<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money/qty field on this page is a
  // decimal STRING end to end. The only Number()/parseFloat() calls below are the labelled
  // "estimated total" preview in the create form (never leaves the browser) and pure UI
  // tone/comparison checks -- everything actually sent to the API is the raw string a
  // DecimalInput produced or the server's own line data, untouched.
  //
  // Mirrors PurchaseInvoicesPage.svelte's structure throughout (list table, detail modal, create
  // modal). A purchase return is the reverse-direction sibling of a purchase invoice
  // (purchase-return.service.ts's header comment in the sibling `rebuild` repo): it creates AND
  // posts in one transaction, no separate draft/approve/post workflow -- so this page has no
  // status-transition actions either, same as the invoices page.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import {
    purchasingApi,
    catalogApi,
    lookupsApi,
    api,
    ApiError,
    ApiNetworkError,
    formatMoney,
    formatQty,
    formatDate,
    todayYmd,
  } from '../../api'
  import type {
    PurchaseReturnRow,
    GetPurchaseReturnResult,
    SupplierRow,
    PurchaseInvoiceRow,
    PurchaseInvoiceLineRow,
    ItemSummary,
    PurchaseCategory,
    CreatePurchaseReturnInput,
    PurchaseReturnLineInput,
  } from '../../api'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  // One row per line on the source invoice, pre-filled from it -- `include` decides whether it
  // is actually sent as a return line. `receivedQty` is display-only (what the invoice line
  // carried); `returnQty`/`unitCost` are the editable, pre-filled decimal strings.
  type ReturnLineForm = {
    purchaseInvoiceLineId: number
    itemId: number
    stockLotId: number
    receivedQty: string
    include: boolean
    returnQty: string
    unitCost: string
  }

  function statusTone(status: string): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    return 'info'
  }

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let returns: PurchaseReturnRow[] = []
  let suppliers: SupplierRow[] = []
  let invoices: PurchaseInvoiceRow[] = []
  $: supplierMap = new Map(suppliers.map((s) => [s.supplierId, s.name]))
  $: invoiceDocMap = new Map(invoices.map((inv) => [inv.purchaseInvoiceId, inv.docNumber]))

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [supplierResult, invoiceResult, returnResult] = await Promise.all([
        purchasingApi.listSuppliers({ limit: 500 }),
        purchasingApi.listPurchaseInvoices({ limit: 200 }),
        purchasingApi.listPurchaseReturns({ limit: 100 }),
      ])
      suppliers = supplierResult.suppliers
      invoices = invoiceResult.purchaseInvoices
      returns = returnResult.purchaseReturns
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load purchase returns.'
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  // ---- detail modal ------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detailResult: GetPurchaseReturnResult | null = null

  async function openDetail(row: PurchaseReturnRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detailResult = null
    try {
      detailResult = await purchasingApi.getPurchaseReturn(row.purchaseReturnId)
    } catch (err) {
      detailError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this purchase return.'
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

  let purchaseCategories: PurchaseCategory[] = []
  let items: ItemSummary[] = []
  $: itemMap = new Map(items.map((item) => [item.itemId, item]))
  // No purchase-return category is marked default in the seed this increment (service-side
  // header comment) -- always offer only the isReturn-flagged categories and require a pick,
  // rather than an "Use default" option that would just 422.
  $: returnCategories = purchaseCategories.filter((c) => c.isReturn)

  let supplierId: number | '' = ''
  let purchaseCategoryId: number | '' = ''
  let documentDate = todayYmd()
  let notes = ''

  let supplierInvoices: PurchaseInvoiceRow[] = []
  let supplierInvoicesLoading = false
  let purchaseInvoiceId: number | '' = ''

  let invoiceLines: ReturnLineForm[] = []
  let invoiceLinesLoading = false
  let invoiceLinesError = ''

  async function openCreate(): Promise<void> {
    createOpen = true
    createError = ''
    formErrors = {}
    supplierId = ''
    purchaseCategoryId = ''
    documentDate = todayYmd()
    notes = ''
    supplierInvoices = []
    purchaseInvoiceId = ''
    invoiceLines = []
    invoiceLinesError = ''
    idempotencyKey = api.newIdempotencyKey()
    createDataLoading = true
    try {
      const [categoryResult, itemResult] = await Promise.all([
        lookupsApi.purchaseCategories(),
        catalogApi.listItems({ isActive: true, limit: 500 }),
      ])
      purchaseCategories = categoryResult
      items = itemResult.items
    } catch (err) {
      createError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load form data.'
    } finally {
      createDataLoading = false
    }
  }

  function closeCreate(): void {
    createOpen = false
  }

  async function handleSupplierChange(value: string): Promise<void> {
    supplierId = value ? Number(value) : ''
    purchaseInvoiceId = ''
    invoiceLines = []
    invoiceLinesError = ''
    supplierInvoices = []
    if (supplierId === '') return
    supplierInvoicesLoading = true
    try {
      // Only a POSTED invoice can be returned against (purchase-return.service.ts).
      const result = await purchasingApi.listPurchaseInvoices({ supplierId, status: 'posted', limit: 200 })
      supplierInvoices = result.purchaseInvoices
    } catch (err) {
      invoiceLinesError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this supplier’s invoices.'
    } finally {
      supplierInvoicesLoading = false
    }
  }

  async function handleInvoiceChange(value: string): Promise<void> {
    purchaseInvoiceId = value ? Number(value) : ''
    invoiceLines = []
    invoiceLinesError = ''
    if (purchaseInvoiceId === '') return
    invoiceLinesLoading = true
    try {
      const result = await purchasingApi.getPurchaseInvoice(purchaseInvoiceId)
      invoiceLines = result.lines.map((line: PurchaseInvoiceLineRow) => ({
        purchaseInvoiceLineId: line.purchaseInvoiceLineId,
        itemId: line.itemId,
        stockLotId: line.stockLotId,
        receivedQty: line.qtyBase,
        include: false,
        returnQty: line.qtyBase,
        unitCost: line.unitCostIn,
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

  // A qty string counts as "zero or empty" without ever converting it to a Number for the
  // actual submission -- only used to decide whether the client-side validation message fires.
  function isZeroOrEmpty(value: string): boolean {
    const trimmed = value.trim()
    if (trimmed === '') return true
    return /^0+(\.0+)?$/.test(trimmed)
  }

  // Display-only estimate for the in-progress form. Never sent to the API -- the API receives
  // the raw per-line strings collected in `invoiceLines` untouched (see buildLineInput below).
  function lineEstimate(line: ReturnLineForm): number {
    if (!line.include) return 0
    return (Number(line.returnQty) || 0) * (Number(line.unitCost) || 0)
  }
  $: estimatedTotal = invoiceLines.reduce((sum, line) => sum + lineEstimate(line), 0)
  $: selectedLines = invoiceLines.filter((line) => line.include)

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (supplierId === '') nextErrors.supplierId = 'Select a supplier.'
    if (purchaseInvoiceId === '') nextErrors.purchaseInvoiceId = 'Select the invoice being returned against.'
    if (purchaseCategoryId === '') nextErrors.purchaseCategoryId = 'Select a return category.'
    if (!documentDate) nextErrors.documentDate = 'Document date is required.'
    if (selectedLines.length === 0) {
      nextErrors.lines = 'Include at least one line to return.'
    } else {
      for (const line of selectedLines) {
        if (isZeroOrEmpty(line.returnQty)) {
          nextErrors.lines = 'Each included line needs a return quantity greater than zero.'
          break
        }
        if (!line.unitCost.trim()) {
          nextErrors.lines = 'Each included line needs a unit cost.'
          break
        }
      }
    }
    formErrors = nextErrors
    return Object.keys(nextErrors).length === 0
  }

  function buildLineInput(line: ReturnLineForm): PurchaseReturnLineInput {
    return {
      itemId: line.itemId,
      stockLotId: line.stockLotId,
      returnQty: line.returnQty.trim(),
      unitCost: line.unitCost.trim(),
    }
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validate()) return
    createLoading = true
    try {
      const input: CreatePurchaseReturnInput = {
        supplierId: supplierId as number,
        purchaseInvoiceId: purchaseInvoiceId as number,
        purchaseCategoryId: purchaseCategoryId as number,
        documentDate,
        lines: selectedLines.map(buildLineInput),
      }
      if (notes.trim()) input.notes = notes.trim()
      const result = await purchasingApi.createPurchaseReturn(input, idempotencyKey)
      toast.success('Purchase return ' + result.purchaseReturn.docNumber + ' posted.')
      closeCreate()
      await loadList()
    } catch (err) {
      createError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not create the purchase return.'
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Purchase returns</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Return received stock to a supplier against a posted purchase invoice.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
      New purchase return
    </button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Purchase returns table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Doc number</th>
            <th class={headClass}>Supplier</th>
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
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">No purchase returns yet.</td></tr>
          {:else}
            {#each returns as row (row.purchaseReturnId)}
              <tr
                class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer"
                on:click={() => openDetail(row)}
              >
                <td class={cellClass}>{row.docNumber}</td>
                <td class={cellClass}>{supplierMap.get(row.supplierId) ?? `Supplier #${row.supplierId}`}</td>
                <td class={cellClass}>
                  {row.purchaseInvoiceId ? (invoiceDocMap.get(row.purchaseInvoiceId) ?? `Invoice #${row.purchaseInvoiceId}`) : '—'}
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

<Modal open={detailOpen} title={detailResult ? `Purchase return ${detailResult.purchaseReturn.docNumber}` : 'Purchase return'} widthClass="max-w-3xl" onClose={closeDetail}>
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
          <p class="text-xs text-secondary-500">Supplier</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">
            {supplierMap.get(detailResult.purchaseReturn.supplierId) ?? `Supplier #${detailResult.purchaseReturn.supplierId}`}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Against invoice</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">
            {detailResult.purchaseReturn.purchaseInvoiceId
              ? (invoiceDocMap.get(detailResult.purchaseReturn.purchaseInvoiceId) ?? `Invoice #${detailResult.purchaseReturn.purchaseInvoiceId}`)
              : '—'}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detailResult.purchaseReturn.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(detailResult.purchaseReturn.status)}>{detailResult.purchaseReturn.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Gross</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseReturn.grossAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Net</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseReturn.netAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Sales tax</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseReturn.salesTaxAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Return total</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseReturn.returnTotal)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Total qty</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatQty(detailResult.purchaseReturn.totalQty)}</p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">GL effect</h3>
        <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-secondary-600 dark:text-secondary-300">Dr &nbsp;Supplier payable (accounts payable)</span>
            <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseReturn.netAmount)}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-secondary-600 dark:text-secondary-300">Cr &nbsp;Inventory (1200)</span>
            <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseReturn.netAmount)}</span>
          </div>
          <p class="text-xs text-secondary-400 pt-1">
            Reverses the original invoice's own AP/Inventory legs -- reduces what is owed to the supplier and removes the returned
            stock's value from inventory.
            {#if detailResult.purchaseReturn.journalEntryId}Journal entry #{detailResult.purchaseReturn.journalEntryId}.{/if}
          </p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Line items &amp; stock effect</h3>
        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Purchase return line items table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Item</th>
                  <th class={headClass}>Lot</th>
                  <th class={headClass}>Qty returned</th>
                  <th class={headClass}>Unit cost</th>
                  <th class={headClass}>Line net</th>
                  <th class={headClass}>Stock effect</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#each detailResult.lines as line (line.purchaseReturnLineId)}
                  <tr>
                    <td class={cellClass}>{itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}</td>
                    <td class={cellClass}>#{line.stockLotId}</td>
                    <td class={cellClass}>{formatQty(line.qtyBase)}</td>
                    <td class={cellClass}>{formatMoney(line.unitCostIn)}</td>
                    <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(line.lineNetAmount)}</td>
                    <td class={`${cellClass} text-danger-600 dark:text-danger-400`}>&minus;{formatQty(line.qtyBase)} (lot #{line.stockLotId})</td>
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

<Modal open={createOpen} title="New purchase return" widthClass="max-w-4xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}

  {#if createDataLoading}
    <p class="text-sm text-secondary-500 mb-4">Loading return categories and items…</p>
  {/if}

  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="pr-supplier">Supplier<span class="text-danger-500"> *</span></label>
        <select
          id="pr-supplier"
          value={supplierId}
          on:change={(e) => handleSupplierChange((e.currentTarget as HTMLSelectElement).value)}
          class={inputClass}
        >
          <option value="">Select supplier…</option>
          {#each suppliers as s (s.supplierId)}
            <option value={s.supplierId}>{s.name} ({s.code})</option>
          {/each}
        </select>
        {#if formErrors.supplierId}<p class="text-xs text-danger-500 mt-1">{formErrors.supplierId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="pr-invoice">Against invoice<span class="text-danger-500"> *</span></label>
        <select
          id="pr-invoice"
          value={purchaseInvoiceId}
          on:change={(e) => handleInvoiceChange((e.currentTarget as HTMLSelectElement).value)}
          class={inputClass}
          disabled={supplierId === '' || supplierInvoicesLoading}
        >
          <option value="">{supplierInvoicesLoading ? 'Loading…' : 'Select invoice…'}</option>
          {#each supplierInvoices as inv (inv.purchaseInvoiceId)}
            <option value={inv.purchaseInvoiceId}>{inv.docNumber} — {formatDate(inv.documentDate)}</option>
          {/each}
        </select>
        {#if supplierId !== '' && !supplierInvoicesLoading && supplierInvoices.length === 0}
          <p class="text-xs text-secondary-400 mt-1">No posted invoices for this supplier.</p>
        {/if}
        {#if formErrors.purchaseInvoiceId}<p class="text-xs text-danger-500 mt-1">{formErrors.purchaseInvoiceId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="pr-category">Return category<span class="text-danger-500"> *</span></label>
        <select id="pr-category" bind:value={purchaseCategoryId} class={inputClass}>
          <option value="">Select category…</option>
          {#each returnCategories as c (c.purchaseCategoryId)}
            <option value={c.purchaseCategoryId}>{c.name}</option>
          {/each}
        </select>
        {#if formErrors.purchaseCategoryId}<p class="text-xs text-danger-500 mt-1">{formErrors.purchaseCategoryId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="pr-document-date">Document date<span class="text-danger-500"> *</span></label>
        <input id="pr-document-date" type="date" bind:value={documentDate} class={inputClass} />
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
      {:else if purchaseInvoiceId === ''}
        <p class="text-sm text-secondary-500">Select a supplier and an invoice to list its lines.</p>
      {:else if invoiceLines.length === 0}
        <p class="text-sm text-secondary-500">This invoice has no lines.</p>
      {:else}
        <div class="space-y-3">
          {#each invoiceLines as line, index (line.purchaseInvoiceLineId)}
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
                  <p class="text-xs text-secondary-500">Lot #{line.stockLotId} · received {formatQty(line.receivedQty)}</p>
                </div>
              </label>

              {#if line.include}
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-7">
                  <DecimalInput bind:value={line.returnQty} label="Return qty" id={`pr-line-qty-${index}`} required />
                  <DecimalInput bind:value={line.unitCost} label="Unit cost" id={`pr-line-cost-${index}`} scale={5} prefix="Rs" required />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div>
      <label class={labelClass} for="pr-notes">Notes</label>
      <textarea id="pr-notes" bind:value={notes} rows="2" class={inputClass} placeholder="Optional notes for this purchase return"></textarea>
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
