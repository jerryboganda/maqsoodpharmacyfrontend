<script lang="ts">
  import { page } from '$app/stores'
  import RouteView from '$lib/components/RouteView.svelte'

  $: routePath = $page.url.pathname
</script>

<RouteView path={routePath} />
