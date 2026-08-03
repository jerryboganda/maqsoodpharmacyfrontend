<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { salesApi, api, ApiError, ApiNetworkError } from '../../api'
  import type { CustomerRow, CreateCustomerInput } from '../../api'
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
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-900/30">
            <tr>
              <th class={`${headClass} py-3 px-4`}>Code</th>
              <th class={`${headClass} py-3 px-4`}>Name</th>
              <th class={`${headClass} py-3 px-4`}></th>
              <th class={`${headClass} py-3 px-4`}>Phone / Email</th>
              <th class={`${headClass} py-3 px-4`}>Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
            {#if loading}
              <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
            {:else if rows.length === 0}
              <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">No customers found.</td></tr>
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
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<Modal open={createOpen} title="New customer" onClose={closeCreateModal}>
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
