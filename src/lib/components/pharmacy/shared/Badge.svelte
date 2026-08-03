<script lang="ts">
  export let tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral'

  const toneClass: Record<string, string> = {
    success: 'bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 ring-success-200 dark:ring-success-800',
    warning: 'bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 ring-warning-200 dark:ring-warning-800',
    danger: 'bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 ring-danger-200 dark:ring-danger-800',
    info: 'bg-info-50 dark:bg-info-950 text-info-700 dark:text-info-300 ring-info-200 dark:ring-info-800',
    neutral: 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 ring-secondary-200 dark:ring-secondary-700',
  }
</script>

<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset {toneClass[tone]}">
  <slot />
</span>
