<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  const t = translate
  $: currentLocale = $locale
  const features = [
    { icon: Icons.bolt, title: 'landing.features.items.lightning_fast.title', description: 'landing.features.items.lightning_fast.desc', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Icons.palette, title: 'landing.features.items.modern_design.title', description: 'landing.features.items.modern_design.desc', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Icons.deviceMobile, title: 'landing.features.items.fully_responsive.title', description: 'landing.features.items.fully_responsive.desc', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Icons.moon, title: 'landing.features.items.dark_mode.title', description: 'landing.features.items.dark_mode.desc', color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { icon: Icons.lock, title: 'landing.features.items.auth_ready.title', description: 'landing.features.items.auth_ready.desc', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Icons.package, title: 'landing.features.items.typescript.title', description: 'landing.features.items.typescript.desc', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Icons.brandReact, title: 'landing.features.items.react19.title', description: 'landing.features.items.react19.desc', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { icon: Icons.rocket, title: 'landing.features.items.production_ui.title', description: 'landing.features.items.production_ui.desc', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ]
</script>

<section id="features" data-locale={currentLocale} class="py-24 px-4 bg-white dark:bg-surface-900 scroll-mt-24 relative overflow-hidden">
  <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-theme-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div><div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-theme-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
  <div class="max-w-7xl mx-auto relative z-10">
    <div class="text-center mb-20"><div class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm mb-6"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-theme-primary"></span></span><span class="text-sm font-semibold text-secondary-600 dark:text-secondary-300">{t('landing.features.badge')}</span></div><h2 class="text-display-section text-secondary-900 dark:text-white mb-6">{t('landing.features.title_prefix')} <span class="text-gradient">{t('landing.features.title_emphasis')}</span></h2><p class="text-lead text-secondary-600 dark:text-secondary-400 mt-4 max-w-2xl mx-auto">{t('landing.features.subtitle')}</p></div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {#each features as feature}<div class="group p-8 rounded-[2rem] bg-surface-50 dark:bg-surface-950 border border-surface-100 dark:border-surface-800 hover:border-theme-primary/20 hover:shadow-xl hover:shadow-theme-primary/5 transition-all duration-300 hover:-translate-y-1"><div class={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}><Icon icon={feature.icon} className={`w-7 h-7 ${feature.color}`} /></div><h3 class="heading-5 text-secondary-900 dark:text-white mb-3 group-hover:text-theme-primary transition-colors">{t(feature.title)}</h3><p class="text-body-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">{t(feature.description)}</p></div>{/each}
    </div>
  </div>
</section>
