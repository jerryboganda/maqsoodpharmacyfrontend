<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  const t = translate
  $: currentLocale = $locale

  const rings = [
    {
      diameter: 650, duration: 40, reverse: false, opacity: '', visibility: '',
      items: [
        { icon: Icons.chartBar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { icon: Icons.users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { icon: Icons.settings, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { icon: Icons.shopping, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      ],
    },
    {
      diameter: 950, duration: 60, reverse: true, opacity: 'opacity-90', visibility: 'hidden sm:block',
      items: [
        { icon: Icons.mail, color: 'text-pink-500', bg: 'bg-pink-500/10' },
        { icon: Icons.calendar, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { icon: Icons.lock, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
        { icon: Icons.file, color: 'text-red-500', bg: 'bg-red-500/10' },
        { icon: Icons.dashboard, color: 'text-teal-500', bg: 'bg-teal-500/10' },
        { icon: Icons.video, color: 'text-violet-500', bg: 'bg-violet-500/10' },
      ],
    },
    {
      diameter: 1250, duration: 80, reverse: false, opacity: 'opacity-70', visibility: 'hidden md:block',
      items: [
        { icon: Icons.kanban, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { icon: Icons.camera, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { icon: Icons.article, color: 'text-lime-500', bg: 'bg-lime-500/10' },
        { icon: Icons.microphone, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
        { icon: Icons.creditCard, color: 'text-sky-500', bg: 'bg-sky-500/10' },
        { icon: Icons.chartPie, color: 'text-green-500', bg: 'bg-green-500/10' },
        { icon: Icons.message, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { icon: Icons.phone, color: 'text-slate-500', bg: 'bg-slate-500/10' },
      ],
    },
  ]
</script>

<section id="top" data-locale={currentLocale} class="relative min-h-screen overflow-hidden flex items-center justify-center pt-20">
  <div class="absolute inset-0 bg-surface-50 dark:bg-surface-950 transition-colors duration-300"></div>
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-theme-primary/10 via-transparent to-transparent opacity-50 dark:opacity-30"></div>

  <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
    {#each rings as ring}
      <div class={`absolute rounded-full border border-surface-200 dark:border-surface-800 animate-${ring.reverse ? 'orbit-reverse' : 'orbit'} ${ring.opacity} ${ring.visibility}`} style={`width:${ring.diameter}px;height:${ring.diameter}px;--duration-orbit:${ring.duration}s`}>
        {#each ring.items as item, index}
          {@const angle = (index / ring.items.length) * 360}
          <div class="absolute top-1/2 left-1/2 -ml-6 -mt-6 pointer-events-auto" style={`transform:rotate(${angle}deg) translateY(-${ring.diameter / 2}px) rotate(-${angle}deg)`}>
            <div class={`animate-${ring.reverse ? 'orbit' : 'orbit-reverse'}`} style={`--duration-orbit:${ring.duration}s`}>
              <div class={`w-12 h-12 rounded-2xl ${item.bg} border border-surface-200 dark:border-surface-700 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-125 cursor-default`}>
                <Icon icon={item.icon} className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pb-20">
    <div class="animate-fade-in flex flex-col items-center">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-800 text-sm text-secondary-700 dark:text-secondary-200 backdrop-blur-xl mb-8 shadow-sm">
        <Icon icon={Icons.sparkles} className="w-4 h-4 text-theme-primary" /><span class="font-medium">{t('landing.hero.badge')}</span>
      </div>
      <h1 class="text-display-hero text-secondary-900 dark:text-white mb-8">{t('landing.hero.title_prefix')}<br /><span class="text-gradient dark:text-white">{t('landing.hero.title_emphasis')}</span></h1>
      <p class="text-lead text-secondary-600 dark:text-secondary-400 mb-12 max-w-2xl mx-auto leading-relaxed">{t('landing.hero.subtitle')}</p>
      <div class="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <a href="/dashboard" class="w-full sm:w-auto btn-theme-primary px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-theme-primary/20 hover:scale-105 transition-transform duration-200 inline-flex items-center justify-center gap-2">{t('landing.hero.view_preview')}<Icon icon={Icons.arrowRight} className="w-5 h-5" /></a>
        <a href="/auth/login" class="w-full sm:w-auto px-8 py-4 bg-white dark:bg-surface-900 text-secondary-900 dark:text-white rounded-2xl font-bold text-lg border border-surface-200 dark:border-surface-800 hover:border-theme-primary hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-200 flex items-center justify-center gap-2"><Icon icon={Icons.user} className="w-5 h-5" />{t('auth.login.sign_in')}</a>
      </div>
      <div class="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 w-full max-w-4xl">
        {#each [{ k: '50+', v: 'landing.hero.stats.pages' }, { k: '12+', v: 'landing.hero.stats.apps' }, { k: '100%', v: 'landing.hero.stats.typescript' }, { k: t('landing.hero.stats.dark'), v: 'landing.hero.stats.mode' }] as stat}
          <div class="rounded-2xl bg-white/60 dark:bg-surface-900/60 backdrop-blur-md border border-surface-200 dark:border-surface-800 p-6 flex flex-col items-center hover:bg-white dark:hover:bg-surface-900 transition-all duration-300"><p class="heading-2 text-secondary-900 dark:text-white">{stat.k}</p><p class="text-sm font-medium text-secondary-500 dark:text-secondary-400 mt-1 uppercase tracking-wider">{t(stat.v)}</p></div>
        {/each}
      </div>
    </div>
  </div>
</section>
