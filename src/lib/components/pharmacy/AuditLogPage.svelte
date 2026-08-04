<script lang="ts">
  // Read-only browse surface over `audit_log` (Wave 6). Structural mirror of ExpensesPage.svelte's
  // filter-bar + paginated-table + row-click-detail-modal shape, minus every create/edit/action
  // affordance -- this module has none (audit-events.controller.ts exposes only GET list + GET
  // by id; the only writer is apps/api/src/common/audit, cross-cutting and untouched here). The
  // detail modal is a pure viewer: before/after JSON is pretty-printed and never fed back into a
  // request body.
  //
  // Pagination: the list service (audit-event.service.ts) does not return a total row count, only
  // `{ events, offset, limit }` -- "has a next page" is inferred the same way every offset/limit
  // list in this theme without a count infers it: `events.length === limit`.
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { toast } from '../../stores/toast'
  import { ApiError, ApiNetworkError, formatDateTime, formatMoney } from '../../api'
  import { auditApi } from '../../api/audit'
  import type { AuditEventRow, ListAuditEventsParams } from '../../api/audit'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const jsonBlockClass = 'rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 text-xs font-mono text-secondary-800 dark:text-secondary-200 overflow-x-auto whitespace-pre-wrap break-all max-h-80'

  function toastApiError(err: unknown, fallback: string): void {
    if (err instanceof ApiError) toast.error(err.detail)
    else if (err instanceof ApiNetworkError) toast.error(err.message)
    else toast.error(fallback)
  }

  function errorMessage(err: unknown, fallback: string): string {
    return err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : fallback
  }

  /** Purely cosmetic bucketing of the free-text `action` column (audit.ts's own comment: this is
   *  an admin-extensible string, not a fixed enum) -- unrecognised actions just fall through to
   *  'neutral'. Never used for anything but a Badge tone. */
  function actionTone(action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const a = action.toLowerCase()
    if (a.includes('cancel') || a.includes('reverse') || a.includes('revoke') || a.includes('delete')) return 'danger'
    if (a.includes('create') || a.includes('post') || a.includes('grant')) return 'success'
    if (a.includes('login') || a.includes('export') || a.includes('setting')) return 'info'
    if (a.includes('update') || a.includes('change')) return 'warning'
    return 'neutral'
  }

  function actorLabel(row: AuditEventRow): string {
    if (row.actorUsername) return row.actorUsername
    if (row.actorUserId != null) return `User #${row.actorUserId}`
    return 'System'
  }

  function entityLabel(row: AuditEventRow): string {
    const idPart = row.entityId != null ? ` #${row.entityId}` : ''
    return `${row.entityType}${idPart}`
  }

  /** `null`/`undefined` render as an explicit "No data recorded." rather than the literal string
   *  "null" -- beforeJson is always empty for a create event, afterJson for a delete, and the
   *  generic AuditInterceptor-written rows never populate either. */
  function prettyJson(value: unknown): string {
    if (value === null || value === undefined) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  // ---------------------------------------------------------------------------------------------
  // List state
  // ---------------------------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let rows: AuditEventRow[] = []

  const PAGE_SIZE = 50
  let offset = 0
  $: hasNextPage = rows.length === PAGE_SIZE
  $: hasPrevPage = offset > 0
  $: pageStart = rows.length === 0 ? 0 : offset + 1
  $: pageEnd = offset + rows.length

  let filterEntityType = ''
  let filterEntityId = ''
  let filterActorUserId = ''
  let filterAction = ''
  let filterDateFrom = ''
  let filterDateTo = ''
  let filterFormErrors: Record<string, string> = {}

  /** `entityId`/`actorUserId` are `zIntString` server-side (audit-event.dto.ts) -- a positive
   *  integer string. Validated the same shape here before it's ever sent, rather than relying on
   *  a 422 as the only signal. Returns `undefined` (field omitted) for a blank input. */
  function parsePositiveIntFilter(raw: string, fieldKey: string, label: string, errors: Record<string, string>): number | undefined {
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    if (!/^\d+$/.test(trimmed)) {
      errors[fieldKey] = `${label} must be a positive whole number.`
      return undefined
    }
    return Number(trimmed)
  }

  function buildParams(): ListAuditEventsParams | null {
    const errors: Record<string, string> = {}
    const entityId = parsePositiveIntFilter(filterEntityId, 'entityId', 'Entity ID', errors)
    const actorUserId = parsePositiveIntFilter(filterActorUserId, 'actorUserId', 'Actor user ID', errors)
    filterFormErrors = errors
    if (Object.keys(errors).length > 0) return null

    const params: ListAuditEventsParams = { offset, limit: PAGE_SIZE }
    if (filterEntityType.trim()) params.entityType = filterEntityType.trim()
    if (entityId !== undefined) params.entityId = entityId
    if (actorUserId !== undefined) params.actorUserId = actorUserId
    if (filterAction.trim()) params.action = filterAction.trim()
    if (filterDateFrom) params.dateFrom = filterDateFrom
    if (filterDateTo) params.dateTo = filterDateTo
    return params
  }

  async function loadList(): Promise<void> {
    const params = buildParams()
    if (!params) return
    loading = true
    loadError = ''
    try {
      const result = await auditApi.listAuditEvents(params)
      rows = result.events
    } catch (err) {
      loadError = errorMessage(err, 'Could not load the audit log.')
      rows = []
    } finally {
      loading = false
    }
  }

  function applyFilters(): void {
    offset = 0
    void loadList()
  }

  function resetFilters(): void {
    filterEntityType = ''
    filterEntityId = ''
    filterActorUserId = ''
    filterAction = ''
    filterDateFrom = ''
    filterDateTo = ''
    filterFormErrors = {}
    offset = 0
    void loadList()
  }

  function nextPage(): void {
    if (!hasNextPage) return
    offset += PAGE_SIZE
    void loadList()
  }

  function prevPage(): void {
    if (!hasPrevPage) return
    offset = Math.max(0, offset - PAGE_SIZE)
    void loadList()
  }

  onMount(() => {
    void loadList()
  })

  // ---------------------------------------------------------------------------------------------
  // Detail (row click / expand) -- pure viewer, no edit affordance anywhere below.
  // ---------------------------------------------------------------------------------------------
  let detailOpen = false
  let detailLoading = false
  let detailError = ''
  let detail: AuditEventRow | null = null

  async function openDetail(row: AuditEventRow): Promise<void> {
    detailOpen = true
    detailError = ''
    detail = null
    detailLoading = true
    try {
      detail = await auditApi.getAuditEvent(row.auditLogId)
    } catch (err) {
      detailError = errorMessage(err, 'Could not load this audit event.')
      toastApiError(err, 'Could not load this audit event.')
    } finally {
      detailLoading = false
    }
  }

  function closeDetail(): void {
    detailOpen = false
    detail = null
  }
</script>

<div class="space-y-6 animate-fade-in">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="heading-2 text-secondary-900 dark:text-white">Audit Log</h1>
        {#if loadError}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Demo Preview
          </span>
        {:else}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Live API
          </span>
        {/if}
      </div>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">
        Who changed what, and when -- an append-only trail of every audited action. Read-only: nothing on this page can be created, edited, or deleted.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
        on:click={loadList}
        disabled={loading}
      >
        <Icon icon={Icons.refresh} className={`w-4 h-4 text-secondary-500 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  </div>

  {#if loadError}
    <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
          <Icon icon={Icons.alertTriangle} className="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-200">Session Notice</h3>
          <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{loadError}</p>
        </div>
      </div>
      <button type="button" on:click={loadList} class="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors flex-shrink-0">
        Retry
      </button>
    </div>
  {/if}

  <!-- Filter Toolbar -->
  <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
    <div class="flex flex-col gap-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div>
          <label class={labelClass} for="audit-filter-entity-type">Entity type</label>
          <input id="audit-filter-entity-type" type="text" bind:value={filterEntityType} class={inputClass} placeholder="e.g. expense" />
        </div>
        <div>
          <label class={labelClass} for="audit-filter-entity-id">Entity ID</label>
          <input id="audit-filter-entity-id" type="text" inputmode="numeric" bind:value={filterEntityId} class={inputClass} placeholder="e.g. 1042" />
          {#if filterFormErrors.entityId}<p class="text-xs text-danger-500 mt-1">{filterFormErrors.entityId}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="audit-filter-action">Action</label>
          <input id="audit-filter-action" type="text" bind:value={filterAction} class={inputClass} placeholder="e.g. post, cancel, login" />
        </div>
        <div>
          <label class={labelClass} for="audit-filter-actor">Actor user ID</label>
          <input id="audit-filter-actor" type="text" inputmode="numeric" bind:value={filterActorUserId} class={inputClass} placeholder="e.g. 7" />
          {#if filterFormErrors.actorUserId}<p class="text-xs text-danger-500 mt-1">{filterFormErrors.actorUserId}</p>{/if}
        </div>
        <div>
          <label class={labelClass} for="audit-filter-from">From</label>
          <input id="audit-filter-from" type="date" bind:value={filterDateFrom} class={inputClass} />
        </div>
        <div>
          <label class={labelClass} for="audit-filter-to">To</label>
          <input id="audit-filter-to" type="date" bind:value={filterDateTo} class={inputClass} />
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button type="button" class="px-4 py-2.5 rounded-xl text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity" on:click={applyFilters}>
          Apply
        </button>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          on:click={resetFilters}
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Audit Events Table -->
    <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto scrollbar-thin" tabindex="0" role="region" aria-label="Audit log table">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-800/80 border-b border-surface-200 dark:border-surface-700">
            <tr>
              <th class={headClass}>Timestamp</th>
              <th class={headClass}>Actor</th>
              <th class={headClass}>Action</th>
              <th class={headClass}>Entity</th>
              <th class={headClass}>IP Address</th>
              <th class={`${headClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
            {#if loading}
              <tr><td colspan="6" class="py-12 px-4 text-center text-sm text-secondary-500">Loading audit events…</td></tr>
            {:else}
              {#each rows as row (row.auditLogId)}
                <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors group cursor-pointer" on:click={() => openDetail(row)}>
                  <td class={cellClass}>
                    <div class="flex items-center gap-1.5 text-xs">
                      <Icon icon={Icons.clock} className="w-3.5 h-3.5 text-secondary-400" />
                      <span class="font-mono text-secondary-800 dark:text-secondary-200">{formatDateTime(row.occurredAt)}</span>
                    </div>
                  </td>
                  <td class={cellClass}>
                    <div class="flex items-center gap-2">
                      <Icon icon={Icons.user} className="w-3.5 h-3.5 text-secondary-400" />
                      <span class="font-medium text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">{actorLabel(row)}</span>
                    </div>
                  </td>
                  <td class={cellClass}>
                    <div class="flex items-center gap-2">
                      <Badge tone={actionTone(row.action)}>{row.action}</Badge>
                      {#if row.isSensitive}
                        <span title="Security-sensitive event">
                          <Icon icon={Icons.shield} className="w-3.5 h-3.5 text-warning-500" />
                        </span>
                      {/if}
                    </div>
                  </td>
                  <td class={cellClass}>
                    <span class="px-2.5 py-1 text-xs rounded-lg bg-surface-100 dark:bg-surface-800 font-semibold text-secondary-700 dark:text-secondary-300">
                      {entityLabel(row)}
                    </span>
                    {#if row.entityLabel}
                      <span class="block text-xs text-secondary-500 dark:text-secondary-400 mt-1">{row.entityLabel}</span>
                    {/if}
                  </td>
                  <td class={`${cellClass} font-mono text-xs`}>{row.ipAddress ?? '—'}</td>
                  <td class={`${cellClass} text-right`}>
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-xs font-semibold text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      on:click|stopPropagation={() => openDetail(row)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              {/each}

              {#if !rows.length}
                <tr>
                  <td colspan="6" class="py-12 px-4 text-center">
                    <Icon icon={Icons.search} className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                    <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">No audit events match your filter.</p>
                  </td>
                </tr>
              {/if}
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4">
      <p class="text-xs text-secondary-500 dark:text-secondary-400">
        {#if rows.length}Showing {pageStart}–{pageEnd}{:else}No rows{/if}
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          on:click={prevPage}
          disabled={!hasPrevPage || loading}
        >
          <Icon icon={Icons.chevronLeft} className="w-4 h-4" />
          Previous
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          on:click={nextPage}
          disabled={!hasNextPage || loading}
        >
          Next
          <Icon icon={Icons.chevronRight} className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Detail (read-only viewer) -->
<Modal open={detailOpen} title={detail ? `Audit Event #${detail.auditLogId}` : 'Audit Event'} widthClass="max-w-4xl" onClose={closeDetail}>
  {#if detailLoading && !detail}
    <p class="text-sm text-secondary-500">Loading…</p>
  {:else if detailError}
    <div class="rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {detailError}
    </div>
  {:else if detail}
    <div class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-secondary-500 mb-1">Action</p>
          <div class="flex items-center gap-2">
            <Badge tone={actionTone(detail.action)}>{detail.action}</Badge>
            {#if detail.isSensitive}<Badge tone="warning">sensitive</Badge>{/if}
          </div>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Timestamp</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white font-mono">{formatDateTime(detail.occurredAt)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Actor</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{actorLabel(detail)}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Entity</p>
          <p class="text-sm font-medium text-secondary-900 dark:text-white">{entityLabel(detail)}</p>
        </div>
        {#if detail.entityLabel}
          <div class="sm:col-span-2">
            <p class="text-xs text-secondary-500">Entity label</p>
            <p class="text-sm text-secondary-800 dark:text-secondary-200">{detail.entityLabel}</p>
          </div>
        {/if}
        {#if detail.amountImpact !== null}
          <div>
            <p class="text-xs text-secondary-500">Amount impact</p>
            <p class="text-sm font-semibold text-secondary-900 dark:text-white">{formatMoney(detail.amountImpact)}</p>
          </div>
        {/if}
        {#if detail.reason}
          <div class="sm:col-span-4">
            <p class="text-xs text-secondary-500">Reason</p>
            <p class="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap">{detail.reason}</p>
          </div>
        {/if}
        <div>
          <p class="text-xs text-secondary-500">Session ID</p>
          <p class="text-xs font-mono text-secondary-800 dark:text-secondary-200 break-all">{detail.sessionId ?? '—'}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Request ID</p>
          <p class="text-xs font-mono text-secondary-800 dark:text-secondary-200 break-all">{detail.requestId ?? '—'}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">IP address</p>
          <p class="text-xs font-mono text-secondary-800 dark:text-secondary-200">{detail.ipAddress ?? '—'}</p>
        </div>
        <div>
          <p class="text-xs text-secondary-500">Machine name</p>
          <p class="text-xs font-mono text-secondary-800 dark:text-secondary-200">{detail.machineName ?? '—'}</p>
        </div>
      </div>

      {#if detail.changedFields && detail.changedFields.length}
        <div>
          <p class="text-xs text-secondary-500 mb-2">Changed fields</p>
          <div class="flex flex-wrap gap-1.5">
            {#each detail.changedFields as field (field)}
              <Badge tone="info">{field}</Badge>
            {/each}
          </div>
        </div>
      {/if}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p class="text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-2">Before</p>
          {#if detail.beforeJson === null || detail.beforeJson === undefined}
            <p class="text-xs text-secondary-500 italic">No data recorded.</p>
          {:else}
            <pre class={jsonBlockClass}>{prettyJson(detail.beforeJson)}</pre>
          {/if}
        </div>
        <div>
          <p class="text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-2">After</p>
          {#if detail.afterJson === null || detail.afterJson === undefined}
            <p class="text-xs text-secondary-500 italic">No data recorded.</p>
          {:else}
            <pre class={jsonBlockClass}>{prettyJson(detail.afterJson)}</pre>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeDetail}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
    >
      Close
    </button>
  </svelte:fragment>
</Modal>
