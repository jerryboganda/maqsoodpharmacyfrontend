<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import Icon from '../common/Icon.svelte'
  import Logo from '../common/Logo.svelte'
  import LanguageSwitcher from '../common/LanguageSwitcher.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'
  import { theme, toggleSidebar } from '../../stores/theme'
  import { session } from '../../stores/session'
  import { formatDateTime } from '../../api'
  import { notificationsApi, type NotificationRow } from '../../api/notifications'

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
  let unreadNotificationCount = 0
  let recentNotifications: NotificationRow[] = []
  let notificationsLoading = false
  let notificationsLoaded = false
  $: pathname = String($page.url.pathname)
  $: isRtl = $theme.direction === 'rtl'
  $: currentLocale = $locale
  $: currentUser = $session.user
  $: userInitials = (currentUser?.displayName ?? '').trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'
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

  /** Best-effort -- the header dropdown degrades to "no notifications" on a fetch failure rather
   *  than blocking the rest of the chrome (same "never let a widget's own fetch break the shell"
   *  convention as every other best-effort read in this header). Real data from GET /notifications
   *  (notification.service.ts's materialized-alert scan runs server-side on every call). */
  async function loadNotifications(): Promise<void> {
    if (!currentUser) return
    notificationsLoading = true
    try {
      const result = await notificationsApi.listNotifications({ limit: 5 })
      unreadNotificationCount = result.unreadCount
      recentNotifications = result.notifications
    } catch {
      // leave whatever was last successfully loaded on screen
    } finally {
      notificationsLoading = false
      notificationsLoaded = true
    }
  }

  function toggleNotifications(): void {
    notificationOpen = !notificationOpen
    if (notificationOpen) void loadNotifications()
  }

  async function markNotificationRead(id: number): Promise<void> {
    try {
      await notificationsApi.markRead(id)
      await loadNotifications()
    } catch {
      // best-effort -- a failed mark-read just leaves the row showing as unread, no user-facing error
    }
  }

  async function markAllNotificationsRead(): Promise<void> {
    try {
      await notificationsApi.markAllRead()
      await loadNotifications()
    } catch {
      // best-effort, same as markNotificationRead
    }
  }

  onMount(() => {
    void loadNotifications()
  })
  function getBreadcrumbs(path: string): { title: string; href?: string }[] {
    if (path.startsWith('/pharmacy/inventory/adjustments')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Inventory', href: '/pharmacy/inventory' }, { title: 'Adjustments' }]
    if (path.startsWith('/pharmacy/inventory/stock-takes')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Inventory', href: '/pharmacy/inventory' }, { title: 'Stock Takes' }]
    if (path.startsWith('/pharmacy/inventory/items')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Inventory', href: '/pharmacy/inventory' }, { title: 'Items' }]
    if (path.startsWith('/pharmacy/inventory/expiry')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Inventory', href: '/pharmacy/inventory' }, { title: 'Expiry' }]
    if (path.startsWith('/pharmacy/inventory')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Inventory' }]
    if (path.startsWith('/pharmacy/purchasing/suppliers')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Purchasing', href: '/pharmacy/purchasing/suppliers' }, { title: 'Suppliers' }]
    if (path.startsWith('/pharmacy/purchasing/invoices')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Purchasing', href: '/pharmacy/purchasing/suppliers' }, { title: 'Invoices' }]
    if (path.startsWith('/pharmacy/purchasing/orders')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Purchasing', href: '/pharmacy/purchasing/suppliers' }, { title: 'Orders' }]
    if (path.startsWith('/pharmacy/purchasing/returns')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Purchasing', href: '/pharmacy/purchasing/suppliers' }, { title: 'Returns' }]
    if (path.startsWith('/pharmacy/sales/pos')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Sales', href: '/pharmacy/sales/customers' }, { title: 'POS Checkout' }]
    if (path.startsWith('/pharmacy/sales/customers')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Sales', href: '/pharmacy/sales/customers' }, { title: 'Customers' }]
    if (path.startsWith('/pharmacy/sales/invoices')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Sales', href: '/pharmacy/sales/customers' }, { title: 'Invoices' }]
    if (path.startsWith('/pharmacy/sales/returns')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Sales', href: '/pharmacy/sales/customers' }, { title: 'Returns' }]
    if (path.startsWith('/pharmacy/accounting/chart-of-accounts')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Accounting', href: '/pharmacy/accounting/chart-of-accounts' }, { title: 'Chart of Accounts' }]
    if (path.startsWith('/pharmacy/accounting/vouchers')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Accounting', href: '/pharmacy/accounting/chart-of-accounts' }, { title: 'Journal Entries' }]
    if (path.startsWith('/pharmacy/accounting/cash-bank')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Accounting', href: '/pharmacy/accounting/chart-of-accounts' }, { title: 'Cash & Bank' }]
    if (path.startsWith('/pharmacy/payments/transactions')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Payments', href: '/pharmacy/payments/transactions' }, { title: 'Payments' }]
    if (path.startsWith('/pharmacy/payments/methods')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Payments', href: '/pharmacy/payments/transactions' }, { title: 'Payment Methods' }]
    if (path.startsWith('/pharmacy/expenses/transactions')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Expenses', href: '/pharmacy/expenses/transactions' }, { title: 'Expenses' }]
    if (path.startsWith('/pharmacy/expenses/categories')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Expenses', href: '/pharmacy/expenses/transactions' }, { title: 'Expense Categories' }]
    if (path.startsWith('/pharmacy/reports')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Reports' }]
    if (path.startsWith('/pharmacy/audit')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Audit Log' }]
    if (path.startsWith('/pharmacy/notifications')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Notifications' }]
    if (path.startsWith('/pharmacy/settings/options')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Settings' }]
    if (path.startsWith('/pharmacy/settings/users')) return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Users & Roles' }]
    return [{ title: 'Pharmacy', href: '/pharmacy' }, { title: 'Dashboard' }]
  }
  $: crumbs = getBreadcrumbs(pathname)
</script>

<svelte:window on:click={closeMenus} on:keydown={handleKeydown} />

<header data-locale={currentLocale} class="layout-header fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-surface-900/95 backdrop-blur border-b border-surface-200 dark:border-surface-800 z-[1020] transition-all duration-300" style={`left:${horizontal || isRtl ? 0 : sidebarWidth}px;right:${horizontal || !isRtl ? 0 : sidebarWidth}px`}>
  <div class={`${horizontal ? 'layout-container' : 'w-full px-4'} h-full flex items-center justify-between`}>
    <div class="flex items-center gap-3">
      {#if !horizontal}<button type="button" on:click={onMobileToggle} class="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('header.aria.toggle_mobile_menu')}><Icon icon={Icons.menu} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>{/if}
      {#if !horizontal}<button type="button" on:click={toggleSidebar} class="hidden lg:block p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('header.aria.toggle_sidebar')}><Icon icon={collapsed ? Icons.chevronRight : Icons.chevronLeft} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>{/if}
      {#if horizontal}<a href="/pharmacy" class="flex items-center gap-2 me-3" aria-label="Pharmacy Home"><Logo height={35} /></a>{/if}

      <div class="hidden sm:flex items-center gap-1.5 text-sm text-secondary-500 dark:text-secondary-400">
        {#each crumbs as crumb, i}
          {#if i > 0}<span class="text-surface-300 dark:text-surface-700">/</span>{/if}
          {#if crumb.href}
            <a href={crumb.href} class="hover:text-theme-primary transition-colors">{crumb.title}</a>
          {:else}
            <span class="font-semibold text-secondary-900 dark:text-white">{crumb.title}</span>
          {/if}
        {/each}
      </div>

      <button type="button" on:click={() => (searchOpen = !searchOpen)} class="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('common.search')}><Icon icon={Icons.search} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>
      <div class="hidden lg:flex items-center"><div class="relative"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" /><input type="text" placeholder={translate('search_placeholder')} class="w-48 xl:w-72 pl-10 pr-4 py-2 bg-surface-100 dark:bg-surface-800 border-0 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20" /></div></div>
    </div>

    <div class="flex items-center gap-2">
      <button type="button" on:click={() => (searchOpen = !searchOpen)} class="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={translate('common.search')}><Icon icon={Icons.search} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" /></button>
      <div class="hidden sm:block"><LanguageSwitcher /></div>
      <div class="relative" bind:this={notificationRoot}>
        <button type="button" class="relative p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" on:click|stopPropagation={toggleNotifications} aria-label={translate('header.notifications')} aria-expanded={notificationOpen}>
          <Icon icon={Icons.bell} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
          {#if unreadNotificationCount > 0}<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white dark:ring-surface-900"></span>{/if}
        </button>
        {#if notificationOpen}
          <div class="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl p-3 z-[1035]">
            <div class="flex items-center justify-between px-2 py-1">
              <p class="text-sm font-semibold text-secondary-900 dark:text-white">{translate('header.notifications')}{#if unreadNotificationCount > 0}<span class="ms-1.5 text-xs font-normal text-secondary-500 dark:text-secondary-400">({unreadNotificationCount})</span>{/if}</p>
              <div class="flex items-center gap-2">
                {#if unreadNotificationCount > 0}<button type="button" class="text-xs text-theme-primary hover:underline" on:click={markAllNotificationsRead}>Mark all read</button>{/if}
                <a href="/pharmacy/notifications" class="text-xs text-theme-primary hover:underline" on:click={() => (notificationOpen = false)}>{translate('common.manage')}</a>
              </div>
            </div>
            <div class="mt-2 space-y-2 max-h-80 overflow-y-auto">
              {#if notificationsLoading && !notificationsLoaded}
                <p class="text-sm text-secondary-500 dark:text-secondary-400 text-center py-6">Loading&hellip;</p>
              {:else if recentNotifications.length === 0}
                <p class="text-sm text-secondary-500 dark:text-secondary-400 text-center py-6">No notifications</p>
              {:else}
                {#each recentNotifications as notification (notification.notificationId)}
                  <button
                    type="button"
                    class="w-full text-left rounded-xl p-3 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    on:click={() => { if (!notification.readAt) void markNotificationRead(notification.notificationId); notificationOpen = false; if (notification.link) window.location.assign(notification.link) }}
                  >
                    <div class="flex items-start gap-2">
                      <span class={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${notification.severity === 'critical' ? 'bg-danger-500' : notification.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                      <div class="min-w-0">
                        <p class={`text-sm ${notification.readAt ? 'text-secondary-600 dark:text-secondary-400' : 'font-semibold text-secondary-900 dark:text-white'}`}>{notification.title}</p>
                        <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{formatDateTime(notification.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>
      <div class="relative" bind:this={userRoot}><button type="button" on:click|stopPropagation={() => (userOpen = !userOpen)} class="flex items-center gap-3 ps-2 border-s border-surface-200 dark:border-surface-700 ms-2" aria-label={translate('header.user_menu')} aria-expanded={userOpen}><div class="hidden sm:block text-right"><p class="text-sm font-medium text-secondary-900 dark:text-white">{currentUser?.displayName ?? 'Guest'}</p><p class="text-xs text-secondary-500 dark:text-secondary-400">{currentUser?.roles?.[0] ?? ''}</p></div><div class="w-9 h-9 rounded-full bg-theme-primary flex items-center justify-center text-white text-sm font-semibold">{userInitials}</div></button>{#if userOpen}<div class="absolute right-0 mt-2 w-56 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl p-2 z-[1035]"><a href="/pharmacy/settings/users" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-secondary-700 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-800" on:click={() => (userOpen = false)}><Icon icon={Icons.user} className="w-5 h-5" />{translate('common.profile')}</a><a href="/pharmacy/settings/options" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-secondary-700 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-800" on:click={() => (userOpen = false)}><Icon icon={Icons.settings} className="w-5 h-5" />{translate('common.settings')}</a><div class="my-2 border-t border-surface-200 dark:border-surface-700"></div><a href="/pharmacy/login" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20" on:click={() => (userOpen = false)}><Icon icon={Icons.logout} className="w-5 h-5" />{translate('common.logout')}</a></div>{/if}</div>
    </div>
  </div>
  {#if searchOpen}<div class="lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 p-4 shadow-lg z-[1019]"><div class="relative"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /><input type="text" placeholder={translate('search_placeholder')} class="w-full pl-10 pr-4 py-2.5 bg-surface-100 dark:bg-surface-800 border-0 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20" /></div></div>{/if}
</header>

<style>
  @media (max-width: 1023px) { .layout-header { left: 0 !important; right: 0 !important; } }
</style>


