<script lang="ts">
  import { toasts, dismiss } from '../../../stores/toast'
  import Icon from '../../common/Icon.svelte'
  import { Icons } from '../../../icons'

  const kindStyle: Record<string, string> = {
    success: 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300',
    error: 'border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300',
    info: 'border-secondary-200 dark:border-secondary-700 bg-white dark:bg-surface-800 text-secondary-700 dark:text-secondary-300',
  }
  const kindIcon: Record<string, string> = {
    success: Icons.check,
    error: Icons.alertTriangle,
    info: Icons.infoCircle,
  }
</script>

<div class="fixed top-4 right-4 z-[1300] flex flex-col gap-2 w-full max-w-sm" role="status" aria-live="polite">
  {#each $toasts as item (item.id)}
    <div class="flex items-start gap-3 rounded-xl border p-4 shadow-lg {kindStyle[item.kind]}">
      <Icon icon={kindIcon[item.kind]} className="w-5 h-5 shrink-0 mt-0.5" />
      <p class="text-sm flex-1">{item.text}</p>
      <button
        type="button"
        class="text-current opacity-60 hover:opacity-100"
        on:click={() => dismiss(item.id)}
        aria-label="Dismiss notification"
      >
        <Icon icon={Icons.close} className="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>
