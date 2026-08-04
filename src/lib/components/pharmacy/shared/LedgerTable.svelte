<script lang="ts">
  // Shared by ChartOfAccountsPage (GET /gl/accounts/:id/ledger) and CashBankAccountsPage
  // (GET /cash-bank/book) -- both endpoints return the exact same `GlLedgerLine[]` shape (they
  // share one LedgerQueryService server-side), just wrapped differently at the top level. This
  // component only ever sees the already-unwrapped `lines`/`openingBalance`/`closingBalance`.
  // Rule M: debit/credit/runningBalance are decimal STRINGS end to end -- formatMoney() is
  // display-only, never fed back into a request.
  import { formatMoney, formatDate } from '../../../api'
  import type { GlLedgerLine } from '../../../api'

  export let lines: GlLedgerLine[] = []
  export let openingBalance = '0.00'
  export let closingBalance = '0.00'
  export let loading = false
  export let error = ''

  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400 py-3 px-4'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'

  // Pure UI tone check (is this leg's amount zero, so an em dash reads cleaner than "Rs 0.00") --
  // never feeds back into a request, so Number() here is fine under Rule M.
  function isZero(value: string): boolean {
    return Number(value) === 0
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
      <p class="text-xs text-secondary-500">Opening balance</p>
      <p class="text-lg font-semibold text-secondary-900 dark:text-white">{formatMoney(openingBalance)}</p>
    </div>
    <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
      <p class="text-xs text-secondary-500">Closing balance</p>
      <p class="text-lg font-semibold text-secondary-900 dark:text-white">{formatMoney(closingBalance)}</p>
    </div>
  </div>

  {#if error}
    <div class="rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {error}
    </div>
  {/if}

  <div class="rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Ledger table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={headClass}>Date</th>
            <th class={headClass}>Entry no</th>
            <th class={headClass}>Doc type</th>
            <th class={headClass}>Description</th>
            <th class={`${headClass} text-right`}>Debit</th>
            <th class={`${headClass} text-right`}>Credit</th>
            <th class={`${headClass} text-right`}>Running balance</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
          {#if loading}
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">Loading…</td></tr>
          {:else if !error && lines.length === 0}
            <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">No ledger lines in this range.</td></tr>
          {:else}
            {#each lines as line (line.journalLineId)}
              <tr>
                <td class={cellClass}>{formatDate(line.entryDate)}</td>
                <td class={cellClass}>{line.entryNo}</td>
                <td class={cellClass}>{line.documentTypeCode}</td>
                <td class={cellClass}>{line.description ?? line.memo ?? '—'}</td>
                <td class={`${cellClass} text-right`}>{isZero(line.debit) ? '—' : formatMoney(line.debit)}</td>
                <td class={`${cellClass} text-right`}>{isZero(line.credit) ? '—' : formatMoney(line.credit)}</td>
                <td class={`${cellClass} text-right font-medium text-secondary-900 dark:text-white`}>{formatMoney(line.runningBalance)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
