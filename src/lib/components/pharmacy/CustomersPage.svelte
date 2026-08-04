<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { salesApi, api, ApiError, ApiNetworkError, formatMoney, formatDate } from '../../api'
  import type { CustomerRow, CreateCustomerInput, UpdateCustomerInput, CustomerLedgerLineRow } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  interface CustomerFormState {
    code: string
    name: string
    nameUr: string
    phone: string
    mobile: string
    email: string
    addressLine1: string
    addressLine2: string
    city: string
    ntnNo: string
    cnicNo: string
    creditLimitAmount: string
    creditDays: number | undefined
  }

  function emptyForm(): CustomerFormState {
    return {
      code: '',
      name: '',
      nameUr: '',
      phone: '',
      mobile: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      ntnNo: '',
      cnicNo: '',
      creditLimitAmount: '',
      creditDays: undefined,
    }
  }

  let loading = true
  let loadError = ''
  let rows: CustomerRow[] = []
  let query = ''
  let searchTimeout: ReturnType<typeof setTimeout> | undefined

  let createOpen = false
  let submitting = false
  let form: CustomerFormState = emptyForm()
  let formErrors: { code?: string; name?: string } = {}

  // -----------------------------------------------------------------------------------------
  // View (detail + ledger)
  // -----------------------------------------------------------------------------------------
  let viewModalOpen = false
  let viewLoading = false
  let viewError = ''
  let viewTarget: CustomerRow | null = null
  let viewTab: 'details' | 'ledger' = 'details'

  let ledgerRows: CustomerLedgerLineRow[] = []
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
  let editFormErrors: { code?: string; name?: string } = {}
  let editTarget: CustomerRow | null = null
  let editForm: CustomerFormState = emptyForm()

  // -----------------------------------------------------------------------------------------
  // Deactivate
  // -----------------------------------------------------------------------------------------
  let deactivatingId: number | null = null

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await salesApi.listCustomers({ q: query || undefined, limit: 100 })
      rows = result.customers
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load customers.'
    } finally {
      loading = false
    }
  }

  function onSearchInput(): void {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(load, 300)
  }

  function openCreateModal(): void {
    form = emptyForm()
    formErrors = {}
    createOpen = true
  }

  function closeCreateModal(): void {
    createOpen = false
  }

  function trimOrUndefined(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  }

  async function handleSubmit(): Promise<void> {
    const nextErrors: { code?: string; name?: string } = {}
    if (!form.code.trim()) nextErrors.code = 'Code is required.'
    if (!form.name.trim()) nextErrors.name = 'Name is required.'
    formErrors = nextErrors
    if (Object.keys(nextErrors).length > 0) return

    const input: CreateCustomerInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      nameUr: trimOrUndefined(form.nameUr),
      phone: trimOrUndefined(form.phone),
      mobile: trimOrUndefined(form.mobile),
      email: trimOrUndefined(form.email),
      addressLine1: trimOrUndefined(form.addressLine1),
      addressLine2: trimOrUndefined(form.addressLine2),
      city: trimOrUndefined(form.city),
      ntnNo: trimOrUndefined(form.ntnNo),
      cnicNo: trimOrUndefined(form.cnicNo),
      creditLimitAmount: trimOrUndefined(form.creditLimitAmount),
      creditDays: form.creditDays,
    }

    submitting = true
    try {
      await salesApi.createCustomer(input, api.newIdempotencyKey())
      toast.success('Customer created.')
      closeCreateModal()
      form = emptyForm()
      formErrors = {}
      await load()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
      } else if (err instanceof ApiNetworkError) {
        toast.error(err.message)
      } else {
        toast.error('Could not create customer.')
      }
    } finally {
      submitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // View (detail + ledger)
  // -----------------------------------------------------------------------------------------
  async function openView(row: CustomerRow): Promise<void> {
    viewTarget = row
    viewTab = 'details'
    viewError = ''
    viewModalOpen = true
    ledgerRows = []
    ledgerLoadedForId = null

    viewLoading = true
    try {
      viewTarget = await salesApi.getCustomer(row.customerId)
    } catch (err) {
      viewError = err instanceof ApiNetworkError ? err.message : 'Could not load the customer.'
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
    if (tab === 'ledger' && viewTarget && ledgerLoadedForId !== viewTarget.customerId) {
      ledgerOffset = 0
      void loadLedger(viewTarget.customerId, 0)
    }
  }

  async function loadLedger(customerId: number, offset: number): Promise<void> {
    ledgerLoading = true
    ledgerError = ''
    try {
      const result = await salesApi.getCustomerLedger(customerId, { offset, limit: ledgerLimit })
      ledgerRows = result.lines
      ledgerOffset = result.offset
      ledgerLimit = result.limit
      ledgerTotal = result.total
      ledgerOpeningBalance = result.openingBalance
      ledgerClosingBalance = result.closingBalance
      ledgerLoadedForId = customerId
    } catch (err) {
      ledgerError = err instanceof ApiNetworkError ? err.message : 'Could not load the ledger.'
    } finally {
      ledgerLoading = false
    }
  }

  function ledgerPrev(): void {
    if (!viewTarget || ledgerOffset <= 0) return
    void loadLedger(viewTarget.customerId, Math.max(0, ledgerOffset - ledgerLimit))
  }

  function ledgerNext(): void {
    if (!viewTarget || ledgerOffset + ledgerLimit >= ledgerTotal) return
    void loadLedger(viewTarget.customerId, ledgerOffset + ledgerLimit)
  }

  // -----------------------------------------------------------------------------------------
  // Edit
  // -----------------------------------------------------------------------------------------
  function rowToForm(row: CustomerRow): CustomerFormState {
    return {
      code: row.code,
      name: row.name,
      nameUr: row.nameUr ?? '',
      phone: row.phone ?? '',
      mobile: row.mobile ?? '',
      email: row.email ?? '',
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      city: row.city ?? '',
      ntnNo: row.ntnNo ?? '',
      cnicNo: row.cnicNo ?? '',
      creditLimitAmount: row.creditLimitAmount ?? '',
      creditDays: row.creditDays ?? undefined,
    }
  }

  function openEdit(row: CustomerRow): void {
    editTarget = row
    editForm = rowToForm(row)
    editFormErrors = {}
    editModalOpen = true
  }

  function closeEditModal(): void {
    if (editSubmitting) return
    editModalOpen = false
    editTarget = null
  }

  async function submitEdit(): Promise<void> {
    if (!editTarget) return
    const nextErrors: { code?: string; name?: string } = {}
    if (!editForm.code.trim()) nextErrors.code = 'Code is required.'
    if (!editForm.name.trim()) nextErrors.name = 'Name is required.'
    editFormErrors = nextErrors
    if (Object.keys(nextErrors).length > 0) return

    const input: UpdateCustomerInput = {
      code: editForm.code.trim(),
      name: editForm.name.trim(),
      nameUr: trimOrUndefined(editForm.nameUr),
      phone: trimOrUndefined(editForm.phone),
      mobile: trimOrUndefined(editForm.mobile),
      email: trimOrUndefined(editForm.email),
      addressLine1: trimOrUndefined(editForm.addressLine1),
      addressLine2: trimOrUndefined(editForm.addressLine2),
      city: trimOrUndefined(editForm.city),
      ntnNo: trimOrUndefined(editForm.ntnNo),
      cnicNo: trimOrUndefined(editForm.cnicNo),
      creditLimitAmount: trimOrUndefined(editForm.creditLimitAmount),
      creditDays: editForm.creditDays,
    }

    editSubmitting = true
    try {
      await salesApi.updateCustomer(editTarget.customerId, input, api.newIdempotencyKey())
      toast.success('Customer updated.')
      editModalOpen = false
      editTarget = null
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not update the customer.')
    } finally {
      editSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Deactivate (one-way -- the backend has no reactivate endpoint for customers)
  // -----------------------------------------------------------------------------------------
  async function deactivate(row: CustomerRow): Promise<void> {
    deactivatingId = row.customerId
    try {
      await salesApi.deactivateCustomer(row.customerId, undefined, api.newIdempotencyKey())
      toast.success('Customer deactivated.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not deactivate the customer.')
    } finally {
      deactivatingId = null
    }
  }

  onMount(load)
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Customers</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Manage customer accounts used for sales and credit.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
      on:click={openCreateModal}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
      New customer
    </button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-6">
    <div class="relative max-w-md">
      <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
      <input
        type="text"
        bind:value={query}
        on:input={onSearchInput}
        class={`${inputClass} pl-10`}
        placeholder="Search by code, name, phone…"
        aria-label="Search customers"
      />
    </div>

    <div class="mt-5 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Customers table">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-900/30">
            <tr>
              <th class={`${headClass} py-3 px-4`}>Code</th>
              <th class={`${headClass} py-3 px-4`}>Name</th>
              <th class={`${headClass} py-3 px-4`}></th>
              <th class={`${headClass} py-3 px-4`}>Phone / Email</th>
              <th class={`${headClass} py-3 px-4`}>Status</th>
              <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
            {#if loading}
              <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
            {:else if rows.length === 0}
              <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No customers found.</td></tr>
            {:else}
              {#each rows as row (row.customerId)}
                <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                  <td class={cellClass}>{row.code}</td>
                  <td class={cellClass}>
                    <div class="font-medium text-secondary-900 dark:text-white">{row.name}</div>
                    {#if row.nameUr}
                      <div class="text-xs text-secondary-500 dark:text-secondary-400">{row.nameUr}</div>
                    {/if}
                  </td>
                  <td class={cellClass}>
                    {#if row.isWalkIn}
                      <Badge tone="info">Walk-in</Badge>
                    {/if}
                  </td>
                  <td class={cellClass}>
                    {#if row.phone}<div>{row.phone}</div>{/if}
                    {#if row.email}<div class="text-xs text-secondary-500 dark:text-secondary-400">{row.email}</div>{/if}
                    {#if !row.phone && !row.email}<span class="text-secondary-400">—</span>{/if}
                  </td>
                  <td class={cellClass}>
                    <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
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
                          disabled={deactivatingId === row.customerId}
                          on:click={() => deactivate(row)}
                        >
                          {deactivatingId === row.customerId ? 'Deactivating…' : 'Deactivate'}
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

<Modal open={createOpen} title="New customer" widthClass="max-w-3xl" onClose={closeCreateModal}>
  <form id="new-customer-form" class="space-y-4" on:submit|preventDefault={handleSubmit}>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_code">Code<span class="text-danger-500"> *</span></label>
        <input
          id="customer_code"
          type="text"
          bind:value={form.code}
          class={inputClass + (formErrors.code ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
          placeholder="e.g. CUST-001"
        />
        <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">e.g. a short reference code, must be unique</p>
        {#if formErrors.code}<p class="mt-1 text-xs text-danger-500">{formErrors.code}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="customer_name">Name<span class="text-danger-500"> *</span></label>
        <input
          id="customer_name"
          type="text"
          bind:value={form.name}
          class={inputClass + (formErrors.name ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
          placeholder="Customer name"
        />
        {#if formErrors.name}<p class="mt-1 text-xs text-danger-500">{formErrors.name}</p>{/if}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_name_ur">Name (Urdu)</label>
        <input id="customer_name_ur" type="text" bind:value={form.nameUr} class={inputClass} dir="rtl" />
      </div>
      <div>
        <label class={labelClass} for="customer_phone">Phone</label>
        <input id="customer_phone" type="text" bind:value={form.phone} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_mobile">Mobile</label>
        <input id="customer_mobile" type="text" bind:value={form.mobile} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="customer_email">Email</label>
        <input id="customer_email" type="email" bind:value={form.email} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_address1">Address line 1</label>
        <input id="customer_address1" type="text" bind:value={form.addressLine1} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="customer_address2">Address line 2</label>
        <input id="customer_address2" type="text" bind:value={form.addressLine2} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_city">City</label>
        <input id="customer_city" type="text" bind:value={form.city} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="customer_ntn">NTN No.</label>
        <input id="customer_ntn" type="text" bind:value={form.ntnNo} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_cnic">CNIC No.</label>
        <input id="customer_cnic" type="text" bind:value={form.cnicNo} class={inputClass} />
      </div>
      <div>
        <DecimalInput bind:value={form.creditLimitAmount} label="Credit limit" id="customer_credit_limit" scale={2} prefix="Rs" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="customer_credit_days">Credit days</label>
        <input id="customer_credit_days" type="number" min="0" step="1" bind:value={form.creditDays} class={inputClass} />
      </div>
    </div>
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeCreateModal}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
    >
      Cancel
    </button>
    <button
      type="submit"
      form="new-customer-form"
      disabled={submitting}
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {submitting ? 'Creating…' : 'Create customer'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Edit customer -->
<Modal open={editModalOpen} title={editTarget ? `Edit ${editTarget.name}` : 'Edit customer'} widthClass="max-w-3xl" onClose={closeEditModal}>
  <form id="edit-customer-form" class="space-y-4" on:submit|preventDefault={submitEdit}>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_code">Code<span class="text-danger-500"> *</span></label>
        <input
          id="edit_customer_code"
          type="text"
          bind:value={editForm.code}
          class={inputClass + (editFormErrors.code ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
          placeholder="e.g. CUST-001"
        />
        {#if editFormErrors.code}<p class="mt-1 text-xs text-danger-500">{editFormErrors.code}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="edit_customer_name">Name<span class="text-danger-500"> *</span></label>
        <input
          id="edit_customer_name"
          type="text"
          bind:value={editForm.name}
          class={inputClass + (editFormErrors.name ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
          placeholder="Customer name"
        />
        {#if editFormErrors.name}<p class="mt-1 text-xs text-danger-500">{editFormErrors.name}</p>{/if}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_name_ur">Name (Urdu)</label>
        <input id="edit_customer_name_ur" type="text" bind:value={editForm.nameUr} class={inputClass} dir="rtl" />
      </div>
      <div>
        <label class={labelClass} for="edit_customer_phone">Phone</label>
        <input id="edit_customer_phone" type="text" bind:value={editForm.phone} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_mobile">Mobile</label>
        <input id="edit_customer_mobile" type="text" bind:value={editForm.mobile} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="edit_customer_email">Email</label>
        <input id="edit_customer_email" type="email" bind:value={editForm.email} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_address1">Address line 1</label>
        <input id="edit_customer_address1" type="text" bind:value={editForm.addressLine1} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="edit_customer_address2">Address line 2</label>
        <input id="edit_customer_address2" type="text" bind:value={editForm.addressLine2} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_city">City</label>
        <input id="edit_customer_city" type="text" bind:value={editForm.city} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="edit_customer_ntn">NTN No.</label>
        <input id="edit_customer_ntn" type="text" bind:value={editForm.ntnNo} class={inputClass} />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_cnic">CNIC No.</label>
        <input id="edit_customer_cnic" type="text" bind:value={editForm.cnicNo} class={inputClass} />
      </div>
      <div>
        <DecimalInput bind:value={editForm.creditLimitAmount} label="Credit limit" id="edit_customer_credit_limit" scale={2} prefix="Rs" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="edit_customer_credit_days">Credit days</label>
        <input id="edit_customer_credit_days" type="number" min="0" step="1" bind:value={editForm.creditDays} class={inputClass} />
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
      form="edit-customer-form"
      disabled={editSubmitting}
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {editSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>

<!-- View customer (details + ledger) -->
<Modal open={viewModalOpen} title={viewTarget ? viewTarget.name : 'Customer'} widthClass="max-w-4xl" onClose={closeView}>
  {#if viewError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm mb-4">
      {viewError}
    </div>
  {/if}

  {#if viewLoading && !viewTarget}
    <p class="py-8 text-center text-sm text-secondary-500">Loading customer…</p>
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
          {#if viewTarget.isWalkIn}
            <Badge tone="info">Walk-in</Badge>
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
            <span class={labelClass}>CNIC No.</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.cnicNo || '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Credit limit</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.creditLimitAmount ? formatMoney(viewTarget.creditLimitAmount) : '—'}</p>
          </div>
          <div>
            <span class={labelClass}>Credit days</span>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{viewTarget.creditDays ?? '—'}</p>
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
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Customer ledger table">
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
