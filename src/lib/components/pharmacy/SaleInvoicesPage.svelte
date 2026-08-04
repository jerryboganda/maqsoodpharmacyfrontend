<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import {
    salesApi,
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
    SaleInvoiceRow,
    CustomerRow,
    ItemSummary,
    SaleCategory,
    PaymentMethod,
    GetSaleInvoiceResult,
    CreateSaleInvoiceInput,
    SaleLineInput,
    SalePaymentInput,
  } from '../../api'
  // Wave 7 lifecycle-action types are local to sales.ts, not re-exported through the './api'
  // barrel (types.ts) -- same "import the module file directly" precedent PaymentMethodsPage.svelte
  // follows for PaymentCashBankAccountRow (see payments.ts's own header comment).
  import type { CancelSaleInvoiceInput, ReverseSaleInvoiceInput, SaleInvoicePrintResult } from '../../api/sales'

  // Rule M (rebuild/CLAUDE.md "Money and quantities"): qty/unitSalePrice/amount are decimal
  // STRINGS end to end. itemId/paymentMethodId are plain ids, not money/qty, so `number | ''`
  // (blank until the cashier picks one) is fine for those.
  type LineForm = { itemId: number | ''; qty: string; unitSalePrice: string }
  type PaymentForm = { paymentMethodId: number | ''; amount: string; referenceNo: string }

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  // ---- List view -------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let saleInvoices: SaleInvoiceRow[] = []
  let customers: CustomerRow[] = []
  let customerNameById = new Map<number, string>()

  // ---- Detail modal (read-only) -----------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detail: GetSaleInvoiceResult | null = null

  // ---- Create modal ------------------------------------------------------------------------
  let createOpen = false
  let creating = false
  let formError = ''
  let createRefLoading = false
  let createRefLoaded = false
  let saleCategories: SaleCategory[] = []
  let items: ItemSummary[] = []
  let paymentMethods: PaymentMethod[] = []

  let customerId: number | '' = ''
  let saleCategoryId: number | '' = ''
  let documentDate = todayYmd()
  let lines: LineForm[] = [{ itemId: '', qty: '', unitSalePrice: '' }]
  let payments: PaymentForm[] = [{ paymentMethodId: '', amount: '', referenceNo: '' }]
  // Tracks the last value we auto-filled into the (single) payment row's amount, so we can tell
  // "still equals what we suggested" (keep syncing) apart from "the cashier typed something else"
  // (stop syncing) without needing an input-event hook DecimalInput doesn't expose.
  let lastAutoPaymentAmount = ''

  // Front-end-only estimate (Rule M's explicitly allowed exception) -- never submitted, just
  // shown so the cashier has a rough total while entering lines/payments.
  $: estimatedTotal = lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitSalePrice) || 0), 0)
  $: estimatedPaidTotal = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)

  $: if (createOpen && payments.length === 1) {
    const suggested = estimatedTotal > 0 ? estimatedTotal.toFixed(2) : ''
    if (payments[0].amount === lastAutoPaymentAmount && suggested !== lastAutoPaymentAmount) {
      payments = [{ ...payments[0], amount: suggested }]
      lastAutoPaymentAmount = suggested
    }
  }

  function statusTone(status: string): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    return 'info'
  }

  function customerName(id: number): string {
    return customerNameById.get(id) ?? 'Walk-in customer'
  }

  function itemFor(itemId: number | ''): ItemSummary | undefined {
    return items.find((item) => item.itemId === itemId)
  }

  function methodFor(paymentMethodId: number | ''): PaymentMethod | undefined {
    return paymentMethods.find((method) => method.paymentMethodId === paymentMethodId)
  }

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [customersResult, invoicesResult] = await Promise.all([
        salesApi.listCustomers({ limit: 200 }), // ListCustomersQuerySchema caps limit at 200
        salesApi.listSaleInvoices({ limit: 100 }),
      ])
      customers = customersResult.customers
      customerNameById = new Map(customers.map((c) => [c.customerId, c.name]))
      saleInvoices = invoicesResult.saleInvoices
    } catch (err) {
      if (err instanceof ApiNetworkError) loadError = err.message
      else if (err instanceof ApiError) loadError = err.detail || err.message
      else loadError = 'Could not load sale invoices.'
    } finally {
      loading = false
    }
  }

  async function refreshInvoices(): Promise<void> {
    try {
      const result = await salesApi.listSaleInvoices({ limit: 100 })
      saleInvoices = result.saleInvoices
    } catch {
      // Non-fatal -- the create flow already toasted success; the list keeps its previous
      // contents and the cashier can hit Refresh explicitly if this quietly failed.
    }
  }

  async function openDetail(row: SaleInvoiceRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detail = null
    try {
      detail = await salesApi.getSaleInvoice(row.saleInvoiceId)
    } catch (err) {
      if (err instanceof ApiNetworkError) detailError = err.message
      else if (err instanceof ApiError) detailError = err.detail || err.message
      else detailError = 'Could not load this sale invoice.'
    } finally {
      detailLoading = false
    }
  }

  function closeDetail(): void {
    detailOpen = false
    detail = null
    cancelOpen = false
    reverseOpen = false
    printOpen = false
    printResult = null
  }

  function toastApiError(err: unknown, fallback: string): void {
    if (err instanceof ApiError) toast.error(err.detail || err.message)
    else if (err instanceof ApiNetworkError) toast.error(err.message)
    else toast.error(fallback)
  }

  // ---- Cancel invoice (Wave 7) --------------------------------------------------------------
  // Only enabled when detail.saleInvoice.status === 'posted' (see the template). The 422 this can
  // throw -- SALES.HAS_ACTIVE_RETURNS, when an active sale_return still references the invoice --
  // carries its own actionable `detail` message ("reverse or cancel the sale return(s) first,
  // then retry"); toastApiError surfaces that real message, not a generic failure.
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
    if (!detail) return
    cancelSubmitting = true
    try {
      const input: CancelSaleInvoiceInput = {}
      if (cancelReason.trim()) input.reason = cancelReason.trim()
      const result = await salesApi.cancelSaleInvoice(detail.saleInvoice.saleInvoiceId, input, api.newIdempotencyKey())
      toast.success(`Sale invoice ${result.saleInvoice.docNumber} cancelled.`)
      cancelOpen = false
      detail = result
      await refreshInvoices()
    } catch (err) {
      toastApiError(err, 'Could not cancel this sale invoice.')
    } finally {
      cancelSubmitting = false
    }
  }

  // ---- Reverse invoice (Wave 7) -------------------------------------------------------------
  // Same enable condition as cancel (status === 'posted'). As of this wave reverse ALSO 422s
  // SALES.HAS_ACTIVE_RETURNS while an active sale_return references the invoice (sale-
  // invoices.service.ts's reverse doc comment -- a live-bug fix, not a doc-only note) -- the same
  // toastApiError path surfaces that real detail message here too.
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
    if (!detail) return
    reverseSubmitting = true
    try {
      const input: ReverseSaleInvoiceInput = {}
      if (reverseReason.trim()) input.reason = reverseReason.trim()
      const result = await salesApi.reverseSaleInvoice(detail.saleInvoice.saleInvoiceId, input, api.newIdempotencyKey())
      toast.success(`Sale invoice ${result.saleInvoice.docNumber} reversed.`)
      reverseOpen = false
      detail = result
      await refreshInvoices()
    } catch (err) {
      toastApiError(err, 'Could not reverse this sale invoice.')
    } finally {
      reverseSubmitting = false
    }
  }

  // ---- Print / reprint (Wave 7) -------------------------------------------------------------
  // "Print" loads the read-only receipt via GET :id/print (no audit trail -- just viewing).
  // "Reprint" inside that same modal re-fetches via POST :id/reprint instead, so the global
  // AuditInterceptor records the explicit reprint action, then triggers the same window.print().
  // Receipt markup mirrors POSCheckoutPage.svelte's own #pos-receipt rendering (already landed --
  // reused here rather than re-invented), scoped to its own id so the two pages' print
  // stylesheets never collide if both are ever open in the same tab's history.
  let printOpen = false
  let printLoading = false
  let printError = ''
  let printResult: SaleInvoicePrintResult | null = null
  let reprintSubmitting = false

  async function openPrint(): Promise<void> {
    if (!detail) return
    printOpen = true
    printLoading = true
    printError = ''
    printResult = null
    try {
      printResult = await salesApi.printSaleInvoice(detail.saleInvoice.saleInvoiceId)
    } catch (err) {
      printError = err instanceof ApiError ? err.detail || err.message : err instanceof ApiNetworkError ? err.message : 'Could not load the receipt.'
    } finally {
      printLoading = false
    }
  }
  function closePrintModal(): void {
    printOpen = false
    printResult = null
  }
  async function performReprint(): Promise<void> {
    if (!detail) return
    reprintSubmitting = true
    try {
      printResult = await salesApi.reprintSaleInvoice(detail.saleInvoice.saleInvoiceId, api.newIdempotencyKey())
      toast.success('Reprint recorded.')
      windowPrint()
    } catch (err) {
      toastApiError(err, 'Could not reprint this receipt.')
    } finally {
      reprintSubmitting = false
    }
  }
  function windowPrint(): void {
    window.print()
  }

  function resetCreateForm(): void {
    const walkIn = customers.find((c) => c.isWalkIn === true)
    customerId = walkIn ? walkIn.customerId : ''
    saleCategoryId = ''
    documentDate = todayYmd()
    lines = [{ itemId: '', qty: '', unitSalePrice: '' }]
    const cashMethod = paymentMethods.find((m) => m.isCounterMethod === true)
    payments = [{ paymentMethodId: cashMethod ? cashMethod.paymentMethodId : '', amount: '', referenceNo: '' }]
    lastAutoPaymentAmount = ''
    formError = ''
  }

  async function openCreateModal(): Promise<void> {
    resetCreateForm()
    createOpen = true
    if (createRefLoaded) return
    createRefLoading = true
    try {
      const [categoriesResult, itemsResult, methodsResult] = await Promise.all([
        lookupsApi.saleCategories(),
        catalogApi.listItems({ isActive: true, limit: 500 }),
        lookupsApi.paymentMethods(),
      ])
      saleCategories = categoriesResult
      items = itemsResult.items
      paymentMethods = methodsResult
      createRefLoaded = true
      // Payment methods weren't known when resetCreateForm() ran -- now that they are, default
      // the still-untouched single payment row to Cash (isCounterMethod===true).
      const cashMethod = paymentMethods.find((m) => m.isCounterMethod === true)
      if (cashMethod && payments.length === 1 && payments[0].paymentMethodId === '') {
        payments = [{ ...payments[0], paymentMethodId: cashMethod.paymentMethodId }]
      }
    } catch (err) {
      if (err instanceof ApiNetworkError) toast.error(err.message)
      else if (err instanceof ApiError) toast.error(err.detail || err.message)
      else toast.error('Could not load the sale form data.')
    } finally {
      createRefLoading = false
    }
  }

  function closeCreateModal(): void {
    createOpen = false
  }

  function addLine(): void {
    lines = [...lines, { itemId: '', qty: '', unitSalePrice: '' }]
  }

  function removeLine(index: number): void {
    lines = lines.filter((_, i) => i !== index)
  }

  function handleItemChange(index: number): void {
    lines = lines.map((line, i) => {
      if (i !== index) return line
      const item = itemFor(line.itemId)
      // Backend only auto-defaults the price when packUnits===1 (sale-invoices.service.ts) --
      // mirror that here so we don't prefill a price the backend would reject/ignore.
      if (!item) return { ...line, unitSalePrice: '' }
      return { ...line, unitSalePrice: item.packUnits === 1 ? item.salePrice : '' }
    })
  }

  function addPayment(): void {
    payments = [...payments, { paymentMethodId: '', amount: '', referenceNo: '' }]
  }

  function removePayment(index: number): void {
    payments = payments.filter((_, i) => i !== index)
  }

  async function submitCreate(): Promise<void> {
    if (creating) return
    formError = ''

    const validLines = lines.filter((line) => line.itemId !== '' && line.qty !== '')
    if (validLines.length === 0) {
      formError = 'Add at least one line with an item and a quantity.'
      return
    }
    for (const line of validLines) {
      const item = itemFor(line.itemId)
      if (item && item.packUnits > 1 && line.unitSalePrice === '') {
        formError = `Enter a unit sale price for ${item.name} -- it is packed ${item.packUnits}/pack, so the price can't be defaulted.`
        return
      }
    }

    const validPayments = payments.filter(
      (payment) => payment.paymentMethodId !== '' && payment.amount !== '' && Number(payment.amount) > 0,
    )
    if (validPayments.length === 0) {
      formError = 'Add at least one payment with an amount greater than zero.'
      return
    }

    creating = true
    try {
      const inputLines: SaleLineInput[] = validLines.map((line) => {
        const built: SaleLineInput = { itemId: line.itemId as number, qty: line.qty }
        if (line.unitSalePrice !== '') built.unitSalePrice = line.unitSalePrice
        return built
      })
      const inputPayments: SalePaymentInput[] = validPayments.map((payment) => {
        const built: SalePaymentInput = { paymentMethodId: payment.paymentMethodId as number, amount: payment.amount }
        if (payment.referenceNo.trim() !== '') built.referenceNo = payment.referenceNo.trim()
        return built
      })
      const input: CreateSaleInvoiceInput = { documentDate, lines: inputLines, payments: inputPayments }
      if (customerId !== '') input.customerId = customerId
      if (saleCategoryId !== '') input.saleCategoryId = saleCategoryId

      const result = await salesApi.createSaleInvoice(input, api.newIdempotencyKey())
      toast.success('Sale ' + result.saleInvoice.docNumber + ' completed. Change: ' + formatMoney(result.changeAmount))
      createOpen = false
      resetCreateForm()
      await refreshInvoices()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail || err.message)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not complete the sale.')
      // Keep the modal open so the cashier can fix it and resubmit.
    } finally {
      creating = false
    }
  }

  onMount(load)
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Sale invoices</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Cash-sale (POS) invoices -- browse recent sales or ring up a new one.</p>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={load} disabled={loading}>
        <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Refresh
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
        on:click={openCreateModal}
      >
        <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
        New sale
      </button>
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Sale invoices table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Doc number</th>
            <th class={`${headClass} py-3 px-4`}>Customer</th>
            <th class={`${headClass} py-3 px-4`}>Date</th>
            <th class={`${headClass} py-3 px-4`}>Status</th>
            <th class={`${headClass} py-3 px-4`}>Invoice total</th>
            <th class={`${headClass} py-3 px-4`}>Change given</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else}
            {#each saleInvoices as row (row.saleInvoiceId)}
              <tr
                class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer"
                role="button"
                tabindex="0"
                on:click={() => openDetail(row)}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(row) } }}
              >
                <td class={cellClass}><span class="font-medium text-secondary-900 dark:text-white">{row.docNumber}</span></td>
                <td class={cellClass}>{customerName(row.customerId)}</td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td class={cellClass}>{formatMoney(row.invoiceTotal)}</td>
                <td class={cellClass}>{#if Number(row.changeAmount) > 0}{formatMoney(row.changeAmount)}{/if}</td>
              </tr>
            {/each}
            {#if !saleInvoices.length}
              <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No sale invoices yet.</td></tr>
            {/if}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<Modal open={detailOpen} title={detail ? 'Sale ' + detail.saleInvoice.docNumber : 'Sale invoice'} widthClass="max-w-3xl" onClose={closeDetail}>
  {#if detailLoading}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if detailError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {detailError}
    </div>
  {:else if detail}
    <div class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div><p class="text-secondary-500">Customer</p><p class="font-medium text-secondary-900 dark:text-white">{customerName(detail.saleInvoice.customerId)}</p></div>
        <div><p class="text-secondary-500">Date</p><p class="font-medium text-secondary-900 dark:text-white">{formatDate(detail.saleInvoice.documentDate)}</p></div>
        <div><p class="text-secondary-500">Status</p><Badge tone={statusTone(detail.saleInvoice.status)}>{detail.saleInvoice.status}</Badge></div>
        <div><p class="text-secondary-500">Gross amount</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.grossAmount)}</p></div>
        <div><p class="text-secondary-500">Net amount</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.netAmount)}</p></div>
        <div><p class="text-secondary-500">Sales tax</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.salesTaxAmount)}</p></div>
        <div><p class="text-secondary-500">Invoice total</p><p class="font-semibold text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.invoiceTotal)}</p></div>
        <div><p class="text-secondary-500">Paid amount</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.paidAmount)}</p></div>
        <div><p class="text-secondary-500">Change given</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.changeAmount)}</p></div>
        <div><p class="text-secondary-500">Balance</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.balanceAmount)}</p></div>
        <div><p class="text-secondary-500">Total qty</p><p class="font-medium text-secondary-900 dark:text-white">{formatQty(detail.saleInvoice.totalQty)}</p></div>
        <div><p class="text-secondary-500">COGS</p><p class="font-medium text-secondary-900 dark:text-white">{formatMoney(detail.saleInvoice.cogsAmount)}</p></div>
      </div>

      <div>
        <h3 class="heading-5 mb-3">Line items</h3>
        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Sale invoice line items table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={`${headClass} py-2 px-3`}>Item</th>
                  <th class={`${headClass} py-2 px-3`}>Qty</th>
                  <th class={`${headClass} py-2 px-3`}>Unit price</th>
                  <th class={`${headClass} py-2 px-3`}>Line net</th>
                  <th class={`${headClass} py-2 px-3`}>Unit cost</th>
                  <th class={`${headClass} py-2 px-3`}>Margin</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#each detail.lines as line (line.saleInvoiceLineId)}
                  <tr>
                    <td class={cellClass}>Item #{line.itemId}</td>
                    <td class={cellClass}>{formatQty(line.qtyBase)}</td>
                    <td class={cellClass}>{formatMoney(line.unitSalePrice)}</td>
                    <td class={cellClass}>{formatMoney(line.lineNetAmount)}</td>
                    <td class={cellClass}>{formatMoney(line.unitCost)}</td>
                    <td class={cellClass}>{formatMoney(line.lineMarginAmount)}</td>
                  </tr>
                {/each}
                {#if !detail.lines.length}
                  <tr><td colspan="6" class="py-6 px-3 text-center text-sm text-secondary-500">No lines.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h3 class="heading-5 mb-3">Payments</h3>
        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Sale invoice payments table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={`${headClass} py-2 px-3`}>Payment method</th>
                  <th class={`${headClass} py-2 px-3`}>Amount</th>
                  <th class={`${headClass} py-2 px-3`}>Sequence</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#each detail.payments as payment (payment.saleInvoicePaymentId)}
                  <tr>
                    <td class={cellClass}>Method #{payment.paymentMethodId}</td>
                    <td class={cellClass}>{formatMoney(payment.amount)}</td>
                    <td class={cellClass}>{payment.sequenceNo}</td>
                  </tr>
                {/each}
                {#if !detail.payments.length}
                  <tr><td colspan="3" class="py-6 px-3 text-center text-sm text-secondary-500">No payments.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2 border-t border-surface-200 dark:border-surface-700">
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          on:click={openPrint}
        >
          Print
        </button>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium border border-danger-300 dark:border-danger-700 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={detail.saleInvoice.status !== 'posted'}
          on:click={openCancel}
        >
          Cancel invoice
        </button>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium bg-danger-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={detail.saleInvoice.status !== 'posted'}
          on:click={openReverse}
        >
          Reverse invoice
        </button>
      </div>
    </div>
  {/if}
</Modal>

<!-- Cancel confirm -->
<Modal open={cancelOpen} title={detail ? `Cancel ${detail.saleInvoice.docNumber}` : 'Cancel sale invoice'} widthClass="max-w-md" onClose={closeCancelModal}>
  {#if detail}
    <div class="space-y-4">
      <p class="text-sm text-secondary-700 dark:text-secondary-300">
        This voids sale invoice {detail.saleInvoice.docNumber}: the dispensed stock is put back and the GL posting is reversed. This
        cannot be undone from here.
      </p>
      <div>
        <label class={labelClass} for="cancel-invoice-reason">Reason (optional)</label>
        <textarea id="cancel-invoice-reason" bind:value={cancelReason} rows="2" class={inputClass} placeholder="Why is this invoice being cancelled?"></textarea>
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
<Modal open={reverseOpen} title={detail ? `Reverse ${detail.saleInvoice.docNumber}` : 'Reverse sale invoice'} widthClass="max-w-md" onClose={closeReverseModal}>
  {#if detail}
    <div class="space-y-4">
      <p class="text-sm text-secondary-700 dark:text-secondary-300">
        This posts an unconditional compensating entry for sale invoice {detail.saleInvoice.docNumber}: stock and GL are reversed the
        same way as a cancel. If a sale return still actively references this invoice, reverse or cancel that return first.
      </p>
      <div>
        <label class={labelClass} for="reverse-invoice-reason">Reason (optional)</label>
        <textarea id="reverse-invoice-reason" bind:value={reverseReason} rows="2" class={inputClass} placeholder="Why is this invoice being reversed?"></textarea>
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

<!-- Print / reprint receipt -->
<Modal open={printOpen} title={detail ? `Receipt -- ${detail.saleInvoice.docNumber}` : 'Receipt'} widthClass="max-w-lg" onClose={closePrintModal}>
  {#if printLoading}
    <p class="text-sm text-secondary-500">Loading receipt…</p>
  {:else if printError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {printError}
    </div>
  {:else if printResult}
    <div class="space-y-4">
      <div id="sale-invoice-receipt" class="card rounded-xl p-6 font-mono text-sm">
        <div class="text-center mb-4 pb-4 border-b border-dashed border-secondary-300 dark:border-secondary-700">
          {#if printResult.header.tenantName}<p class="font-semibold text-base">{printResult.header.tenantName}</p>{/if}
          {#if printResult.header.branchName}<p class="text-xs text-secondary-500">{printResult.header.branchName}</p>{/if}
          <p class="mt-2 font-semibold">{printResult.header.docNumber}</p>
          <p class="text-xs text-secondary-500">
            {formatDate(printResult.header.documentDate)} -- {printResult.header.customer.name ?? 'Walk-in customer'}
          </p>
          <p class="text-xs text-secondary-400 uppercase">{printResult.header.status}</p>
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
            {#each printResult.lines as line (line.lineNo)}
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
          <div class="flex justify-between"><span>Gross</span><span>{formatMoney(printResult.grossAmount)}</span></div>
          {#if Number(printResult.lineDiscountAmount) > 0}<div class="flex justify-between"><span>Line discount</span><span>-{formatMoney(printResult.lineDiscountAmount)}</span></div>{/if}
          {#if Number(printResult.invoiceDiscountAmount) > 0}<div class="flex justify-between"><span>Invoice discount</span><span>-{formatMoney(printResult.invoiceDiscountAmount)}</span></div>{/if}
          {#if Number(printResult.taxBreakdown.salesTaxAmount) > 0}<div class="flex justify-between"><span>Sales tax</span><span>{formatMoney(printResult.taxBreakdown.salesTaxAmount)}</span></div>{/if}
          {#if Number(printResult.roundingAmount) !== 0}<div class="flex justify-between"><span>Rounding</span><span>{formatMoney(printResult.roundingAmount)}</span></div>{/if}
          <div class="flex justify-between text-sm font-bold pt-1 border-t border-secondary-300 dark:border-secondary-700"><span>Total</span><span>{formatMoney(printResult.invoiceTotal)}</span></div>
        </div>

        <div class="mt-4 pt-4 border-t border-dashed border-secondary-300 dark:border-secondary-700 space-y-1 text-xs">
          {#each printResult.payments as payment (payment.sequenceNo)}
            <div class="flex justify-between">
              <span>{payment.methodName}{#if payment.referenceNo} (#{payment.referenceNo}){/if}</span>
              <span>{formatMoney(payment.amount)}</span>
            </div>
          {/each}
          {#if Number(printResult.changeAmount) > 0}
            <div class="flex justify-between font-semibold"><span>Change</span><span>{formatMoney(printResult.changeAmount)}</span></div>
          {/if}
        </div>

        <p class="text-center text-xs text-secondary-400 mt-6">Thank you</p>
      </div>
    </div>
  {/if}
  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closePrintModal}
    >
      Close
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-50"
      on:click={windowPrint}
      disabled={!printResult}
    >
      Print
    </button>
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      on:click={performReprint}
      disabled={!printResult || reprintSubmitting}
    >
      {reprintSubmitting ? 'Reprinting…' : 'Reprint (audited)'}
    </button>
  </svelte:fragment>
</Modal>

<Modal open={createOpen} title="New sale" widthClass="max-w-4xl" onClose={closeCreateModal}>
  <form on:submit|preventDefault={submitCreate} class="space-y-6">
    {#if createRefLoading}
      <p class="text-sm text-secondary-500">Loading catalog, categories, and payment methods…</p>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="sale-customer">Customer</label>
        <select id="sale-customer" class={inputClass} bind:value={customerId}>
          <option value="">Walk-in customer (default)</option>
          {#each customers as customer (customer.customerId)}
            <option value={customer.customerId}>{customer.name}{customer.isWalkIn ? ' (Walk-in)' : ''}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class={labelClass} for="sale-category">Sale category</label>
        <select id="sale-category" class={inputClass} bind:value={saleCategoryId} disabled={createRefLoading}>
          <option value="">Use default</option>
          {#each saleCategories as category (category.saleCategoryId)}
            <option value={category.saleCategoryId}>{category.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class={labelClass} for="sale-date">Document date</label>
        <input id="sale-date" type="date" class={inputClass} bind:value={documentDate} />
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="heading-5">Line items</h3>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg text-sm"
          on:click={addLine}
          disabled={createRefLoading}
        >
          <Icon icon={Icons.plus} width={16} height={16} />
          Add line
        </button>
      </div>
      <div class="space-y-4">
        {#each lines as line, index (index)}
          {@const selectedItem = itemFor(line.itemId)}
          <div class="p-4 rounded-xl border border-surface-200 dark:border-surface-700 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-start">
            <div>
              <label class={labelClass} for={`line-item-${index}`}>Item</label>
              <select id={`line-item-${index}`} class={inputClass} bind:value={line.itemId} on:change={() => handleItemChange(index)} disabled={createRefLoading}>
                <option value="">Select an item…</option>
                {#each items as item (item.itemId)}
                  <option value={item.itemId}>{item.name} ({item.customCode})</option>
                {/each}
              </select>
            </div>
            <DecimalInput id={`line-qty-${index}`} label="Qty (loose units)" scale={4} required bind:value={line.qty} />
            <DecimalInput
              id={`line-price-${index}`}
              label="Unit sale price"
              scale={4}
              prefix="Rs"
              bind:value={line.unitSalePrice}
              required={selectedItem ? selectedItem.packUnits > 1 : false}
              error={selectedItem && selectedItem.packUnits > 1 ? `Required: this item is packed ${selectedItem.packUnits}/pack, enter the per-unit price` : ''}
            />
            <div class="flex md:justify-end pt-7">
              <button
                type="button"
                class="p-2.5 text-danger-500 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Remove line"
                on:click={() => removeLine(index)}
                disabled={lines.length <= 1}
              >
                <Icon icon={Icons.trash} width={18} height={18} />
              </button>
            </div>
          </div>
        {/each}
      </div>
      <p class="mt-3 text-xs text-secondary-500">
        Estimated total (server computes the authoritative total): {formatMoney(estimatedTotal.toFixed(2))}
      </p>
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="heading-5">Payments</h3>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg text-sm"
          on:click={addPayment}
          disabled={createRefLoading}
        >
          <Icon icon={Icons.plus} width={16} height={16} />
          Add payment
        </button>
      </div>
      <div class="space-y-4">
        {#each payments as payment, index (index)}
          {@const selectedMethod = methodFor(payment.paymentMethodId)}
          <div class="p-4 rounded-xl border border-surface-200 dark:border-surface-700 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-start">
            <div>
              <label class={labelClass} for={`payment-method-${index}`}>Payment method</label>
              <select id={`payment-method-${index}`} class={inputClass} bind:value={payment.paymentMethodId} disabled={createRefLoading}>
                <option value="">Select a method…</option>
                {#each paymentMethods as method (method.paymentMethodId)}
                  <option value={method.paymentMethodId}>{method.name}</option>
                {/each}
              </select>
            </div>
            <DecimalInput id={`payment-amount-${index}`} label="Amount" scale={2} prefix="Rs" required bind:value={payment.amount} />
            <div>
              <label class={labelClass} for={`payment-ref-${index}`}>
                Reference no{#if selectedMethod && selectedMethod.requiresReference}<span class="text-danger-500"> *</span>{:else} (optional){/if}
              </label>
              <input
                id={`payment-ref-${index}`}
                class={inputClass}
                bind:value={payment.referenceNo}
                required={selectedMethod ? selectedMethod.requiresReference : false}
              />
            </div>
            <div class="flex md:justify-end pt-7">
              <button
                type="button"
                class="p-2.5 text-danger-500 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Remove payment"
                on:click={() => removePayment(index)}
                disabled={payments.length <= 1}
              >
                <Icon icon={Icons.trash} width={18} height={18} />
              </button>
            </div>
          </div>
        {/each}
      </div>
      {#if estimatedPaidTotal < estimatedTotal}
        <p class="mt-3 text-xs text-warning-600 dark:text-warning-400">
          Payments ({formatMoney(estimatedPaidTotal.toFixed(2))}) are less than the estimated total ({formatMoney(estimatedTotal.toFixed(2))}). The
          server is authoritative and may reject a shortfall.
        </p>
      {/if}
    </div>

    {#if formError}
      <p class="text-sm text-danger-500">{formError}</p>
    {/if}
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeCreateModal}
    >
      Cancel
    </button>
    <button
      type="button"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      on:click={submitCreate}
      disabled={creating}
    >
      {creating ? 'Completing…' : 'Complete sale'}
    </button>
  </svelte:fragment>
</Modal>

<style>
  /* Isolates #sale-invoice-receipt for window.print() -- same technique POSCheckoutPage.svelte's
     own #pos-receipt print stylesheet uses, scoped to a different id so the two never collide. */
  @media print {
    :global(body *) {
      visibility: hidden;
    }
    :global(#sale-invoice-receipt),
    :global(#sale-invoice-receipt *) {
      visibility: visible;
    }
    :global(#sale-invoice-receipt) {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }
</style>
