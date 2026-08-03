<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money/qty field on this page is a
  // decimal STRING end to end. The only Number()/parseFloat() calls below are (a) the labelled
  // "estimated total" preview in the create form, which never leaves the browser, and (b) the
  // balance/tone checks the spec for this page explicitly calls for -- everything actually sent
  // to the API is the raw string the user typed into a DecimalInput.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { purchasingApi, catalogApi, lookupsApi, api, ApiError, ApiNetworkError, formatMoney, formatQty, formatDate, todayYmd } from '../../api'
  import type {
    PurchaseInvoiceRow,
    GetPurchaseInvoiceResult,
    SupplierRow,
    ItemSummary,
    PurchaseCategory,
    CreatePurchaseInvoiceInput,
    PurchaseInvoiceLineInput,
  } from '../../api'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  type LineForm = {
    itemId: string
    qtyPack: string
    qtyLoose: string
    qtyBonus: string
    unitPurchasePrice: string
    discountPercent: string
    batchNo: string
    expiryDate: string
    expiryStatus: 'known' | 'unknown' | 'not_applicable'
  }

  function blankLine(): LineForm {
    return {
      itemId: '',
      qtyPack: '0',
      qtyLoose: '0',
      qtyBonus: '0',
      unitPurchasePrice: '',
      discountPercent: '',
      batchNo: '',
      expiryDate: '',
      expiryStatus: 'known',
    }
  }

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let invoices: PurchaseInvoiceRow[] = []
  let suppliers: SupplierRow[] = []
  $: supplierMap = new Map(suppliers.map((s) => [s.supplierId, s.name]))

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [supplierResult, invoiceResult] = await Promise.all([
        purchasingApi.listSuppliers({ limit: 500 }),
        purchasingApi.listPurchaseInvoices({ limit: 100 }),
      ])
      suppliers = supplierResult.suppliers
      invoices = invoiceResult.purchaseInvoices
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load purchase invoices.'
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  function statusTone(status: string): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    return 'info'
  }

  // ---- detail modal ------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detailResult: GetPurchaseInvoiceResult | null = null

  async function openDetail(row: PurchaseInvoiceRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detailResult = null
    try {
      detailResult = await purchasingApi.getPurchaseInvoice(row.purchaseInvoiceId)
    } catch (err) {
      detailError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this invoice.'
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

  let supplierId: number | '' = ''
  let purchaseCategoryId: number | '' = ''
  let supplierInvoiceNo = ''
  let documentDate = todayYmd()
  let costBasis: 'net_rate' | 'gross_price' = 'net_rate'
  let notes = ''
  let lines: LineForm[] = [blankLine()]

  function selectedItem(line: LineForm): ItemSummary | undefined {
    return line.itemId ? itemMap.get(Number(line.itemId)) : undefined
  }

  function selectItem(index: number, itemIdStr: string): void {
    lines = lines.map((line, i) => {
      if (i !== index) return line
      const item = itemIdStr ? itemMap.get(Number(itemIdStr)) : undefined
      return { ...line, itemId: itemIdStr, unitPurchasePrice: item ? item.purchasePrice : line.unitPurchasePrice }
    })
  }

  function addLine(): void {
    lines = [...lines, blankLine()]
  }

  function removeLine(index: number): void {
    lines = lines.filter((_, i) => i !== index)
  }

  // Display-only estimate for the in-progress form. Never sent to the API -- the API receives
  // the raw per-line strings collected in `lines` untouched (see buildLineInput below).
  function lineEstimate(line: LineForm): number {
    const item = selectedItem(line)
    if (!item) return 0
    const packUnits = item.packUnits > 0 ? item.packUnits : 1
    const qtyBase = (Number(line.qtyPack) || 0) * packUnits + (Number(line.qtyLoose) || 0)
    const unitPrice = (Number(line.unitPurchasePrice) || 0) / packUnits
    return qtyBase * unitPrice
  }
  $: estimatedTotal = lines.reduce((sum, line) => sum + lineEstimate(line), 0)

  async function openCreate(): Promise<void> {
    createOpen = true
    createError = ''
    formErrors = {}
    supplierId = ''
    purchaseCategoryId = ''
    supplierInvoiceNo = ''
    documentDate = todayYmd()
    costBasis = 'net_rate'
    notes = ''
    lines = [blankLine()]
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

  // A qty string counts as "zero or empty" without ever converting it to a Number for the
  // actual submission -- only used to decide whether the client-side validation message fires.
  function isZeroOrEmpty(value: string): boolean {
    const trimmed = value.trim()
    if (trimmed === '') return true
    return /^0+(\.0+)?$/.test(trimmed)
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (supplierId === '') nextErrors.supplierId = 'Select a supplier.'
    if (!documentDate) nextErrors.documentDate = 'Document date is required.'
    const chosenLines = lines.filter((line) => line.itemId)
    if (chosenLines.length === 0) {
      nextErrors.lines = 'Add at least one line with an item selected.'
    } else {
      for (const line of chosenLines) {
        if (isZeroOrEmpty(line.qtyPack) && isZeroOrEmpty(line.qtyLoose)) {
          nextErrors.lines = 'Each line needs a pack or loose quantity greater than zero.'
          break
        }
        if (!line.unitPurchasePrice.trim()) {
          nextErrors.lines = 'Each line needs a unit purchase price.'
          break
        }
      }
    }
    formErrors = nextErrors
    return Object.keys(nextErrors).length === 0
  }

  function buildLineInput(line: LineForm): PurchaseInvoiceLineInput {
    const input: PurchaseInvoiceLineInput = {
      itemId: Number(line.itemId),
      qtyPack: line.qtyPack.trim() || '0',
      unitPurchasePrice: line.unitPurchasePrice.trim(),
    }
    const qtyLoose = line.qtyLoose.trim()
    if (qtyLoose) input.qtyLoose = qtyLoose
    const qtyBonus = line.qtyBonus.trim()
    if (qtyBonus) input.qtyBonus = qtyBonus
    const discountPercent = line.discountPercent.trim()
    if (discountPercent) input.discountPercent = discountPercent
    const batchNo = line.batchNo.trim()
    if (batchNo) input.batchNo = batchNo
    const expiryDate = line.expiryDate.trim()
    if (expiryDate) {
      input.expiryDate = expiryDate
      input.expiryStatus = line.expiryStatus
    }
    return input
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validate()) return
    createLoading = true
    try {
      const input: CreatePurchaseInvoiceInput = {
        supplierId: supplierId as number,
        documentDate,
        costBasis,
        lines: lines.filter((line) => line.itemId).map(buildLineInput),
      }
      if (purchaseCategoryId !== '') input.purchaseCategoryId = purchaseCategoryId
      if (supplierInvoiceNo.trim()) input.supplierInvoiceNo = supplierInvoiceNo.trim()
      if (notes.trim()) input.notes = notes.trim()
      const result = await purchasingApi.createPurchaseInvoice(input, idempotencyKey)
      toast.success('Purchase invoice ' + result.purchaseInvoice.docNumber + ' posted.')
      closeCreate()
      await loadList()
    } catch (err) {
      createError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not create the purchase invoice.'
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Purchase invoices</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Record supplier purchases and track outstanding balances.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
      New purchase invoice
    </button>
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
            <th class={headClass}>Doc number</th>
            <th class={headClass}>Supplier</th>
            <th class={headClass}>Supplier invoice #</th>
            <th class={headClass}>Date</th>
            <th class={headClass}>Status</th>
            <th class={headClass}>Invoice total</th>
            <th class={headClass}>Balance</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if invoices.length === 0}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">No purchase invoices yet.</td></tr>
          {:else}
            {#each invoices as row (row.purchaseInvoiceId)}
              <tr
                class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer"
                on:click={() => openDetail(row)}
              >
                <td class={cellClass}>{row.docNumber}</td>
                <td class={cellClass}>{supplierMap.get(row.supplierId) ?? `Supplier #${row.supplierId}`}</td>
                <td class={cellClass}>{row.supplierInvoiceNo ?? '—'}</td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td class={cellClass}>{formatMoney(row.invoiceTotal)}</td>
                <td
                  class={`py-3 px-4 text-sm font-medium ${
                    Number(row.balanceAmount) > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-secondary-800 dark:text-secondary-200'
                  }`}
                >
                  {formatMoney(row.balanceAmount)}
                </td>
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

<Modal open={detailOpen} title={detailResult ? `Purchase invoice ${detailResult.purchaseInvoice.docNumber}` : 'Purchase invoice'} widthClass="max-w-3xl" onClose={closeDetail}>
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
            {supplierMap.get(detailResult.purchaseInvoice.supplierId) ?? `Supplier #${detailResult.purchaseInvoice.supplierId}`}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Supplier invoice #</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{detailResult.purchaseInvoice.supplierInvoiceNo ?? '—'}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detailResult.purchaseInvoice.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(detailResult.purchaseInvoice.status)}>{detailResult.purchaseInvoice.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Gross</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseInvoice.grossAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Discount</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseInvoice.lineDiscountAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Net</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseInvoice.netAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Total</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseInvoice.invoiceTotal)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Paid</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseInvoice.paidAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Balance</p>
          <p
            class={`text-sm font-medium ${
              Number(detailResult.purchaseInvoice.balanceAmount) > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-secondary-900 dark:text-white'
            }`}
          >
            {formatMoney(detailResult.purchaseInvoice.balanceAmount)}
          </p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Line items</h3>
        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Item</th>
                  <th class={headClass}>Qty (pack)</th>
                  <th class={headClass}>Qty (loose)</th>
                  <th class={headClass}>Unit cost</th>
                  <th class={headClass}>Line net</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#each detailResult.lines as line (line.purchaseInvoiceLineId)}
                  <tr>
                    <td class={cellClass}>{itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}</td>
                    <td class={cellClass}>{formatQty(line.qtyPack)}</td>
                    <td class={cellClass}>{formatQty(line.qtyLoose)}</td>
                    <td class={cellClass}>{formatMoney(line.unitCostIn)}</td>
                    <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(line.lineNetAmount)}</td>
                  </tr>
                {/each}
                {#if !detailResult.lines.length}
                  <tr><td colspan="5" class="py-6 px-4 text-center text-sm text-secondary-500">No lines.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Modal>

<Modal open={createOpen} title="New purchase invoice" widthClass="max-w-4xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}

  {#if createDataLoading}
    <p class="text-sm text-secondary-500 mb-4">Loading suppliers and items…</p>
  {/if}

  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="pi-supplier">Supplier<span class="text-danger-500"> *</span></label>
        <select id="pi-supplier" bind:value={supplierId} class={inputClass}>
          <option value="">Select supplier…</option>
          {#each suppliers as s (s.supplierId)}
            <option value={s.supplierId}>{s.name} ({s.code})</option>
          {/each}
        </select>
        {#if formErrors.supplierId}<p class="text-xs text-danger-500 mt-1">{formErrors.supplierId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="pi-category">Purchase category</label>
        <select id="pi-category" bind:value={purchaseCategoryId} class={inputClass}>
          <option value="">Use default</option>
          {#each purchaseCategories as c (c.purchaseCategoryId)}
            <option value={c.purchaseCategoryId}>{c.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class={labelClass} for="pi-supplier-invoice-no">Supplier invoice #</label>
        <input id="pi-supplier-invoice-no" type="text" bind:value={supplierInvoiceNo} class={inputClass} placeholder="Optional" />
      </div>
      <div>
        <label class={labelClass} for="pi-document-date">Document date<span class="text-danger-500"> *</span></label>
        <input id="pi-document-date" type="date" bind:value={documentDate} class={inputClass} />
        {#if formErrors.documentDate}<p class="text-xs text-danger-500 mt-1">{formErrors.documentDate}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="pi-cost-basis">Cost basis</label>
        <select id="pi-cost-basis" bind:value={costBasis} class={inputClass}>
          <option value="net_rate">Net rate</option>
          <option value="gross_price">Gross price</option>
        </select>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Line items</h3>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-secondary-300 dark:border-secondary-600 text-sm font-medium text-theme-primary hover:bg-theme-primary/5 transition-colors"
          on:click={addLine}
        >
          <Icon icon={Icons.plus} className="w-4 h-4" />
          Add line
        </button>
      </div>

      {#if formErrors.lines}<p class="text-xs text-danger-500 mb-3">{formErrors.lines}</p>{/if}

      <div class="space-y-4">
        {#each lines as line, index (index)}
          <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="flex-1">
                <label class={labelClass} for={`pi-line-item-${index}`}>Item<span class="text-danger-500"> *</span></label>
                <select
                  id={`pi-line-item-${index}`}
                  value={line.itemId}
                  on:change={(e) => selectItem(index, (e.currentTarget as HTMLSelectElement).value)}
                  class={inputClass}
                >
                  <option value="">Select item…</option>
                  {#each items as item (item.itemId)}
                    <option value={item.itemId}>{item.name} ({item.customCode})</option>
                  {/each}
                </select>
                {#if selectedItem(line)}
                  <p class="text-xs text-secondary-500 mt-1">x{selectedItem(line)?.packUnits}/pack</p>
                {/if}
              </div>
              <button
                type="button"
                class="p-2 mt-6 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-danger-500 transition-colors"
                on:click={() => removeLine(index)}
                aria-label={`Remove line ${index + 1}`}
              >
                <Icon icon={Icons.trash} className="w-4 h-4" />
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DecimalInput bind:value={line.qtyPack} label="Qty (pack)" id={`pi-line-qtypack-${index}`} />
              <DecimalInput bind:value={line.qtyLoose} label="Qty (loose)" id={`pi-line-qtyloose-${index}`} />
              <DecimalInput bind:value={line.qtyBonus} label="Qty (bonus)" id={`pi-line-qtybonus-${index}`} />
              <DecimalInput bind:value={line.unitPurchasePrice} label="Unit purchase price" id={`pi-line-price-${index}`} prefix="Rs" required />
              <DecimalInput bind:value={line.discountPercent} label="Discount %" id={`pi-line-discount-${index}`} placeholder="0" />
              <div>
                <label class={labelClass} for={`pi-line-batch-${index}`}>Batch no</label>
                <input id={`pi-line-batch-${index}`} type="text" bind:value={line.batchNo} class={inputClass} placeholder="Optional" />
              </div>
              <div>
                <label class={labelClass} for={`pi-line-expiry-${index}`}>Expiry date</label>
                <input id={`pi-line-expiry-${index}`} type="date" bind:value={line.expiryDate} class={inputClass} />
              </div>
              <div>
                <label class={labelClass} for={`pi-line-expiry-status-${index}`}>Expiry status</label>
                <select id={`pi-line-expiry-status-${index}`} bind:value={line.expiryStatus} class={inputClass}>
                  <option value="known">Known</option>
                  <option value="unknown">Unknown</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div>
      <label class={labelClass} for="pi-notes">Notes</label>
      <textarea id="pi-notes" bind:value={notes} rows="2" class={inputClass} placeholder="Optional notes for this purchase invoice"></textarea>
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
