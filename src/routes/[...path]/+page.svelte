<script lang="ts">
  import { page } from '$app/stores'
  import RouteView from '$lib/components/RouteView.svelte'
  $: path = String($page.url.pathname)
</script>

<RouteView {path} />
