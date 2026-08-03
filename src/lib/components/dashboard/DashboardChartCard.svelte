<script lang="ts">
  export let title = ''
  export let subtitle = ''
  export let className = ''
</script>

<div class={'card rounded-xl p-6 ' + className}>
  <div class="flex items-start justify-between mb-6">
    <div>
      <h3 class="heading-5 text-secondary-900 dark:text-white">{title}</h3>
      {#if subtitle}
        <p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-0.5">{subtitle}</p>
      {/if}
    </div>
    {#if $$slots.action}
      <div><slot name="action" /></div>
    {/if}
  </div>
  <slot />
</div>



