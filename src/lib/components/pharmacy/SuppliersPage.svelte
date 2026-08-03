<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { purchasingApi, api, ApiError, ApiNetworkError } from '../../api'
  import type { SupplierRow, CreateSupplierInput } from '../../api'
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

  let modalOpen = false
  let submitting = false
  let nameError = ''
  let form: FormValues = emptyForm()

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
    <div class="relative max-w-md">
      <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
      <input
        bind:value={query}
        on:input={onSearchInput}
        class={`${inputClass} pl-10`}
        placeholder="Search suppliers by name or code…"
        aria-label="Search suppliers"
      />
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
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
            {#if loading}
              <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">Loading suppliers…</td></tr>
            {:else if rows.length === 0}
              <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">No suppliers found.</td></tr>
            {:else}
              {#each rows as row (row.supplierId)}
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
