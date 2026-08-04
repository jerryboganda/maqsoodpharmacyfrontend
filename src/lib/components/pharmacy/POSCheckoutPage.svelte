<script lang="ts">
  // Fast POS checkout -- a DIFFERENT shape from SaleInvoicesPage.svelte's own "New sale" modal
  // (that page stays the admin browse/history screen; this is net new). Same backend endpoints,
  // same CreateSaleInvoiceInput/CreateSaleInvoiceResult wire shapes (confirmed by reading that
  // page's create-modal code + sale-invoices.controller.ts/sale-invoices.service.ts directly), but
  // the UI is live-search + running-cart + tender/change calculator instead of a multi-field form.
  //
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money/qty value here is a decimal
  // STRING end to end. The one deliberate exception -- same one SaleInvoicesPage.svelte's own
  // "estimatedTotal" already uses -- is small Number()/toFixed(2) arithmetic for UI-only display
  // (quick-cash suggestion buttons, the "short by Rs X" hint while typing an insufficient tender).
  // Nothing computed that way is ever sent back in a request body; every request field is either a
  // server-returned decimal string passed through verbatim or the raw string the cashier typed.
  //
  // ---- previewSale()/printSale() are LOCAL to this file, not added to src/lib/api/sales.ts -----
  // Per this task's own instruction and payments.ts's header comment precedent ("local minimal
  // fetch instead of touching a shared file a sibling task may also be editing"): sales.ts is a
  // small shared registry another concurrently-running agent may be appending to, so this page
  // calls `api.post`/`api.get` (imported straight from '../../api/client', not the barrel) for the
  // two routes it needs that sales.ts doesn't expose yet (`POST /sale-invoices/preview`,
  // `GET /sale-invoices/:id/print`) instead of adding exports there. `salesApi.createSaleInvoice`/
  // `listCustomers` (already exported) are used normally -- only the NEW routes get a local fetch.
  //
  // ---- Why the live cart total needs a "sentinel" payment on the preview call -------------------
  // CreateSaleInvoiceSchema requires `payments: array().min(1)` even on `/preview`, and
  // SaleInvoicesService.computeSale validates payments (Σ must cover the total) AFTER it computes
  // grossAmount/netAmount/invoiceTotal but BEFORE it returns -- an insufficient payment throws
  // before the caller ever sees those totals. So there is no way to preview "just the cart totals"
  // with zero or too-small a payment; the only way to reliably see invoiceTotal while the cashier
  // is still scanning items (before they've typed a real tender) is to preview with a payment that
  // is GUARANTEED to cover any realistic total. This page keeps a dedicated cash/counter payment
  // method id (`sentinelPaymentMethodId`, resolved once from the loaded payment methods list,
  // independent of whatever method the cashier has picked for their REAL tender) and previews with
  // a large placeholder amount (`SENTINEL_TENDER`) whenever no real tender is in hand yet. Only
  // `invoiceTotal`/`netAmount`/`grossAmount`/`totalQty`/`lines` are read off that response --
  // `changeAmount` from a sentinel call is meaningless and is only ever surfaced from a preview
  // that used the cashier's REAL tender (`tenderIsAuthoritative` below), matching the task's own
  // allowance ("changeAmount ... if the preview endpoint returns one when payments are included").
  import { onMount, onDestroy } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { api, ApiError, ApiNetworkError } from '../../api/client'
  import { catalogApi, salesApi, paymentsApi, formatMoney, formatDate, todayYmd } from '../../api'
  import type { ItemSummary, CustomerRow, PaymentMethodRow, SaleLineInput, CreateSaleInvoiceInput } from '../../api'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-2.5 px-3'
  const cellClass = 'py-2.5 px-3 text-sm text-secondary-800 dark:text-secondary-200'

  function toastApiError(err: unknown, fallback: string): void {
    if (err instanceof ApiError) toast.error(err.detail || err.message)
    else if (err instanceof ApiNetworkError) toast.error(err.message)
    else toast.error(fallback)
  }

  // ---------------------------------------------------------------------------------------------
  // Local fetch shapes -- mirrors sale-invoices.service.ts's SaleInvoicePreviewResult /
  // SaleInvoicePrintResult exactly (Date columns serialize to ISO strings over the wire, so they
  // are typed `string` here, same convention as every Date-column field elsewhere in types.ts).
  // ---------------------------------------------------------------------------------------------
  interface SaleInvoicePreviewLine {
    lineNo: number
    itemId: number
    itemName: string
    qty: string
    unitSalePrice: string
    lineGrossAmount: string
    lineCostAmount: string
    allocations: { stockLotId: number; qty: string; batchNo: string | null; expiryDate: string | null }[]
  }
  interface SaleInvoicePreviewResult {
    customerId: number
    customerName: string
    saleCategoryId: number
    lines: SaleInvoicePreviewLine[]
    grossAmount: string
    netAmount: string
    cogsAmount: string
    invoiceTotal: string
    totalQty: string
    paidTotal: string
    changeAmount: string
  }
  interface SaleInvoicePrintResult {
    printFormat: 'standard_receipt'
    header: {
      saleInvoiceId: number
      docNumber: string
      documentDate: string
      postingDate: string
      status: string
      tenantName: string | null
      branchName: string | null
      customer: { customerId: number; name: string | null }
    }
    lines: {
      lineNo: number
      itemId: number
      itemName: string
      itemCode: string
      qty: string
      unitSalePrice: string
      itemFlatDiscount: string
      discountPercent: string
      lineDiscountAmount: string
      lineGrossAmount: string
      lineNetAmount: string
      lineTaxAmount: string
    }[]
    taxBreakdown: { salesTaxAmount: string; advanceIncomeTaxAmount: string; fbrPosFeeAmount: string }
    grossAmount: string
    lineDiscountAmount: string
    invoiceDiscountAmount: string
    netAmount: string
    roundingAmount: string
    invoiceTotal: string
    payments: { sequenceNo: number; paymentMethodId: number; methodName: string; amount: string; referenceNo: string | null; cardLast4: string | null }[]
    changeAmount: string
  }

  /** POST /sale-invoices/preview -- zero writes, `sale.cash:view`, no idempotency key needed. */
  function previewSale(body: CreateSaleInvoiceInput): Promise<SaleInvoicePreviewResult> {
    return api.post<SaleInvoicePreviewResult>('/sale-invoices/preview', body)
  }
  /** GET /sale-invoices/:id/print -- read-only structured receipt JSON, no idempotency key. */
  function printSale(saleInvoiceId: number): Promise<SaleInvoicePrintResult> {
    return api.get<SaleInvoicePrintResult>(`/sale-invoices/${saleInvoiceId}/print`)
  }

  // ---------------------------------------------------------------------------------------------
  // Reference data -- payment methods (tender picker) and customers (optional picker). Loaded once
  // on mount, same shape SaleInvoicesPage/PaymentMethodsPage already use.
  // ---------------------------------------------------------------------------------------------
  let refsLoading = true
  let paymentMethods: PaymentMethodRow[] = []
  let customers: CustomerRow[] = []
  let sentinelPaymentMethodId: number | '' = ''
  const SENTINEL_TENDER = '9999999.00' // guaranteed to cover any realistic sale -- see header comment

  async function loadRefs(): Promise<void> {
    refsLoading = true
    try {
      const [methodsResult, customersResult] = await Promise.all([
        paymentsApi.listPaymentMethods(), // default excludes disabled (payment-method.service.ts)
        salesApi.listCustomers({ limit: 200 }), // ListCustomersQuerySchema caps limit at 200
      ])
      paymentMethods = methodsResult.paymentMethods
      customers = customersResult.customers
      const cashMethod = paymentMethods.find((m) => m.isCounterMethod)
      sentinelPaymentMethodId = cashMethod ? cashMethod.paymentMethodId : ''
      if (cashMethod && tenderPaymentMethodId === '') tenderPaymentMethodId = cashMethod.paymentMethodId
    } catch (err) {
      toastApiError(err, 'Could not load payment methods or customers.')
    } finally {
      refsLoading = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Item search -- debounced ~250ms, `q` server-side search (ListItemsQuerySchema), isActive only.
  // ---------------------------------------------------------------------------------------------
  let searchInputEl: HTMLInputElement | undefined
  let searchContainerEl: HTMLDivElement | undefined
  let searchQuery = ''
  let searchResults: ItemSummary[] = []
  let searchLoading = false
  let searchOpen = false
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  async function runSearch(q: string): Promise<ItemSummary[]> {
    try {
      const result = await catalogApi.listItems({ q, isActive: true, limit: 20 })
      return result.items
    } catch (err) {
      toastApiError(err, 'Item search failed.')
      return []
    }
  }

  function scheduleSearch(): void {
    if (searchTimer) clearTimeout(searchTimer)
    const q = searchQuery.trim()
    if (q.length === 0) {
      searchResults = []
      searchOpen = false
      return
    }
    searchTimer = setTimeout(() => {
      searchLoading = true
      void runSearch(q).then((items) => {
        searchResults = items
        searchOpen = true
        searchLoading = false
      })
    }, 250)
  }

  /** Barcode-style flow: an exact `customCode` match + Enter adds qty 1 immediately, no click
   *  needed. A barcode scanner can type+Enter faster than the 250ms debounce resolves, so this
   *  does its own immediate (non-debounced) lookup rather than trusting `searchResults` to be
   *  fresh. Falls back to just showing results (click-to-add) when nothing matches exactly. */
  async function handleSearchKeydown(e: KeyboardEvent): Promise<void> {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    if (searchTimer) clearTimeout(searchTimer)

    const exactLoaded = searchResults.find((i) => i.customCode.toLowerCase() === q.toLowerCase())
    if (exactLoaded) {
      addToCart(exactLoaded)
      return
    }
    searchLoading = true
    const items = await runSearch(q)
    searchLoading = false
    const exact = items.find((i) => i.customCode.toLowerCase() === q.toLowerCase())
    if (exact) {
      addToCart(exact)
      return
    }
    searchResults = items
    searchOpen = true
  }

  function handleWindowClick(e: MouseEvent): void {
    if (searchOpen && searchContainerEl && !searchContainerEl.contains(e.target as Node)) searchOpen = false
  }
  function handleWindowKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && searchOpen) searchOpen = false
  }

  // ---------------------------------------------------------------------------------------------
  // Cart -- one line per distinct item (adding an already-present item bumps its qty by 1 instead
  // of creating a duplicate line, standard POS behaviour). `unitSalePrice` is only ever sent when
  // non-empty -- the backend only auto-defaults price when `packUnits === 1` (sale-invoices.
  // service.ts's own price-resolution comment), so a packUnits>1 item's price field is shown
  // inline and required, mirroring SaleInvoicesPage.svelte's identical handling of that same rule.
  // ---------------------------------------------------------------------------------------------
  type CartLine = { item: ItemSummary; qty: string; unitSalePrice: string }
  let cart: CartLine[] = []

  function qtyOk(item: ItemSummary, qty: string): boolean {
    const trimmed = qty.trim()
    if (trimmed === '') return false
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n <= 0) return false
    if (!item.allowDecimalQty && !Number.isInteger(n)) return false
    return true
  }

  function incrementQty(current: string): string {
    const n = (Number(current) || 0) + 1
    return String(n)
  }

  function addToCart(item: ItemSummary): void {
    const existing = cart.find((l) => l.item.itemId === item.itemId)
    if (existing) {
      existing.qty = incrementQty(existing.qty)
      cart = [...cart]
    } else {
      cart = [...cart, { item, qty: '1', unitSalePrice: '' }]
    }
    searchQuery = ''
    searchResults = []
    searchOpen = false
    searchInputEl?.focus()
  }

  function removeLine(itemId: number): void {
    cart = cart.filter((l) => l.item.itemId !== itemId)
  }

  $: cartLinesValid = cart.length > 0 && cart.every((l) => qtyOk(l.item, l.qty) && (l.item.packUnits === 1 || l.unitSalePrice.trim() !== ''))

  function lineTotal(itemId: number): string | null {
    const line = preview?.lines.find((l) => l.itemId === itemId)
    return line ? line.lineGrossAmount : null
  }

  // ---------------------------------------------------------------------------------------------
  // Customer -- default walk-in (customerId omitted entirely, matches the backend's own default).
  // ---------------------------------------------------------------------------------------------
  let customerId: number | '' = ''

  // ---------------------------------------------------------------------------------------------
  // Tender panel.
  // ---------------------------------------------------------------------------------------------
  let tenderPaymentMethodId: number | '' = ''
  let tenderAmount = ''
  let tenderReferenceNo = ''
  $: tenderMethod = paymentMethods.find((m) => m.paymentMethodId === tenderPaymentMethodId)

  // ---------------------------------------------------------------------------------------------
  // Live preview -- debounced, re-fires whenever the cart, customer, or tender changes. See this
  // file's header comment for the sentinel-payment mechanics.
  // ---------------------------------------------------------------------------------------------
  let preview: SaleInvoicePreviewResult | null = null
  let previewLoading = false
  let previewError = ''
  /** True only when the LAST successful preview used the cashier's real, entered tender (not the
   *  sentinel) -- i.e. the server has confirmed this exact payment covers the total and computed a
   *  real `changeAmount`. `completeSale` is gated on this being true, so the UI never lets the
   *  cashier submit something the server hasn't already dry-run-approved. */
  let tenderIsAuthoritative = false
  let previewTimer: ReturnType<typeof setTimeout> | undefined

  function buildLines(): SaleLineInput[] {
    return cart.map((l) => {
      const built: SaleLineInput = { itemId: l.item.itemId, qty: l.qty.trim() }
      if (l.unitSalePrice.trim() !== '') built.unitSalePrice = l.unitSalePrice.trim()
      return built
    })
  }

  async function refreshPreview(): Promise<void> {
    if (cart.length === 0 || !cartLinesValid) {
      preview = null
      previewError = ''
      tenderIsAuthoritative = false
      return
    }
    const realTenderReady = tenderAmount.trim() !== '' && Number(tenderAmount) > 0 && tenderPaymentMethodId !== ''
    const paymentMethodForPreview = realTenderReady ? (tenderPaymentMethodId as number) : sentinelPaymentMethodId
    if (paymentMethodForPreview === '') {
      previewError = refsLoading ? '' : 'No cash/counter payment method is configured -- cannot compute a live total.'
      return
    }

    const body: CreateSaleInvoiceInput = {
      documentDate: todayYmd(),
      lines: buildLines(),
      payments: realTenderReady
        ? [
            {
              paymentMethodId: tenderPaymentMethodId as number,
              amount: tenderAmount.trim(),
              ...(tenderReferenceNo.trim() ? { referenceNo: tenderReferenceNo.trim() } : {}),
            },
          ]
        : [{ paymentMethodId: paymentMethodForPreview, amount: SENTINEL_TENDER }],
    }
    if (customerId !== '') body.customerId = customerId

    previewLoading = true
    try {
      const result = await previewSale(body)
      preview = result
      tenderIsAuthoritative = realTenderReady
      previewError = ''
    } catch (err) {
      const shortfallCode = err instanceof ApiError && (err.code === 'SALES.PAYMENT_SHORT' || err.code === 'SALES.OVERPAYMENT_REQUIRES_CASH')
      if (realTenderReady && shortfallCode) {
        // Expected mid-entry state ("hasn't typed enough cash yet") -- not an error. Keep whatever
        // totals are already on screen (the cart itself hasn't changed) and just mark the tender
        // as not-yet-sufficient so the change display and Complete Sale button react accordingly.
        tenderIsAuthoritative = false
      } else {
        tenderIsAuthoritative = false
        preview = null
        if (err instanceof ApiError) previewError = err.detail || err.message
        else if (err instanceof ApiNetworkError) previewError = err.message
        else previewError = 'Could not compute the live total.'
      }
    } finally {
      previewLoading = false
    }
  }

  function schedulePreview(): void {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(() => void refreshPreview(), 300)
  }

  // Re-schedule whenever any of these change. `cart` is reassigned on every qty edit/add/remove
  // (Svelte tracks `bind:value={line.qty}` inside `#each cart as line` as a `cart` invalidation,
  // same pattern ExpensesPage.svelte's own line forms rely on), so this reactive block fires on
  // every cart edit too, not just add/remove.
  $: {
    // Bare identifier statements (`cart` / `customerId` / ...) are the common Svelte idiom for
    // registering extra reactive dependencies on a `$:` block, but ESLint's
    // @typescript-eslint/no-unused-expressions flags them as no-op expression statements (it has
    // no notion of Svelte's own reactivity analysis). Referencing them inside a template literal
    // assigned to a variable satisfies both: Svelte's compiler still statically finds every
    // identifier reference in the block (assignment position doesn't matter to it), and ESLint
    // sees a real VariableDeclaration, not a bare ExpressionStatement.
    const _previewDeps = `${JSON.stringify(cart)}|${customerId}|${tenderAmount}|${tenderPaymentMethodId}`
    void _previewDeps
    schedulePreview()
  }

  function fillExactTender(): void {
    if (preview) tenderAmount = preview.invoiceTotal
  }
  function roundUpTo(totalStr: string, step: number): string {
    const total = Number(totalStr) || 0
    return (Math.ceil(total / step) * step).toFixed(2)
  }
  $: quickTenderAmounts = preview
    ? Array.from(new Set([100, 500, 1000, 5000].map((step) => roundUpTo(preview!.invoiceTotal, step))))
    : []
  $: shortBy = preview && !tenderIsAuthoritative && tenderAmount.trim() !== '' ? Number(preview.invoiceTotal) - Number(tenderAmount) : 0

  // ---------------------------------------------------------------------------------------------
  // Complete sale -> receipt.
  // ---------------------------------------------------------------------------------------------
  let submitting = false
  let receipt: SaleInvoicePrintResult | null = null

  $: canCheckout = !submitting && !previewLoading && cartLinesValid && preview !== null && tenderIsAuthoritative

  async function completeSale(): Promise<void> {
    if (!canCheckout) return
    submitting = true
    try {
      const body: CreateSaleInvoiceInput = {
        documentDate: todayYmd(),
        lines: buildLines(),
        payments: [
          {
            paymentMethodId: tenderPaymentMethodId as number,
            amount: tenderAmount.trim(),
            ...(tenderReferenceNo.trim() ? { referenceNo: tenderReferenceNo.trim() } : {}),
          },
        ],
      }
      if (customerId !== '') body.customerId = customerId

      // Fresh key per submit click -- mirrors SaleInvoicesPage.svelte's own submitCreate (which
      // calls `api.newIdempotencyKey()` inline at submit time, not a key minted once and reused
      // across edits), the established precedent for this exact endpoint in this codebase.
      const result = await salesApi.createSaleInvoice(body, api.newIdempotencyKey())
      toast.success(`Sale ${result.saleInvoice.docNumber} completed. Change: ${formatMoney(result.changeAmount)}`)

      try {
        receipt = await printSale(result.saleInvoice.saleInvoiceId)
      } catch (err) {
        toastApiError(err, 'Sale completed, but the receipt could not be loaded.')
      }

      resetCart()
    } catch (err) {
      toastApiError(err, 'Could not complete the sale.')
      // Keep the cart intact so the cashier can fix and resubmit.
    } finally {
      submitting = false
    }
  }

  function resetCart(): void {
    cart = []
    customerId = ''
    tenderAmount = ''
    tenderReferenceNo = ''
    preview = null
    previewError = ''
    tenderIsAuthoritative = false
    searchQuery = ''
    searchResults = []
  }

  function startNewSale(): void {
    receipt = null
    searchInputEl?.focus()
  }

  function printReceipt(): void {
    window.print()
  }

  onMount(() => {
    void loadRefs()
    searchInputEl?.focus()
  })
  onDestroy(() => {
    if (searchTimer) clearTimeout(searchTimer)
    if (previewTimer) clearTimeout(previewTimer)
  })
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleWindowKeydown} />

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Point of sale</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Fast checkout -- search, scan, or click an item, then tender and complete the sale.</p>
    </div>
  </div>

  {#if receipt}
    <!-- ---------------------------------------------------------------------------------------
         Receipt view -- real GET /sale-invoices/:id/print data. #pos-receipt is what the print
         stylesheet below isolates for window.print().
    ---------------------------------------------------------------------------------------- -->
    <div class="max-w-2xl mx-auto space-y-4">
      <div class="flex items-center justify-between no-print">
        <div class="flex items-center gap-2 text-success-600 dark:text-success-400">
          <Icon icon={Icons.circleCheck} className="w-5 h-5" />
          <span class="text-sm font-semibold">Sale completed</span>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" on:click={printReceipt}>
            Print
          </button>
          <button type="button" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity" on:click={startNewSale}>
            New sale
          </button>
        </div>
      </div>

      <div id="pos-receipt" class="card rounded-xl p-6 font-mono text-sm">
        <div class="text-center mb-4 pb-4 border-b border-dashed border-secondary-300 dark:border-secondary-700">
          {#if receipt.header.tenantName}<p class="font-semibold text-base">{receipt.header.tenantName}</p>{/if}
          {#if receipt.header.branchName}<p class="text-xs text-secondary-500">{receipt.header.branchName}</p>{/if}
          <p class="mt-2 font-semibold">{receipt.header.docNumber}</p>
          <p class="text-xs text-secondary-500">{formatDate(receipt.header.documentDate)} -- {receipt.header.customer.name ?? 'Walk-in customer'}</p>
        </div>

        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-secondary-300 dark:border-secondary-700">
              <th class="text-left py-1">Item</th>
              <th class="text-right py-1">Qty</th>
              <th class="text-right py-1">Price</th>
              <th class="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {#each receipt.lines as line (line.lineNo)}
              <tr class="border-b border-dashed border-secondary-200 dark:border-secondary-800">
                <td class="py-1 pr-2">{line.itemName} <span class="text-secondary-400">({line.itemCode})</span></td>
                <td class="py-1 text-right">{line.qty}</td>
                <td class="py-1 text-right">{formatMoney(line.unitSalePrice)}</td>
                <td class="py-1 text-right">{formatMoney(line.lineNetAmount)}</td>
              </tr>
            {/each}
          </tbody>
        </table>

        <div class="mt-4 pt-4 border-t border-dashed border-secondary-300 dark:border-secondary-700 space-y-1 text-xs">
          <div class="flex justify-between"><span>Gross</span><span>{formatMoney(receipt.grossAmount)}</span></div>
          {#if Number(receipt.lineDiscountAmount) > 0}<div class="flex justify-between"><span>Line discount</span><span>-{formatMoney(receipt.lineDiscountAmount)}</span></div>{/if}
          {#if Number(receipt.invoiceDiscountAmount) > 0}<div class="flex justify-between"><span>Invoice discount</span><span>-{formatMoney(receipt.invoiceDiscountAmount)}</span></div>{/if}
          {#if Number(receipt.taxBreakdown.salesTaxAmount) > 0}<div class="flex justify-between"><span>Sales tax</span><span>{formatMoney(receipt.taxBreakdown.salesTaxAmount)}</span></div>{/if}
          {#if Number(receipt.roundingAmount) !== 0}<div class="flex justify-between"><span>Rounding</span><span>{formatMoney(receipt.roundingAmount)}</span></div>{/if}
          <div class="flex justify-between text-sm font-bold pt-1 border-t border-secondary-300 dark:border-secondary-700"><span>Total</span><span>{formatMoney(receipt.invoiceTotal)}</span></div>
        </div>

        <div class="mt-4 pt-4 border-t border-dashed border-secondary-300 dark:border-secondary-700 space-y-1 text-xs">
          {#each receipt.payments as payment (payment.sequenceNo)}
            <div class="flex justify-between">
              <span>{payment.methodName}{#if payment.referenceNo} (#{payment.referenceNo}){/if}</span>
              <span>{formatMoney(payment.amount)}</span>
            </div>
          {/each}
          {#if Number(receipt.changeAmount) > 0}
            <div class="flex justify-between font-semibold"><span>Change</span><span>{formatMoney(receipt.changeAmount)}</span></div>
          {/if}
        </div>

        <p class="text-center text-xs text-secondary-400 mt-6">Thank you</p>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- ------------------------------------------------------------------------------------
           Left: search + cart
      ------------------------------------------------------------------------------------- -->
      <div class="lg:col-span-2 space-y-4">
        <div class="relative" bind:this={searchContainerEl}>
          <div class="relative">
            <Icon icon={Icons.search} className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              bind:this={searchInputEl}
              type="text"
              class="{inputClass} pl-11 text-base py-3.5"
              placeholder="Search item name or scan/type a code, then Enter…"
              bind:value={searchQuery}
              on:input={scheduleSearch}
              on:keydown={handleSearchKeydown}
              on:focus={() => { if (searchResults.length > 0) searchOpen = true }}
            />
            {#if searchLoading}
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-secondary-400">Searching…</span>
            {/if}
          </div>

          {#if searchOpen}
            <div class="absolute z-40 mt-1 w-full card !p-0 max-h-80 overflow-y-auto">
              {#if searchResults.length === 0}
                <p class="py-6 px-4 text-center text-sm text-secondary-500">{searchLoading ? 'Searching…' : 'No items match.'}</p>
              {:else}
                {#each searchResults as item (item.itemId)}
                  <button
                    type="button"
                    class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800/60 border-b border-surface-100 dark:border-surface-800 last:border-0 transition-colors"
                    on:click={() => addToCart(item)}
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-secondary-900 dark:text-white truncate">{item.name}</p>
                      <p class="text-xs text-secondary-500 font-mono">{item.customCode}{#if !item.isActive} -- inactive{/if}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      {#if item.isControlledDrug}<Badge tone="warning">Controlled</Badge>{/if}
                      <span class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(item.salePrice)}</span>
                    </div>
                  </button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>

        <div class="card rounded-xl p-0 overflow-hidden">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Cart">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Item</th>
                  <th class={`${headClass} w-32`}>Qty</th>
                  <th class={`${headClass} w-40`}>Unit price</th>
                  <th class={`${headClass} text-right w-32`}>Line total</th>
                  <th class={`${headClass} w-10`}></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#if cart.length === 0}
                  <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">Cart is empty -- search or scan an item to begin.</td></tr>
                {:else}
                  {#each cart as line (line.item.itemId)}
                    {@const total = lineTotal(line.item.itemId)}
                    <tr>
                      <td class={cellClass}>
                        <p class="font-medium text-secondary-900 dark:text-white">{line.item.name}</p>
                        <p class="text-xs text-secondary-400 font-mono">{line.item.customCode} -- list {formatMoney(line.item.salePrice)}</p>
                        {#if !qtyOk(line.item, line.qty)}
                          <p class="text-xs text-danger-500 mt-0.5">
                            {line.item.allowDecimalQty ? 'Enter a quantity greater than zero.' : 'This item only accepts whole-number quantities.'}
                          </p>
                        {/if}
                        {#if line.item.packUnits > 1}
                          <div class="mt-1.5 max-w-[10rem]">
                            <DecimalInput
                              id={`pos-price-${line.item.itemId}`}
                              scale={4}
                              prefix="Rs"
                              placeholder="Unit price"
                              required
                              bind:value={line.unitSalePrice}
                              error={line.unitSalePrice.trim() === '' ? `Required -- packed ${line.item.packUnits}/pack` : ''}
                            />
                          </div>
                        {/if}
                      </td>
                      <td class={cellClass}>
                        <DecimalInput id={`pos-qty-${line.item.itemId}`} scale={4} bind:value={line.qty} />
                      </td>
                      <td class={cellClass}>{formatMoney(line.unitSalePrice.trim() !== '' ? line.unitSalePrice : line.item.salePrice)}</td>
                      <td class={`${cellClass} text-right font-semibold text-secondary-900 dark:text-white`}>{total ? formatMoney(total) : '—'}</td>
                      <td class={cellClass}>
                        <button type="button" class="p-2 text-danger-500 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20" aria-label="Remove line" on:click={() => removeLine(line.item.itemId)}>
                          <Icon icon={Icons.trash} width={16} height={16} />
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

      <!-- ------------------------------------------------------------------------------------
           Right: customer, totals, tender/change calculator, complete sale
      ------------------------------------------------------------------------------------- -->
      <div class="space-y-4">
        <div class="card rounded-xl p-5 space-y-4">
          <div>
            <label class={labelClass} for="pos-customer">Customer</label>
            <select id="pos-customer" class={inputClass} bind:value={customerId}>
              <option value="">Walk-in customer (default)</option>
              {#each customers.filter((c) => c.isActive && !c.isWalkIn) as customer (customer.customerId)}
                <option value={customer.customerId}>{customer.name}</option>
              {/each}
            </select>
          </div>

          {#if previewError}
            <p class="text-xs text-danger-500">{previewError}</p>
          {/if}

          <div class="pt-3 border-t border-surface-200 dark:border-surface-700 space-y-1.5 text-sm">
            <div class="flex justify-between text-secondary-500"><span>Items</span><span>{cart.length}</span></div>
            <div class="flex justify-between text-secondary-500">
              <span>Subtotal</span>
              <span class={previewLoading ? 'opacity-50' : ''}>{preview ? formatMoney(preview.grossAmount) : '—'}</span>
            </div>
            <div class="flex justify-between text-lg font-bold text-secondary-900 dark:text-white pt-1.5 border-t border-surface-200 dark:border-surface-700">
              <span>Total due</span>
              <span class={previewLoading ? 'opacity-50' : ''}>{preview ? formatMoney(preview.invoiceTotal) : '—'}</span>
            </div>
          </div>
        </div>

        <div class="card rounded-xl p-5 space-y-4">
          <h3 class="heading-5">Tender</h3>
          <div>
            <label class={labelClass} for="pos-method">Payment method</label>
            <select id="pos-method" class={inputClass} bind:value={tenderPaymentMethodId} disabled={refsLoading}>
              <option value="">Select a method…</option>
              {#each paymentMethods as method (method.paymentMethodId)}
                <option value={method.paymentMethodId}>{method.name}</option>
              {/each}
            </select>
          </div>

          <div>
            <DecimalInput id="pos-tender-amount" label="Amount tendered" scale={2} prefix="Rs" bind:value={tenderAmount} />
          </div>

          {#if quickTenderAmounts.length > 0}
            <div class="flex flex-wrap gap-2">
              <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 transition-colors" on:click={fillExactTender}>
                Exact
              </button>
              {#each quickTenderAmounts as amount (amount)}
                <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" on:click={() => (tenderAmount = amount)}>
                  {formatMoney(amount)}
                </button>
              {/each}
            </div>
          {/if}

          {#if tenderMethod?.requiresReference}
            <div>
              <label class={labelClass} for="pos-reference">Reference no <span class="text-danger-500">*</span></label>
              <input id="pos-reference" class={inputClass} bind:value={tenderReferenceNo} required />
            </div>
          {/if}

          <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
            {#if preview && tenderIsAuthoritative}
              <div class="flex justify-between text-lg font-bold text-success-600 dark:text-success-400">
                <span>Change due</span>
                <span>{formatMoney(preview.changeAmount)}</span>
              </div>
            {:else if shortBy > 0}
              <div class="flex justify-between text-sm font-medium text-warning-600 dark:text-warning-400">
                <span>Still short</span>
                <span>{formatMoney(shortBy.toFixed(2))}</span>
              </div>
            {:else}
              <p class="text-xs text-secondary-400">Enter a payment method and amount to see the change due.</p>
            {/if}
          </div>

          <button
            type="button"
            class="w-full px-4 py-3.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canCheckout}
            on:click={completeSale}
          >
            {submitting ? 'Completing…' : 'Complete sale'}
          </button>
          {#if cart.length > 0 && !cartLinesValid}
            <p class="text-xs text-danger-500 text-center">Fix the highlighted cart line(s) before checking out.</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  @media print {
    :global(body *) {
      visibility: hidden;
    }
    :global(#pos-receipt),
    :global(#pos-receipt *) {
      visibility: visible;
    }
    :global(#pos-receipt) {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }
</style>
