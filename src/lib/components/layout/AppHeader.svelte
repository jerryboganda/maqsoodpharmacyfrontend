<script lang="ts">
  import { page } from '$app/stores'
  import Icon from '../common/Icon.svelte'
  import Logo from '../common/Logo.svelte'
  import LanguageSwitcher from '../common/LanguageSwitcher.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'
  import { theme, toggleSidebar } from '../../stores/theme'

  export let horizontal = false
  export let collapsed = false
  export let sidebarWidth = 260
  export let onMobileToggle: () => void = () => undefined

  type MegaItem = { to: string; title: string; description: string; icon: string; badge?: string }
  type MegaMenu = { id: string; label: string; items: MegaItem[]; footer: { label: string; to: string } }

  let openMega: string | null = null
  let userOpen = false
  let notificationOpen = false
  let searchOpen = false
  let megaTimer: ReturnType<typeof setTimeout> | null = null
  let megaRoot: HTMLElement | null = null
  let userRoot: HTMLElement | null = null
  let notificationRoot: HTMLElement | null = null
  $: pathname = String($page.url.pathname)
  $: isRtl = $theme.direction === 'rtl'
  $: currentLocale = $locale
  $: menus = [
    {
      id: 'apps', label: translate('header.menu.apps'),
      items: [
        { to: '/app/email', title: translate('nav.email'), description: translate('header.apps.email_desc'), icon: Icons.mail, badge: '3' },
        { to: '/app/chat', title: translate('nav.chat'), description: translate('header.apps.chat_desc'), icon: Icons.message, badge: '5' },
        { to: '/app/notes', title: translate('nav.notes'), description: translate('header.apps.notes_desc'), icon: Icons.note },
        { to: '/app/kanban', title: translate('nav.kanban_board'), description: translate('header.apps.kanban_desc'), icon: Icons.kanban },
        { to: '/app/calendar', title: translate('nav.calendar'), description: translate('header.apps.calendar_desc'), icon: Icons.calendar },
        { to: '/app/ecommerce/products', title: translate('nav.ecommerce_title'), description: translate('header.apps.ecommerce_desc'), icon: Icons.shopping },
        { to: '/app/blog', title: translate('nav.blog'), description: translate('header.apps.blog_desc'), icon: Icons.article },
      ], footer: { label: translate('header.footer.all_apps'), to: '/dashboard' },
    },
    {
      id: 'components', label: translate('header.menu.components'),
      items: [
        { to: '/forms/layout', title: translate('header.components.forms'), description: translate('header.components.forms_desc'), icon: Icons.layoutGrid },
        { to: '/tables/data', title: translate('header.components.tables'), description: translate('header.components.tables_desc'), icon: Icons.table },
        { to: '/charts/line', title: translate('header.components.charts'), description: translate('header.components.charts_desc'), icon: Icons.chartLine },
        { to: '/pages/account-settings', title: translate('header.components.settings_pages'), description: translate('header.components.settings_pages_desc'), icon: Icons.settings },
      ], footer: { label: translate('header.footer.explore_pages'), to: '/pages/pricing' },
    },
  ] as MegaMenu[]

  function active(path: string): boolean { return pathname === path || pathname.startsWith(`${path}/`) }
  function clearMegaTimer(): void { if (megaTimer) { clearTimeout(megaTimer); megaTimer = null } }
  function openMegaMenu(id: string): void { clearMegaTimer(); openMega = id }
  function scheduleMegaClose(): void { clearMegaTimer(); megaTimer = setTimeout(() => (openMega = null), 180) }
  function closeMenus(event: MouseEvent): void {
    const target = event.target as Node
    if (openMega && megaRoot && !megaRoot.contains(target)) openMega = null
    if (userOpen && userRoot && !userRoot.contains(target)) userOpen = false
    if (notificationOpen && notificationRoot && !notificationRoot.contains(target)) notificationOpen = false
  }
  function handleKeydown(event: KeyboardEvent): void { if (event.key === 'Escape') { openMega = null; userOpen = false; notificationOpen = false; searchOpen = false } }
</script>

<svelte:window on:click={closeMenus} on:keydown={handleKeydown} />

