<script lang="ts">
  // Wave 7: admin CRUD for option-list/option-item -- the generic P1 pick-list mechanism every
  // other module reads via settings.controller.ts's enabled-only `GET /settings/options/:key`.
  // This REPLACES the previous stopgap (a plain "type a key, hit Load" viewer) now that
  // `GET /option-lists` actually exists to enumerate which lists there are -- see
  // rebuild/apps/api/src/modules/settings/api/option-lists.controller.ts (read fully before
  // touching this file) for the exact five admin routes this page drives.
  //
  // Layout: two-pane master/detail (left = every option list, right = the selected list's items),
  // no precedent for this exact shape elsewhere in pharmacy/ (PaymentMethodsPage is the closest
  // admin-CRUD-over-a-lookup precedent for the item table/modals themselves; ExpensesPage is the
  // precedent for the list+filter+create+lifecycle-action shape in general).
  //
  // No money/quantity fields anywhere on option_item (options.ts's own schema), so Rule M/
  // DecimalInput do not apply here -- `sortOrder` is a plain bounded integer, same convention
  // PaymentMethodsPage already uses for its own `settlementLagDays`/`sortOrder` (`<input
  // type="number">` bound to a JS number, not DecimalInput).
  //
  // Permission gating: confirmed against every existing admin-CRUD pharmacy page (PaymentMethodsPage,
  // ExpenseCategoriesPage, ExpensesPage) that this codebase has NO client-side permission-aware UI
  // hiding anywhere -- `UserResponse` (src/lib/stores/session.ts) carries only `roles: string[]`,
  // never a resolved permission set, so there is nothing to gate on client-side without inventing a
  // new permission-fetch mechanism out of scope for this task. Matching that established
  // convention: create/edit/set-default controls are always rendered; a 403 (caller lacking
  // settings.option:create/:edit) surfaces through the same ApiError -> toast.error() path as every
  // other failure below, exactly like every other admin page in this codebase already does.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { toast } from '../../stores/toast'
  import { api, ApiError, ApiNetworkError, formatDate, todayYmd } from '../../api'
  import { optionsApi } from '../../api/options'
  import type { OptionListSummary, OptionItemRow, CreateOptionItemInput, UpdateOptionItemInput } from '../../api/options'
  import { branchesApi } from '../../api/branches'
  import type { BranchRow, UpdateBranchInput } from '../../api/branches'

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const checkboxRowClass = 'flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300'

  function errorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) return err.detail || err.message
    if (err instanceof ApiNetworkError) return err.message
    return fallback
  }
  function toastApiError(err: unknown, fallback: string): void {
    toast.error(errorMessage(err, fallback))
  }
  function toOptional(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  // ---------------------------------------------------------------------------------------------
  // Branches -- DRAP licence tracking (Wave 8, U-062/D18/R7). Small, independent surface (its own
  // GET/PATCH /settings/branches routes, its own permission `settings.branch`) bolted onto this
  // page rather than a new route -- most tenants have exactly one branch (tenant.ts's own "every
  // tenant starts with one branch, adding a second is data entry" convention), so a full
  // route/nav-entry for this is more plumbing than the surface deserves; it belongs wherever an
  // admin already looks for "business identity" settings, which is here.
  // ---------------------------------------------------------------------------------------------
  let branches: BranchRow[] = []
  let branchesLoading = true
  let branchesError = ''

  async function loadBranches(): Promise<void> {
    branchesLoading = true
    branchesError = ''
    try {
      branches = await branchesApi.listBranches()
    } catch (err) {
      branchesError = errorMessage(err, 'Could not load branches.')
    } finally {
      branchesLoading = false
    }
  }

  let branchEditOpen = false
  let branchEditTarget: BranchRow | null = null
  let branchEditForm = { name: '', addressLine1: '', addressLine2: '', city: '', drugSaleLicenceNo: '', drugLicenceExpiryDate: '' }
  let branchEditSubmitting = false

  function openBranchEdit(branch: BranchRow): void {
    branchEditTarget = branch
    branchEditForm = {
      name: branch.name,
      addressLine1: branch.addressLine1 ?? '',
      addressLine2: branch.addressLine2 ?? '',
      city: branch.city ?? '',
      drugSaleLicenceNo: branch.drugSaleLicenceNo ?? '',
      drugLicenceExpiryDate: branch.drugLicenceExpiryDate ?? '',
    }
    branchEditOpen = true
  }
  function closeBranchEdit(): void {
    branchEditOpen = false
    branchEditTarget = null
  }

  /** `''` -> `null` (clears the field server-side); non-empty -> the trimmed value. Mirrors the
   *  `toOptional` pattern above but for a PATCH that accepts explicit `null`, not just omission. */
  function toNullable(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  /** Mirrors notification.service.ts's own 60-day `LICENCE_EXPIRY_WARNING_DAYS` window (a
   *  defensible default that task picked, not a DRAP-mandated number -- see that file's header
   *  comment) purely for this table's own visual badge; the actual alert is server-computed and
   *  surfaced via NotificationsPage, this is just "don't make the admin open a modal to notice". */
  function licenceTone(dateStr: string | null): 'danger' | 'warning' | 'neutral' {
    if (!dateStr) return 'neutral'
    const days = Math.round((new Date(`${dateStr}T00:00:00`).getTime() - new Date(`${todayYmd()}T00:00:00`).getTime()) / 86_400_000)
    if (days < 0) return 'danger'
    if (days <= 60) return 'warning'
    return 'neutral'
  }

  async function submitBranchEdit(): Promise<void> {
    if (!branchEditTarget) return
    branchEditSubmitting = true
    try {
      const input: UpdateBranchInput = {
        name: branchEditForm.name.trim() || undefined,
        addressLine1: toNullable(branchEditForm.addressLine1),
        addressLine2: toNullable(branchEditForm.addressLine2),
        city: toNullable(branchEditForm.city),
        drugSaleLicenceNo: toNullable(branchEditForm.drugSaleLicenceNo),
        drugLicenceExpiryDate: toNullable(branchEditForm.drugLicenceExpiryDate),
      }
      const updated = await branchesApi.updateBranch(branchEditTarget.branchId, input)
      branches = branches.map((b) => (b.branchId === updated.branchId ? updated : b))
      toast.success('Branch updated.')
      closeBranchEdit()
    } catch (err) {
      toastApiError(err, 'Could not update this branch.')
    } finally {
      branchEditSubmitting = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Left pane: every option list.
  // ---------------------------------------------------------------------------------------------
  let lists: OptionListSummary[] = []
  let listsLoading = true
  let listsError = ''
  let selectedListCode: string | null = null
  $: selectedList = lists.find((l) => l.listCode === selectedListCode) ?? null
  $: sortedLists = [...lists].sort((a, b) => a.name.localeCompare(b.name))

  async function loadLists(preserveSelection = true): Promise<void> {
    listsLoading = true
    listsError = ''
    try {
      lists = await optionsApi.listOptionLists()
      if (!preserveSelection || !selectedListCode || !lists.some((l) => l.listCode === selectedListCode)) {
        if (lists.length > 0) void selectList(lists[0].listCode)
        else selectedListCode = null
      }
    } catch (err) {
      listsError = errorMessage(err, 'Could not load option lists.')
    } finally {
      listsLoading = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Right pane: the selected list's items (admin view -- includes disabled rows).
  // ---------------------------------------------------------------------------------------------
  let items: OptionItemRow[] = []
  let itemsLoading = false
  let itemsError = ''
  $: sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

  async function selectList(listCode: string): Promise<void> {
    selectedListCode = listCode
    await loadItems(listCode)
  }

  async function loadItems(listCode: string): Promise<void> {
    itemsLoading = true
    itemsError = ''
    try {
      items = await optionsApi.listOptionItems(listCode)
    } catch (err) {
      items = []
      itemsError = errorMessage(err, 'Could not load items for this list.')
    } finally {
      itemsLoading = false
    }
  }

  onMount(() => {
    void loadLists()
    void loadBranches()
  })

  // ---------------------------------------------------------------------------------------------
  // Create item modal -- disabled entirely (button + modal never opens) when the selected list
  // isn't admin-extensible, mirroring SettingsService.createOptionItem's own
  // OPTION_LIST.NOT_ADMIN_EXTENSIBLE 422 client-side so the action doesn't even invite a doomed
  // request.
  // ---------------------------------------------------------------------------------------------
  type CreateForm = { code: string; name: string; nameUr: string; description: string; groupLabel: string; sortOrder: number; isEnabled: boolean }
  function emptyCreateForm(): CreateForm {
    return { code: '', name: '', nameUr: '', description: '', groupLabel: '', sortOrder: 100, isEnabled: true }
  }

  let createOpen = false
  let createSubmitting = false
  let createFormErrors: Record<string, string> = {}
  let createForm: CreateForm = emptyCreateForm()
  let createIdempotencyKey = ''

  function openCreate(): void {
    if (!selectedList || !selectedList.isAdminExtensible) return
    createForm = emptyCreateForm()
    createFormErrors = {}
    createIdempotencyKey = api.newIdempotencyKey()
    createOpen = true
  }
  function closeCreate(): void {
    if (createSubmitting) return
    createOpen = false
  }

  function validateCreate(form: CreateForm): Record<string, string> {
    const errors: Record<string, string> = {}
    const code = form.code.trim()
    if (!code) errors.code = 'Code is required.'
    else if (code.length > 32) errors.code = 'Code must be 32 characters or fewer.'
    const name = form.name.trim()
    if (!name) errors.name = 'Name is required.'
    else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.'
    if (form.nameUr.trim().length > 120) errors.nameUr = 'Urdu name must be 120 characters or fewer.'
    if (form.description.trim().length > 255) errors.description = 'Description must be 255 characters or fewer.'
    if (form.groupLabel.trim().length > 64) errors.groupLabel = 'Group label must be 64 characters or fewer.'
    if (!Number.isInteger(form.sortOrder) || form.sortOrder < 0 || form.sortOrder > 65535) {
      errors.sortOrder = 'Sort order must be a whole number between 0 and 65535.'
    }
    return errors
  }

  async function submitCreate(): Promise<void> {
    if (!selectedList) return
    if (!selectedList.isAdminExtensible) {
      toast.error(`"${selectedList.name}" is fixed/system-defined and does not accept admin-added items.`)
      return
    }
    const errors = validateCreate(createForm)
    createFormErrors = errors
    if (Object.keys(errors).length > 0) return

    const input: CreateOptionItemInput = {
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      nameUr: toOptional(createForm.nameUr),
      description: toOptional(createForm.description),
      groupLabel: toOptional(createForm.groupLabel),
      sortOrder: createForm.sortOrder,
      isEnabled: createForm.isEnabled,
    }
    createSubmitting = true
    try {
      await optionsApi.createOptionItem(selectedList.listCode, input, createIdempotencyKey)
      toast.success(`Option "${input.name}" created.`)
      createOpen = false
      await Promise.all([loadItems(selectedList.listCode), loadLists()])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
        if (err.fieldErrors) for (const fe of err.fieldErrors) createFormErrors[fe.path] = fe.message
      } else {
        toastApiError(err, 'Could not create this option item.')
      }
    } finally {
      createSubmitting = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Edit item modal. `code` is immutable (shown read-only). The "Enabled" checkbox is itself
  // locked whenever the backend would 422 an `isEnabled: false` patch for this row --
  // OPTION_ITEM.SYSTEM_ITEM_CANNOT_BE_DISABLED (isSystem) / OPTION_LIST.DISABLE_NOT_ALLOWED
  // (parent list's allowsDisable) -- see SettingsService.updateOptionItem's own comment for the
  // exact two checks this mirrors.
  // ---------------------------------------------------------------------------------------------
  type EditForm = { name: string; nameUr: string; description: string; groupLabel: string; sortOrder: number; isEnabled: boolean }

  let editOpen = false
  let editSubmitting = false
  let editFormErrors: Record<string, string> = {}
  let editTarget: OptionItemRow | null = null
  let editForm: EditForm = { name: '', nameUr: '', description: '', groupLabel: '', sortOrder: 100, isEnabled: true }
  let editIdempotencyKey = ''

  $: editCanDisable = !!editTarget && !editTarget.isSystem && !!selectedList?.allowsDisable

  function rowToEditForm(row: OptionItemRow): EditForm {
    return {
      name: row.name,
      nameUr: row.nameUr ?? '',
      description: row.description ?? '',
      groupLabel: row.groupLabel ?? '',
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
    }
  }

  function openEdit(row: OptionItemRow): void {
    editTarget = row
    editForm = rowToEditForm(row)
    editFormErrors = {}
    editIdempotencyKey = api.newIdempotencyKey()
    editOpen = true
  }
  function closeEdit(): void {
    if (editSubmitting) return
    editOpen = false
    editTarget = null
  }

  function validateEdit(form: EditForm): Record<string, string> {
    const errors: Record<string, string> = {}
    const name = form.name.trim()
    if (!name) errors.name = 'Name is required.'
    else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.'
    if (form.nameUr.trim().length > 120) errors.nameUr = 'Urdu name must be 120 characters or fewer.'
    if (form.description.trim().length > 255) errors.description = 'Description must be 255 characters or fewer.'
    if (form.groupLabel.trim().length > 64) errors.groupLabel = 'Group label must be 64 characters or fewer.'
    if (!Number.isInteger(form.sortOrder) || form.sortOrder < 0 || form.sortOrder > 65535) {
      errors.sortOrder = 'Sort order must be a whole number between 0 and 65535.'
    }
    return errors
  }

  /** Diff-only patch: UpdateOptionItemSchema 422s an empty body, and blindly resending
   *  `isEnabled: false` would 422 SYSTEM_ITEM_CANNOT_BE_DISABLED/DISABLE_NOT_ALLOWED any time it's
   *  resent for a row this UI already keeps disabled (checkbox locked -- see `editCanDisable`
   *  above), even when the user never touched that field. */
  function buildEditPatch(target: OptionItemRow, form: EditForm): UpdateOptionItemInput {
    const patch: UpdateOptionItemInput = {}
    const name = form.name.trim()
    if (name !== target.name) patch.name = name
    const nameUr = toOptional(form.nameUr) ?? null
    if (nameUr !== (target.nameUr ?? null)) patch.nameUr = nameUr
    const description = toOptional(form.description) ?? null
    if (description !== (target.description ?? null)) patch.description = description
    const groupLabel = toOptional(form.groupLabel) ?? null
    if (groupLabel !== (target.groupLabel ?? null)) patch.groupLabel = groupLabel
    if (form.sortOrder !== target.sortOrder) patch.sortOrder = form.sortOrder
    if (form.isEnabled !== target.isEnabled) patch.isEnabled = form.isEnabled
    return patch
  }

  async function submitEdit(): Promise<void> {
    if (!editTarget || !selectedList) return
    const errors = validateEdit(editForm)
    editFormErrors = errors
    if (Object.keys(errors).length > 0) return

    const patch = buildEditPatch(editTarget, editForm)
    if (Object.keys(patch).length === 0) {
      editOpen = false
      editTarget = null
      return
    }

    editSubmitting = true
    try {
      await optionsApi.updateOptionItem(selectedList.listCode, editTarget.optionItemId, patch, editIdempotencyKey)
      toast.success(`Option "${editForm.name.trim()}" updated.`)
      editOpen = false
      editTarget = null
      await loadItems(selectedList.listCode)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
        if (err.fieldErrors) for (const fe of err.fieldErrors) editFormErrors[fe.path] = fe.message
      } else {
        toastApiError(err, 'Could not update this option item.')
      }
    } finally {
      editSubmitting = false
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Set default -- atomic swap, no body, no Idempotency-Key (see optionsApi.setDefaultOptionItem's
  // own comment). Disabled client-side whenever the row is itself disabled or already the default,
  // mirroring OPTION_ITEM.CANNOT_DEFAULT_DISABLED so the button doesn't even invite a doomed
  // request.
  // ---------------------------------------------------------------------------------------------
  let settingDefaultId: number | null = null

  function canSetDefault(row: OptionItemRow): boolean {
    return row.isEnabled && !row.isDefault
  }

  async function performSetDefault(row: OptionItemRow): Promise<void> {
    if (!selectedList || !canSetDefault(row) || settingDefaultId !== null) return
    settingDefaultId = row.optionItemId
    try {
      await optionsApi.setDefaultOptionItem(selectedList.listCode, row.optionItemId)
      toast.success(`"${row.name}" is now the default for "${selectedList.name}".`)
      await loadItems(selectedList.listCode)
    } catch (err) {
      toastApiError(err, 'Could not set this option as the default.')
    } finally {
      settingDefaultId = null
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Settings &middot; Option lists</h1>
      <p class="text-body-sm mt-1 text-secondary-500">
        Admin-curated pick-lists every other module reads from -- payment methods, expense categories, cancel/return reasons, and more.
      </p>
    </div>
    <button
      type="button"
      class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
      on:click={() => loadLists()}
      disabled={listsLoading}
    >
      <Icon icon={Icons.refresh} className={`w-4 h-4 text-secondary-500 ${listsLoading ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  </div>

  {#if listsError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm flex items-center justify-between gap-4">
      <span>{listsError}</span>
      <button type="button" class="px-3 py-1.5 text-xs font-medium bg-danger-600 text-white hover:opacity-90 rounded-lg transition-opacity flex-shrink-0" on:click={() => loadLists()}>
        Retry
      </button>
    </div>
  {/if}

  <!-- Branches -- DRAP licence tracking (Wave 8, U-062/D18/R7) -->
  <div class="card rounded-xl p-0 overflow-hidden">
    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center gap-2">
      <Icon icon={Icons.shield} className="w-4 h-4 text-secondary-400" />
      <h2 class="text-sm font-semibold text-secondary-900 dark:text-white">Branches &middot; DRAP licence</h2>
    </div>
    <p class="px-4 pt-3 text-xs text-secondary-500 dark:text-secondary-400">
      Address and drug-sale licence details per branch. Full DRAP compliance scope is still pending a licensed pharmacist/regulatory
      consultant's sign-off -- this is record-keeping the system can hold today, not a claim of legal compliance.
    </p>
    {#if branchesError}
      <div class="mx-4 mt-3 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-3 text-sm flex items-center justify-between gap-4">
        <span>{branchesError}</span>
        <button type="button" class="px-3 py-1.5 text-xs font-medium bg-danger-600 text-white hover:opacity-90 rounded-lg transition-opacity flex-shrink-0" on:click={loadBranches}>
          Retry
        </button>
      </div>
    {/if}
    {#if branchesLoading}
      <p class="p-6 text-center text-sm text-secondary-500">Loading…</p>
    {:else if branches.length === 0}
      <p class="p-6 text-center text-sm text-secondary-500">No branches found.</p>
    {:else}
      <div class="overflow-x-auto scrollbar-thin">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-900/30">
            <tr>
              <th class={headClass}>Branch</th>
              <th class={headClass}>Address</th>
              <th class={headClass}>Licence No.</th>
              <th class={headClass}>Licence expiry</th>
              <th class={`${headClass} w-10`}></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
            {#each branches as branch (branch.branchId)}
              <tr>
                <td class={cellClass}>
                  <p class="font-medium text-secondary-900 dark:text-white">{branch.name}</p>
                  <p class="text-xs text-secondary-400 font-mono">{branch.code}{branch.isDefault ? ' -- default' : ''}</p>
                </td>
                <td class={cellClass}>{[branch.addressLine1, branch.addressLine2, branch.city].filter(Boolean).join(', ') || '—'}</td>
                <td class={cellClass}>{branch.drugSaleLicenceNo ?? '—'}</td>
                <td class={cellClass}>
                  {#if branch.drugLicenceExpiryDate}
                    <Badge tone={licenceTone(branch.drugLicenceExpiryDate)}>{formatDate(branch.drugLicenceExpiryDate)}</Badge>
                  {:else}
                    <span class="text-secondary-400">—</span>
                  {/if}
                </td>
                <td class={cellClass}>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 dark:border-surface-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    on:click={() => openBranchEdit(branch)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Left pane: option lists -->
    <div class="lg:col-span-4 card rounded-xl p-0 overflow-hidden self-start">
      <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center gap-2">
        <Icon icon={Icons.list} className="w-4 h-4 text-secondary-400" />
        <h2 class="text-sm font-semibold text-secondary-900 dark:text-white">Option lists</h2>
      </div>
      {#if listsLoading && lists.length === 0}
        <p class="p-6 text-center text-sm text-secondary-500">Loading…</p>
      {:else if lists.length === 0}
        <p class="p-6 text-center text-sm text-secondary-500">No option lists found.</p>
      {:else}
        <div class="max-h-[70vh] overflow-y-auto">
          {#each sortedLists as list (list.listCode)}
            <button
              type="button"
              class={`w-full text-left px-4 py-3 border-b last:border-b-0 border-surface-200 dark:border-surface-700 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 ${
                selectedListCode === list.listCode ? 'bg-theme-primary/5 dark:bg-theme-primary/10 border-l-4 border-l-theme-primary' : 'border-l-4 border-l-transparent'
              }`}
              on:click={() => selectList(list.listCode)}
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-semibold text-secondary-900 dark:text-white">{list.name}</span>
                <Badge tone="neutral">{list.itemCount}</Badge>
              </div>
              {#if list.description}<p class="text-xs text-secondary-500 mt-0.5 line-clamp-2">{list.description}</p>{/if}
              <p class="font-mono text-[11px] text-secondary-400 mt-1">{list.listCode}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                {#if list.isAdminExtensible}<Badge tone="success">Extensible</Badge>{:else}<Badge tone="neutral">Fixed list</Badge>{/if}
                {#if list.allowsDisable}<Badge tone="info">Disable allowed</Badge>{:else}<Badge tone="warning">Cannot disable</Badge>{/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Right pane: selected list's items -->
    <div class="lg:col-span-8 card rounded-xl p-6">
      {#if !selectedList}
        <p class="text-sm text-secondary-500 py-10 text-center">Select an option list on the left to view its items.</p>
      {:else}
        <div class="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 class="heading-5 text-secondary-900 dark:text-white">{selectedList.name}</h2>
            {#if selectedList.description}<p class="text-xs text-secondary-500 mt-0.5">{selectedList.description}</p>{/if}
            <p class="font-mono text-[11px] text-secondary-400 mt-1">{selectedList.listCode}</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={openCreate}
            disabled={!selectedList.isAdminExtensible}
            title={selectedList.isAdminExtensible ? '' : 'This list is fixed/system-defined and does not accept admin-added items.'}
          >
            <Icon icon={Icons.plus} className="w-[18px] h-[18px]" />
            Add item
          </button>
        </div>

        {#if itemsError}
          <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm mb-4">
            {itemsError}
          </div>
        {/if}

        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Option items table">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={headClass}>Code</th>
                  <th class={headClass}>Name</th>
                  <th class={headClass}>Urdu name</th>
                  <th class={headClass}>Group</th>
                  <th class={headClass}>Sort</th>
                  <th class={headClass}>Status</th>
                  <th class={headClass}>Default</th>
                  <th class={`${headClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#if itemsLoading}
                  <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
                {:else if sortedItems.length === 0}
                  <tr><td colspan="8" class="py-10 px-4 text-center text-sm text-secondary-500">No items in this list yet.</td></tr>
                {:else}
                  {#each sortedItems as row (row.optionItemId)}
                    <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                      <td class={`${cellClass} font-mono font-medium text-secondary-900 dark:text-white`}>
                        {row.code}
                        {#if row.isSystem}<span class="ml-1"><Badge tone="neutral">System</Badge></span>{/if}
                      </td>
                      <td class={cellClass}>{row.name}</td>
                      <td class={cellClass}>{row.nameUr ?? '—'}</td>
                      <td class={cellClass}>{row.groupLabel ?? '—'}</td>
                      <td class={cellClass}>{row.sortOrder}</td>
                      <td class={cellClass}>
                        {#if row.isEnabled}<Badge tone="success">Enabled</Badge>{:else}<Badge tone="neutral">Disabled</Badge>{/if}
                      </td>
                      <td class={cellClass}>
                        {#if row.isDefault}
                          <Badge tone="info">
                            <Icon icon={Icons.starFilled} className="w-3 h-3" />
                            Default
                          </Badge>
                        {/if}
                      </td>
                      <td class={`${cellClass} text-right`}>
                        <div class="inline-flex items-center gap-2">
                          <button
                            type="button"
                            class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                            on:click={() => openEdit(row)}
                          >
                            <Icon icon={Icons.edit} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            Edit
                          </button>
                          <button
                            type="button"
                            class="px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            on:click={() => performSetDefault(row)}
                            disabled={!canSetDefault(row) || settingDefaultId === row.optionItemId}
                            title={!row.isEnabled ? 'Enable this item before making it the default.' : row.isDefault ? 'Already the default.' : 'Make this the default for the list.'}
                          >
                            <Icon icon={Icons.star} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            {settingDefaultId === row.optionItemId ? 'Setting…' : 'Set default'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Create item -->
<Modal open={createOpen} title={selectedList ? `New item in ${selectedList.name}` : 'New item'} widthClass="max-w-2xl" onClose={closeCreate}>
  <form id="new-option-item-form" on:submit|preventDefault={submitCreate}>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class={labelClass} for="oi-code">Code<span class="text-danger-500"> *</span></label>
        <input id="oi-code" bind:value={createForm.code} class={inputClass} placeholder="e.g. crypto_wallet" maxlength="32" />
        {#if createFormErrors.code}<p class="text-xs text-danger-500 mt-1">{createFormErrors.code}</p>{/if}
        <p class="mt-1 text-xs text-secondary-400">Stable, machine-readable. Cannot be changed once created.</p>
      </div>
      <div>
        <label class={labelClass} for="oi-name">Name<span class="text-danger-500"> *</span></label>
        <input id="oi-name" bind:value={createForm.name} class={inputClass} placeholder="e.g. Crypto wallet" maxlength="120" />
        {#if createFormErrors.name}<p class="text-xs text-danger-500 mt-1">{createFormErrors.name}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="oi-name-ur">Urdu name</label>
        <input id="oi-name-ur" bind:value={createForm.nameUr} class={inputClass} placeholder="Optional" maxlength="120" />
        {#if createFormErrors.nameUr}<p class="text-xs text-danger-500 mt-1">{createFormErrors.nameUr}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="oi-group">Group label</label>
        <input id="oi-group" bind:value={createForm.groupLabel} class={inputClass} placeholder="Optional, e.g. Digital wallet" maxlength="64" />
        {#if createFormErrors.groupLabel}<p class="text-xs text-danger-500 mt-1">{createFormErrors.groupLabel}</p>{/if}
      </div>
      <div class="sm:col-span-2">
        <label class={labelClass} for="oi-description">Description</label>
        <input id="oi-description" bind:value={createForm.description} class={inputClass} placeholder="Optional" maxlength="255" />
        {#if createFormErrors.description}<p class="text-xs text-danger-500 mt-1">{createFormErrors.description}</p>{/if}
      </div>
      <div>
        <label class={labelClass} for="oi-sort">Sort order</label>
        <input id="oi-sort" type="number" min="0" max="65535" step="1" bind:value={createForm.sortOrder} class={inputClass} />
        {#if createFormErrors.sortOrder}<p class="text-xs text-danger-500 mt-1">{createFormErrors.sortOrder}</p>{/if}
      </div>
      <div class="flex items-end">
        <label class={checkboxRowClass}>
          <input type="checkbox" bind:checked={createForm.isEnabled} />
          Enabled
        </label>
      </div>
    </div>
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeCreate}
      disabled={createSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="new-option-item-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={createSubmitting}
    >
      {createSubmitting ? 'Saving…' : 'Create'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Edit item -->
<Modal open={editOpen} title={editTarget ? `Edit ${editTarget.name}` : 'Edit item'} widthClass="max-w-2xl" onClose={closeEdit}>
  {#if editTarget}
    <form id="edit-option-item-form" on:submit|preventDefault={submitEdit}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span class={labelClass}>Code</span>
          <p class="text-sm text-secondary-500 font-mono px-4 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl">{editTarget.code}</p>
          <p class="mt-1 text-xs text-secondary-400">Code cannot be changed once created.</p>
        </div>
        <div>
          <label class={labelClass} for="edit-oi-name">Name<span class="text-danger-500"> *</span></label>
          <input id="edit-oi-name" bind:value={editForm.name} class={inputClass} maxlength="120" />
          {#if editFormErrors.name}<p class="text-xs text-danger-500 mt-1">{editFormErrors.name}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="edit-oi-name-ur">Urdu name</label>
          <input id="edit-oi-name-ur" bind:value={editForm.nameUr} class={inputClass} placeholder="Optional" maxlength="120" />
          {#if editFormErrors.nameUr}<p class="text-xs text-danger-500 mt-1">{editFormErrors.nameUr}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="edit-oi-group">Group label</label>
          <input id="edit-oi-group" bind:value={editForm.groupLabel} class={inputClass} placeholder="Optional" maxlength="64" />
          {#if editFormErrors.groupLabel}<p class="text-xs text-danger-500 mt-1">{editFormErrors.groupLabel}</p>{/if}
        </div>
        <div class="sm:col-span-2">
          <label class={labelClass} for="edit-oi-description">Description</label>
          <input id="edit-oi-description" bind:value={editForm.description} class={inputClass} placeholder="Optional" maxlength="255" />
          {#if editFormErrors.description}<p class="text-xs text-danger-500 mt-1">{editFormErrors.description}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="edit-oi-sort">Sort order</label>
          <input id="edit-oi-sort" type="number" min="0" max="65535" step="1" bind:value={editForm.sortOrder} class={inputClass} />
          {#if editFormErrors.sortOrder}<p class="text-xs text-danger-500 mt-1">{editFormErrors.sortOrder}</p>{/if}
        </div>
        <div class="flex flex-col justify-end gap-1">
          <label class={checkboxRowClass}>
            <input type="checkbox" bind:checked={editForm.isEnabled} disabled={!editCanDisable} />
            Enabled
          </label>
          {#if !editCanDisable}
            <p class="text-xs text-secondary-400">
              {editTarget.isSystem
                ? 'System-seeded item -- cannot be disabled.'
                : 'This list does not allow disabling its items.'}
            </p>
          {/if}
        </div>
      </div>
    </form>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeEdit}
      disabled={editSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="edit-option-item-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={editSubmitting}
    >
      {editSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Edit branch (Wave 8, U-062/D18/R7) -->
<Modal open={branchEditOpen} title={branchEditTarget ? `Edit ${branchEditTarget.name}` : 'Edit branch'} widthClass="max-w-2xl" onClose={closeBranchEdit}>
  {#if branchEditTarget}
    <form id="edit-branch-form" on:submit|preventDefault={submitBranchEdit}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class={labelClass} for="edit-branch-name">Branch name<span class="text-danger-500"> *</span></label>
          <input id="edit-branch-name" bind:value={branchEditForm.name} class={inputClass} maxlength="160" />
        </div>
        <div>
          <label class={labelClass} for="edit-branch-addr1">Address line 1</label>
          <input id="edit-branch-addr1" bind:value={branchEditForm.addressLine1} class={inputClass} placeholder="Optional" maxlength="255" />
        </div>
        <div>
          <label class={labelClass} for="edit-branch-addr2">Address line 2</label>
          <input id="edit-branch-addr2" bind:value={branchEditForm.addressLine2} class={inputClass} placeholder="Optional" maxlength="255" />
        </div>
        <div>
          <label class={labelClass} for="edit-branch-city">City</label>
          <input id="edit-branch-city" bind:value={branchEditForm.city} class={inputClass} placeholder="Optional" maxlength="80" />
        </div>
        <div></div>
        <div>
          <label class={labelClass} for="edit-branch-licence-no">Drug sale licence no.</label>
          <input id="edit-branch-licence-no" bind:value={branchEditForm.drugSaleLicenceNo} class={inputClass} placeholder="Optional" maxlength="64" />
        </div>
        <div>
          <label class={labelClass} for="edit-branch-licence-expiry">Drug sale licence expiry</label>
          <input id="edit-branch-licence-expiry" type="date" bind:value={branchEditForm.drugLicenceExpiryDate} class={inputClass} />
        </div>
      </div>
      <p class="mt-4 text-xs text-secondary-400">
        Whether DRAP requires a drug-sale licence to be recorded for a retail dispensing pharmacy at all is still open pending a
        pharmacist/regulatory consultant's sign-off -- these fields exist so the record can be kept once that's confirmed; leaving
        them blank has no other effect.
      </p>
    </form>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      on:click={closeBranchEdit}
      disabled={branchEditSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="edit-branch-form"
      class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={branchEditSubmitting || !branchEditForm.name.trim()}
    >
      {branchEditSubmitting ? 'Saving…' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>
