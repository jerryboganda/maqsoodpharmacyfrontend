<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): amount/allocatedAmount/unallocatedAmount
  // and every candidate's totalAmount/outstandingAmount are decimal STRINGS end to end. The only
  // Number()/parseFloat() calls below are the display-only "remaining to allocate" running total
  // in the create form (never sent to the API) and pure UI tone/eligibility checks -- everything
  // actually posted is the raw string a DecimalInput produced or the server's own data, untouched.
  //
  // Structurally mirrors PurchaseReturnsPage.svelte (list table + detail modal + create modal,
  // Toast/Modal/DecimalInput/ApiError conventions) -- a payment's optional allocation step is the
  // closest analogue to that page's "pick invoice lines to return" step: fetch open documents for
  // the chosen party, let the user tick which ones to apply the payment against, per-row
  // DecimalInput for the applied amount, running remaining-to-allocate display.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { paymentsApi, purchasingApi, salesApi, api, ApiError, ApiNetworkError, formatMoney, formatDate, todayYmd } from '../../api'
  import type {
    PaymentRow,
    GetPaymentResult,
    PaymentAllocationRow,
    PaymentAllocationCandidate,
    PaymentMethodRow,
    PaymentDirection,
    PaymentPartyKind,
    PaymentStatus,
    CreatePaymentInput,
    PaymentAllocationInput,
    SupplierRow,
    CustomerRow,
  } from '../../api'
  import type { PaymentCashBankAccountRow } from '../../api/payments'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  function statusTone(status: string): 'neutral' | 'success' | 'danger' | 'info' | 'warning' {
    if (status === 'draft') return 'neutral'
    if (status === 'confirmed') return 'info'
    if (status === 'posted') return 'success'
    if (status === 'cancelled') return 'danger'
    if (status === 'reversed') return 'warning'
    return 'neutral'
  }

  function targetKindLabel(kind: string): string {
    if (kind === 'PURCHASE') return 'Purchase invoice'
    if (kind === 'PURCHASE_RETURN') return 'Purchase return'
    if (kind === 'SALE') return 'Sale invoice'
    if (kind === 'SALE_RETURN') return 'Sale return'
    return kind
  }

  /** `PAYMENT.*` codes this page gives a friendlier message for than the raw `detail` string --
   *  everything else falls back to `error.detail`, same as the rest of this client. */
  function friendlyError(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
      if (err.code === 'PAYMENT.UNSUPPORTED_DIRECTION_PARTY') {
        return 'This direction/party combination is not supported yet -- only paying a supplier (out) or receiving from a customer (in) is available so far.'
      }
      if (err.code === 'PAYMENT.HAS_ACTIVE_ALLOCATIONS') {
        return 'This payment still has active allocations. Reverse its allocations first, then cancel.'
      }
      return err.detail || fallback
    }
    if (err instanceof ApiNetworkError) return err.message
    return fallback
  }

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let payments: PaymentRow[] = []
  let suppliers: SupplierRow[] = []
  let customers: CustomerRow[] = []
  let paymentMethods: PaymentMethodRow[] = []
  let cashBankAccounts: PaymentCashBankAccountRow[] = []
  $: supplierMap = new Map(suppliers.map((s) => [s.supplierId, s.name]))
  $: customerMap = new Map(customers.map((c) => [c.customerId, c.name]))
  $: paymentMethodMap = new Map(paymentMethods.map((m) => [m.paymentMethodId, m]))
  $: cashBankAccountMap = new Map(
    cashBankAccounts.map((a) => [a.cashBankAccountId, a.bankName ? `${a.bankName} (${a.accountKind})` : `#${a.cashBankAccountId} (${a.accountKind})`]),
  )

  function partyLabel(row: PaymentRow): string {
    if (row.partyKind === 'supplier') return row.supplierId ? (supplierMap.get(row.supplierId) ?? `Supplier #${row.supplierId}`) : '—'
    if (row.partyKind === 'customer') return row.customerId ? (customerMap.get(row.customerId) ?? `Customer #${row.customerId}`) : '—'
    return row.otherPartyName || '—'
  }

  // ---- filters ------------------------------------------------------------------------------
  let directionFilter: 'all' | PaymentDirection = 'all'
  let statusFilter: 'all' | PaymentStatus = 'all'
  let dateFrom = ''
  let dateTo = ''
  let partyKindFilter: 'all' | 'supplier' | 'customer' = 'all'
  let partyIdFilter: number | '' = ''

  function resetPartyIdFilter(): void {
    partyIdFilter = ''
  }

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const params: {
        direction?: PaymentDirection
        status?: PaymentStatus
        dateFrom?: string
        dateTo?: string
        supplierId?: number
        customerId?: number
        limit?: number
      } = { limit: 100 }
      if (directionFilter !== 'all') params.direction = directionFilter
      if (statusFilter !== 'all') params.status = statusFilter
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (partyKindFilter === 'supplier' && partyIdFilter !== '') params.supplierId = partyIdFilter
      if (partyKindFilter === 'customer' && partyIdFilter !== '') params.customerId = partyIdFilter

      const [result, supplierResult, customerResult, methodResult, cashBankResult] = await Promise.all([
        paymentsApi.listPayments(params),
        purchasingApi.listSuppliers({ limit: 200 }),
        salesApi.listCustomers({ limit: 200 }),
        paymentsApi.listPaymentMethods(),
        paymentsApi.listCashBankAccounts(),
      ])
      payments = result.payments
      suppliers = supplierResult.suppliers
      customers = customerResult.customers
      paymentMethods = methodResult.paymentMethods
      cashBankAccounts = cashBankResult.cashBankAccounts
    } catch (err) {
      loadError = friendlyError(err, 'Could not load payments.')
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  // ---- detail modal ------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detailResult: GetPaymentResult | null = null
  let cancelReason = ''
  let cancelling = false
  let reversingId: number | null = null

  $: activeAllocations = detailResult ? detailResult.allocations.filter((a) => !a.reversedAt) : []
  $: canCancel = !!detailResult && detailResult.payment.status === 'posted' && activeAllocations.length === 0

  async function openDetail(row: PaymentRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detailResult = null
    cancelReason = ''
    try {
      detailResult = await paymentsApi.getPayment(row.paymentId)
    } catch (err) {
      detailError = friendlyError(err, 'Could not load this payment.')
    } finally {
      detailLoading = false
    }
  }

  function closeDetail(): void {
    detailOpen = false
    detailResult = null
    detailError = ''
  }

  async function refreshDetail(): Promise<void> {
    if (!detailResult) return
    try {
      detailResult = await paymentsApi.getPayment(detailResult.payment.paymentId)
    } catch (err) {
      detailError = friendlyError(err, 'Could not refresh this payment.')
    }
  }

  async function reverseAllocation(allocation: PaymentAllocationRow): Promise<void> {
    if (!detailResult) return
    reversingId = allocation.paymentAllocationId
    try {
      await paymentsApi.reverseAllocation(detailResult.payment.paymentId, allocation.paymentAllocationId)
      toast.success('Allocation reversed.')
      await refreshDetail()
      await loadList()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not reverse this allocation.'))
    } finally {
      reversingId = null
    }
  }

  async function cancelPayment(): Promise<void> {
    if (!detailResult) return
    cancelling = true
    try {
      await paymentsApi.cancelPayment(detailResult.payment.paymentId, cancelReason.trim() ? { reason: cancelReason.trim() } : {})
      toast.success(`Payment ${detailResult.payment.docNumber} cancelled.`)
      await refreshDetail()
      await loadList()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not cancel this payment.'))
    } finally {
      cancelling = false
    }
  }

  // ---- create modal ------------------------------------------------------------------------
  let createOpen = false
  let createLoading = false
  let createError = ''
  let formErrors: Record<string, string> = {}
  let idempotencyKey = ''

  let direction: PaymentDirection = 'out'
  let partyKind: PaymentPartyKind = 'supplier'
  $: partyKind = direction === 'out' ? 'supplier' : 'customer'
  let partyId: number | '' = ''
  let paymentMethodId: number | '' = ''
  let cashBankAccountId: number | '' = ''
  let amount = ''
  let referenceNo = ''
  let chequeNo = ''
  let chequeDate = ''
  let documentDate = todayYmd()
  let notes = ''

  $: selectedMethod = paymentMethodId === '' ? null : (paymentMethodMap.get(paymentMethodId) ?? null)
  $: methodOptions = paymentMethods.filter((m) => m.isEnabled && (m.directionAllowed === 'both' || m.directionAllowed === direction))
  $: cashBankAccountOptions = cashBankAccounts.filter((a) => a.isActive && (!selectedMethod?.requiresBankAccount || a.accountKind !== 'cash_drawer'))

  type AllocationRowForm = PaymentAllocationCandidate & { include: boolean; allocatedAmount: string }
  let candidates: AllocationRowForm[] = []
  let candidatesLoading = false
  let candidatesError = ''

  $: selectedAllocations = candidates.filter((c) => c.include)
  $: allocatedSoFar = selectedAllocations.reduce((sum, c) => sum + (Number(c.allocatedAmount) || 0), 0)
  $: remainingToAllocate = (Number(amount) || 0) - allocatedSoFar

  function resetCreateForm(): void {
    direction = 'out'
    partyId = ''
    paymentMethodId = ''
    cashBankAccountId = ''
    amount = ''
    referenceNo = ''
    chequeNo = ''
    chequeDate = ''
    documentDate = todayYmd()
    notes = ''
    candidates = []
    candidatesError = ''
    formErrors = {}
    createError = ''
  }

  function openCreate(): void {
    resetCreateForm()
    idempotencyKey = api.newIdempotencyKey()
    createOpen = true
  }

  function closeCreate(): void {
    if (createLoading) return
    createOpen = false
  }

  function changeDirection(next: PaymentDirection): void {
    if (direction === next) return
    direction = next
    partyId = ''
    paymentMethodId = ''
    candidates = []
    candidatesError = ''
  }

  async function loadCandidates(): Promise<void> {
    candidates = []
    candidatesError = ''
    if (partyId === '') return
    candidatesLoading = true
    try {
      const result =
        partyKind === 'supplier' ? await paymentsApi.getAllocationCandidates({ supplierId: partyId }) : await paymentsApi.getAllocationCandidates({ customerId: partyId })
      candidates = result.candidates.map((c) => ({ ...c, include: false, allocatedAmount: c.outstandingAmount }))
    } catch (err) {
      candidatesError = friendlyError(err, 'Could not load this party’s open documents.')
    } finally {
      candidatesLoading = false
    }
  }

  function handlePartyChange(value: string): void {
    partyId = value ? Number(value) : ''
    void loadCandidates()
  }

  function handleMethodChange(value: string): void {
    paymentMethodId = value ? Number(value) : ''
    const method = paymentMethodId === '' ? null : paymentMethodMap.get(paymentMethodId)
    if (method?.defaultCashBankAccountId && cashBankAccountId === '') {
      cashBankAccountId = method.defaultCashBankAccountId
    }
    if (!method?.requiresReference) referenceNo = ''
    if (!method?.requiresChequeDetails) {
      chequeNo = ''
      chequeDate = ''
    }
  }

  function toggleCandidate(index: number, include: boolean): void {
    candidates = candidates.map((c, i) => {
      if (i !== index) return c
      if (include && (!c.allocatedAmount || c.allocatedAmount === '0')) {
        // Prefill with whichever is smaller: this document's own outstanding balance, or
        // whatever of the payment amount is still unallocated -- display-only arithmetic
        // (Number()), the actual value stored is still the plain decimal string typed/prefilled.
        const remaining = Math.max((Number(amount) || 0) - allocatedSoFar, 0)
        const outstanding = Number(c.outstandingAmount) || 0
        const prefill = remaining > 0 ? Math.min(remaining, outstanding) : outstanding
        return { ...c, include, allocatedAmount: prefill.toFixed(2) }
      }
      return { ...c, include }
    })
  }

  function isZeroOrEmpty(value: string): boolean {
    const trimmed = value.trim()
    if (trimmed === '') return true
    return /^0+(\.0+)?$/.test(trimmed)
  }

  function validateCreate(): boolean {
    const next: Record<string, string> = {}
    if (partyId === '') next.partyId = partyKind === 'supplier' ? 'Select a supplier.' : 'Select a customer.'
    if (paymentMethodId === '') next.paymentMethodId = 'Select a payment method.'
    if (cashBankAccountId === '') next.cashBankAccountId = 'Select a cash/bank account.'
    if (isZeroOrEmpty(amount)) next.amount = 'Enter an amount greater than zero.'
    if (!documentDate) next.documentDate = 'Document date is required.'
    if (selectedMethod?.requiresReference && !referenceNo.trim()) next.referenceNo = 'This payment method requires a reference number.'
    if (selectedMethod?.requiresChequeDetails) {
      if (!chequeNo.trim()) next.chequeNo = 'This payment method requires a cheque number.'
      if (!chequeDate) next.chequeDate = 'This payment method requires a cheque date.'
    }
    for (const c of selectedAllocations) {
      if (isZeroOrEmpty(c.allocatedAmount)) {
        next.allocations = `Enter an allocated amount for ${c.docNumber}.`
        break
      }
      if ((Number(c.allocatedAmount) || 0) > (Number(c.outstandingAmount) || 0) + 0.0001) {
        next.allocations = `Allocated amount for ${c.docNumber} cannot exceed its outstanding balance (${formatMoney(c.outstandingAmount)}).`
        break
      }
    }
    if (!next.allocations && amount && allocatedSoFar > (Number(amount) || 0) + 0.0001) {
      next.allocations = 'Allocated amounts add up to more than the payment amount.'
    }
    formErrors = next
    return Object.keys(next).length === 0
  }

  function buildAllocationInput(c: AllocationRowForm): PaymentAllocationInput {
    return {
      targetDocumentTypeId: c.targetDocumentTypeId,
      targetDocumentId: c.targetDocumentId,
      allocatedAmount: c.allocatedAmount.trim(),
    }
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validateCreate()) return
    createLoading = true
    try {
      const allocations = selectedAllocations.map(buildAllocationInput)
      const input: CreatePaymentInput = {
        direction,
        partyKind,
        paymentMethodId: paymentMethodId as number,
        cashBankAccountId: cashBankAccountId as number,
        amount: amount.trim(),
        documentDate,
        allocationMode: allocations.length > 0 ? 'specific' : 'on_account',
      }
      if (partyKind === 'supplier') input.supplierId = partyId as number
      else input.customerId = partyId as number
      if (referenceNo.trim()) input.referenceNo = referenceNo.trim()
      if (chequeNo.trim()) input.chequeNo = chequeNo.trim()
      if (chequeDate) input.chequeDate = chequeDate
      if (notes.trim()) input.notes = notes.trim()
      if (allocations.length > 0) input.allocations = allocations

      const result = await paymentsApi.createPayment(input, idempotencyKey)
      toast.success(`Payment ${result.payment.docNumber} posted.`)
      closeCreate()
      await loadList()
    } catch (err) {
      createError = friendlyError(err, 'Could not create the payment.')
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Payments</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Record payments to suppliers and receipts from customers, and allocate them against open documents.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
      New payment
    </button>
  </div>

  <!-- Filters -->
  <div class="card rounded-xl p-5">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label class={labelClass} for="pf-direction">Direction</label>
        <select id="pf-direction" bind:value={directionFilter} class={inputClass} on:change={loadList}>
          <option value="all">All</option>
          <option value="out">Paid out (to supplier)</option>
          <option value="in">Received (from customer)</option>
        </select>
      </div>
      <div>
        <label class={labelClass} for="pf-status">Status</label>
        <select id="pf-status" bind:value={statusFilter} class={inputClass} on:change={loadList}>
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="posted">Posted</option>
          <option value="cancelled">Cancelled</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>
      <div>
        <label class={labelClass} for="pf-date-from">Date from</label>
        <input id="pf-date-from" type="date" bind:value={dateFrom} class={inputClass} on:change={loadList} />
      </div>
      <div>
        <label class={labelClass} for="pf-date-to">Date to</label>
        <input id="pf-date-to" type="date" bind:value={dateTo} class={inputClass} on:change={loadList} />
      </div>
      <div>
        <label class={labelClass} for="pf-party-kind">Party</label>
        <select
          id="pf-party-kind"
          bind:value={partyKindFilter}
          class={inputClass}
          on:change={() => {
            resetPartyIdFilter()
            loadList()
          }}
        >
          <option value="all">All parties</option>
          <option value="supplier">Supplier</option>
          <option value="customer">Customer</option>
        </select>
      </div>
      {#if partyKindFilter !== 'all'}
        <div class="sm:col-span-2">
          <label class={labelClass} for="pf-party-id">{partyKindFilter === 'supplier' ? 'Supplier' : 'Customer'}</label>
          <select id="pf-party-id" bind:value={partyIdFilter} class={inputClass} on:change={loadList}>
            <option value="">Any {partyKindFilter}</option>
            {#if partyKindFilter === 'supplier'}
              {#each suppliers as s (s.supplierId)}<option value={s.supplierId}>{s.name}</option>{/each}
            {:else}
              {#each customers as c (c.customerId)}<option value={c.customerId}>{c.name}</option>{/each}
            {/if}
          </select>
        </div>
      {/if}
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Payments table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Doc number</th>
            <th class={headClass}>Date</th>
            <th class={headClass}>Direction</th>
            <th class={headClass}>Party</th>
            <th class={headClass}>Amount</th>
            <th class={headClass}>Unallocated</th>
            <th class={headClass}>Status</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if payments.length === 0}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">No payments match these filters.</td></tr>
          {:else}
            {#each payments as row (row.paymentId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer" on:click={() => openDetail(row)}>
                <td class={cellClass}>{row.docNumber}</td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}>
                  {#if row.direction === 'out'}
                    <span class="inline-flex items-center gap-1 text-danger-600 dark:text-danger-400">
                      <Icon icon={Icons.arrowUpRight} className="w-3.5 h-3.5" />Paid out
                    </span>
                  {:else}
                    <span class="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                      <Icon icon={Icons.arrowDownRight} className="w-3.5 h-3.5" />Received
                    </span>
                  {/if}
                </td>
                <td class={cellClass}>{partyLabel(row)}</td>
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(row.amount)}</td>
                <td class={cellClass}>{formatMoney(row.unallocatedAmount)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
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

<!-- Detail -->
<Modal open={detailOpen} title={detailResult ? `Payment ${detailResult.payment.docNumber}` : 'Payment'} widthClass="max-w-3xl" onClose={closeDetail}>
  {#if detailLoading}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if detailError}
    <div class="rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {detailError}
    </div>
  {:else if detailResult}
    {@const p = detailResult.payment}
    <div class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-secondary-500">Direction</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{p.direction === 'out' ? 'Paid out' : 'Received'}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Party</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{partyLabel(p)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(p.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(p.status)}>{p.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Payment method</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{paymentMethodMap.get(p.paymentMethodId)?.name ?? `#${p.paymentMethodId}`}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Cash/bank account</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{cashBankAccountMap.get(p.cashBankAccountId) ?? `#${p.cashBankAccountId}`}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Amount</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(p.amount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Allocated</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(p.allocatedAmount)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Unallocated</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatMoney(p.unallocatedAmount)}</p>
        </div>
        {#if p.referenceNo}
          <div>
            <p class="text-xs text-secondary-500">Reference</p>
            <p class="text-sm font-medium text-secondary-900 dark:text-white">{p.referenceNo}</p>
          </div>
        {/if}
        {#if p.chequeNo}
          <div>
            <p class="text-xs text-secondary-500">Cheque no.</p>
            <p class="text-sm font-medium text-secondary-900 dark:text-white">{p.chequeNo}{p.chequeDate ? ` · ${formatDate(p.chequeDate)}` : ''}</p>
          </div>
        {/if}
      </div>

      {#if p.notes}
        <div>
          <p class="text-xs text-secondary-500">Notes</p>
          <p class="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap">{p.notes}</p>
        </div>
      {/if}

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">GL effect</h3>
        <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-2">
          {#if p.direction === 'out'}
            <div class="flex items-center justify-between text-sm">
              <span class="text-secondary-600 dark:text-secondary-300">Dr &nbsp;Supplier payable (accounts payable)</span>
              <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(p.amount)}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-secondary-600 dark:text-secondary-300">Cr &nbsp;Cash / bank</span>
              <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(p.amount)}</span>
            </div>
          {:else}
            <div class="flex items-center justify-between text-sm">
              <span class="text-secondary-600 dark:text-secondary-300">Dr &nbsp;Cash / bank</span>
              <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(p.amount)}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-secondary-600 dark:text-secondary-300">Cr &nbsp;Customer receivable (accounts receivable)</span>
              <span class="font-medium text-secondary-900 dark:text-white">{formatMoney(p.amount)}</span>
            </div>
          {/if}
          <p class="text-xs text-secondary-400 pt-1">
            {#if p.journalEntryId}Journal entry #{p.journalEntryId}.{/if}
          </p>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Allocations</h3>
        </div>
        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Payment allocations table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Target document</th>
                  <th class={headClass}>Allocated amount</th>
                  <th class={headClass}>Allocated on</th>
                  <th class={headClass}>Status</th>
                  <th class={`${headClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#each detailResult.allocations as a (a.paymentAllocationId)}
                  <tr>
                    <td class={cellClass}>Document type #{a.targetDocumentTypeId} · #{a.targetDocumentId}</td>
                    <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(a.allocatedAmount)}</td>
                    <td class={cellClass}>{formatDate(a.allocatedAt)}</td>
                    <td class={cellClass}>
                      {#if a.reversedAt}<Badge tone="neutral">Reversed</Badge>{:else}<Badge tone="success">Active</Badge>{/if}
                    </td>
                    <td class={`${cellClass} text-right`}>
                      {#if !a.reversedAt}
                        <button
                          type="button"
                          class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-50"
                          disabled={reversingId === a.paymentAllocationId}
                          on:click={() => reverseAllocation(a)}
                        >
                          {reversingId === a.paymentAllocationId ? 'Reversing…' : 'Reverse allocation'}
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
                {#if !detailResult.allocations.length}
                  <tr><td colspan="5" class="py-6 px-4 text-center text-sm text-secondary-500">No allocations -- this payment is fully on account.</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
        <p class="text-xs text-secondary-400 mt-2">
          Target documents are shown by document type + id -- allocations don't carry back the source invoice/return's own doc number.
        </p>
      </div>

      {#if p.status === 'posted'}
        <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
          <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Cancel payment</h3>
          {#if !canCancel}
            <p class="text-xs text-warning-600 dark:text-warning-400" title="Reverse every active allocation before this payment can be cancelled.">
              This payment has {activeAllocations.length} active allocation{activeAllocations.length === 1 ? '' : 's'}. Reverse
              {activeAllocations.length === 1 ? 'it' : 'them'} first before cancelling.
            </p>
          {/if}
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label class={labelClass} for="cancel-reason">Reason (optional)</label>
              <input id="cancel-reason" bind:value={cancelReason} class={inputClass} placeholder="Optional audit note" disabled={!canCancel} />
            </div>
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-sm font-medium bg-danger-50 dark:bg-danger-950 text-danger-600 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!canCancel || cancelling}
              title={canCancel ? '' : 'Reverse its allocations first'}
              on:click={cancelPayment}
            >
              {cancelling ? 'Cancelling…' : 'Cancel payment'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeDetail}
    >
      Close
    </button>
  </svelte:fragment>
</Modal>

<!-- Create -->
<Modal open={createOpen} title="New payment" widthClass="max-w-4xl" onClose={closeCreate}>
  {#if createError}
    <div class="mb-4 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {createError}
    </div>
  {/if}

  <div class="space-y-6">
    <div>
      <span class={labelClass}>Direction</span>
      <div class="inline-flex p-1 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <button
          type="button"
          class={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${direction === 'out' ? 'bg-white dark:bg-surface-700 text-danger-600 dark:text-danger-400 shadow-sm' : 'text-secondary-500 hover:text-secondary-900 dark:hover:text-white'}`}
          on:click={() => changeDirection('out')}
        >
          Pay a supplier (out)
        </button>
        <button
          type="button"
          class={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${direction === 'in' ? 'bg-white dark:bg-surface-700 text-success-600 dark:text-success-400 shadow-sm' : 'text-secondary-500 hover:text-secondary-900 dark:hover:text-white'}`}
          on:click={() => changeDirection('in')}
        >
          Receive from a customer (in)
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class={labelClass} for="np-party">{partyKind === 'supplier' ? 'Supplier' : 'Customer'}<span class="text-danger-500"> *</span></label>
        <select id="np-party" value={partyId} on:change={(e) => handlePartyChange((e.currentTarget as HTMLSelectElement).value)} class={inputClass}>
          <option value="">Select {partyKind}…</option>
          {#if partyKind === 'supplier'}
            {#each suppliers.filter((s) => s.isActive) as s (s.supplierId)}<option value={s.supplierId}>{s.name} ({s.code})</option>{/each}
          {:else}
            {#each customers.filter((c) => c.isActive) as c (c.customerId)}<option value={c.customerId}>{c.name} ({c.code})</option>{/each}
          {/if}
        </select>
        {#if formErrors.partyId}<p class="text-xs text-danger-500 mt-1">{formErrors.partyId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="np-method">Payment method<span class="text-danger-500"> *</span></label>
        <select id="np-method" value={paymentMethodId} on:change={(e) => handleMethodChange((e.currentTarget as HTMLSelectElement).value)} class={inputClass}>
          <option value="">Select method…</option>
          {#each methodOptions as m (m.paymentMethodId)}<option value={m.paymentMethodId}>{m.name}</option>{/each}
        </select>
        {#if formErrors.paymentMethodId}<p class="text-xs text-danger-500 mt-1">{formErrors.paymentMethodId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="np-account">Cash/bank account<span class="text-danger-500"> *</span></label>
        <select id="np-account" bind:value={cashBankAccountId} class={inputClass}>
          <option value="">Select account…</option>
          {#each cashBankAccountOptions as a (a.cashBankAccountId)}<option value={a.cashBankAccountId}>{cashBankAccountMap.get(a.cashBankAccountId)}</option>{/each}
        </select>
        {#if formErrors.cashBankAccountId}<p class="text-xs text-danger-500 mt-1">{formErrors.cashBankAccountId}</p>{/if}
      </div>

      <DecimalInput bind:value={amount} label="Amount" id="np-amount" scale={2} prefix="Rs" required error={formErrors.amount} />

      <div>
        <label class={labelClass} for="np-document-date">Document date<span class="text-danger-500"> *</span></label>
        <input id="np-document-date" type="date" bind:value={documentDate} class={inputClass} />
        {#if formErrors.documentDate}<p class="text-xs text-danger-500 mt-1">{formErrors.documentDate}</p>{/if}
      </div>

      {#if selectedMethod?.requiresReference}
        <div>
          <label class={labelClass} for="np-reference">Reference no.<span class="text-danger-500"> *</span></label>
          <input id="np-reference" bind:value={referenceNo} class={inputClass} placeholder="Transaction / slip reference" />
          {#if formErrors.referenceNo}<p class="text-xs text-danger-500 mt-1">{formErrors.referenceNo}</p>{/if}
        </div>
      {/if}
      {#if selectedMethod?.requiresChequeDetails}
        <div>
          <label class={labelClass} for="np-cheque-no">Cheque no.<span class="text-danger-500"> *</span></label>
          <input id="np-cheque-no" bind:value={chequeNo} class={inputClass} />
          {#if formErrors.chequeNo}<p class="text-xs text-danger-500 mt-1">{formErrors.chequeNo}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="np-cheque-date">Cheque date<span class="text-danger-500"> *</span></label>
          <input id="np-cheque-date" type="date" bind:value={chequeDate} class={inputClass} />
          {#if formErrors.chequeDate}<p class="text-xs text-danger-500 mt-1">{formErrors.chequeDate}</p>{/if}
        </div>
      {/if}
    </div>

    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Allocate against open documents (optional)</h3>
        {#if amount}
          <span class="text-xs font-medium {remainingToAllocate < -0.001 ? 'text-danger-500' : 'text-secondary-500'}">
            Remaining to allocate: {formatMoney(remainingToAllocate.toFixed(2))}
          </span>
        {/if}
      </div>

      {#if formErrors.allocations}<p class="text-xs text-danger-500 mb-3">{formErrors.allocations}</p>{/if}
      {#if candidatesError}<p class="text-xs text-danger-500 mb-3">{candidatesError}</p>{/if}

      {#if candidatesLoading}
        <p class="text-sm text-secondary-500">Loading open documents…</p>
      {:else if partyId === ''}
        <p class="text-sm text-secondary-500">Select a {partyKind} to list its open documents.</p>
      {:else if candidates.length === 0}
        <p class="text-sm text-secondary-500">No open documents with an outstanding balance for this {partyKind}. This payment will be recorded on account.</p>
      {:else}
        <div class="space-y-3">
          {#each candidates as c, index (`${c.targetDocumentTypeId}-${c.targetDocumentId}`)}
            <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" class="mt-1" checked={c.include} on:change={(e) => toggleCandidate(index, (e.currentTarget as HTMLInputElement).checked)} />
                <div class="flex-1">
                  <p class="text-sm font-medium text-secondary-900 dark:text-white">{targetKindLabel(c.targetDocumentKind)} · {c.docNumber}</p>
                  <p class="text-xs text-secondary-500">
                    {formatDate(c.documentDate)} · total {formatMoney(c.totalAmount)} · outstanding {formatMoney(c.outstandingAmount)}
                  </p>
                </div>
              </label>
              {#if c.include}
                <div class="pl-7 max-w-xs">
                  <DecimalInput bind:value={c.allocatedAmount} label="Allocated amount" id={`np-alloc-${index}`} scale={2} prefix="Rs" required />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div>
      <label class={labelClass} for="np-notes">Notes</label>
      <textarea id="np-notes" bind:value={notes} rows="2" class={inputClass} placeholder="Optional notes for this payment"></textarea>
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
      disabled={createLoading}
    >
      {createLoading ? 'Submitting…' : 'Submit'}
    </button>
  </svelte:fragment>
</Modal>
