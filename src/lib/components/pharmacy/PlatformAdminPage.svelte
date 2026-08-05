<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import { platformApi, ApiError, ApiNetworkError } from '../../api'
  import type { FeatureCapabilityRow, FeatureCapabilityStatus, PlatformHealth, PlatformReady } from '../../api'
  import { toast } from '../../stores/toast'

  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  const STATUS_TONE: Record<FeatureCapabilityStatus, 'success' | 'warning' | 'neutral' | 'info'> = {
    in_scope: 'success',
    deferred: 'warning',
    excluded: 'neutral',
    replaced: 'info',
  }
  const STATUS_OPTIONS: FeatureCapabilityStatus[] = ['in_scope', 'deferred', 'excluded', 'replaced']

  let health: PlatformHealth | null = null
  let ready: PlatformReady | null = null
  let probeLoading = true

  let rows: FeatureCapabilityRow[] = []
  let loading = true
  let loadError = ''

  async function loadProbes(): Promise<void> {
    probeLoading = true
    try {
      const [h, r] = await Promise.all([platformApi.health(), platformApi.ready()])
      health = h
      ready = r
    } catch {
      health = null
      ready = null
    } finally {
      probeLoading = false
    }
  }

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      rows = await platformApi.listFeatureCapabilities()
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load the feature-capability register.'
    } finally {
      loading = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Record a decision
  // -----------------------------------------------------------------------------------------
  let decisionModalOpen = false
  let decisionSubmitting = false
  let decisionTarget: FeatureCapabilityRow | null = null
  let decisionStatus: FeatureCapabilityStatus = 'deferred'
  let decisionRationale = ''
  let decisionError = ''

  function openDecision(row: FeatureCapabilityRow): void {
    decisionTarget = row
    decisionStatus = row.status
    decisionRationale = ''
    decisionError = ''
    decisionModalOpen = true
  }

  function closeDecisionModal(): void {
    if (decisionSubmitting) return
    decisionModalOpen = false
    decisionTarget = null
  }

  async function submitDecision(): Promise<void> {
    if (!decisionTarget) return
    decisionError = ''
    if (decisionRationale.trim().length < 20) {
      decisionError = 'Rationale must be at least 20 characters -- a one-word status flip is not an audit trail.'
      return
    }

    decisionSubmitting = true
    try {
      await platformApi.updateFeatureCapability(decisionTarget.code, { status: decisionStatus, rationale: decisionRationale.trim() })
      toast.success('Decision recorded.')
      decisionModalOpen = false
      decisionTarget = null
      await load()
    } catch (err) {
      if (err instanceof ApiError) decisionError = err.detail || err.message
      else if (err instanceof ApiNetworkError) decisionError = err.message
      else decisionError = 'Could not record the decision.'
    } finally {
      decisionSubmitting = false
    }
  }

  onMount(() => {
    void loadProbes()
    void load()
  })
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Platform</h1>
      <p class="text-body-sm mt-1 text-secondary-500">System status and the feature-capability register (D1) -- what's in scope, deferred, excluded, or replaced, and why.</p>
    </div>
    <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={() => { void loadProbes(); void load() }} disabled={loading || probeLoading}>
      <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
      Refresh
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="card p-4">
      <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">API health</p>
      {#if probeLoading}
        <p class="text-sm text-secondary-500 mt-2">Checking…</p>
      {:else if health}
        <div class="mt-2 flex items-center gap-2"><Badge tone="success">ok</Badge><span class="text-xs text-secondary-500">v{health.version}</span></div>
      {:else}
        <div class="mt-2"><Badge tone="danger">unreachable</Badge></div>
      {/if}
    </div>
    <div class="card p-4">
      <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Database</p>
      <div class="mt-2"><Badge tone={ready?.db ? 'success' : 'danger'}>{ready?.db ? 'connected' : 'unknown'}</Badge></div>
    </div>
    <div class="card p-4">
      <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">Migrations</p>
      <div class="mt-2"><Badge tone={ready?.migrations ? 'success' : 'danger'}>{ready?.migrations ? 'up to date' : 'unknown'}</Badge></div>
    </div>
    <div class="card p-4">
      <p class="text-xs font-medium text-secondary-500 uppercase tracking-wide">FBR fiscalization</p>
      <div class="mt-2"><Badge tone="neutral">not built</Badge></div>
      <p class="text-xs text-secondary-500 mt-1">Blocked pending owner/tax-adviser sign-off.</p>
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">{loadError}</div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Feature capabilities table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Feature</th>
            <th class={`${headClass} py-3 px-4`}>Module</th>
            <th class={`${headClass} py-3 px-4`}>Status</th>
            <th class={`${headClass} py-3 px-4`}>Rationale</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">No feature-capability rows found.</td></tr>
          {:else}
            {#each rows as row (row.code)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>
                  {row.name}
                  <span class="block text-xs text-secondary-400 font-normal">{row.code}</span>
                </td>
                <td class={cellClass}>{row.module ?? '—'}</td>
                <td class={cellClass}><Badge tone={STATUS_TONE[row.status]}>{row.status.replace('_', ' ')}</Badge></td>
                <td class={`${cellClass} max-w-md`}>{row.rationale ?? '—'}</td>
                <td class={`${cellClass} text-right`}>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    on:click={() => openDecision(row)}
                  >
                    Record decision
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

<Modal open={decisionModalOpen} title={decisionTarget ? `Decision -- ${decisionTarget.name}` : 'Record decision'} widthClass="max-w-lg" onClose={closeDecisionModal}>
  {#if decisionTarget}
    <form id="decision-form" on:submit|preventDefault={submitDecision} class="space-y-4">
      <div>
        <span class={labelClass}>Status</span>
        <div class="grid grid-cols-2 gap-2">
          {#each STATUS_OPTIONS as opt (opt)}
            <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 cursor-pointer">
              <input type="radio" bind:group={decisionStatus} value={opt} class="text-theme-primary focus:ring-theme-primary/30" />
              {opt.replace('_', ' ')}
            </label>
          {/each}
        </div>
      </div>
      <div>
        <label class={labelClass} for="decision-rationale">Rationale <span class="text-danger-500">*</span></label>
        <textarea
          id="decision-rationale"
          bind:value={decisionRationale}
          rows="3"
          class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all"
          placeholder="Why this status -- at least 20 characters."
        ></textarea>
      </div>
      {#if decisionError}<p class="text-xs text-danger-500">{decisionError}</p>{/if}
    </form>
  {/if}
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeDecisionModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={decisionSubmitting}>Cancel</button>
    <button type="submit" form="decision-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={decisionSubmitting}>{decisionSubmitting ? 'Saving…' : 'Save decision'}</button>
  </svelte:fragment>
</Modal>
