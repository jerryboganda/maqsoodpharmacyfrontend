<script lang="ts">
  // Admin CRUD for the expense-category taxonomy (P1: disable, never delete -- there is no DELETE
  // endpoint; "removing" a category means unchecking `isEnabled` in the edit modal, same pattern
  // as PaymentMethodsPage.svelte). `code` is immutable once created (mirrors PaymentMethodsPage's
  // own code-is-immutable convention) -- the edit modal shows it read-only.
  //
  // `sortOrder` is a plain integer count, not money/qty -- Rule M does not apply to it, so it uses
  // an ordinary `<input type="number">` bound to a JS number, same as PaymentMethodsPage's own
  // `settlementLagDays`/`sortOrder`.
  //
  // GL accounts are fetched directly in this file (not via accountingApi.listAccountsFlat()) per
  // this task's own instruction -- a small local duplicate, same reasoning as expenses.ts's own
  // cash-bank-accounts fetch (avoids depending on a sibling module another agent may be creating
  // concurrently). The *type* (GlAccountFlatRow) is still imported from the stable, pre-existing
  // barrel -- only the function call is duplicated.
  //
  // expensesApi is imported directly from './api/expenses' rather than through the './api' barrel
  // -- see ExpensesPage.svelte's header comment for why (index.ts is a shared registry file this
  // task's brief asked not to add new files' worth of churn to).
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { toast } from '../../stores/toast'
  import { api, ApiError, ApiNetworkError } from '../../api'
  import type { GlAccountFlatRow, GlAccountListResult } from '../../api'
  import { expensesApi } from '../../api/expenses'
  import type { ExpenseCategoryRow, CreateExpenseCategoryInput, UpdateExpenseCategoryInput } from '../../api/expenses'

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
    glAccountId: number | ''
    isEnabled: boolean
    isDefault: boolean
    sortOrder: number
    remarks: string
  }

  function emptyForm(): FormValues {
    return { code: '', name: '', description: '', glAccountId: '', isEnabled: true, isDefault: false, sortOrder: 100, remarks: '' }
  }

  function toOptional(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  // ---- list state -----------------------------------------------------------------------------
  let rows: ExpenseCategoryRow[] = []
  let loading = true
  let loadError = ''
  let glAccounts: GlAccountFlatRow[] = []
  $: postableActiveGlAccounts = glAccounts.filter((a) => a.isPostable && a.isActive)
  $: glAccountLabel = new Map(glAccounts.map((a) => [a.glAccountId, `${a.code} — ${a.name}`]))

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const [catResult, glResult] = await Promise.all([
        expensesApi.listExpenseCategories(),
        api.get<GlAccountListResult>('/gl/accounts'),
      ])
      rows = [...catResult.expenseCategories].sort((a, b) => a.sortOrder - b.sortOrder)
      glAccounts = glResult.data
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : err instanceof ApiError ? err.detail : 'Could not load expense categories.'
    } finally {
      loading = false
    }
  }

  onMount(loadList)

  // ---- create modal -----------------------------------------------------------------------------
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

  function validateCreate(): boolean {
    const next: Record<string, string> = {}
    if (!form.code.trim()) next.code = 'Code is required.'
    if (!form.name.trim()) next.name = 'Name is required.'
    if (form.glAccountId === '') next.glAccountId = 'Select a GL account.'
    formErrors = next
    return Object.keys(next).length === 0
  }

  async function submitCreate(): Promise<void> {
    if (!validateCreate()) return
    const input: CreateExpenseCategoryInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: toOptional(form.description),
      glAccountId: form.glAccountId as number,
      isEnabled: form.isEnabled,
      isDefault: form.isDefault,
      sortOrder: form.sortOrder,
      remarks: toOptional(form.remarks),
    }
    submitting = true
    try {
      await expensesApi.createExpenseCategory(input, idempotencyKey)
      toast.success(`Expense category "${input.name}" created.`)
      modalOpen = false
      await loadList()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
        if (err.fieldErrors) for (const fe of err.fieldErrors) formErrors[fe.path] = fe.message
      } else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not create the expense category.')
    } finally {
      submitting = false
    }
  }

  // ---- edit modal ---------------------------------------------------------------------------
  let editModalOpen = false
  let editSubmitting = false
  let editFormErrors: Record<string, string> = {}
  let editTarget: ExpenseCategoryRow | null = null
  let editForm: FormValues = emptyForm()
  let editIdempotencyKey = ''

  function rowToForm(row: ExpenseCategoryRow): FormValues {
    return {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      glAccountId: row.glAccountId,
      isEnabled: row.isEnabled,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      remarks: row.remarks ?? '',
    }
  }

  function openEdit(row: ExpenseCategoryRow): void {
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
    if (editForm.glAccountId === '') {
      editFormErrors.glAccountId = 'Select a GL account.'
      return
    }
    const input: UpdateExpenseCategoryInput = {
      name: editForm.name.trim(),
      description: toOptional(editForm.description),
      glAccountId: editForm.glAccountId as number,
      isEnabled: editForm.isEnabled,
      isDefault: editForm.isDefault,
      sortOrder: editForm.sortOrder,
      remarks: toOptional(editForm.remarks),
    }
    editSubmitting = true
    try {
      await expensesApi.updateExpenseCategory(editTarget.expenseCategoryId, input, editIdempotencyKey)
      toast.success(`Expense category "${input.name}" updated.`)
      editModalOpen = false
      editTarget = null
      await loadList()
    } catch (err) {
      // EXPENSE_CATEGORY.IN_USE (disabling an isSystem category already referenced by an expense
      // line) lands here too -- err.detail already names the category, surface it verbatim.
      if (err instanceof ApiError) {
        toast.error(err.detail)
        if (err.fieldErrors) for (const fe of err.fieldErrors) editFormErrors[fe.path] = fe.message
      } else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not update the expense category.')
    } finally {
      editSubmitting = false
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Expense categories</h1>
      <p class="text-body-sm mt-1 text-secondary-500">The taxonomy every expense line is coded to -- each category's GL account is debited when its parent expense is posted.</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"
      on:click={openCreate}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
      New category
    </button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Expense categories table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Code</th>
            <th class={headClass}>Name</th>
            <th class={headClass}>GL account</th>
            <th class={headClass}>Default</th>
            <th class={headClass}>Sort</th>
            <th class={headClass}>Status</th>
            <th class={`${headClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">No expense categories yet.</td></tr>
          {:else}
            {#each rows as row (row.expenseCategoryId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-mono font-medium text-secondary-900 dark:text-white`}>{row.code}</td>
                <td class={cellClass}>
                  <div class="flex items-center gap-2">
                    {row.name}
                    {#if row.isSystem}<Badge tone="info">System</Badge>{/if}
                  </div>
                  {#if row.description}<p class="text-xs text-secondary-400">{row.description}</p>{/if}
                </td>
                <td class={cellClass}>{glAccountLabel.get(row.glAccountId) ?? `#${row.glAccountId}`}</td>
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
<Modal open={modalOpen} title="New expense category" widthClass="max-w-2xl" onClose={closeModal}>
  <form id="new-expense-category-form" on:submit|preventDefault={submitCreate}>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="ec-code">Code<span class="text-danger-500"> *</span></label>
        <input id="ec-code" bind:value={form.code} class={inputClass} placeholder="e.g. FUEL" />
        {#if formErrors.code}<p class="text-xs text-danger-500 mt-1">{formErrors.code}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="ec-name">Name<span class="text-danger-500"> *</span></label>
        <input id="ec-name" bind:value={form.name} class={inputClass} placeholder="e.g. Fuel & Transport" />
        {#if formErrors.name}<p class="text-xs text-danger-500 mt-1">{formErrors.name}</p>{/if}
      </div>
      <div class="sm:col-span-2">
        <label class={labelClass} for="ec-description">Description</label>
        <input id="ec-description" bind:value={form.description} class={inputClass} placeholder="Optional" />
      </div>
      <div class="sm:col-span-2">
        <label class={labelClass} for="ec-gl-account">GL account<span class="text-danger-500"> *</span></label>
        <select id="ec-gl-account" bind:value={form.glAccountId} class={inputClass}>
          <option value="">Select GL account…</option>
          {#each postableActiveGlAccounts as a (a.glAccountId)}
            <option value={a.glAccountId}>{a.code} — {a.name}</option>
          {/each}
        </select>
        {#if formErrors.glAccountId}<p class="text-xs text-danger-500 mt-1">{formErrors.glAccountId}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="ec-sort-order">Sort order</label>
        <input id="ec-sort-order" type="number" min="0" step="1" bind:value={form.sortOrder} class={inputClass} />
      </div>
      <div class="sm:col-span-2">
        <label class={labelClass} for="ec-remarks">Remarks</label>
        <input id="ec-remarks" bind:value={form.remarks} class={inputClass} placeholder="Optional" />
      </div>
      <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
        <label class={checkboxRowClass}>
          <input type="checkbox" bind:checked={form.isDefault} />
          Default category
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
      form="new-expense-category-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={submitting}
    >
      {submitting ? 'Saving…' : 'Create'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Edit -->
<Modal open={editModalOpen} title={editTarget ? `Edit ${editTarget.name}` : 'Edit expense category'} widthClass="max-w-2xl" onClose={closeEditModal}>
  {#if editTarget}
    <form id="edit-expense-category-form" on:submit|preventDefault={submitEdit}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span class={labelClass}>Code</span>
          <p class="text-sm text-secondary-500 font-mono px-4 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl flex items-center gap-2">
            {editTarget.code}
            {#if editTarget.isSystem}<Badge tone="info">System</Badge>{/if}
          </p>
          <p class="mt-1 text-xs text-secondary-400">Code cannot be changed once created.</p>
        </div>
        <div>
          <label class={labelClass} for="edit-ec-name">Name<span class="text-danger-500"> *</span></label>
          <input id="edit-ec-name" bind:value={editForm.name} class={inputClass} />
          {#if editFormErrors.name}<p class="text-xs text-danger-500 mt-1">{editFormErrors.name}</p>{/if}
        </div>
        <div class="sm:col-span-2">
          <label class={labelClass} for="edit-ec-description">Description</label>
          <input id="edit-ec-description" bind:value={editForm.description} class={inputClass} placeholder="Optional" />
        </div>
        <div class="sm:col-span-2">
          <label class={labelClass} for="edit-ec-gl-account">GL account<span class="text-danger-500"> *</span></label>
          <select id="edit-ec-gl-account" bind:value={editForm.glAccountId} class={inputClass}>
            <option value="">Select GL account…</option>
            {#each postableActiveGlAccounts as a (a.glAccountId)}
              <option value={a.glAccountId}>{a.code} — {a.name}</option>
            {/each}
          </select>
          {#if editFormErrors.glAccountId}<p class="text-xs text-danger-500 mt-1">{editFormErrors.glAccountId}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="edit-ec-sort-order">Sort order</label>
          <input id="edit-ec-sort-order" type="number" min="0" step="1" bind:value={editForm.sortOrder} class={inputClass} />
        </div>
        <div class="sm:col-span-2">
          <label class={labelClass} for="edit-ec-remarks">Remarks</label>
          <input id="edit-ec-remarks" bind:value={editForm.remarks} class={inputClass} placeholder="Optional" />
        </div>
        <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
          <label class={checkboxRowClass}>
            <input type="checkbox" bind:checked={editForm.isDefault} />
            Default category
          </label>
          <label class={checkboxRowClass}>
            <input type="checkbox" bind:checked={editForm.isEnabled} />
            Enabled
          </label>
        </div>
        {#if editTarget.isSystem}
          <p class="sm:col-span-2 text-xs text-secondary-400">
            This is a system-seeded default category -- it can be renamed/re-pointed at a different GL account like any other, but disabling it while an expense line still references it is rejected by the server.
          </p>
        {/if}
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
      form="edit-expense-category-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={editSubmitting}
    >
      {editSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>
