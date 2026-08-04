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
    ItemSummary,
    CreateSaleReturnInput,
    SaleReturnLineInput,
  } from '../../api'
  // Wave 7 lifecycle-action types are local to sales.ts, not re-exported through the './api'
  // barrel (types.ts) -- same "import the module file directly" precedent PaymentMethodsPage.svelte
  // follows for PaymentCashBankAccountRow (see payments.ts's own header comment).
  import type {
    CancelSaleReturnInput,
    ReverseSaleReturnInput,
    LookupSaleReturnInvoiceResult,
  } from '../../api/sales'

  // One row per line on the original invoice, pre-filled from a real POST /sale-returns/lookup-
  // invoice response (Wave 7) -- `include` decides whether it is actually sent as a return line.
  // `soldQty`/`qtyAlreadyReturned`/`qtyReturnable` are display-only (what the lookup reported);
  // `returnQty` is the editable, pre-filled-to-`qtyReturnable` decimal string.
  type ReturnLineForm = {
    saleInvoiceLineId: number
    itemId: number
    stockLotId: number
    soldQty: string
    qtyAlreadyReturned: string
    qtyReturnable: string
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
    cancelOpen = false
    reverseOpen = false
  }

  function toastApiError(err: unknown, fallback: string): void {
    if (err instanceof ApiError) toast.error(err.detail || err.message)
    else if (err instanceof ApiNetworkError) toast.error(err.message)
    else toast.error(fallback)
  }

  // ---- Cancel return (Wave 7) ---------------------------------------------------------------
  // Only enabled when detailResult.saleReturn.status === 'posted'. The 422 this can throw --
  // SALE_RETURN.STOCK_ALREADY_MOVED, when the lot(s) this return added to have since been touched
  // -- carries its own actionable `detail` message ("reverse this return instead of cancelling
  // it"); toastApiError surfaces that real message, not a generic failure.
  let cancelOpen = false
  let cancelReason = ''
  let cancelSubmitting = false

  function openCancel(): void {
    cancelReason = ''
    cancelOpen = true
  }
  function closeCancelModal(): void {
    if (cancelSubmitting) return
    cancelOpen = false
  }
  async function confirmCancel(): Promise<void> {
    if (!detailResult) return
    cancelSubmitting = true
    try {
      const input: CancelSaleReturnInput = {}
      if (cancelReason.trim()) input.reason = cancelReason.trim()
      const result = await salesApi.cancelSaleReturn(detailResult.saleReturn.saleReturnId, input, api.newIdempotencyKey())
      toast.success(`Sale return ${result.saleReturn.docNumber} cancelled.`)
      cancelOpen = false
      detailResult = result
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not cancel this sale return.')
    } finally {
      cancelSubmitting = false
    }
  }

  // ---- Reverse return (Wave 7) --------------------------------------------------------------
  // Same enable condition as cancel (status === 'posted'), but unconditional w.r.t. cancel's own
  // stock-untouched guard -- can still 422 INVENTORY.INSUFFICIENT_STOCK if the returned stock has
  // genuinely since been consumed elsewhere (sale-returns.service.ts's reverse doc comment).
  let reverseOpen = false
  let reverseReason = ''
  let reverseSubmitting = false

  function openReverse(): void {
    reverseReason = ''
    reverseOpen = true
  }
  function closeReverseModal(): void {
    if (reverseSubmitting) return
    reverseOpen = false
  }
  async function confirmReverse(): Promise<void> {
    if (!detailResult) return
    reverseSubmitting = true
    try {
      const input: ReverseSaleReturnInput = {}
      if (reverseReason.trim()) input.reason = reverseReason.trim()
      const result = await salesApi.reverseSaleReturn(detailResult.saleReturn.saleReturnId, input, api.newIdempotencyKey())
      toast.success(`Sale return ${result.saleReturn.docNumber} reversed.`)
      reverseOpen = false
      detailResult = result
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not reverse this sale return.')
    } finally {
      reverseSubmitting = false
    }
  }

  // ---- create modal ------------------------------------------------------------------------
  // Wave 7: the create form is now driven by a real lookup-invoice step FIRST (docNumber search
  // box -> SaleReturnsService.lookupInvoice's real per-line qtyAlreadyReturned/qtyReturnable),
  // replacing the old customer-dropdown -> invoice-dropdown -> getSaleInvoice chain, which
  // pre-filled returnQty with the FULL sold qty and had no idea how much of a line was already
  // returned -- relying entirely on the server's own 422 to catch an over-return after the fact.
  let createOpen = false
  let createDataLoading = false
  let createLoading = false
  let createError = ''
  let formErrors: Record<string, string> = {}
  let idempotencyKey = ''

  let items: ItemSummary[] = []
  $: itemMap = new Map(items.map((item) => [item.itemId, item]))

  let customerId: number | '' = ''
  let saleInvoiceId: number | '' = ''
  let documentDate = todayYmd()
  let notes = ''

  let lookupDocNumber = ''
  let lookupLoading = false
  let lookupError = ''
  let lookupResult: LookupSaleReturnInvoiceResult | null = null

  let invoiceLines: ReturnLineForm[] = []

  async function openCreate(): Promise<void> {
    createOpen = true
    createError = ''
    formErrors = {}
    customerId = ''
    saleInvoiceId = ''
    documentDate = todayYmd()
    notes = ''
    lookupDocNumber = ''
    lookupLoading = false
    lookupError = ''
    lookupResult = null
    invoiceLines = []
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

  /** POST /sale-returns/lookup-invoice -- real per-line qtyAlreadyReturned/qtyReturnable, used to
   *  pre-fill the return form against actual prior-sale data instead of guessing full sold qty.
   *  Best-effort as of the moment it runs -- createAndPost's own locked re-check is what is
   *  actually authoritative at submit time (same relationship preview has to createCashSale, see
   *  that service method's own doc comment). */
  async function performLookup(): Promise<void> {
    const docNumber = lookupDocNumber.trim()
    if (!docNumber) {
      lookupError = 'Enter the original sale invoice’s doc number.'
      return
    }
    lookupLoading = true
    lookupError = ''
    lookupResult = null
    invoiceLines = []
    customerId = ''
    saleInvoiceId = ''
    formErrors = {}
    try {
      const result = await salesApi.lookupSaleReturnInvoice(docNumber)
      lookupResult = result
      customerId = result.invoice.customerId
      saleInvoiceId = result.invoice.saleInvoiceId
      invoiceLines = result.lines.map((line) => ({
        saleInvoiceLineId: line.saleInvoiceLineId,
        itemId: line.itemId,
        stockLotId: line.stockLotId,
        soldQty: line.qtyBase,
        qtyAlreadyReturned: line.qtyAlreadyReturned,
        qtyReturnable: line.qtyReturnable,
        unitSalePrice: line.unitSalePrice,
        include: false,
        returnQty: line.qtyReturnable,
      }))
    } catch (err) {
      lookupError = err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not find that invoice.'
    } finally {
      lookupLoading = false
    }
  }

  function resetLookup(): void {
    lookupDocNumber = ''
    lookupError = ''
    lookupResult = null
    invoiceLines = []
    customerId = ''
    saleInvoiceId = ''
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
    if (!lookupResult || customerId === '' || saleInvoiceId === '') nextErrors.lookup = 'Look up the original invoice first.'
    if (!documentDate) nextErrors.documentDate = 'Document date is required.'
    if (selectedLines.length === 0) {
      nextErrors.lines = 'Include at least one line to return.'
    } else {
      for (const line of selectedLines) {
        if (isZeroOrEmpty(line.returnQty)) {
          nextErrors.lines = 'Each included line needs a return quantity greater than zero.'
          break
        }
        if (Number(line.returnQty) > Number(line.qtyReturnable)) {
          nextErrors.lines = `Return qty for ${itemMap.get(line.itemId)?.name ?? `item #${line.itemId}`} exceeds what is still returnable.`
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

      <div class="flex items-center justify-end gap-3 pt-2 border-t border-secondary-200 dark:border-secondary-700">
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium border border-danger-300 dark:border-danger-700 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={detailResult.saleReturn.status !== 'posted'}
          on:click={openCancel}
        >
          Cancel return
        </button>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium bg-danger-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={detailResult.saleReturn.status !== 'posted'}
          on:click={openReverse}
        >
          Reverse return
        </button>
      </div>
    </div>
  {/if}
</Modal>

<!-- Cancel confirm -->
<Modal open={cancelOpen} title={detailResult ? `Cancel ${detailResult.saleReturn.docNumber}` : 'Cancel sale return'} widthClass="max-w-md" onClose={closeCancelModal}>
  {#if detailResult}
    <div class="space-y-4">
      <p class="text-sm text-secondary-700 dark:text-secondary-300">
        This voids sale return {detailResult.saleReturn.docNumber}: the returned stock is pulled back out of its lot and the GL
        posting is reversed. Only possible while that lot is untouched since this return posted -- if it has since moved, reverse
        instead.
      </p>
      <div>
        <label class={labelClass} for="cancel-return-reason">Reason (optional)</label>
        <textarea id="cancel-return-reason" bind:value={cancelReason} rows="2" class={inputClass} placeholder="Why is this return being cancelled?"></textarea>
      </div>
    </div>
  {/if}
  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeCancelModal}
      disabled={cancelSubmitting}
    >
      Back
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-danger-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      on:click={confirmCancel}
      disabled={cancelSubmitting}
    >
      {cancelSubmitting ? 'Cancelling…' : 'Confirm cancel'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Reverse confirm -->
<Modal open={reverseOpen} title={detailResult ? `Reverse ${detailResult.saleReturn.docNumber}` : 'Reverse sale return'} widthClass="max-w-md" onClose={closeReverseModal}>
  {#if detailResult}
    <div class="space-y-4">
      <p class="text-sm text-secondary-700 dark:text-secondary-300">
        This posts an unconditional compensating entry for sale return {detailResult.saleReturn.docNumber}: the returned stock is
        pulled back out and the GL posting is reversed, even if the lot has had other activity since. Still 422s if the stock has
        genuinely since been consumed elsewhere.
      </p>
      <div>
        <label class={labelClass} for="reverse-return-reason">Reason (optional)</label>
        <textarea id="reverse-return-reason" bind:value={reverseReason} rows="2" class={inputClass} placeholder="Why is this return being reversed?"></textarea>
      </div>
    </div>
  {/if}
  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeReverseModal}
      disabled={reverseSubmitting}
    >
      Back
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-danger-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      on:click={confirmReverse}
      disabled={reverseSubmitting}
    >
      {reverseSubmitting ? 'Reversing…' : 'Confirm reverse'}
    </button>
  </svelte:fragment>
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
    <div>
      <label class={labelClass} for="sr-lookup-doc">Original sale invoice doc number<span class="text-danger-500"> *</span></label>
      <div class="flex gap-2">
        <input
          id="sr-lookup-doc"
          bind:value={lookupDocNumber}
          class={inputClass}
          placeholder="e.g. SV-000123"
          disabled={lookupLoading}
          on:keydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              performLookup()
            }
          }}
        />
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
          on:click={performLookup}
          disabled={lookupLoading}
        >
          {lookupLoading ? 'Looking up…' : 'Look up'}
        </button>
      </div>
      {#if lookupError}<p class="text-xs text-danger-500 mt-1">{lookupError}</p>{/if}
      {#if formErrors.lookup}<p class="text-xs text-danger-500 mt-1">{formErrors.lookup}</p>{/if}
    </div>

    {#if lookupResult}
      <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-secondary-500">Customer</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">
            {customerMap.get(lookupResult.invoice.customerId) ?? `Customer #${lookupResult.invoice.customerId}`}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Invoice</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{lookupResult.invoice.docNumber}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Invoice date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(lookupResult.invoice.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Invoice total</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(lookupResult.invoice.invoiceTotal)}</p>
        </div>
        <div class="col-span-2 sm:col-span-4">
          <button type="button" class="text-xs font-medium text-theme-primary hover:opacity-80" on:click={resetLookup}>
            Look up a different invoice
          </button>
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="sr-document-date">Return document date<span class="text-danger-500"> *</span></label>
        <input id="sr-document-date" type="date" bind:value={documentDate} class={inputClass} />
        {#if formErrors.documentDate}<p class="text-xs text-danger-500 mt-1">{formErrors.documentDate}</p>{/if}
      </div>
    </div>

    <div>
      <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Lines to return</h3>

      {#if formErrors.lines}<p class="text-xs text-danger-500 mb-3">{formErrors.lines}</p>{/if}

      {#if !lookupResult}
        <p class="text-sm text-secondary-500">Look up the original invoice above to list its lines.</p>
      {:else if invoiceLines.length === 0}
        <p class="text-sm text-secondary-500">This invoice has no lines.</p>
      {:else}
        <div class="space-y-3">
          {#each invoiceLines as line, index (line.saleInvoiceLineId)}
            {@const returnable = Number(line.qtyReturnable) > 0}
            <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
              <label class={`flex items-start gap-3 ${returnable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  class="mt-1"
                  checked={line.include}
                  disabled={!returnable}
                  on:change={(e) => toggleLine(index, (e.currentTarget as HTMLInputElement).checked)}
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-secondary-900 dark:text-white">
                    {itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}
                  </p>
                  <p class="text-xs text-secondary-500">
                    Lot #{line.stockLotId} · sold {formatQty(line.soldQty)} · already returned {formatQty(line.qtyAlreadyReturned)} ·
                    returnable {formatQty(line.qtyReturnable)}
                  </p>
                </div>
              </label>

              {#if line.include}
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-7">
                  <DecimalInput
                    bind:value={line.returnQty}
                    label="Return qty"
                    id={`sr-line-qty-${index}`}
                    required
                    error={Number(line.returnQty) > Number(line.qtyReturnable) ? `Exceeds returnable qty (${formatQty(line.qtyReturnable)})` : ''}
                  />
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
      disabled={createLoading || createDataLoading || !lookupResult}
    >
      {createLoading ? 'Submitting…' : 'Submit'}
    </button>
  </svelte:fragment>
</Modal>
