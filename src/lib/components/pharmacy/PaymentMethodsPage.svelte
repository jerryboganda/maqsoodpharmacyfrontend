<script lang="ts">
  // Admin CRUD for payment methods (P1.3: disable, never delete -- there is no DELETE endpoint,
  // "removing" a method means unchecking `isEnabled` in the edit modal). Mirrors SuppliersPage's
  // create+edit modal shape, but simpler (no separate view/ledger modal -- a payment method has
  // no sub-resource worth its own detail screen).
  //
  // `settlementLagDays`/`sortOrder` are plain integer counts, not money/qty -- Rule M does not
  // apply to them, so they use ordinary `<input type="number">` bound to a JS number, same as
  // SuppliersPage's `creditDays`/`leadTimeDays`.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { toast } from '../../stores/toast'
  import { paymentsApi, api, ApiError, ApiNetworkError } from '../../api'
  import type { PaymentMethodRow, CreatePaymentMethodInput, UpdatePaymentMethodInput } from '../../api'
  import type { PaymentCashBankAccountRow } from '../../api/payments'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const checkboxRowClass = 'flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300'

  type FormValues = {
    code: string
    name: string
    description: string
    directionAllowed: 'in' | 'out' | 'both'
    defaultCashBankAccountId: number | ''
    requiresReference: boolean
    requiresBankAccount: boolean
    requiresChequeDetails: boolean
    settlementLagDays: number
    isCounterMethod: boolean
    isDefault: boolean
    isEnabled: boolean
    sortOrder: number
  }

  function emptyForm(): FormValues {
    return {
      code: '',
      name: '',
      description: '',
      directionAllowed: 'both',
      defaultCashBankAccountId: '',
      requiresReference: false,
      requiresBankAccount: false,
      requiresChequeDetails: false,
      settlementLagDays: 0,
      isCounterMethod: false,
      isDefault: false,
      isEnabled: true,
      sortOrder: 100,
    }
  }

  // Light-touch client mirror of PaymentMethodService's own two cross-field checks
  // (PAYMENT_METHOD.CHEQUE_REQUIRES_BANK_ACCOUNT / .COUNTER_METHOD_CANNOT_REQUIRE_BANK_OR_CHEQUE)
  // -- auto-corrects the obviously-inconsistent combination instead of letting the user submit
  // and bounce off a 422. The server still re-validates; this is purely a UX nicety.
  function reconcileFlags(f: FormValues): FormValues {
    const next = { ...f }
    if (next.requiresChequeDetails) next.requiresBankAccount = true
    if (next.isCounterMethod) {
      next.requiresBankAccount = false
      next.requiresChequeDetails = false
    }
    return next
  }

  let rows: PaymentMethodRow[] = []
  let loading = true
  let loadError = ''
  let includeDisabled = false
  let cashBankAccounts: PaymentCashBankAccountRow[] = []
  $: cashBankAccountLabel = new Map(
    cashBankAccounts.map((a) => [a.cashBankAccountId, a.bankName ? `${a.bankName} (${a.accountKind})` : `#${a.cashBankAccountId} (${a.accountKind})`]),
  )

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [methodResult, cashBankResult] = await Promise.all([
        paymentsApi.listPaymentMethods({ includeDisabled }),
        paymentsApi.listCashBankAccounts(),
      ])
      rows = [...methodResult.paymentMethods].sort((a, b) => a.sortOrder - b.sortOrder)
      cashBankAccounts = cashBankResult.cashBankAccounts
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : err instanceof ApiError ? err.detail : 'Could not load payment methods.'
    } finally {
      loading = false
    }
  }

  function toggleIncludeDisabled(): void {
    includeDisabled = !includeDisabled
    void loadList()
  }

  onMount(loadList)

  // ---- create modal ------------------------------------------------------------------------
  let modalOpen = false
  let submitting = false
  let formErrors: Record<string, string> = {}
  let form: FormValues = emptyForm()
  let idempotencyKey = ''

  function openCreate(): void {
    form = emptyForm()
    formErrors = {}
    idempotencyKey = api.newIdempotencyKey()
    modalOpen = true
  }

  function closeModal(): void {
    if (submitting) return
    modalOpen = false
  }

  function toOptional(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  function validateCreate(): boolean {
    const next: Record<string, string> = {}
    if (!form.code.trim()) next.code = 'Code is required.'
    if (!form.name.trim()) next.name = 'Name is required.'
    formErrors = next
    return Object.keys(next).length === 0
  }

  async function submitCreate(): Promise<void> {
    if (!validateCreate()) return
    const input: CreatePaymentMethodInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: toOptional(form.description),
      directionAllowed: form.directionAllowed,
      defaultCashBankAccountId: form.defaultCashBankAccountId === '' ? undefined : form.defaultCashBankAccountId,
      requiresReference: form.requiresReference,
      requiresBankAccount: form.requiresBankAccount,
      requiresChequeDetails: form.requiresChequeDetails,
      settlementLagDays: form.settlementLagDays,
      isCounterMethod: form.isCounterMethod,
      isDefault: form.isDefault,
      isEnabled: form.isEnabled,
      sortOrder: form.sortOrder,
    }
    submitting = true
    try {
      await paymentsApi.createPaymentMethod(input, idempotencyKey)
      toast.success(`Payment method "${input.name}" created.`)
      modalOpen = false
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
        if (err.fieldErrors) for (const fe of err.fieldErrors) formErrors[fe.path] = fe.message
      } else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not create the payment method.')
    } finally {
      submitting = false
    }
  }

  // ---- edit modal ---------------------------------------------------------------------------
  let editModalOpen = false
  let editSubmitting = false
  let editFormErrors: Record<string, string> = {}
  let editTarget: PaymentMethodRow | null = null
  let editForm: FormValues = emptyForm()
  let editIdempotencyKey = ''

  function rowToForm(row: PaymentMethodRow): FormValues {
    return {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      directionAllowed: row.directionAllowed,
      defaultCashBankAccountId: row.defaultCashBankAccountId ?? '',
      requiresReference: row.requiresReference,
      requiresBankAccount: row.requiresBankAccount,
      requiresChequeDetails: row.requiresChequeDetails,
      settlementLagDays: row.settlementLagDays,
      isCounterMethod: row.isCounterMethod,
      isDefault: row.isDefault,
      isEnabled: row.isEnabled,
      sortOrder: row.sortOrder,
    }
  }

  function openEdit(row: PaymentMethodRow): void {
    editTarget = row
    editForm = rowToForm(row)
    editFormErrors = {}
    editIdempotencyKey = api.newIdempotencyKey()
    editModalOpen = true
  }

  function closeEditModal(): void {
    if (editSubmitting) return
    editModalOpen = false
    editTarget = null
  }

  async function submitEdit(): Promise<void> {
    if (!editTarget) return
    editFormErrors = {}
    if (!editForm.name.trim()) {
      editFormErrors.name = 'Name is required.'
      return
    }
    const input: UpdatePaymentMethodInput = {
      name: editForm.name.trim(),
      description: toOptional(editForm.description),
      directionAllowed: editForm.directionAllowed,
      defaultCashBankAccountId: editForm.defaultCashBankAccountId === '' ? undefined : editForm.defaultCashBankAccountId,
      requiresReference: editForm.requiresReference,
      requiresBankAccount: editForm.requiresBankAccount,
      requiresChequeDetails: editForm.requiresChequeDetails,
      settlementLagDays: editForm.settlementLagDays,
      isCounterMethod: editForm.isCounterMethod,
      isDefault: editForm.isDefault,
      isEnabled: editForm.isEnabled,
      sortOrder: editForm.sortOrder,
    }
    editSubmitting = true
    try {
      await paymentsApi.updatePaymentMethod(editTarget.paymentMethodId, input, editIdempotencyKey)
      toast.success(`Payment method "${input.name}" updated.`)
      editModalOpen = false
      editTarget = null
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
        if (err.fieldErrors) for (const fe of err.fieldErrors) editFormErrors[fe.path] = fe.message
      } else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not update the payment method.')
    } finally {
      editSubmitting = false
    }
  }

  function directionLabel(d: 'in' | 'out' | 'both'): string {
    return d === 'in' ? 'Receipts only' : d === 'out' ? 'Payments only' : 'Both'
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Payment methods</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Cash, bank and other tender types available when recording a payment or receipt.</p>
    </div>
    <div class="flex items-center gap-3">
      <label class="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-300 cursor-pointer select-none">
        <input type="checkbox" checked={includeDisabled} on:change={toggleIncludeDisabled} />
        Show disabled
      </label>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
        on:click={openCreate}
      >
        <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
        New payment method
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
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Payment methods table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Code</th>
            <th class={headClass}>Name</th>
            <th class={headClass}>Direction</th>
            <th class={headClass}>Requires</th>
            <th class={headClass}>Counter</th>
            <th class={headClass}>Default</th>
            <th class={headClass}>Sort</th>
            <th class={headClass}>Status</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="9" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="9" class="py-10 px-4 text-center text-sm text-secondary-500">No payment methods yet.</td></tr>
          {:else}
            {#each rows as row (row.paymentMethodId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-mono font-medium text-secondary-900 dark:text-white`}>{row.code}</td>
                <td class={cellClass}>
                  {row.name}
                  {#if row.description}<p class="text-xs text-secondary-400">{row.description}</p>{/if}
                </td>
                <td class={cellClass}>{directionLabel(row.directionAllowed)}</td>
                <td class={cellClass}>
                  <div class="flex flex-wrap gap-1">
                    {#if row.requiresReference}<Badge tone="info">Reference</Badge>{/if}
                    {#if row.requiresBankAccount}<Badge tone="info">Bank account</Badge>{/if}
                    {#if row.requiresChequeDetails}<Badge tone="info">Cheque</Badge>{/if}
                    {#if !row.requiresReference && !row.requiresBankAccount && !row.requiresChequeDetails}
                      <span class="text-xs text-secondary-400">—</span>
                    {/if}
                  </div>
                </td>
                <td class={cellClass}>{row.isCounterMethod ? 'Yes' : '—'}</td>
                <td class={cellClass}>{row.isDefault ? 'Yes' : '—'}</td>
                <td class={cellClass}>{row.sortOrder}</td>
                <td class={cellClass}>
                  {#if row.isEnabled}<Badge tone="success">Enabled</Badge>{:else}<Badge tone="neutral">Disabled</Badge>{/if}
                </td>
                <td class={`${cellClass} text-right`}>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                    on:click={() => openEdit(row)}
                  >
                    <Icon icon={Icons.edit} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                    Edit
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

<!-- Create -->
<Modal open={modalOpen} title="New payment method" widthClass="max-w-2xl" onClose={closeModal}>
  <form id="new-payment-method-form" on:submit|preventDefault={submitCreate}>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="pm-code">Code<span class="text-danger-500"> *</span></label>
        <input id="pm-code" bind:value={form.code} class={inputClass} placeholder="e.g. IBFT" />
        {#if formErrors.code}<p class="text-xs text-danger-500 mt-1">{formErrors.code}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="pm-name">Name<span class="text-danger-500"> *</span></label>
        <input id="pm-name" bind:value={form.name} class={inputClass} placeholder="e.g. Online / IBFT" />
        {#if formErrors.name}<p class="text-xs text-danger-500 mt-1">{formErrors.name}</p>{/if}
      </div>
      <div class="sm:col-span-2">
        <label class={labelClass} for="pm-description">Description</label>
        <input id="pm-description" bind:value={form.description} class={inputClass} placeholder="Optional" />
      </div>
      <div>
        <label class={labelClass} for="pm-direction">Direction allowed</label>
        <select id="pm-direction" bind:value={form.directionAllowed} class={inputClass}>
          <option value="both">Both (pay + receive)</option>
          <option value="out">Payments only (out)</option>
          <option value="in">Receipts only (in)</option>
        </select>
      </div>
      <div>
        <label class={labelClass} for="pm-default-account">Default cash/bank account</label>
        <select id="pm-default-account" bind:value={form.defaultCashBankAccountId} class={inputClass}>
          <option value="">None</option>
          {#each cashBankAccounts as a (a.cashBankAccountId)}
            <option value={a.cashBankAccountId}>{cashBankAccountLabel.get(a.cashBankAccountId)}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class={labelClass} for="pm-settlement-lag">Settlement lag (days)</label>
        <input id="pm-settlement-lag" type="number" min="0" step="1" bind:value={form.settlementLagDays} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="pm-sort-order">Sort order</label>
        <input id="pm-sort-order" type="number" min="0" step="1" bind:value={form.sortOrder} class={inputClass} />
      </div>
      <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
        <label class={checkboxRowClass}>
          <input type="checkbox" bind:checked={form.requiresReference} />
          Requires reference number
        </label>
        <label class={checkboxRowClass}>
          <input type="checkbox" checked={form.requiresBankAccount} on:change={(e) => (form = reconcileFlags({ ...form, requiresBankAccount: (e.currentTarget as HTMLInputElement).checked }))} disabled={form.isCounterMethod} />
          Requires bank account
        </label>
        <label class={checkboxRowClass}>
          <input type="checkbox" checked={form.requiresChequeDetails} on:change={(e) => (form = reconcileFlags({ ...form, requiresChequeDetails: (e.currentTarget as HTMLInputElement).checked }))} disabled={form.isCounterMethod} />
          Requires cheque details
        </label>
        <label class={checkboxRowClass}>
          <input type="checkbox" checked={form.isCounterMethod} on:change={(e) => (form = reconcileFlags({ ...form, isCounterMethod: (e.currentTarget as HTMLInputElement).checked }))} />
          Counter method (cashier till)
        </label>
        <label class={checkboxRowClass}>
          <input type="checkbox" bind:checked={form.isDefault} />
          Default method
        </label>
        <label class={checkboxRowClass}>
          <input type="checkbox" bind:checked={form.isEnabled} />
          Enabled
        </label>
      </div>
    </div>
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeModal}
      disabled={submitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="new-payment-method-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={submitting}
    >
      {submitting ? 'Saving…' : 'Create'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Edit -->
<Modal open={editModalOpen} title={editTarget ? `Edit ${editTarget.name}` : 'Edit payment method'} widthClass="max-w-2xl" onClose={closeEditModal}>
  {#if editTarget}
    <form id="edit-payment-method-form" on:submit|preventDefault={submitEdit}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span class={labelClass}>Code</span>
          <p class="text-sm text-secondary-500 font-mono px-4 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl">{editTarget.code}</p>
          <p class="mt-1 text-xs text-secondary-400">Code cannot be changed once created.</p>
        </div>
        <div>
          <label class={labelClass} for="edit-pm-name">Name<span class="text-danger-500"> *</span></label>
          <input id="edit-pm-name" bind:value={editForm.name} class={inputClass} />
          {#if editFormErrors.name}<p class="text-xs text-danger-500 mt-1">{editFormErrors.name}</p>{/if}
        </div>
        <div class="sm:col-span-2">
          <label class={labelClass} for="edit-pm-description">Description</label>
          <input id="edit-pm-description" bind:value={editForm.description} class={inputClass} placeholder="Optional" />
        </div>
        <div>
          <label class={labelClass} for="edit-pm-direction">Direction allowed</label>
          <select id="edit-pm-direction" bind:value={editForm.directionAllowed} class={inputClass}>
            <option value="both">Both (pay + receive)</option>
            <option value="out">Payments only (out)</option>
            <option value="in">Receipts only (in)</option>
          </select>
        </div>
        <div>
          <label class={labelClass} for="edit-pm-default-account">Default cash/bank account</label>
          <select id="edit-pm-default-account" bind:value={editForm.defaultCashBankAccountId} class={inputClass}>
            <option value="">None</option>
            {#each cashBankAccounts as a (a.cashBankAccountId)}
              <option value={a.cashBankAccountId}>{cashBankAccountLabel.get(a.cashBankAccountId)}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class={labelClass} for="edit-pm-settlement-lag">Settlement lag (days)</label>
          <input id="edit-pm-settlement-lag" type="number" min="0" step="1" bind:value={editForm.settlementLagDays} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="edit-pm-sort-order">Sort order</label>
          <input id="edit-pm-sort-order" type="number" min="0" step="1" bind:value={editForm.sortOrder} class={inputClass} />
        </div>
        <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
          <label class={checkboxRowClass}>
            <input type="checkbox" bind:checked={editForm.requiresReference} />
            Requires reference number
          </label>
          <label class={checkboxRowClass}>
            <input type="checkbox" checked={editForm.requiresBankAccount} on:change={(e) => (editForm = reconcileFlags({ ...editForm, requiresBankAccount: (e.currentTarget as HTMLInputElement).checked }))} disabled={editForm.isCounterMethod} />
            Requires bank account
          </label>
          <label class={checkboxRowClass}>
            <input type="checkbox" checked={editForm.requiresChequeDetails} on:change={(e) => (editForm = reconcileFlags({ ...editForm, requiresChequeDetails: (e.currentTarget as HTMLInputElement).checked }))} disabled={editForm.isCounterMethod} />
            Requires cheque details
          </label>
          <label class={checkboxRowClass}>
            <input type="checkbox" checked={editForm.isCounterMethod} on:change={(e) => (editForm = reconcileFlags({ ...editForm, isCounterMethod: (e.currentTarget as HTMLInputElement).checked }))} />
            Counter method (cashier till)
          </label>
          <label class={checkboxRowClass}>
            <input type="checkbox" bind:checked={editForm.isDefault} />
            Default method
          </label>
          <label class={checkboxRowClass}>
            <input type="checkbox" bind:checked={editForm.isEnabled} />
            Enabled
          </label>
        </div>
      </div>
    </form>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeEditModal}
      disabled={editSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="edit-payment-method-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={editSubmitting}
    >
      {editSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>
