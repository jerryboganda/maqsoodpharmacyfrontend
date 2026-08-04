<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { purchasingApi, api, ApiError, ApiNetworkError, formatMoney, formatDate } from '../../api'
  import type { SupplierRow, CreateSupplierInput, UpdateSupplierInput, SupplierLedgerLineRow } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  type FormValues = {
    name: string
    code: string
    nameUr: string
    phone: string
    mobile: string
    email: string
    addressLine1: string
    addressLine2: string
    city: string
    ntnNo: string
    strnNo: string
    cnicNo: string
    creditDays: number | undefined
    leadTimeDays: number | undefined
    specialInstructions: string
  }

  function emptyForm(): FormValues {
    return {
      name: '',
      code: '',
      nameUr: '',
      phone: '',
      mobile: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      ntnNo: '',
      strnNo: '',
      cnicNo: '',
      creditDays: undefined,
      leadTimeDays: undefined,
      specialInstructions: '',
    }
  }

  let rows: SupplierRow[] = []
  let loading = true
  let loadError = ''
  let query = ''
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let statusFilter: 'all' | 'active' | 'inactive' = 'all'

  $: filteredRows = rows.filter((row) => {
    if (statusFilter === 'active') return row.isActive
    if (statusFilter === 'inactive') return !row.isActive
    return true
  })

  let modalOpen = false
  let submitting = false
  let nameError = ''
  let form: FormValues = emptyForm()

  // -----------------------------------------------------------------------------------------
  // View (detail + ledger)
  // -----------------------------------------------------------------------------------------
  let viewModalOpen = false
  let viewLoading = false
  let viewError = ''
  let viewTarget: SupplierRow | null = null
  let viewTab: 'details' | 'ledger' = 'details'

  let ledgerRows: SupplierLedgerLineRow[] = []
  let ledgerLoading = false
  let ledgerError = ''
  let ledgerOffset = 0
  let ledgerLimit = 50
  let ledgerTotal = 0
  let ledgerOpeningBalance = '0'
  let ledgerClosingBalance = '0'
  let ledgerLoadedForId: number | null = null

  // -----------------------------------------------------------------------------------------
  // Edit
  // -----------------------------------------------------------------------------------------
  let editModalOpen = false
  let editSubmitting = false
  let editNameError = ''
  let editTarget: SupplierRow | null = null
  let editForm: FormValues = emptyForm()

  // -----------------------------------------------------------------------------------------
  // Deactivate
  // -----------------------------------------------------------------------------------------
  let deactivatingId: number | null = null

  async function load(q?: string): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await purchasingApi.listSuppliers({ q: q || undefined, limit: 100 })
      rows = result.suppliers
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load suppliers.'
    } finally {
      loading = false
    }
  }

  function onSearchInput(): void {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(query), 300)
  }

  function openCreate(): void {
    form = emptyForm()
    nameError = ''
    modalOpen = true
  }

  function closeModal(): void {
    modalOpen = false
  }

  function toOptional(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  async function submit(): Promise<void> {
    nameError = ''
    if (!form.name.trim()) {
      nameError = 'Name is required.'
      return
    }

    const input: CreateSupplierInput = {
      name: form.name.trim(),
      code: toOptional(form.code),
      nameUr: toOptional(form.nameUr),
      phone: toOptional(form.phone),
      mobile: toOptional(form.mobile),
      email: toOptional(form.email),
      addressLine1: toOptional(form.addressLine1),
      addressLine2: toOptional(form.addressLine2),
      city: toOptional(form.city),
      ntnNo: toOptional(form.ntnNo),
      strnNo: toOptional(form.strnNo),
      cnicNo: toOptional(form.cnicNo),
      creditDays: form.creditDays,
      leadTimeDays: form.leadTimeDays,
      specialInstructions: toOptional(form.specialInstructions),
    }

    submitting = true
    try {
      await purchasingApi.createSupplier(input, api.newIdempotencyKey())
      toast.success('Supplier created.')
      modalOpen = false
      form = emptyForm()
      await load(query)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not create supplier.')
    } finally {
      submitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // View (detail + ledger)
  // -----------------------------------------------------------------------------------------
  async function openView(row: SupplierRow): Promise<void> {
    viewTarget = row
    viewTab = 'details'
    viewError = ''
    viewModalOpen = true
    ledgerRows = []
    ledgerLoadedForId = null

    viewLoading = true
    try {
      viewTarget = await purchasingApi.getSupplier(row.supplierId)
    } catch (err) {
      viewError = err instanceof ApiNetworkError ? err.message : 'Could not load the supplier.'
    } finally {
      viewLoading = false
    }
  }

  function closeView(): void {
    viewModalOpen = false
    viewTarget = null
  }

  function selectViewTab(tab: 'details' | 'ledger'): void {
    viewTab = tab
    if (tab === 'ledger' && viewTarget && ledgerLoadedForId !== viewTarget.supplierId) {
      ledgerOffset = 0
      void loadLedger(viewTarget.supplierId, 0)
    }
  }

  async function loadLedger(supplierId: number, offset: number): Promise<void> {
    ledgerLoading = true
    ledgerError = ''
    try {
      const result = await purchasingApi.getSupplierLedger(supplierId, { offset, limit: ledgerLimit })
      ledgerRows = result.lines
      ledgerOffset = result.offset
      ledgerLimit = result.limit
      ledgerTotal = result.total
      ledgerOpeningBalance = result.openingBalance
      ledgerClosingBalance = result.closingBalance
      ledgerLoadedForId = supplierId
    } catch (err) {
      ledgerError = err instanceof ApiNetworkError ? err.message : 'Could not load the ledger.'
    } finally {
      ledgerLoading = false
    }
  }

  function ledgerPrev(): void {
    if (!viewTarget || ledgerOffset <= 0) return
    void loadLedger(viewTarget.supplierId, Math.max(0, ledgerOffset - ledgerLimit))
  }

  function ledgerNext(): void {
    if (!viewTarget || ledgerOffset + ledgerLimit >= ledgerTotal) return
    void loadLedger(viewTarget.supplierId, ledgerOffset + ledgerLimit)
  }

  // -----------------------------------------------------------------------------------------
  // Edit
  // -----------------------------------------------------------------------------------------
  function rowToForm(row: SupplierRow): FormValues {
    return {
      name: row.name,
      code: row.code,
      nameUr: row.nameUr ?? '',
      phone: row.phone ?? '',
      mobile: row.mobile ?? '',
      email: row.email ?? '',
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      city: row.city ?? '',
      ntnNo: row.ntnNo ?? '',
      strnNo: row.strnNo ?? '',
      cnicNo: row.cnicNo ?? '',
      creditDays: row.creditDays ?? undefined,
      leadTimeDays: row.leadTimeDays ?? undefined,
      specialInstructions: row.specialInstructions ?? '',
    }
  }

  function openEdit(row: SupplierRow): void {
    editTarget = row
    editForm = rowToForm(row)
    editNameError = ''
    editModalOpen = true
  }

  function closeEditModal(): void {
    if (editSubmitting) return
    editModalOpen = false
    editTarget = null
  }

  async function submitEdit(): Promise<void> {
    if (!editTarget) return
    editNameError = ''
    if (!editForm.name.trim()) {
      editNameError = 'Name is required.'
      return
    }

    const input: UpdateSupplierInput = {
      name: editForm.name.trim(),
      code: toOptional(editForm.code),
      nameUr: toOptional(editForm.nameUr),
      phone: toOptional(editForm.phone),
      mobile: toOptional(editForm.mobile),
      email: toOptional(editForm.email),
      addressLine1: toOptional(editForm.addressLine1),
      addressLine2: toOptional(editForm.addressLine2),
      city: toOptional(editForm.city),
      ntnNo: toOptional(editForm.ntnNo),
      strnNo: toOptional(editForm.strnNo),
      cnicNo: toOptional(editForm.cnicNo),
      creditDays: editForm.creditDays,
      leadTimeDays: editForm.leadTimeDays,
      specialInstructions: toOptional(editForm.specialInstructions),
    }

    editSubmitting = true
    try {
      await purchasingApi.updateSupplier(editTarget.supplierId, input, api.newIdempotencyKey())
      toast.success('Supplier updated.')
      editModalOpen = false
      editTarget = null
      await load(query)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not update the supplier.')
    } finally {
      editSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Deactivate (one-way -- the backend has no reactivate endpoint for suppliers)
  // -----------------------------------------------------------------------------------------
  async function deactivate(row: SupplierRow): Promise<void> {
    deactivatingId = row.supplierId
    try {
      await purchasingApi.deactivateSupplier(row.supplierId, undefined, api.newIdempotencyKey())
      toast.success('Supplier deactivated.')
      await load(query)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not deactivate the supplier.')
    } finally {
      deactivatingId = null
    }
  }

  onMount(() => load())
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Suppliers</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Manage the suppliers you purchase stock from.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
      New supplier
    </button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
      <div class="relative max-w-md w-full">
        <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
        <input
          bind:value={query}
          on:input={onSearchInput}
          class={`${inputClass} pl-10`}
          placeholder="Search suppliers by name or code…"
          aria-label="Search suppliers"
        />
      </div>

      <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800 shrink-0">
        {#each [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] as option (option.value)}
          <button
            type="button"
            class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === option.value ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'}`}
            on:click={() => (statusFilter = option.value as 'all' | 'active' | 'inactive')}
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="mt-5 rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Suppliers table">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-900/30">
            <tr>
              <th class={`${headClass} py-3 px-4`}>Code</th>
              <th class={`${headClass} py-3 px-4`}>Name</th>
              <th class={`${headClass} py-3 px-4`}>Phone/Mobile</th>
              <th class={`${headClass} py-3 px-4`}>Email</th>
              <th class={`${headClass} py-3 px-4`}>Status</th>
              <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
            {#if loading}
              <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading suppliers…</td></tr>
            {:else if filteredRows.length === 0}
              <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">{rows.length === 0 ? 'No suppliers found.' : 'No suppliers match this filter.'}</td></tr>
            {:else}
              {#each filteredRows as row (row.supplierId)}
                <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                  <td class={cellClass}>{row.code}</td>
                  <td class={cellClass}>
                    <div class="font-medium text-secondary-900 dark:text-white">{row.name}</div>
                    {#if row.nameUr}
                      <div class="text-xs text-secondary-500 dark:text-secondary-400">{row.nameUr}</div>
                    {/if}
                  </td>
                  <td class={cellClass}>{row.phone || row.mobile || '—'}</td>
                  <td class={cellClass}>{row.email || '—'}</td>
                  <td class={cellClass}>
                    {#if row.isActive}
                      <Badge tone="success">Active</Badge>
                    {:else}
                      <Badge tone="neutral">Inactive</Badge>
                    {/if}
                  </td>
                  <td class={`${cellClass} text-right`}>
                    <div class="inline-flex items-center gap-2">
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        on:click={() => openView(row)}
                      >
                        <Icon icon={Icons.eye} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                        View
                      </button>
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        on:click={() => openEdit(row)}
                      >
                        <Icon icon={Icons.edit} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                        Edit
                      </button>
                      {#if row.isActive}
                        <button
                          type="button"
                          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900 disabled:opacity-50"
                          disabled={deactivatingId === row.supplierId}
                          on:click={() => deactivate(row)}
                        >
                          {deactivatingId === row.supplierId ? 'Deactivating…' : 'Deactivate'}
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
</div>

<Modal open={modalOpen} title="New supplier" widthClass="max-w-3xl" onClose={closeModal}>
  <form id="new-supplier-form" on:submit|preventDefault={submit}>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <label class={labelClass} for="supplier-name">Name <span class="text-danger-500">*</span></label>
        <input
          id="supplier-name"
          bind:value={form.name}
          class={inputClass + (nameError ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
          placeholder="Supplier name"
        />
        {#if nameError}<p class="mt-1 text-xs text-danger-500">{nameError}</p>{/if}
      </div>

      <div>
        <label class={labelClass} for="supplier-code">Code</label>
        <input id="supplier-code" bind:value={form.code} class={inputClass} placeholder="e.g. SUP-001" />
        <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">Leave blank to auto-generate from the name.</p>
      </div>

      <div>
        <label class={labelClass} for="supplier-name-ur">Name (Urdu)</label>
        <input id="supplier-name-ur" bind:value={form.nameUr} class={inputClass} dir="rtl" />
      </div>

      <div>
        <label class={labelClass} for="supplier-phone">Phone</label>
        <input id="supplier-phone" type="tel" bind:value={form.phone} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-mobile">Mobile</label>
        <input id="supplier-mobile" type="tel" bind:value={form.mobile} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-email">Email</label>
        <input id="supplier-email" type="email" bind:value={form.email} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-city">City</label>
        <input id="supplier-city" bind:value={form.city} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-address1">Address line 1</label>
        <input id="supplier-address1" bind:value={form.addressLine1} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-address2">Address line 2</label>
        <input id="supplier-address2" bind:value={form.addressLine2} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-ntn">NTN No.</label>
        <input id="supplier-ntn" bind:value={form.ntnNo} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-strn">STRN No.</label>
        <input id="supplier-strn" bind:value={form.strnNo} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-cnic">CNIC No.</label>
        <input id="supplier-cnic" bind:value={form.cnicNo} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-credit-days">Credit days</label>
        <input id="supplier-credit-days" type="number" min="0" step="1" bind:value={form.creditDays} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="supplier-lead-time-days">Lead time (days)</label>
        <input id="supplier-lead-time-days" type="number" min="0" step="1" bind:value={form.leadTimeDays} class={inputClass} />
      </div>

      <div class="sm:col-span-2">
        <label class={labelClass} for="supplier-instructions">Special instructions</label>
        <textarea id="supplier-instructions" rows="3" bind:value={form.specialInstructions} class={inputClass}></textarea>
      </div>
    </div>
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeModal}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={submitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="new-supplier-form"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={submitting}
    >
      {submitting ? 'Saving…' : 'Create supplier'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Edit supplier -->
<Modal open={editModalOpen} title={editTarget ? `Edit ${editTarget.name}` : 'Edit supplier'} widthClass="max-w-3xl" onClose={closeEditModal}>
  <form id="edit-supplier-form" on:submit|preventDefault={submitEdit}>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <label class={labelClass} for="edit-supplier-name">Name <span class="text-danger-500">*</span></label>
        <input
          id="edit-supplier-name"
          bind:value={editForm.name}
          class={inputClass + (editNameError ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
          placeholder="Supplier name"
        />
        {#if editNameError}<p class="mt-1 text-xs text-danger-500">{editNameError}</p>{/if}
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-code">Code</label>
        <input id="edit-supplier-code" bind:value={editForm.code} class={inputClass} placeholder="e.g. SUP-001" />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-name-ur">Name (Urdu)</label>
        <input id="edit-supplier-name-ur" bind:value={editForm.nameUr} class={inputClass} dir="rtl" />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-phone">Phone</label>
        <input id="edit-supplier-phone" type="tel" bind:value={editForm.phone} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-mobile">Mobile</label>
        <input id="edit-supplier-mobile" type="tel" bind:value={editForm.mobile} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-email">Email</label>
        <input id="edit-supplier-email" type="email" bind:value={editForm.email} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-city">City</label>
        <input id="edit-supplier-city" bind:value={editForm.city} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-address1">Address line 1</label>
        <input id="edit-supplier-address1" bind:value={editForm.addressLine1} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-address2">Address line 2</label>
        <input id="edit-supplier-address2" bind:value={editForm.addressLine2} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-ntn">NTN No.</label>
        <input id="edit-supplier-ntn" bind:value={editForm.ntnNo} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-strn">STRN No.</label>
        <input id="edit-supplier-strn" bind:value={editForm.strnNo} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-cnic">CNIC No.</label>
        <input id="edit-supplier-cnic" bind:value={editForm.cnicNo} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-credit-days">Credit days</label>
        <input id="edit-supplier-credit-days" type="number" min="0" step="1" bind:value={editForm.creditDays} class={inputClass} />
      </div>

      <div>
        <label class={labelClass} for="edit-supplier-lead-time-days">Lead time (days)</label>
        <input id="edit-supplier-lead-time-days" type="number" min="0" step="1" bind:value={editForm.leadTimeDays} class={inputClass} />
      </div>

      <div class="sm:col-span-2">
        <label class={labelClass} for="edit-supplier-instructions">Special instructions</label>
        <textarea id="edit-supplier-instructions" rows="3" bind:value={editForm.specialInstructions} class={inputClass}></textarea>
      </div>
    </div>
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeEditModal}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={editSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="edit-supplier-form"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={editSubmitting}
    >
      {editSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>

<!-- View supplier (details + ledger) -->
<Modal open={viewModalOpen} title={viewTarget ? viewTarget.name : 'Supplier'} widthClass="max-w-4xl" onClose={closeView}>
  {#if viewError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm mb-4">
      {viewError}
    </div>
  {/if}

  {#if viewLoading && !viewTarget}
    <p class="py-8 text-center text-sm text-secondary-500">Loading supplier…</p>
  {:else if viewTarget}
    <div class="flex items-center gap-2 border-b border-secondary-200 dark:border-secondary-700 mb-5">
      <button
        type="button"
        class={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${viewTab === 'details' ? 'border-theme-primary text-theme-primary' : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'}`}
        on:click={() => selectViewTab('details')}
      >
        Details
      </button>
      <button
        type="button"
        class={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${viewTab === 'ledger' ? 'border-theme-primary text-theme-primary' : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'}`}
        on:click={() => selectViewTab('ledger')}
      >
        Ledger
      </button>
    </div>

    {#if viewTab === 'details'}
      <div class="space-y-5">
        <div class="flex items-center gap-2">
          {#if viewTarget.isActive}
            <Badge tone="success">Active</Badge>
          {:else}
            <Badge tone="neutral">Inactive</Badge>
          {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <span class={labelClass}>Code</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.code}</p>
          </div>
          <div>
            <span class={labelClass}>Name (Urdu)</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.nameUr || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Phone</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.phone || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Mobile</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.mobile || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Email</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.email || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>City</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.city || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Address line 1</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.addressLine1 || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Address line 2</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.addressLine2 || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>NTN No.</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.ntnNo || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>STRN No.</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.strnNo || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>CNIC No.</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.cnicNo || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Credit days</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.creditDays ?? '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Lead time (days)</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.leadTimeDays ?? '—'}</p>
          </div>
          <div class="sm:col-span-2">
            <span class={labelClass}>Special instructions</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap">{viewTarget.specialInstructions || '—'}</p>
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        {#if ledgerError}
          <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
            {ledgerError}
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-3">
            <span class="text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400">Opening balance</span>
            <p class="text-sm font-medium text-secondary-900 dark:text-white mt-0.5">{formatMoney(ledgerOpeningBalance)}</p>
          </div>
          <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-3">
            <span class="text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400">Closing balance</span>
            <p class="text-sm font-medium text-secondary-900 dark:text-white mt-0.5">{formatMoney(ledgerClosingBalance)}</p>
          </div>
        </div>

        <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Supplier ledger table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={`${headClass} py-3 px-4`}>Date</th>
                  <th class={`${headClass} py-3 px-4`}>Entry no.</th>
                  <th class={`${headClass} py-3 px-4`}>Description</th>
                  <th class={`${headClass} py-3 px-4 text-right`}>Debit</th>
                  <th class={`${headClass} py-3 px-4 text-right`}>Credit</th>
                  <th class={`${headClass} py-3 px-4 text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                {#if ledgerLoading}
                  <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading ledger…</td></tr>
                {:else if ledgerRows.length === 0}
                  <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No ledger activity yet.</td></tr>
                {:else}
                  {#each ledgerRows as line (line.journalLineId)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                      <td class={cellClass}>{formatDate(line.entryDate)}</td>
                      <td class={cellClass}>{line.entryNo}</td>
                      <td class={cellClass}>{line.memo || line.description || '—'}</td>
                      <td class={`${cellClass} text-right`}>{Number(line.debitAmount) > 0 ? formatMoney(line.debitAmount) : '—'}</td>
                      <td class={`${cellClass} text-right`}>{Number(line.creditAmount) > 0 ? formatMoney(line.creditAmount) : '—'}</td>
                      <td class={`${cellClass} text-right font-medium text-secondary-900 dark:text-white`}>{formatMoney(line.balance)}</td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        {#if ledgerTotal > 0}
          <div class="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400">
            <span>
              Showing {ledgerRows.length === 0 ? 0 : ledgerOffset + 1}–{ledgerOffset + ledgerRows.length} of {ledgerTotal}
            </span>
            <div class="inline-flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-50"
                disabled={ledgerLoading || ledgerOffset <= 0}
                on:click={ledgerPrev}
              >
                Previous
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-50"
                disabled={ledgerLoading || ledgerOffset + ledgerLimit >= ledgerTotal}
                on:click={ledgerNext}
              >
                Next
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeView}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
    >
      Close
    </button>
  </svelte:fragment>
</Modal>
