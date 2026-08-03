<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'

  export let label = ''
  export let value = ''
  export let change = ''
  export let isPositive = true
  export let icon = ''
  export let iconBg = 'bg-primary-100 dark:bg-primary-900/40'
  export let iconColor = 'text-primary-600 dark:text-primary-400'
  export let showMenu = true
</script>

<div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
  <div class="flex items-center justify-between mb-4">
    <div class={'w-11 h-11 rounded-xl ' + iconBg + ' flex items-center justify-center'}>
      <Icon icon={icon} className={'w-5 h-5 ' + iconColor} width={20} height={20} />
    </div>
    {#if showMenu}
      <button type="button" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label="More options">
        <Icon icon={Icons.dotsVertical} className="w-4 h-4 text-secondary-400" width={16} height={16} />
      </button>
    {/if}
  </div>
  <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">{label}</p>
  <div class="flex items-end justify-between mt-1">
    <p class="heading-3 text-secondary-900 dark:text-white">{value}</p>
    {#if change}
      <span class={'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ' + (isPositive ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400')}>
        <Icon icon={isPositive ? Icons.arrowUpRight : Icons.arrowDownRight} className="w-3 h-3" width={12} height={12} />
        {change}
      </span>
    {/if}
  </div>
</div>

