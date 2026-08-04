<script lang="ts">
  // Rule M: every money field in a ledger line is a decimal STRING end to end -- this page never
  // parses one into a JS number except inside LedgerTable's own pure UI zero/tone check.
  // Mirrors PurchaseReturnsPage.svelte's structure (list/tree + detail Modal, Toast, ApiError
  // handling) even though this page's "list" is a 4-level collapsible tree, not a flat table.
  import { onMount } from 'svelte'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import LedgerTable from './shared/LedgerTable.svelte'
  import { accountingApi, ApiError, ApiNetworkError } from '../../api'
  import type { GlAccountTreeMain, GlAccountTreeLeaf, GlAccountLedgerResult } from '../../api'

  const headerClass = 'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-secondary-800 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-900/20 rounded-lg cursor-pointer select-none'
  const inputClass =
    'w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-xs font-medium text-secondary-500 mb-1'

  // ---- tree state -----------------------------------------------------------------------
  let loading = true
  let loadError = ''
  let mains: GlAccountTreeMain[] = []

  async function loadTree(): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await accountingApi.getAccountTree()
      mains = result.data
    } catch (err) {
      loadError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load the chart of accounts.'
    } finally {
      loading = false
    }
  }

  onMount(loadTree)

  // ---- ledger modal -----------------------------------------------------------------------
  let ledgerOpen = false
  let ledgerAccount: GlAccountTreeLeaf | null = null
  let ledgerLoading = false
  let ledgerError = ''
  let ledgerResult: GlAccountLedgerResult | null = null
  let ledgerFrom = ''
  let ledgerTo = ''

  async function loadLedger(): Promise<void> {
    if (!ledgerAccount) return
    ledgerLoading = true
    ledgerError = ''
    try {
      const params: { from?: string; to?: string; limit?: number } = { limit: 200 }
      if (ledgerFrom) params.from = ledgerFrom
      if (ledgerTo) params.to = ledgerTo
      ledgerResult = await accountingApi.getAccountLedger(ledgerAccount.glAccountId, params)
    } catch (err) {
      ledgerError =
        err instanceof ApiError ? err.detail : err instanceof ApiNetworkError ? err.message : 'Could not load this account’s ledger.'
    } finally {
      ledgerLoading = false
    }
  }

  function openLedger(account: GlAccountTreeLeaf): void {
    if (!account.isPostable) return
    ledgerAccount = account
    ledgerOpen = true
    ledgerResult = null
    ledgerError = ''
    ledgerFrom = ''
    ledgerTo = ''
    void loadLedger()
  }

  function closeLedger(): void {
    ledgerOpen = false
    ledgerAccount = null
    ledgerResult = null
    ledgerError = ''
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="heading-2">Chart of accounts</h1>
    <p class="text-body-sm mt-1 text-secondary-500">Main → category → sub → account. Click a postable leaf account to view its ledger.</p>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-3">
    {#if loading}
      <p class="text-sm text-secondary-500 px-3 py-6 text-center">Loading…</p>
    {:else if mains.length === 0 && !loadError}
      <p class="text-sm text-secondary-500 px-3 py-6 text-center">No GL accounts found.</p>
    {:else}
      <div class="space-y-1">
        {#each mains as main (main.glAccountMainId)}
          <details class="rounded-lg">
            <summary class={headerClass}>
              <span>{main.code} — {main.name}</span>
              <Badge tone="neutral">{main.normalBalance}</Badge>
            </summary>
            <div class="pl-4 border-l border-secondary-200 dark:border-secondary-700 ml-3 space-y-1 pt-1 pb-1">
              {#each main.categories as category (category.glAccountCategoryId)}
                <details class="rounded-lg">
                  <summary class={headerClass}>
                    <span>{category.code} — {category.name}</span>
                    <span class="text-xs text-secondary-400">{category.statementSection}</span>
                  </summary>
                  <div class="pl-4 border-l border-secondary-200 dark:border-secondary-700 ml-3 space-y-1 pt-1 pb-1">
                    {#each category.subs as sub (sub.glAccountSubId)}
                      <details class="rounded-lg">
                        <summary class={headerClass}>
                          <span class="flex items-center gap-2">
                            {sub.code} — {sub.name}
                            {#if sub.isControlAccount}<Badge tone="info">control</Badge>{/if}
                          </span>
                          {#if sub.subledgerKind}<span class="text-xs text-secondary-400">{sub.subledgerKind}</span>{/if}
                        </summary>
                        <div class="pl-4 border-l border-secondary-200 dark:border-secondary-700 ml-3 divide-y divide-secondary-100 dark:divide-secondary-800">
                          {#each sub.accounts as account (account.glAccountId)}
                            <button
                              type="button"
                              class="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition-colors {account.isPostable
                                ? 'hover:bg-surface-50 dark:hover:bg-surface-900/20 cursor-pointer'
                                : 'cursor-default opacity-70'}"
                              disabled={!account.isPostable}
                              on:click={() => openLedger(account)}
                            >
                              <span class="text-secondary-800 dark:text-secondary-200">{account.code} — {account.name}</span>
                              <span class="flex items-center gap-2 shrink-0">
                                {#if !account.isActive}<Badge tone="danger">inactive</Badge>{/if}
                                {#if !account.isPostable}<Badge tone="neutral">non-postable</Badge>{/if}
                                {#if account.isContra}<Badge tone="warning">contra</Badge>{/if}
                                <span class="text-xs text-secondary-400">{account.normalBalance}</span>
                              </span>
                            </button>
                          {/each}
                          {#if sub.accounts.length === 0}
                            <p class="px-3 py-2 text-xs text-secondary-400">No accounts under this sub-ledger.</p>
                          {/if}
                        </div>
                      </details>
                    {/each}
                  </div>
                </details>
              {/each}
            </div>
          </details>
        {/each}
      </div>
    {/if}
  </div>
</div>

<Modal
  open={ledgerOpen}
  title={ledgerAccount ? `Ledger — ${ledgerAccount.code} ${ledgerAccount.name}` : 'Account ledger'}
  widthClass="max-w-4xl"
  onClose={closeLedger}
>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class={labelClass} for="coa-ledger-from">From</label>
        <input id="coa-ledger-from" type="date" bind:value={ledgerFrom} class={inputClass} />
      </div>
      <div>
        <label class={labelClass} for="coa-ledger-to">To</label>
        <input id="coa-ledger-to" type="date" bind:value={ledgerTo} class={inputClass} />
      </div>
      <button
        type="button"
        class="px-4 py-2 rounded-lg text-sm font-medium bg-theme-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        on:click={loadLedger}
        disabled={ledgerLoading}
      >
        Apply
      </button>
      {#if ledgerFrom || ledgerTo}
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          on:click={() => { ledgerFrom = ''; ledgerTo = ''; loadLedger() }}
          disabled={ledgerLoading}
        >
          Clear
        </button>
      {/if}
    </div>

    <LedgerTable
      lines={ledgerResult?.lines ?? []}
      openingBalance={ledgerResult?.openingBalance ?? '0.00'}
      closingBalance={ledgerResult?.closingBalance ?? '0.00'}
      loading={ledgerLoading}
      error={ledgerError}
    />
  </div>
</Modal>
