<script lang="ts">
  import Icon from '../../common/Icon.svelte'
  import { Icons } from '../../../icons'

  export let open = false
  export let title = ''
  export let widthClass = 'max-w-2xl'
  export let onClose: () => void = () => {}
</script>

{#if open}
  <div class="fixed inset-0 z-[1200] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm"
      role="presentation"
      on:click={onClose}
    ></div>
    <div
      class="relative w-full {widthClass} card !p-0 my-8 max-h-[calc(100vh-4rem)] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
        <h2 class="heading-5">{title}</h2>
        <button type="button" class="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200" on:click={onClose} aria-label="Close dialog">
          <Icon icon={Icons.close} className="w-5 h-5" />
        </button>
      </div>
      <div class="px-6 py-5 overflow-y-auto">
        <slot />
      </div>
      {#if $$slots.footer}
        <div class="px-6 py-4 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-end gap-3">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
