<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import '../index.css'
  import ThemeCustomizer from '$lib/components/common/ThemeCustomizer.svelte'
  import { initializeLocale, initializeTheme } from '$lib/stores'

  $: showCustomizer = $page.route.id !== '/[...path]'

  onMount(() => {
    const stopTheme = initializeTheme()
    initializeLocale()
    return stopTheme
  })
</script>

<div class="min-h-screen bg-surface-100 dark:bg-surface-950">
  <slot />
  {#if showCustomizer}<ThemeCustomizer />{/if}
</div>
