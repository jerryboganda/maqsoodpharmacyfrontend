<script lang="ts">
  // Wave 6 "Notifications" -- a full browsing/management page over the actor's own in-app
  // notifications (NOT the header bell dropdown, out of scope here -- see this task's own
  // boundaries). Structural mirror of AuditLogPage.svelte's shape: a read-mostly, paginated,
  // offset/limit list with NO filter panel (ListNotificationsQuerySchema takes offset/limit only,
  // per notification.dto.ts's own comment -- always the actor's own visible set, unread-first),
  // and no total row count (`{ notifications, unreadCount, offset, limit }` -- "has a next page"
  // is inferred the same way AuditLogPage's own comment documents: `notifications.length ===
  // limit`).
  //
  // `unreadCount` (unlike `notifications.length`) is the actor's TRUE total unread count across
  // every page, straight off the server's own `count(*)` -- not recomputed from the current
  // page's rows. Kept as its own piece of state, decremented locally by 1 whenever a previously-
  // unread row on the current page is marked read, and refetched in full after "mark all read"
  // (which can touch rows outside the current page).
  //
  // Row update, not full refetch: markRead's response IS the exact "give me the updated row"
  // shape the wire returns -- so on success this splices the returned `notification` straight
  // into `rows` in place, rather than re-running `loadList()` (this task's "optimistic or
  // refetch-after" instruction, resolved as a targeted single-row update -- cheaper than a full
  // refetch and avoids the whole list visibly re-sorting/jumping mid-browse since the server's
  // unread-first ordering is only reapplied on the next real `list()` call).
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import { toast } from '../../stores/toast'
  import { ApiError, ApiNetworkError, formatDateTime } from '../../api'
  import { notificationsApi } from '../../api/notifications'
  import type { NotificationRow, NotificationSeverity } from '../../api/notifications'

  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200 align-top'

  function errorMessage(err: unknown, fallback: string): string {
    return err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : fallback
  }

  function toastApiError(err: unknown, fallback: string): void {
    toast.error(errorMessage(err, fallback))
  }

  /** Badge tone + icon per severity -- info/warning/critical, matching this theme's existing
   *  Badge.svelte tones (warning renders amber, danger renders red -- the same bg-amber/
   *  bg-danger convention this task asked for, reused via the shared component rather than
   *  re-declared locally). */
  function severityTone(severity: NotificationSeverity): 'info' | 'warning' | 'danger' {
    if (severity === 'critical') return 'danger'
    if (severity === 'warning') return 'warning'
    return 'info'
  }
  function severityIcon(severity: NotificationSeverity): string {
    return severity === 'info' ? Icons.infoCircle : Icons.alertTriangle
  }
  /** Full, static class strings (not a template-literal interpolation) -- Tailwind's JIT scanner
   *  only picks up class names it can find verbatim in source text, same reasoning EmailPage.
   *  svelte's own `email.isStarred ? 'text-warning-500' : 'text-secondary-400'` ternary follows. */
  function severityIconClass(severity: NotificationSeverity): string {
    if (severity === 'critical') return 'w-4 h-4 text-danger-500'
    if (severity === 'warning') return 'w-4 h-4 text-warning-500'
    return 'w-4 h-4 text-info-500'
  }

  /** Free-text, module-extensible `kind`/`sourceType` columns (notifications.ts's own comment) --
   *  cosmetic "low_stock" -> "Low stock" title-casing only, never fed back into a request. */
  function humanize(value: string): string {
    return value
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  function sourceLabel(row: NotificationRow): string {
    const idPart = row.sourceId != null ? ` #${row.sourceId}` : ''
    return `${humanize(row.sourceType)}${idPart}`
  }

  // ---------------------------------------------------------------------------------------------
  // List state
  // ---------------------------------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let rows: NotificationRow[] = []
  let unreadCount = 0

  const PAGE_SIZE = 20
  let offset = 0
  $: hasNextPage = rows.length === PAGE_SIZE
  $: hasPrevPage = offset > 0
  $: pageStart = rows.length === 0 ? 0 : offset + 1
  $: pageEnd = offset + rows.length
  $: criticalOnPage = rows.filter((r) => r.severity === 'critical').length
  $: warningOnPage = rows.filter((r) => r.severity === 'warning').length

  let markAllSubmitting = false
  let markReadIds = new Set<number>()

  async function loadList(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await notificationsApi.listNotifications({ offset, limit: PAGE_SIZE })
      rows = result.notifications
      unreadCount = result.unreadCount
    } catch (err) {
      loadError = errorMessage(err, 'Could not load notifications.')
      rows = []
    } finally {
      loading = false
    }
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

  async function markRead(row: NotificationRow): Promise<void> {
    if (row.readAt !== null || markReadIds.has(row.notificationId)) return
    markReadIds = new Set(markReadIds).add(row.notificationId)
    try {
      const result = await notificationsApi.markRead(row.notificationId)
      rows = rows.map((r) => (r.notificationId === row.notificationId ? result.notification : r))
      unreadCount = Math.max(0, unreadCount - 1)
    } catch (err) {
      toastApiError(err, 'Could not mark this notification read.')
    } finally {
      const next = new Set(markReadIds)
      next.delete(row.notificationId)
      markReadIds = next
    }
  }

  async function markAllRead(): Promise<void> {
    if (unreadCount === 0 || markAllSubmitting) return
    markAllSubmitting = true
    try {
      const result = await notificationsApi.markAllRead()
      toast.success(result.updatedCount === 1 ? '1 notification marked read.' : `${result.updatedCount} notifications marked read.`)
      await loadList()
    } catch (err) {
      toastApiError(err, 'Could not mark all notifications read.')
    } finally {
      markAllSubmitting = false
    }
  }

  /** Clicking a row with a link navigates there (a real `<a href>`, see the template) AND marks
   *  it read along the way -- the same "opening it resolves it" convention as an email/notification
   *  inbox. A row with no `link` only exposes the explicit "Mark read" button. */
  function onRowLinkClick(row: NotificationRow): void {
    if (row.readAt === null) void markRead(row)
  }
</script>

<div class="space-y-6 animate-fade-in">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="heading-2 text-secondary-900 dark:text-white">Notifications</h1>
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
        Operational alerts addressed to you -- low stock, expiry risk, pending approvals, and stale purchase orders.
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

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        on:click={markAllRead}
        disabled={markAllSubmitting || unreadCount === 0}
      >
        <Icon icon={Icons.checks} className="w-4 h-4" />
        {markAllSubmitting ? 'Marking…' : 'Mark all read'}
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

  <!-- Summary Metric Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
          <Icon icon={Icons.bell} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600">This Page</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Notifications</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : rows.length}</p>
    </div>

    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-info-100 dark:bg-info-900/40 text-info-600 dark:text-info-400 flex items-center justify-center">
          <Icon icon={Icons.infoCircle} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-info-50 dark:bg-info-900/20 text-info-600">Across All Pages</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Unread</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : unreadCount}</p>
    </div>

    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-warning-100 dark:bg-warning-900/40 text-warning-600 dark:text-warning-400 flex items-center justify-center">
          <Icon icon={Icons.alertTriangle} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning-50 dark:bg-warning-900/20 text-warning-600">This Page</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Warning</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : warningOnPage}</p>
    </div>

    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="w-11 h-11 rounded-xl bg-danger-100 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400 flex items-center justify-center">
          <Icon icon={Icons.alertTriangle} className="w-5 h-5" />
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-50 dark:bg-danger-900/20 text-danger-600">This Page</span>
      </div>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Critical</p>
      <p class="heading-3 text-secondary-900 dark:text-white mt-1">{loading ? '…' : criticalOnPage}</p>
    </div>
  </div>

  <!-- Notifications List -->
  <div class="card rounded-xl p-6 hover:shadow-md transition-shadow">
    <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto scrollbar-thin" tabindex="0" role="region" aria-label="Notifications table">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-800/80 border-b border-surface-200 dark:border-surface-700">
            <tr>
              <th class={headClass}>Severity</th>
              <th class={headClass}>Notification</th>
              <th class={headClass}>Source</th>
              <th class={headClass}>Received</th>
              <th class={`${headClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
            {#if loading}
              <tr><td colspan="5" class="py-12 px-4 text-center text-sm text-secondary-500">Loading notifications…</td></tr>
            {:else}
              {#each rows as row (row.notificationId)}
                {@const unread = row.readAt === null}
                <tr class={`transition-colors ${unread ? 'bg-primary-50/40 dark:bg-primary-900/10' : 'hover:bg-surface-50 dark:hover:bg-surface-800/40'}`}>
                  <td class={cellClass}>
                    <div class="flex items-center gap-1.5">
                      <Icon icon={severityIcon(row.severity)} className={severityIconClass(row.severity)} />
                      <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>
                    </div>
                  </td>
                  <td class={cellClass}>
                    <div class="flex items-start gap-2">
                      {#if unread}
                        <span class="mt-1.5 w-2 h-2 rounded-full bg-theme-primary flex-shrink-0" title="Unread"></span>
                      {:else}
                        <span class="mt-1.5 w-2 h-2 flex-shrink-0"></span>
                      {/if}
                      <div class="min-w-0">
                        {#if row.link}
                          <a
                            href={row.link}
                            on:click={() => onRowLinkClick(row)}
                            class={`inline-flex items-center gap-1 hover:text-theme-primary transition-colors ${unread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-800 dark:text-secondary-200'}`}
                          >
                            {row.title}
                            <Icon icon={Icons.externalLink} className="w-3.5 h-3.5 text-secondary-400 flex-shrink-0" />
                          </a>
                        {:else}
                          <p class={unread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-800 dark:text-secondary-200'}>
                            {row.title}
                          </p>
                        {/if}
                        <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{row.body}</p>
                      </div>
                    </div>
                  </td>
                  <td class={cellClass}>
                    <span class="px-2.5 py-1 text-xs rounded-lg bg-surface-100 dark:bg-surface-800 font-semibold text-secondary-700 dark:text-secondary-300 whitespace-nowrap">
                      {sourceLabel(row)}
                    </span>
                    <span class="block text-xs text-secondary-500 dark:text-secondary-400 mt-1">{humanize(row.kind)}</span>
                  </td>
                  <td class={cellClass}>
                    <div class="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <Icon icon={Icons.clock} className="w-3.5 h-3.5 text-secondary-400" />
                      <span class="font-mono text-secondary-800 dark:text-secondary-200">{formatDateTime(row.createdAt)}</span>
                    </div>
                  </td>
                  <td class={`${cellClass} text-right`}>
                    {#if unread}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-xs font-semibold text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={markReadIds.has(row.notificationId)}
                        on:click={() => markRead(row)}
                      >
                        {markReadIds.has(row.notificationId) ? 'Marking…' : 'Mark read'}
                      </button>
                    {:else}
                      <span class="inline-flex items-center gap-1 text-xs text-secondary-400">
                        <Icon icon={Icons.circleCheck} className="w-3.5 h-3.5" />
                        Read
                      </span>
                    {/if}
                  </td>
                </tr>
              {/each}

              {#if !rows.length}
                <tr>
                  <td colspan="5" class="py-12 px-4 text-center">
                    <Icon icon={Icons.bell} className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                    <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      {offset > 0 ? 'No more notifications.' : 'No notifications right now.'}
                    </p>
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
