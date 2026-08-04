<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { theme, initializeTheme } from '../../stores/theme'
  import { initializeLocale } from '../../stores/locale'
  import { navGroups, pharmacyNavGroups } from '../../navigation'
  import AppHeader from './AppHeader.svelte'
  import Sidebar from './Sidebar.svelte'
  import HorizontalNav from './HorizontalNav.svelte'
  import ThemeCustomizer from '../common/ThemeCustomizer.svelte'

  export let showCustomizer = true
  let mobileOpen = false
  $: horizontal = $theme.sidebarLayout === 'horizontal'
  $: collapsed = $theme.sidebarCollapsed && !horizontal
  $: sidebarWidth = collapsed ? 80 : 260
  $: isRtl = $theme.direction === 'rtl'
  // Route-aware: pharmacy pages get the pharmacy-only nav; every other (demo/template) route
  // keeps the theme's full nav, exactly as it did before this app grew a pharmacy section --
  // AdminShell wraps BOTH /pharmacy/* pages and the original template routes (/dashboard,
  // /tables/*, /charts/*, etc, see RouteView.svelte), so hardcoding pharmacyNavGroups here would
  // strip the demo routes' own nav (confirmed by a real CI e2e failure: the /dashboard locale
  // test couldn't find its "Overview" link once this was hardcoded).
  $: sidebarGroups = String($page.url.pathname).startsWith('/pharmacy') ? pharmacyNavGroups : navGroups

  onMount(() => {
    const stopTheme = initializeTheme()
    initializeLocale()
    return stopTheme
  })
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-950">
  <AppHeader {horizontal} {collapsed} {sidebarWidth} onMobileToggle={() => (mobileOpen = !mobileOpen)} />
  {#if horizontal}<HorizontalNav />{:else}<Sidebar groups={sidebarGroups} {collapsed} mobileOpen={mobileOpen} onClose={() => (mobileOpen = false)} />{/if}
  <main class="transition-all duration-300 lg:ms-0" style={`padding-top:${horizontal ? 112 : 64}px;${horizontal ? '' : (isRtl ? `margin-right:${sidebarWidth}px;` : `margin-left:${sidebarWidth}px;`)}`}>
    <div class="layout-container p-4 md:p-6"><slot /></div>
  </main>
  {#if showCustomizer}<ThemeCustomizer />{/if}
</div>

<style>
  @media (max-width: 1023px) {
    main { margin-left: 0 !important; margin-right: 0 !important; }
  }
</style>

