<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import '../index.css'
  import ThemeCustomizer from '$lib/components/common/ThemeCustomizer.svelte'
  import Toast from '$lib/components/pharmacy/shared/Toast.svelte'
  import { initializeLocale, initializeTheme } from '$lib/stores'
  import { restoreSession } from '$lib/stores/session'

  $: showCustomizer = $page.route.id !== '/[...path]'

  onMount(() => {
    const stopTheme = initializeTheme()
    initializeLocale()
    // Global, not just on the login page: the bearer token lives in an in-memory variable
    // (client.ts's setAuthToken), which is wiped on every full page load/reload. Without this,
    // navigating straight to any pharmacy route other than /pharmacy/login (a hard reload, a
    // bookmark, a browser refresh) leaves that in-memory token unset even though sessionStorage
    // still has it, and every authenticated request 401s until the user revisits /pharmacy/login.
    // restoreSession() is idempotent/read-only (validates an existing token, no-ops if absent) so
    // calling it here unconditionally, in addition to PharmacyLoginPage's own call, is harmless.
    void restoreSession()
    return stopTheme
  })
</script>

<div class="min-h-screen bg-surface-100 dark:bg-surface-950">
  <slot />
  {#if showCustomizer}<ThemeCustomizer />{/if}
  <Toast />
</div>
