<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import Logo from '../common/Logo.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  const t = translate
  let mobileOpen = false
  let megaOpen = false
  let scrolled = false
  let mounted = false
  let closeTimer: number | undefined
  $: currentLocale = $locale

  const sectionLinks = [
    { label: 'landing.header.nav.demos', href: '#demos' },
    { label: 'landing.header.nav.features', href: '#features' },
    { label: 'landing.header.nav.widgets', href: '#widgets' },
    { label: 'landing.header.nav.testimonials', href: '#testimonials' },
  ] as const

  $: dashboards = [
    {
      title: t('nav.analytics'),
      description: t('landing.header.dashboards.analytics.desc'),
      to: '/dashboard/analytics', icon: Icons.chartLine,
      iconColor: 'text-blue-600 dark:text-blue-400', badge: t('landing.header.badge.popular'), badgeKind: 'popular',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
    },
    {
      title: t('nav.ecommerce_title'),
      description: t('landing.header.dashboards.ecommerce.desc'),
      to: '/dashboard/ecommerce', icon: Icons.shoppingBag,
      iconColor: 'text-emerald-600 dark:text-emerald-400', badge: t('landing.header.badge.new'), badgeKind: 'new',
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    },
    {
      title: t('nav.crm'),
      description: t('landing.header.dashboards.crm.desc'),
      to: '/dashboard/crm', icon: Icons.users,
      iconColor: 'text-orange-600 dark:text-orange-400', badge: t('landing.header.badge.pro'), badgeKind: 'pro',
      bg: 'bg-orange-50 dark:bg-orange-900/10',
    },
  ]

  const quickLinks = [
    { key: 'landing.header.quick_links.chat_app', to: '/app/chat', icon: Icons.message },
    { key: 'landing.header.quick_links.kanban_board', to: '/app/kanban', icon: Icons.kanban },
    { key: 'landing.header.quick_links.file_manager', to: '/app/files', icon: Icons.briefcase },
    { key: 'landing.header.quick_links.user_profile', to: '/pages/account-settings', icon: Icons.user },
  ]

  onMount(() => {
    mounted = true
    const handleScroll = () => (scrolled = window.scrollY > 20)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        mobileOpen = false
        megaOpen = false
      }
    }
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && !target.closest('[data-landing-mega-root]')) megaOpen = false
    }
    window.addEventListener('scroll', handleScroll)
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleOutside)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleOutside)
      if (closeTimer !== undefined) window.clearTimeout(closeTimer)
      document.body.style.overflow = ''
    }
  })

  $: if (mounted) document.body.style.overflow = mobileOpen ? 'hidden' : ''

  function openMega(): void {
    if (closeTimer !== undefined) window.clearTimeout(closeTimer)
    megaOpen = true
  }

  function scheduleMegaClose(): void {
    if (closeTimer !== undefined) window.clearTimeout(closeTimer)
    closeTimer = window.setTimeout(() => (megaOpen = false), 150)
  }

  function closeMobile(): void {
    mobileOpen = false
  }
</script>

