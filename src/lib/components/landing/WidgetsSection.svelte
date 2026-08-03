<script lang="ts">
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  const t = translate
  $: currentLocale = $locale
  $: monthLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(currentLocale, { month: 'short' }).format(new Date(2024, index, 1)))
  $: chartData = {
    labels: monthLabels,
    datasets: [{
      fill: true, label: t('charts.dataset.revenue'), data: [25, 35, 38, 55, 65, 75, 82], borderColor: '#3B82F6',
      backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => { const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300); gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)'); return gradient },
      borderWidth: 3, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: '#3B82F6', pointBorderColor: '#fff', pointBorderWidth: 2,
    }],
  } as any
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 8, displayColors: false } },
    scales: { x: { display: false }, y: { display: false, min: 0 } },
    layout: { padding: { left: -10, right: -10, bottom: -10 } },
  } as any

  const widgets = [
    { title: 'landing.widgets.items.total_users', value: '12,845', delta: '+12%', deltaUp: true, icon: Icons.users, color: 'text-blue-500', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-500/10' },
    { title: 'landing.widgets.items.revenue', value: '$48,295', delta: '+8%', deltaUp: true, icon: Icons.currencyDollar, color: 'text-emerald-500', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-500/10' },
    { title: 'landing.widgets.items.orders', value: '1,234', delta: '-3%', deltaUp: false, icon: Icons.shopping, color: 'text-violet-500', bg: 'bg-violet-50', darkBg: 'dark:bg-violet-500/10' },
    { title: 'landing.widgets.items.avg_response', value: '2m 18s', delta: '+4%', deltaUp: true, icon: Icons.clock, color: 'text-amber-500', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-500/10' },
  ]
</script>

<section id="widgets" data-locale={currentLocale} class="py-32 px-4 bg-surface-50 dark:bg-surface-950 scroll-mt-24 relative overflow-hidden">
  <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
  <div class="max-w-7xl mx-auto relative z-10">
    <div class="text-center mb-20 max-w-3xl mx-auto"><div class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm mb-6"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-theme-primary"></span></span><span class="text-sm font-semibold text-secondary-600 dark:text-secondary-300">{t('landing.widgets.badge')}</span></div><h2 class="text-display-section text-secondary-900 dark:text-white mb-6">{t('landing.widgets.title_prefix')} <span class="text-theme-primary">{t('landing.widgets.title_emphasis')}</span></h2><p class="text-lead text-secondary-600 dark:text-secondary-400 leading-relaxed">{t('landing.widgets.subtitle')}</p></div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {#each widgets as widget}<div class="group relative rounded-[2rem] border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"><div class="relative flex items-start justify-between mb-8"><div class={`w-12 h-12 rounded-full ${widget.bg} ${widget.darkBg} flex items-center justify-center ${widget.color}`}><Icon icon={widget.icon} className="w-6 h-6" /></div><span class={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${widget.deltaUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>{#if widget.deltaUp}<Icon icon={Icons.arrowUpRight} className="w-3.5 h-3.5" />{:else}<Icon icon={Icons.arrowDownRight} className="w-3.5 h-3.5" />{/if}{widget.delta}</span></div><div><p class="text-secondary-500 dark:text-secondary-400 text-sm font-medium mb-1">{t(widget.title)}</p><p class="heading-2 text-secondary-900 dark:text-white">{widget.value}</p></div></div>{/each}
      </div>
      <div class="lg:col-span-5 space-y-6">
        <div class="rounded-[2rem] border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-sm hover:shadow-xl transition-all duration-300 h-[340px] flex flex-col"><div class="flex items-start justify-between mb-2"><div><div class="flex items-center gap-2 mb-1"><p class="text-secondary-500 dark:text-secondary-400 font-medium">{t('landing.widgets.revenue_overview.title')}</p><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span></div><p class="heading-4 text-secondary-900 dark:text-white">{t('landing.widgets.revenue_overview.subtitle')}</p></div><button type="button" class="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-700 flex items-center justify-center text-secondary-400 hover:text-secondary-600 transition-colors" aria-label="More options"><Icon icon={Icons.moreHorizontal} className="w-5 h-5 rotate-90" /></button></div><div class="flex-1 w-full relative -mx-4 overflow-hidden flex items-end"><div class="w-[110%] -ml-2 h-[220px]"><ChartCanvas type="line" data={chartData} options={chartOptions} height={220} /></div></div></div>
        <div class="grid grid-cols-2 gap-6"><div class="rounded-[2rem] bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden h-[180px] flex flex-col justify-between"><div class="absolute -right-4 -bottom-4 text-cyan-500/5"><Icon icon={Icons.activity} width={80} height={80} /></div><div class="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-500"><Icon icon={Icons.activity} width={20} height={20} /></div><div class="relative z-10"><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium mb-1">{t('charts.source.organic')}</p><div class="flex items-baseline gap-2 mb-3"><p class="heading-3 text-secondary-900 dark:text-white">42%</p><span class="text-xs font-semibold text-emerald-500">+12.5%</span></div><div class="h-1.5 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class="h-full bg-cyan-500 w-[42%] rounded-full"></div></div></div></div><div class="rounded-[2rem] bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden h-[180px] flex flex-col justify-between"><div class="absolute -right-4 -bottom-4 text-purple-500/5"><Icon icon={Icons.creditCard} width={80} height={80} /></div><div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500"><Icon icon={Icons.creditCard} width={20} height={20} /></div><div class="relative z-10"><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium mb-1">{t('charts.source.paid')}</p><div class="flex items-baseline gap-2 mb-3"><p class="heading-3 text-secondary-900 dark:text-white">28%</p><span class="text-xs font-semibold text-rose-500">-2.4%</span></div><div class="h-1.5 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class="h-full bg-purple-500 w-[28%] rounded-full"></div></div></div></div></div>
      </div>
      <div class="lg:col-span-12 rounded-[2.5rem] border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-10 relative overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"><div class="flex flex-col md:flex-row items-center gap-8 relative z-10"><div class="w-20 h-20 rounded-[2.5rem] bg-surface-50 dark:bg-surface-800 flex items-center justify-center shadow-inner"><Icon icon={Icons.trendingUp} className="w-8 h-8 text-secondary-400" /></div><div class="text-center md:text-left flex-1"><h3 class="text-display-subhero text-secondary-900 dark:text-white mb-3">{t('landing.widgets.banner.title')}</h3><p class="text-body text-secondary-600 dark:text-secondary-400 max-w-2xl">{t('landing.widgets.banner.subtitle')}</p></div><div class="md:ml-auto"><button type="button" class="px-8 py-4 rounded-xl bg-secondary-900 dark:bg-white text-white dark:text-secondary-900 font-bold shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">{t('landing.widgets.banner.button')}<Icon icon={Icons.arrowRight} className="w-4 h-4" /></button></div></div></div>
    </div>
  </div>
</section>
