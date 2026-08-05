<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { visibilityApi, formatDateTime, ApiError, ApiNetworkError } from '../../api'
  import type { VisibilityScope, VisibilitySource, VisibilityWorkbenchRow } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const checkboxClass = 'rounded border-surface-300 dark:border-surface-700 text-theme-primary focus:ring-theme-primary/30'

  const SCOPES: VisibilityScope[] = ['pos', 'purchase', 'reports', 'stock_list']
  const SCOPE_LABEL: Record<VisibilityScope, string> = { pos: 'POS', purchase: 'Purchasing', reports: 'Reports', stock_list: 'Stock list' }

  // -----------------------------------------------------------------------------------------
  // Workbench list
  // -----------------------------------------------------------------------------------------
  let rows: VisibilityWorkbenchRow[] = []
  let hiddenCount = 0
  let visibleCount = 0
  let loading = true
  let loadError = ''

  let filterScope: VisibilityScope | '' = ''
  let filterSource: VisibilitySource | '' = ''
  let filterQ = ''

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await visibilityApi.workbench({
        scope: filterScope || undefined,
        source: filterSource || undefined,
        q: filterQ.trim() || undefined,
        limit: 200,
      })
      rows = result.data
      hiddenCount = result.meta.hiddenCount
      visibleCount = result.meta.visibleCount
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load the visibility workbench.'
    } finally {
      loading = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Single-item override
  // -----------------------------------------------------------------------------------------
  let singleModalOpen = false
  let singleSubmitting = false
  let singleError = ''
  let singleItemId = ''
  let singleScopes: VisibilityScope[] = []
  let singleVisible = true
  let singleReason = ''

  function openSingle(): void {
    singleItemId = ''
    singleScopes = []
    singleVisible = false
    singleReason = ''
    singleError = ''
    singleModalOpen = true
  }
  function closeSingleModal(): void {
    if (singleSubmitting) return
    singleModalOpen = false
  }
  async function submitSingle(): Promise<void> {
    singleError = ''
    const itemId = Number(singleItemId)
    if (!Number.isInteger(itemId) || itemId <= 0) {
      singleError = 'Enter a valid item id.'
      return
    }
    if (singleScopes.length === 0) {
      singleError = 'Select at least one scope.'
      return
    }
    singleSubmitting = true
    try {
      await visibilityApi.setItemVisibility(itemId, {
        scopes: singleScopes.map((scope) => ({ scope, isVisible: singleVisible })),
        reason: singleReason.trim() || undefined,
      })
      toast.success('Visibility updated.')
      singleModalOpen = false
      await load()
    } catch (err) {
      if (err instanceof ApiError) singleError = err.detail || err.message
      else if (err instanceof ApiNetworkError) singleError = err.message
      else singleError = 'Could not update visibility.'
    } finally {
      singleSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Bulk action (with a mandatory dry-run preview before it actually writes anything)
  // -----------------------------------------------------------------------------------------
  let bulkModalOpen = false
  let bulkSubmitting = false
  let bulkError = ''
  let bulkItemIds = ''
  let bulkQ = ''
  let bulkScopes: VisibilityScope[] = []
  let bulkVisible = false
  let bulkReason = ''
  let bulkPreviewCount: number | null = null

  function openBulk(): void {
    bulkItemIds = ''
    bulkQ = ''
    bulkScopes = []
    bulkVisible = false
    bulkReason = ''
    bulkPreviewCount = null
    bulkError = ''
    bulkModalOpen = true
  }
  function closeBulkModal(): void {
    if (bulkSubmitting) return
    bulkModalOpen = false
  }
  function parseBulkItemIds(): number[] | undefined {
    const ids = bulkItemIds
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
    return ids.length > 0 && ids.every((n) => Number.isInteger(n) && n > 0) ? ids : undefined
  }
  function validateBulkForm(): string {
    const itemIds = parseBulkItemIds()
    if (!itemIds && !bulkQ.trim()) return 'Provide either a comma-separated list of item ids, or a search term.'
    if (bulkScopes.length === 0) return 'Select at least one scope.'
    if (bulkReason.trim().length < 10) return 'Reason must be at least 10 characters -- a bulk action affecting many items needs a real explanation.'
    return ''
  }
  async function previewBulk(): Promise<void> {
    bulkError = validateBulkForm()
    if (bulkError) return
    bulkSubmitting = true
    try {
      const result = await visibilityApi.bulkApply(
        { itemIds: parseBulkItemIds(), q: bulkQ.trim() || undefined, scopes: bulkScopes, isVisible: bulkVisible, reason: bulkReason.trim(), dryRun: true },
      )
      bulkPreviewCount = result.affectedCount
    } catch (err) {
      if (err instanceof ApiError) bulkError = err.detail || err.message
      else if (err instanceof ApiNetworkError) bulkError = err.message
      else bulkError = 'Could not preview this bulk action.'
    } finally {
      bulkSubmitting = false
    }
  }
  async function submitBulk(): Promise<void> {
    bulkError = validateBulkForm()
    if (bulkError) return
    bulkSubmitting = true
    try {
      const result = await visibilityApi.bulkApply(
        { itemIds: parseBulkItemIds(), q: bulkQ.trim() || undefined, scopes: bulkScopes, isVisible: bulkVisible, reason: bulkReason.trim(), dryRun: false },
        crypto.randomUUID(),
      )
      toast.success(`Bulk action applied to ${result.affectedCount} item(s).`)
      bulkModalOpen = false
      await load()
    } catch (err) {
      if (err instanceof ApiError) bulkError = err.detail || err.message
      else if (err instanceof ApiNetworkError) bulkError = err.message
      else bulkError = 'Could not apply this bulk action.'
    } finally {
      bulkSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Undo a bulk operation
  // -----------------------------------------------------------------------------------------
  let undoingBulkOperationId: number | null = null
  async function undoBulk(bulkOperationId: number): Promise<void> {
    undoingBulkOperationId = bulkOperationId
    try {
      const result = await visibilityApi.undoBulk(bulkOperationId, undefined, crypto.randomUUID())
      toast.success(`Reverted ${result.reversedCount} row(s).`)
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not undo this bulk operation.')
    } finally {
      undoingBulkOperationId = null
    }
  }

  onMount(() => {
    void load()
  })
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="heading-2">Item visibility</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Curate which items appear in POS, purchasing, reports, and the stock list, per scope. Absence of a row here means visible everywhere (the default).</p>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={load} disabled={loading}>
        <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Refresh
      </button>
      <button type="button" class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" on:click={openSingle}>
        Single item
      </button>
      <button type="button" class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors" on:click={openBulk}>
        <Icon icon={Icons.filter} className="w-[18px] h-[18px]" width={18} height={18} />
        Bulk action
      </button>
    </div>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <div class="card p-4"><p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Hidden overrides</p><p class="text-2xl font-semibold mt-1 text-secondary-900 dark:text-white">{hiddenCount}</p></div>
    <div class="card p-4"><p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Visible overrides</p><p class="text-2xl font-semibold mt-1 text-secondary-900 dark:text-white">{visibleCount}</p></div>
  </div>

  <div class="card p-4 flex flex-wrap items-end gap-3">
    <div>
      <label class={labelClass} for="filter-scope">Scope</label>
      <select id="filter-scope" bind:value={filterScope} on:change={load} class={inputClass}>
        <option value="">All scopes</option>
        {#each SCOPES as scope (scope)}<option value={scope}>{SCOPE_LABEL[scope]}</option>{/each}
      </select>
    </div>
    <div>
      <label class={labelClass} for="filter-source">Source</label>
      <select id="filter-source" bind:value={filterSource} on:change={load} class={inputClass}>
        <option value="">All sources</option>
        <option value="manual">Manual</option>
        <option value="bulk">Bulk</option>
        <option value="preset">Preset</option>
        <option value="default">Default</option>
      </select>
    </div>
    <div class="flex-1 min-w-[200px]">
      <label class={labelClass} for="filter-q">Search</label>
      <input id="filter-q" bind:value={filterQ} on:keydown={(e) => e.key === 'Enter' && load()} class={inputClass} placeholder="Item name or code…" />
    </div>
    <button type="button" class="btn-theme-outline px-4 py-2.5 rounded-xl text-sm font-medium" on:click={load}>Apply</button>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">{loadError}</div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Item visibility overrides table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Item</th>
            <th class={`${headClass} py-3 px-4`}>Scope</th>
            <th class={`${headClass} py-3 px-4`}>Visibility</th>
            <th class={`${headClass} py-3 px-4`}>Source</th>
            <th class={`${headClass} py-3 px-4`}>Changed</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No overrides match these filters.</td></tr>
          {:else}
            {#each rows as row (`${row.itemId}-${row.scope}`)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{row.name}<span class="block text-xs text-secondary-400 font-normal">#{row.itemId}</span></td>
                <td class={cellClass}>{SCOPE_LABEL[row.scope]}</td>
                <td class={cellClass}>{#if row.isVisible}<Badge tone="success">Visible</Badge>{:else}<Badge tone="danger">Hidden</Badge>{/if}</td>
                <td class={cellClass}><Badge tone="neutral">{row.source}</Badge></td>
                <td class={cellClass}>{formatDateTime(row.changedAt)}</td>
                <td class={`${cellClass} text-right`}>
                  {#if row.bulkOperationId !== null}
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900 disabled:opacity-50"
                      disabled={undoingBulkOperationId === row.bulkOperationId}
                      on:click={() => row.bulkOperationId !== null && undoBulk(row.bulkOperationId)}
                    >
                      {undoingBulkOperationId === row.bulkOperationId ? 'Undoing…' : `Undo bulk #${row.bulkOperationId}`}
                    </button>
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

<!-- Single item override -->
<Modal open={singleModalOpen} title="Set item visibility" widthClass="max-w-lg" onClose={closeSingleModal}>
  <form id="single-visibility-form" on:submit|preventDefault={submitSingle} class="space-y-4">
    <div>
      <label class={labelClass} for="single-item-id">Item id <span class="text-danger-500">*</span></label>
      <input id="single-item-id" bind:value={singleItemId} class={inputClass} placeholder="e.g. 128" inputmode="numeric" />
    </div>
    <div>
      <span class={labelClass}>Scopes <span class="text-danger-500">*</span></span>
      <div class="grid grid-cols-2 gap-2">
        {#each SCOPES as scope (scope)}
          <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
            <input type="checkbox" bind:group={singleScopes} value={scope} class={checkboxClass} />
            {SCOPE_LABEL[scope]}
          </label>
        {/each}
      </div>
    </div>
    <div>
      <span class={labelClass}>Set to</span>
      <div class="flex gap-4">
        <label class="inline-flex items-center gap-2 text-sm"><input type="radio" bind:group={singleVisible} value={true} /> Visible</label>
        <label class="inline-flex items-center gap-2 text-sm"><input type="radio" bind:group={singleVisible} value={false} /> Hidden</label>
      </div>
    </div>
    <div>
      <label class={labelClass} for="single-reason">Reason (optional)</label>
      <input id="single-reason" bind:value={singleReason} class={inputClass} placeholder="Why this change" />
    </div>
    {#if singleError}<p class="text-xs text-danger-500">{singleError}</p>{/if}
  </form>
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeSingleModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={singleSubmitting}>Cancel</button>
    <button type="submit" form="single-visibility-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={singleSubmitting}>{singleSubmitting ? 'Saving…' : 'Save'}</button>
  </svelte:fragment>
</Modal>

<!-- Bulk action -->
<Modal open={bulkModalOpen} title="Bulk visibility action" widthClass="max-w-xl" onClose={closeBulkModal}>
  <form id="bulk-visibility-form" on:submit|preventDefault={submitBulk} class="space-y-4">
    <div>
      <label class={labelClass} for="bulk-item-ids">Item ids (comma-separated)</label>
      <input id="bulk-item-ids" bind:value={bulkItemIds} class={inputClass} placeholder="e.g. 12, 45, 88" on:input={() => (bulkPreviewCount = null)} />
    </div>
    <div class="text-center text-xs text-secondary-400">— or —</div>
    <div>
      <label class={labelClass} for="bulk-q">Search (name or code substring)</label>
      <input id="bulk-q" bind:value={bulkQ} class={inputClass} placeholder="e.g. expired-batch" on:input={() => (bulkPreviewCount = null)} />
    </div>
    <div>
      <span class={labelClass}>Scopes <span class="text-danger-500">*</span></span>
      <div class="grid grid-cols-2 gap-2">
        {#each SCOPES as scope (scope)}
          <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
            <input type="checkbox" bind:group={bulkScopes} value={scope} class={checkboxClass} on:change={() => (bulkPreviewCount = null)} />
            {SCOPE_LABEL[scope]}
          </label>
        {/each}
      </div>
    </div>
    <div>
      <span class={labelClass}>Set to</span>
      <div class="flex gap-4">
        <label class="inline-flex items-center gap-2 text-sm"><input type="radio" bind:group={bulkVisible} value={true} on:change={() => (bulkPreviewCount = null)} /> Visible</label>
        <label class="inline-flex items-center gap-2 text-sm"><input type="radio" bind:group={bulkVisible} value={false} on:change={() => (bulkPreviewCount = null)} /> Hidden</label>
      </div>
    </div>
    <div>
      <label class={labelClass} for="bulk-reason">Reason <span class="text-danger-500">*</span></label>
      <input id="bulk-reason" bind:value={bulkReason} class={inputClass} placeholder="At least 10 characters" on:input={() => (bulkPreviewCount = null)} />
    </div>

    <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">Affected items</p>
        <p class="text-xs text-secondary-500">Preview before applying -- nothing is written until you click Apply.</p>
      </div>
      <div class="flex items-center gap-2">
        {#if bulkPreviewCount !== null}<span class="text-lg font-semibold text-secondary-900 dark:text-white">{bulkPreviewCount}</span>{/if}
        <button type="button" class="btn-theme-outline px-3 py-2 rounded-lg text-xs font-medium" on:click={previewBulk} disabled={bulkSubmitting}>Preview</button>
      </div>
    </div>

    {#if bulkError}<p class="text-xs text-danger-500">{bulkError}</p>{/if}
  </form>
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeBulkModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={bulkSubmitting}>Cancel</button>
    <button type="submit" form="bulk-visibility-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={bulkSubmitting}>{bulkSubmitting ? 'Applying…' : 'Apply'}</button>
  </svelte:fragment>
</Modal>