<header data-locale={currentLocale} class="layout-header fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-surface-900/95 backdrop-blur border-b border-surface-200 dark:border-surface-800 z-[1020] transition-all duration-300" style={`left:${horizontal || isRtl ? 0 : sidebarWidth}px;right:${horizontal || !isRtl ? 0 : sidebarWidth}px`}>
  <div class={`${horizontal ? 'layout-container' : 'w-full px-4'} h-full flex items-center justify-between`}>
    <div class="flex items-center gap-3">
      {#if !horizontal}<button type="button" on:click={onMobileToggle} class="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('header.aria.toggle_mobile_menu')}><Icon icon={Icons.menu} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>{/if}
      {#if !horizontal}<button type="button" on:click={toggleSidebar} class="hidden lg:block p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('header.aria.toggle_sidebar')}><Icon icon={collapsed ? Icons.chevronRight : Icons.chevronLeft} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>{/if}
      {#if horizontal}<a href="/" class="flex items-center gap-2 me-3" aria-label="Adminex Home"><Logo height={35} /></a>{/if}

      <div class="hidden xl:flex items-center gap-1" bind:this={megaRoot}>
        <a href="/dashboard" class={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active('/dashboard') ? 'bg-theme-primary/10 text-theme-primary' : 'text-secondary-600 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white'}`}>{translate('header.top.dashboard')}</a>
        <a href="/pages/pricing" class={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active('/pages') ? 'bg-theme-primary/10 text-theme-primary' : 'text-secondary-600 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white'}`}>{translate('header.top.pages')}</a>
        {#each menus as menu}
          <div class="relative">
            <button type="button" on:click|stopPropagation={() => { clearMegaTimer(); openMega = openMega === menu.id ? null : menu.id }} on:mouseenter={() => openMegaMenu(menu.id)} on:mouseleave={scheduleMegaClose} class={`${openMega === menu.id ? 'bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white' : 'text-secondary-600 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white'} px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1`} aria-haspopup="menu" aria-expanded={openMega === menu.id}>{menu.label}<Icon icon={Icons.chevronDown} className="w-4 h-4" /></button>
            {#if openMega === menu.id}
              <div role="presentation" class="absolute left-0 mt-2 w-[860px] rounded-3xl border border-surface-200/80 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl p-5 z-[1035]" on:mouseenter={() => openMegaMenu(menu.id)} on:mouseleave={scheduleMegaClose}>
                <div class="flex items-center justify-between mb-4"><div><p class="text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">{menu.label}</p><p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">{translate('header.quick_access')}</p></div><button type="button" class="text-sm text-secondary-500 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white" on:click={() => (openMega = null)}>{translate('common.close')}</button></div>
                <div class="grid grid-cols-3 gap-3">
                  {#each menu.items as item}<a href={item.to} on:click={() => (openMega = null)} class={`group flex items-start gap-3 rounded-2xl p-4 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors border border-transparent hover:border-surface-200/70 dark:hover:border-surface-700 ${active(item.to) ? 'bg-surface-50 dark:bg-surface-800 border-surface-200/70 dark:border-surface-700' : ''}`}><div class="w-11 h-11 rounded-2xl bg-theme-primary/10 text-theme-primary flex items-center justify-center flex-shrink-0"><Icon icon={item.icon} className="w-5 h-5" /></div><div class="min-w-0"><div class="flex items-center gap-2"><p class="text-ui font-semibold text-secondary-900 dark:text-white truncate">{item.title}</p>{#if item.badge}<span class="px-2 py-0.5 text-ui-xs rounded-full bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-300">{item.badge}</span>{/if}</div><p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1 line-clamp-2">{item.description}</p></div></a>{/each}
                </div>
                <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between"><div class="flex items-center gap-2"><span class="text-xs text-secondary-500 dark:text-secondary-400">{translate('header.shortcuts')}</span><a href="/forms/layout" class="text-xs px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200 hover:bg-surface-200 dark:hover:bg-surface-700">{translate('header.components.forms')}</a><a href="/tables/data" class="text-xs px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200 hover:bg-surface-200 dark:hover:bg-surface-700">{translate('header.components.tables')}</a><a href="/charts/line" class="text-xs px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200 hover:bg-surface-200 dark:hover:bg-surface-700">{translate('header.components.charts')}</a></div><a href={menu.footer.to} class="text-sm font-semibold text-theme-primary hover:underline">{menu.footer.label}</a></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <button type="button" on:click={() => (searchOpen = !searchOpen)} class="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('common.search')}><Icon icon={Icons.search} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>
      <div class="hidden lg:flex items-center"><div class="relative"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" /><input type="text" placeholder={translate('search_placeholder')} class="w-48 xl:w-72 pl-10 pr-4 py-2 bg-surface-100 dark:bg-surface-800 border-0 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20" /></div></div>
    </div>

    <div class="flex items-center gap-2">
      <button type="button" on:click={() => (searchOpen = !searchOpen)} class="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('common.search')}><Icon icon={Icons.search} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>
      <a href="/app/blog/create" class="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-primary text-white text-sm font-medium hover:bg-theme-primary-dark transition-colors"><Icon icon={Icons.plus} className="w-4 h-4" /><span class="hidden lg:inline">{translate('create')}</span></a>
      <div class="hidden sm:block"><LanguageSwitcher /></div>
      <div class="relative" bind:this={notificationRoot}><button type="button" class="relative p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" on:click|stopPropagation={() => (notificationOpen = !notificationOpen)} aria-label={translate('header.notifications')} aria-expanded={notificationOpen}><Icon icon={Icons.bell} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /><span class="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white dark:ring-surface-900"></span></button>{#if notificationOpen}<div class="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl p-3 z-[1035]"><div class="flex items-center justify-between px-2 py-1"><p class="text-sm font-semibold text-secondary-900 dark:text-white">{translate('header.notifications')}</p><a href="/pages/account-settings" class="text-xs text-theme-primary hover:underline" on:click={() => (notificationOpen = false)}>{translate('common.manage')}</a></div><div class="mt-2 space-y-2"><div class="rounded-xl p-3 bg-surface-50 dark:bg-surface-800"><p class="text-sm text-secondary-900 dark:text-white">New message in Chat</p><p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">2 minutes ago</p></div><div class="rounded-xl p-3 bg-surface-50 dark:bg-surface-800"><p class="text-sm text-secondary-900 dark:text-white">Order #1024 paid</p><p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Today</p></div></div></div>{/if}</div>
      <div class="relative" bind:this={userRoot}><button type="button" on:click|stopPropagation={() => (userOpen = !userOpen)} class="flex items-center gap-3 ps-2 border-s border-surface-200 dark:border-surface-700 ms-2" aria-label={translate('header.user_menu')} aria-expanded={userOpen}><div class="hidden sm:block text-right"><p class="text-sm font-medium text-secondary-900 dark:text-white">John Doe</p><p class="text-xs text-secondary-500 dark:text-secondary-400">Admin</p></div><div class="w-9 h-9 rounded-full bg-theme-primary flex items-center justify-center text-white text-sm font-semibold">JD</div></button>{#if userOpen}<div class="absolute right-0 mt-2 w-56 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl p-2 z-[1035]"><a href="/pages/account-settings" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-secondary-700 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-800" on:click={() => (userOpen = false)}><Icon icon={Icons.user} className="w-5 h-5" />{translate('common.profile')}</a><a href="/pages/account-settings" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-secondary-700 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-800" on:click={() => (userOpen = false)}><Icon icon={Icons.settings} className="w-5 h-5" />{translate('common.settings')}</a><a href="/pages/faq" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-secondary-700 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-800" on:click={() => (userOpen = false)}><Icon icon={Icons.help} className="w-5 h-5" />{translate('common.help')}</a><div class="my-2 border-t border-surface-200 dark:border-surface-700"></div><a href="/auth/login" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20" on:click={() => (userOpen = false)}><Icon icon={Icons.logout} className="w-5 h-5" />{translate('common.logout')}</a></div>{/if}</div>
    </div>
  </div>
  {#if searchOpen}<div class="lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 p-4 shadow-lg z-[1019]"><div class="relative"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /><input type="text" placeholder={translate('search_placeholder')} class="w-full pl-10 pr-4 py-2.5 bg-surface-100 dark:bg-surface-800 border-0 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20" /></div></div>{/if}
</header>

<style>
  @media (max-width: 1023px) { .layout-header { left: 0 !important; right: 0 !important; } }
</style>


