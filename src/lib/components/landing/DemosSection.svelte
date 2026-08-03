<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'
  import { setMode } from '../../stores/theme'

  const t = translate
  $: currentLocale = $locale
  const demos = [
    { title: 'landing.demos.items.overview_light.title', description: 'landing.demos.items.overview_light.desc', to: '/dashboard', image: '/assets/landing/demos/main-light.png', mode: 'light' as const, icon: Icons.dashboard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'landing.demos.items.overview_dark.title', description: 'landing.demos.items.overview_dark.desc', to: '/dashboard', image: '/assets/landing/demos/main-dark.png', mode: 'dark' as const, icon: Icons.dashboard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'landing.demos.items.analytics.title', description: 'landing.demos.items.analytics.desc', to: '/dashboard/analytics', image: '/assets/landing/demos/analytics.png', mode: 'light' as const, icon: Icons.chartBar, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { title: 'landing.demos.items.ecommerce.title', description: 'landing.demos.items.ecommerce.desc', to: '/dashboard/ecommerce', image: '/assets/landing/demos/e-commerce.png', mode: 'light' as const, icon: Icons.shopping, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'landing.demos.items.crm.title', description: 'landing.demos.items.crm.desc', to: '/dashboard/crm', image: '/assets/landing/demos/crm.png', mode: 'light' as const, icon: Icons.users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'landing.demos.items.calendar.title', description: 'landing.demos.items.calendar.desc', to: '/app/calendar', image: '/assets/landing/demos/calendar.png', mode: 'light' as const, icon: Icons.calendar, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ]
</script>

<section id="demos" data-locale={currentLocale} class="py-24 px-4 bg-surface-50 dark:bg-surface-950 scroll-mt-24 relative overflow-hidden">
  <div class="absolute top-0 right-0 w-[800px] h-[800px] bg-theme-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
  <div class="max-w-7xl mx-auto relative z-10">
    <div class="flex items-end justify-between gap-6 flex-wrap mb-16">
      <div>
        <div class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm mb-6"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-theme-primary"></span></span><span class="text-sm font-semibold text-secondary-600 dark:text-secondary-300">{t('landing.demos.badge')}</span></div>
        <h2 class="text-display-section text-secondary-900 dark:text-white">{t('landing.demos.title_prefix')} <span class="text-gradient">{t('landing.demos.title_emphasis')}</span></h2>
        <p class="text-lead text-secondary-600 dark:text-secondary-400 mt-4 max-w-2xl">{t('landing.demos.subtitle')}</p>
      </div>
      <a href="/dashboard" class="px-6 py-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-secondary-900 dark:text-white font-semibold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-2">{t('landing.demos.open_dashboard')}<Icon icon={Icons.arrowRight} className="w-4 h-4" /></a>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each demos as demo}
        <a href={demo.to} on:pointerdown={() => setMode(demo.mode)} on:click={() => setMode(demo.mode)} class="group relative rounded-[1rem] overflow-hidden border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:shadow-xl hover:shadow-theme-primary/10 transition-all duration-500 hover:-translate-y-1">
          <div class="relative overflow-hidden bg-surface-100 dark:bg-surface-900 group-hover:opacity-100 transition-opacity h-[310px]"><div class="absolute inset-0 bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-900 flex items-center justify-center text-secondary-300 dark:text-secondary-700"><Icon icon={demo.icon} className="w-12 h-12 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110" /></div><img src={demo.image} alt={t(demo.title)} class="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" /><div class="absolute inset-0 bg-secondary-900/0 group-hover:bg-secondary-900/5 transition-colors duration-300"></div></div>
          <div class="p-5"><div class="flex items-start gap-3"><div class={`w-10 h-10 rounded-xl ${demo.bg} flex items-center justify-center ${demo.color} flex-shrink-0`}><Icon icon={demo.icon} width={20} height={20} /></div><div class="flex-1"><h3 class="font-bold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors text-base">{t(demo.title)}</h3><p class="text-body text-secondary-500 dark:text-secondary-400 mt-1 leading-snug">{t(demo.description)}</p></div></div><div class="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between"><span class="text-ui-xs font-bold text-secondary-400 uppercase tracking-wider">{t('landing.demos.view_demo')}</span><div class="w-7 h-7 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-secondary-500 group-hover:bg-theme-primary group-hover:text-white transition-all duration-300"><Icon icon={Icons.arrowRight} width={12} height={12} /></div></div></div>
        </a>
      {/each}
    </div>
  </div>
</section>
