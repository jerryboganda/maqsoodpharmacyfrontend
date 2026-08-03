<script lang="ts">
  import { onMount } from 'svelte'
  import PageLoadError from './common/PageLoadError.svelte'
  import PageLoader from './common/PageLoader.svelte'

  export let routePath: string

  let RouteView: typeof import('./RouteView.svelte')['default'] | null = null
  let loadError: Error | null = null

  onMount(() => {
    let mounted = true
    void import('./RouteView.svelte')
      .then((module) => {
        if (mounted) RouteView = module.default
      })
      .catch((error: unknown) => {
        if (mounted) loadError = error instanceof Error ? error : new Error('Unable to load route')
      })
    return () => {
      mounted = false
    }
  })

</script>

{#if loadError}
  <PageLoadError />
{:else if RouteView}
  <RouteView path={routePath} />
{:else}
  <PageLoader />
{/if}
