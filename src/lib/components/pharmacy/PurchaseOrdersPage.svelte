<script lang="ts">
  // Rule M (rebuild/CLAUDE.md "Money and quantities"): every money/qty field on this page is a
  // decimal STRING end to end. The only Number()/parseFloat() calls below are the labelled
  // "estimated total" preview in the create form (never sent to the API) and pure UI tone/compare
  // checks -- everything actually sent to the API is the raw string the user typed into a
  // DecimalInput. See PurchaseInvoicesPage.svelte's header comment for the same convention.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { toast } from '../../stores/toast'
  import { purchasingApi, catalogApi, api, ApiError, ApiNetworkError, formatMoney, formatQty, formatDate, todayYmd } from '../../api'
  import type { PurchaseOrderRow, GetPurchaseOrderResult, SupplierRow, ItemSummary, CreatePurchaseOrderInput, PurchaseOrderLineInput } from '../../api'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  type LineForm = {
    itemId: string
    qtyOrdered: string
    unitPrice: string
  }

  function blankLine(): LineForm {
    return { itemId: '', qtyOrdered: '', unitPrice: '' }
  }

  // ---- list state ------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let orders: PurchaseOrderRow[] = []
  let suppliers: SupplierRow[] = []
  $: supplierMap = new Map(suppliers.map((s) => [s.supplierId, s.name]))

  let actionLoading: Record<number, 'approve' | 'close' | 'cancel' | undefined> = {}

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [supplierResult, orderResult] = await Promise.all([
        purchasingApi.listSuppliers({ limit: 500 }),
        purchasingApi.listPurchaseOrders({ limit: 100 }),
      ])
      suppliers = supplierResult.suppliers
      orders = orderResult.purchaseOrders
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load purchase orders.'
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  function statusTone(status: PurchaseOrderRow['status']): 'neutral' | 'success' | 'danger' | 'info' {
    if (status === 'draft') return 'neutral'
    if (status === 'confirmed') return 'info'
    if (status === 'cancelled' || status === 'reversed') return 'danger'
    return 'success' // posted -- never actually reached by a purchase order, kept for parity
  }

  function orderStatusTone(orderStatus: PurchaseOrderRow['orderStatus']): 'neutral' | 'success' | 'danger' | 'info' | 'warning' {
    if (orderStatus === 'open') return 'neutral'
    if (orderStatus === 'partial') return 'warning'
    if (orderStatus === 'received') return 'info'
    if (orderStatus === 'closed') return 'success'
    return 'danger' // cancelled
  }

  // Row-action eligibility mirrors purchase-order.service.ts's own guards (approve/close/cancel)
  // so a disabled/hidden button here never masks a call the server would reject anyway.
  function canApprove(row: PurchaseOrderRow): boolean {
    return row.status === 'draft'
  }
  function canClose(row: PurchaseOrderRow): boolean {
    return row.status === 'confirmed' && row.orderStatus !== 'closed' && row.orderStatus !== 'cancelled'
  }
  function canCancel(row: PurchaseOrderRow): boolean {
    return row.status !== 'cancelled' && row.orderStatus !== 'closed'
  }

  async function approve(row: PurchaseOrderRow): Promise<void> {
    actionLoading = { ...actionLoading, [row.purchaseOrderId]: 'approve' }
    try {
      await purchasingApi.approvePurchaseOrder(row.purchaseOrderId, undefined, api.newIdempotencyKey())
      toast.success('Purchase order approved.')
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not approve the purchase order.')
    } finally {
      const next = { ...actionLoading }
      delete next[row.purchaseOrderId]
      actionLoading = next
    }
  }

  async function close(row: PurchaseOrderRow): Promise<void> {
    actionLoading = { ...actionLoading, [row.purchaseOrderId]: 'close' }
    try {
      await purchasingApi.closePurchaseOrder(row.purchaseOrderId, undefined, api.newIdempotencyKey())
      toast.success('Purchase order closed.')
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not close the purchase order.')
    } finally {
      const next = { ...actionLoading }
      delete next[row.purchaseOrderId]
      actionLoading = next
    }
  }

  async function cancel(row: PurchaseOrderRow): Promise<void> {
    actionLoading = { ...actionLoading, [row.purchaseOrderId]: 'cancel' }
    try {
      await purchasingApi.cancelPurchaseOrder(row.purchaseOrderId, {}, api.newIdempotencyKey())
      toast.success('Purchase order cancelled.')
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not cancel the purchase order.')
    } finally {
      const next = { ...actionLoading }
      delete next[row.purchaseOrderId]
      actionLoading = next
    }
  }

  // ---- detail modal ------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detailResult: GetPurchaseOrderResult | null = null

  async function openDetail(row: PurchaseOrderRow): Promise<void> {
    detailOpen = true
    detailLoading = true
    detailError = ''
    detailResult = null
    try {
      detailResult = await purchasingApi.getPurchaseOrder(row.purchaseOrderId)
    } catch (err) {
      detailError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this purchase order.'
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

  let supplierId: number | '' = ''
  let documentDate = todayYmd()
  let expectedDate = ''
  let notes = ''
  let lines: LineForm[] = [blankLine()]

  function selectedItem(line: LineForm): ItemSummary | undefined {
    return line.itemId ? itemMap.get(Number(line.itemId)) : undefined
  }

  function selectItem(index: number, itemIdStr: string): void {
    lines = lines.map((line, i) => {
      if (i !== index) return line
      const item = itemIdStr ? itemMap.get(Number(itemIdStr)) : undefined
      return { ...line, itemId: itemIdStr, unitPrice: item ? item.purchasePrice : line.unitPrice }
    })
  }

  function addLine(): void {
    lines = [...lines, blankLine()]
  }

  function removeLine(index: number): void {
    lines = lines.filter((_, i) => i !== index)
  }

  // Display-only estimate for the in-progress form. Never sent to the API -- the API receives the
  // raw per-line strings collected in `lines` untouched (see buildLineInput below).
  function lineEstimate(line: LineForm): number {
    return (Number(line.qtyOrdered) || 0) * (Number(line.unitPrice) || 0)
  }
  $: estimatedTotal = lines.reduce((sum, line) => sum + lineEstimate(line), 0)

  async function openCreate(): Promise<void> {
    createOpen = true
    createError = ''
    formErrors = {}
    supplierId = ''
    documentDate = todayYmd()
    expectedDate = ''
    notes = ''
    lines = [blankLine()]
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

  // A qty/price string counts as "zero or empty" without ever converting it to a Number for the
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
        if (isZeroOrEmpty(line.qtyOrdered)) {
          nextErrors.lines = 'Each line needs an ordered quantity greater than zero.'
          break
        }
        if (!line.unitPrice.trim()) {
          nextErrors.lines = 'Each line needs a unit price.'
          break
        }
      }
    }
    formErrors = nextErrors
    return Object.keys(nextErrors).length === 0
  }

  function buildLineInput(line: LineForm): PurchaseOrderLineInput {
    return {
      itemId: Number(line.itemId),
      qtyOrdered: line.qtyOrdered.trim(),
      unitPrice: line.unitPrice.trim(),
    }
  }

  async function submitCreate(): Promise<void> {
    createError = ''
    if (!validate()) return
    createLoading = true
    try {
      const input: CreatePurchaseOrderInput = {
        supplierId: supplierId as number,
        documentDate,
        lines: lines.filter((line) => line.itemId).map(buildLineInput),
      }
      if (expectedDate.trim()) input.expectedDate = expectedDate
      if (notes.trim()) input.notes = notes.trim()
      const result = await purchasingApi.createPurchaseOrder(input, idempotencyKey)
      toast.success('Purchase order ' + result.purchaseOrder.docNumber + ' created.')
      closeCreate()
      await loadList()
    } catch (err) {
      createError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not create the purchase order.'
      toast.error(createError)
    } finally {
      createLoading = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Purchase orders</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Raise, approve, and track commitment orders sent to suppliers.</p>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={loadList} disabled={loading}>
        <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Refresh
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
        on:click={openCreate}
      >
        <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
        New purchase order
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
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Purchase orders table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Doc number</th>
            <th class={headClass}>Supplier</th>
            <th class={headClass}>Document date</th>
            <th class={headClass}>Expected date</th>
            <th class={headClass}>Total</th>
            <th class={headClass}>Status</th>
            <th class={headClass}>Order status</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if orders.length === 0}
            <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">No purchase orders yet.</td></tr>
          {:else}
            {#each orders as row (row.purchaseOrderId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white cursor-pointer`} on:click={() => openDetail(row)}>
                  {row.docNumber}
                </td>
                <td class={cellClass}>{supplierMap.get(row.supplierId) ?? `Supplier #${row.supplierId}`}</td>
                <td class={cellClass}>{formatDate(row.documentDate)}</td>
                <td class={cellClass}>{row.expectedDate ? formatDate(row.expectedDate) : '—'}</td>
                <td class={cellClass}>{formatMoney(row.totalAmount)}</td>
                <td class={cellClass}><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td class={cellClass}><Badge tone={orderStatusTone(row.orderStatus)}>{row.orderStatus}</Badge></td>
                <td class={`${cellClass} text-right`}>
                  <div class="inline-flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                      on:click={() => openDetail(row)}
                    >
                      View
                    </button>
                    {#if canApprove(row)}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 hover:bg-warning-100 dark:hover:bg-warning-900 disabled:opacity-50"
                        disabled={actionLoading[row.purchaseOrderId] !== undefined}
                        on:click={() => approve(row)}
                      >
                        {actionLoading[row.purchaseOrderId] === 'approve' ? 'Approving…' : 'Approve'}
                      </button>
                    {/if}
                    {#if canClose(row)}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-primary text-white hover:opacity-90 disabled:opacity-50"
                        disabled={actionLoading[row.purchaseOrderId] !== undefined}
                        on:click={() => close(row)}
                      >
                        {actionLoading[row.purchaseOrderId] === 'close' ? 'Closing…' : 'Close'}
                      </button>
                    {/if}
                    {#if canCancel(row)}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900 disabled:opacity-50"
                        disabled={actionLoading[row.purchaseOrderId] !== undefined}
                        on:click={() => cancel(row)}
                      >
                        {actionLoading[row.purchaseOrderId] === 'cancel' ? 'Cancelling…' : 'Cancel'}
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<Modal open={detailOpen} title={detailResult ? `Purchase order ${detailResult.purchaseOrder.docNumber}` : 'Purchase order'} widthClass="max-w-3xl" onClose={closeDetail}>
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
            {supplierMap.get(detailResult.purchaseOrder.supplierId) ?? `Supplier #${detailResult.purchaseOrder.supplierId}`}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Document date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{formatDate(detailResult.purchaseOrder.documentDate)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Expected date</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">
            {detailResult.purchaseOrder.expectedDate ? formatDate(detailResult.purchaseOrder.expectedDate) : '—'}
          </p>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Status</p>
          <Badge tone={statusTone(detailResult.purchaseOrder.status)}>{detailResult.purchaseOrder.status}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500 mb-1">Order status</p>
          <Badge tone={orderStatusTone(detailResult.purchaseOrder.orderStatus)}>{detailResult.purchaseOrder.orderStatus}</Badge>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Total</p>
          <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detailResult.purchaseOrder.totalAmount)}</p>
        </div>
        {#if detailResult.purchaseOrder.notes}
          <div class="sm:col-span-3">
            <p class="text-xs text-secondary-500">Notes</p>
            <p class="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap">{detailResult.purchaseOrder.notes}</p>
          </div>
        {/if}
      </div>

      <div>
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Line items</h3>
        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Purchase order line items table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Item</th>
                  <th class={headClass}>Qty ordered</th>
                  <th class={headClass}>Qty received</th>
                  <th class={headClass}>Qty outstanding</th>
                  <th class={headClass}>Unit price</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#each detailResult.lines as line (line.purchaseOrderLineId)}
                  <tr>
                    <td class={cellClass}>{itemMap.get(line.itemId)?.name ?? `Item #${line.itemId}`}</td>
                    <td class={cellClass}>{formatQty(line.qtyOrdered)}</td>
                    <td class={cellClass}>{formatQty(line.qtyReceived)}</td>
                    <td class={cellClass}>{formatQty(line.qtyOutstanding)}</td>
                    <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{formatMoney(line.unitPrice)}</td>
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

<Modal open={createOpen} title="New purchase order" widthClass="max-w-4xl" onClose={closeCreate}>
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
        <label class={labelClass} for="po-supplier">Supplier<span class="text-danger-500"> *</span></label>
        <select id="po-supplier" bind:value={supplierId} class={inputClass}>
          <option value="">Select supplier…</option>
          {#each suppliers as s (s.supplierId)}
            <option value={s.supplierId}>{s.name} ({s.code})</option>
          {/each}
        </select>
        {#if formErrors.supplierId}<p class="text-xs text-danger-500 mt-1">{formErrors.supplierId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="po-document-date">Document date<span class="text-danger-500"> *</span></label>
        <input id="po-document-date" type="date" bind:value={documentDate} class={inputClass} />
        {#if formErrors.documentDate}<p class="text-xs text-danger-500 mt-1">{formErrors.documentDate}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="po-expected-date">Expected date</label>
        <input id="po-expected-date" type="date" bind:value={expectedDate} class={inputClass} />
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
                <label class={labelClass} for={`po-line-item-${index}`}>Item<span class="text-danger-500"> *</span></label>
                <select
                  id={`po-line-item-${index}`}
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

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DecimalInput bind:value={line.qtyOrdered} label="Qty ordered" id={`po-line-qty-${index}`} required placeholder="0.0000" />
              <DecimalInput bind:value={line.unitPrice} label="Unit price" id={`po-line-price-${index}`} prefix="Rs" required scale={5} />
              <div class="flex items-end pb-2.5 text-sm text-secondary-500">
                Line total: {formatMoney(lineEstimate(line).toFixed(2))}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div>
      <label class={labelClass} for="po-notes">Notes</label>
      <textarea id="po-notes" bind:value={notes} rows="2" class={inputClass} placeholder="Optional notes for this purchase order"></textarea>
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