<header data-locale={currentLocale} class={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200/50 dark:border-surface-800/50 shadow-sm py-3' : 'bg-transparent py-5'}`}>
  <div class="max-w-7xl mx-auto px-4 sm:px-4 lg:px-0">
    <div class="flex items-center justify-between" data-landing-mega-root>
      <a href="/" class="flex items-center gap-2.5 group">
        <Logo className="group-hover:scale-105 transition-transform duration-300" width={140} height={28} />
      </a>

      <nav class="hidden md:flex items-center p-1.5 rounded-full bg-surface-100/50 dark:bg-surface-900/50 border border-surface-200/50 dark:border-surface-800/50 backdrop-blur-md shadow-sm">
        {#each sectionLinks as link}
          <a href={link.href} class="px-4 py-2 rounded-full text-sm font-medium text-secondary-600 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-800 transition-all duration-200">{t(link.label)}</a>
        {/each}
        <div class="relative" role="presentation" on:mouseenter={openMega} on:mouseleave={scheduleMegaClose}>
          <button type="button" class={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${megaOpen ? 'bg-white dark:bg-surface-800 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-600 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-800'}`} aria-haspopup="menu" aria-expanded={megaOpen} on:click={() => (megaOpen = !megaOpen)}>
            {t('landing.header.nav.dashboards')}
            <Icon icon={Icons.chevronDown} className={`w-4 h-4 transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
          </button>

          <div class={`absolute left-1/2 -translate-x-1/2 top-full mt-6 w-[800px] transition-all duration-300 origin-top-right ${megaOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible'}`} role="presentation" on:mouseenter={openMega} on:mouseleave={scheduleMegaClose}>
            <div class="rounded-[2rem] border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl shadow-theme-primary/10 overflow-hidden p-2">
              <div class="grid grid-cols-12 gap-2">
                <div class="col-span-8 p-6 bg-surface-50/50 dark:bg-surface-950/50 rounded-[1.5rem]">
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-2">
                      <div class="p-2 rounded-lg bg-theme-primary/10 text-theme-primary"><Icon icon={Icons.sparkles} className="w-4 h-4" /></div>
                      <div>
                        <h3 class="text-sm font-bold text-secondary-900 dark:text-white">{t('landing.header.mega.title')}</h3>
                        <p class="text-xs text-secondary-500 dark:text-secondary-400">{t('landing.header.mega.subtitle')}</p>
                      </div>
                    </div>
                    <a href="/dashboard" class="text-xs font-bold text-theme-primary hover:text-theme-primary-dark transition-colors flex items-center gap-1 bg-white dark:bg-surface-800 px-3 py-1.5 rounded-full shadow-sm border border-surface-200 dark:border-surface-700" on:click={() => (megaOpen = false)}>{t('landing.header.mega.view_all')}<Icon icon={Icons.arrowRight} className="w-3 h-3" /></a>
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    {#each dashboards as dashboard}
                      <a href={dashboard.to} on:click={() => (megaOpen = false)} class="group relative flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-theme-primary/50 hover:shadow-lg hover:shadow-theme-primary/5 transition-all duration-300">
                        <div class={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${dashboard.bg} ${dashboard.iconColor} group-hover:scale-110 transition-transform`}><Icon icon={dashboard.icon} className="w-6 h-6" /></div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-1"><h4 class="text-sm font-bold text-secondary-900 dark:text-white truncate">{dashboard.title}</h4><span class={`px-1.5 py-0.5 rounded text-ui-2xs font-bold uppercase tracking-wider ${dashboard.badgeKind === 'new' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-surface-100 text-secondary-600 dark:bg-surface-700 dark:text-secondary-400'}`}>{dashboard.badge}</span></div>
                          <p class="text-xs text-secondary-500 dark:text-secondary-400 line-clamp-2 leading-relaxed">{dashboard.description}</p>
                        </div>
                      </a>
                    {/each}
                  </div>
                </div>
                <div class="col-span-4 flex flex-col gap-2">
                  <div class="p-6 rounded-[1.5rem] bg-surface-50/50 dark:bg-surface-950/50 h-full">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-secondary-500 dark:text-secondary-400 mb-4 px-2">{t('landing.header.quick_links.title')}</h3>
                    <div class="space-y-1">
                      {#each quickLinks as link}
                        <a href={link.to} on:click={() => (megaOpen = false)} class="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-surface-800 transition-all hover:shadow-sm group"><Icon icon={link.icon} className="w-4 h-4 text-secondary-400 group-hover:text-theme-primary transition-colors" /><span class="text-sm font-medium text-secondary-700 dark:text-secondary-200 group-hover:text-secondary-900 dark:group-hover:text-white">{t(link.key)}</span></a>
                      {/each}
                    </div>
                  </div>
                  <a href="/dashboard" on:click={() => (megaOpen = false)} class="p-6 rounded-[1.5rem] bg-theme-primary text-white shadow-lg shadow-theme-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-center items-center gap-3">
                    <div class="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30"><Icon icon={Icons.layoutGrid} className="w-6 h-6" /></div>
                    <div class="text-center"><p class="text-base font-bold leading-tight text-white">{t('landing.header.components_cta.title')}</p><p class="text-xs opacity-90 font-medium mt-1 text-white">{t('landing.header.components_cta.subtitle')}</p></div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div class="hidden md:flex items-center gap-3">
        <a href="/auth/login" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-secondary-700 dark:text-secondary-200 border border-surface-200 dark:border-surface-800 hover:border-theme-primary hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">{t('landing.header.actions.login')}</a>
        <a href="/auth/register" class="btn-theme-primary px-6 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/20 hover:shadow-xl transition-all">{t('home.get_started')}<Icon icon={Icons.chevronDown} className="w-4 h-4 -rotate-90" /></a>
      </div>

      <button type="button" class="md:hidden relative z-50 w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-secondary-900 dark:text-white" on:click={() => (mobileOpen = !mobileOpen)} aria-expanded={mobileOpen} aria-label="Toggle navigation"><Icon icon={mobileOpen ? Icons.x : Icons.menu} className="w-5 h-5" /></button>
    </div>
  </div>

  <div class={`fixed inset-0 z-40 bg-white/95 dark:bg-surface-950/95 backdrop-blur-xl transition-all duration-300 md:hidden ${mobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
    <div class="h-full overflow-y-auto pt-24 pb-8 px-6">
      <div class="flex flex-col gap-2">
        {#each sectionLinks as link}<a href={link.href} on:click={closeMobile} class="heading-3 text-secondary-900 dark:text-white py-3 border-b border-surface-100 dark:border-surface-800">{t(link.label)}</a>{/each}
      </div>
      <div class="mt-8">
        <p class="text-xs font-bold uppercase tracking-wider text-secondary-500 dark:text-secondary-400 mb-4">{t('landing.header.nav.dashboards')}</p>
        <div class="grid gap-3">
          {#each dashboards as dashboard}<a href={dashboard.to} on:click={closeMobile} class="flex items-center gap-4 p-4 rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800"><div class={`w-10 h-10 rounded-xl bg-white dark:bg-surface-800 flex items-center justify-center ${dashboard.iconColor} shadow-sm`}><Icon icon={dashboard.icon} className="w-5 h-5" /></div><div><h4 class="text-base font-bold text-secondary-900 dark:text-white">{dashboard.title}</h4><p class="text-xs text-secondary-500 dark:text-secondary-400">{dashboard.description}</p></div></a>{/each}
        </div>
      </div>
      <div class="mt-8 grid gap-3">
        <a href="/auth/login" on:click={closeMobile} class="w-full py-3 rounded-xl border border-surface-200 dark:border-surface-800 text-center font-bold text-secondary-900 dark:text-white hover:border-theme-primary transition-colors">{t('landing.header.actions.login')}</a>
        <a href="/auth/register" on:click={closeMobile} class="btn-theme-primary w-full py-3 rounded-xl text-white text-center font-bold shadow-lg shadow-theme-primary/20">{t('home.get_started')}</a>
      </div>
    </div>
  </div>
</header>
