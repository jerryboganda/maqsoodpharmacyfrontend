<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Badge from './shared/Badge.svelte'
  import { lookupsApi, ApiError, ApiNetworkError } from '../../api'
  import type { OptionValueResponse } from '../../api'

  // Background: the backend's /settings/options/:key endpoint is a GENERIC, admin-curated
  // pick-list system (e.g. a hypothetical key like "sale.tender_method") -- a DIFFERENT
  // mechanism from the dedicated lookup tables (payment methods, sale/purchase categories,
  // adjustment reasons) the other pharmacy screens already read via lookupsApi. There is
  // currently no backend endpoint to enumerate WHICH keys exist, so this page is a generic
  // "look up any key" viewer rather than a browsable list of all option sets. It does not
  // auto-load on mount -- there's no default/enumerable key to load.

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  const keyPattern = /^[^.\s]+\.[^.\s]+$/

  let key = ''
  let loading = false
  let loadError = ''
  let hasSearched = false
  let rows: OptionValueResponse[] = []

  $: sortedRows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder)

  async function load(): Promise<void> {
    const trimmedKey = key.trim()
    if (!trimmedKey) return
    loading = true
    loadError = ''
    try {
      rows = await lookupsApi.options(trimmedKey)
      hasSearched = true
    } catch (err) {
      rows = []
      hasSearched = false
      if (err instanceof ApiError) loadError = err.detail || err.message
      else if (err instanceof ApiNetworkError) loadError = err.message
      else loadError = 'Could not load option values.'
    } finally {
      loading = false
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') load()
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="heading-2">Settings</h1>
    <p class="text-body-sm mt-1 text-secondary-500">Look up admin-curated option lists.</p>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-6">
    <label class={labelClass} for="option-set-key">Option-set key</label>
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
        <input
          id="option-set-key"
          bind:value={key}
          on:keydown={onKeydown}
          class={`${inputClass} pl-10`}
          placeholder="module.concept"
          aria-label="Option-set key"
        />
      </div>
      <button
        type="button"
        class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        on:click={load}
        disabled={loading || !keyPattern.test(key.trim())}
      >
        {#if loading}Loading…{:else}Load{/if}
      </button>
    </div>
    <p class="mt-2 text-xs text-secondary-500">
      Enter an option-set key, e.g. a module-dotted concept name your backend team has configured.
    </p>
  </div>

  {#if hasSearched}
    <div class="card rounded-xl p-6">
      {#if sortedRows.length === 0}
        <p class="text-sm text-secondary-500">
          No values found for this key. Either the key doesn't exist yet or has no enabled values.
        </p>
      {:else}
        <div class="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-surface-50 dark:bg-surface-900/30">
                <tr>
                  <th class={`${headClass} py-3 px-4`}>Code</th>
                  <th class={`${headClass} py-3 px-4`}>Display name</th>
                  <th class={`${headClass} py-3 px-4`}>Help text</th>
                  <th class={`${headClass} py-3 px-4`}>Group</th>
                  <th class={`${headClass} py-3 px-4`}>Sort order</th>
                  <th class={`${headClass} py-3 px-4`}>Default</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                {#each sortedRows as row (row.optionValueId)}
                  <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                    <td class={cellClass}>
                      <div class="font-medium text-secondary-900 dark:text-white">{row.code}</div>
                    </td>
                    <td class={cellClass}>{row.displayName}</td>
                    <td class={cellClass}>{row.helpText ?? '—'}</td>
                    <td class={cellClass}>{row.groupLabel ?? '—'}</td>
                    <td class={cellClass}>{row.sortOrder}</td>
                    <td class={cellClass}>
                      {#if row.isDefault}<Badge tone="success">Default</Badge>{/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
