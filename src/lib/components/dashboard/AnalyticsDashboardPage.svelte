<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import DashboardStatCard from './DashboardStatCard.svelte'
  import DashboardChartCard from './DashboardChartCard.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'
  import { topPages, browserStats, countries } from '../../../data/analytics'

  const t = translate
  const trafficData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
    datasets: [{
      label: 'Visitors',
      data: [2400, 3200, 2800, 3600, 4100, 3200, 2100, 2800, 3400, 3100, 3800, 4200, 3400, 4800],
      fill: true,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 6,
    }],
  } as any
  const hourlyData = {
    labels: ['12AM', '3AM', '6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [{
      label: 'Sessions',
      data: [120, 80, 200, 890, 1240, 1580, 1120, 680],
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
      borderSkipped: false,
      barThickness: 20,
    }],
  } as any
  const deviceData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [{ data: [58, 35, 7], backgroundColor: ['#3b82f6', '#8b5cf6', '#f97316'], borderWidth: 0, cutout: '70%' }],
  } as any
  const deviceLegend = [
    { icon: Icons.deviceDesktop, label: 'Desktop', value: '58%', color: 'text-blue-500', bg: 'bg-blue-500' },
    { icon: Icons.deviceMobile, label: 'Mobile', value: '35%', color: 'text-purple-500', bg: 'bg-purple-500' },
    { icon: Icons.deviceTablet, label: 'Tablet', value: '7%', color: 'text-orange-500', bg: 'bg-orange-500' },
  ]

  function bounceClass(value: string): string {
    const number = Number.parseInt(value, 10)
    return number < 40
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : number < 60
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
</script>
<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="heading-2 text-secondary-900 dark:text-white">{t('dashboard.analytics_overview')}</h1>
        <span class="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
          <Icon icon={Icons.circleFilled} className="w-1.5 h-1.5 animate-pulse" width={6} height={6} />
          {t('dashboard.live')}
        </span>
      </div>
      <p class="text-body-sm text-secondary-500 mt-1">{t('dashboard.monitor_performance')}</p>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" aria-label="Refresh analytics" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors text-secondary-500">
        <Icon icon={Icons.refresh} width={20} height={20} />
      </button>
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
        <Icon icon={Icons.calendar} width={16} height={16} />
        {t('dashboard.last_14_days')}
      </button>
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
        <Icon icon={Icons.download} width={16} height={16} />
        {t('dashboard.export')}
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <DashboardStatCard label={t('dashboard.total_visitors')} value="45,890" change="12.5%" icon={Icons.users} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
    <DashboardStatCard label={t('dashboard.page_views')} value="128,430" change="8.2%" icon={Icons.eye} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
    <DashboardStatCard label={t('dashboard.avg_session_duration')} value="4m 32s" change="2.4%" isPositive={false} icon={Icons.clock} iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600 dark:text-orange-400" />
    <DashboardStatCard label={t('dashboard.bounce_rate')} value="32.8%" change="1.2%" icon={Icons.activity} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" />
  </div>

  <div class="bg-gradient-to-r from-theme-primary/10 to-purple-500/10 border border-theme-primary/20 rounded-xl p-4 flex items-start gap-4">
    <div class="p-2 bg-theme-primary/20 rounded-lg text-theme-primary"><Icon icon={Icons.sparkles} width={20} height={20} /></div>
    <div>
      <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">{t('dashboard.traffic_spike_detected')}</h3>
      <p class="text-sm text-secondary-600 dark:text-secondary-400 mt-1">{@html t('dashboard.traffic_spike_description')}</p>
    </div>
    <button type="button" aria-label="Dismiss insight" class="ml-auto text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"><Icon icon={Icons.x} width={16} height={16} /></button>
  </div>

  <DashboardChartCard title={t('dashboard.traffic_overview')} subtitle={t('dashboard.compare_traffic_stats')}>
    <div slot="action" class="flex items-center gap-2 text-sm">
      <button type="button" class="px-3 py-1 bg-theme-primary text-white rounded-lg text-xs font-medium">{t('dashboard.14_days')}</button>
      <button type="button" class="px-3 py-1 text-secondary-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-xs font-medium">{t('dashboard.30_days')}</button>
      <button type="button" class="px-3 py-1 text-secondary-500 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-xs font-medium">{t('dashboard.90_days')}</button>
    </div>
    <ChartCanvas type="line" data={trafficData} height={320} showLegend={false} />
  </DashboardChartCard>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <DashboardChartCard title={t('dashboard.device_breakdown')} subtitle={t('dashboard.traffic_source_by_device')}>
      <div class="flex justify-center mb-6"><ChartCanvas type="doughnut" data={deviceData} height={160} /></div>
      <div class="space-y-3">
        {#each deviceLegend as device}
          <div class="flex items-center justify-between p-2 hover:bg-surface-50 dark:hover:bg-surface-800/50 rounded-lg transition-colors">
            <div class="flex items-center gap-3">
              <div class={'w-2 h-2 rounded-full ' + device.bg}></div>
              <div class="flex items-center gap-2"><Icon icon={device.icon} width={16} height={16} className={device.color} /><span class="text-sm text-secondary-600 dark:text-secondary-400">{device.label}</span></div>
            </div>
            <span class="text-sm font-bold text-secondary-900 dark:text-white">{device.value}</span>
          </div>
        {/each}
      </div>
    </DashboardChartCard>

    <DashboardChartCard title={t('dashboard.browser_stats')} subtitle={t('dashboard.most_used_browsers')}>
      <div class="space-y-4">
        {#each browserStats as browser}
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2"><Icon icon={Icons.brandChrome} width={16} height={16} style={'color:' + browser.color} /><span class="text-sm font-medium text-secondary-700 dark:text-secondary-300">{browser.name}</span></div>
              <span class="text-sm font-bold text-secondary-900 dark:text-white">{browser.value}%</span>
            </div>
            <div class="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-500" style={'width:' + browser.value + '%;background-color:' + browser.color}></div></div>
          </div>
        {/each}
      </div>
    </DashboardChartCard>

    <DashboardChartCard title={t('dashboard.top_countries')} subtitle={t('dashboard.traffic_distribution_by_country')}>
      <div class="space-y-4">
        {#each countries as country}
          <div class="flex items-center gap-3 p-2 hover:bg-surface-50 dark:hover:bg-surface-800/50 rounded-lg transition-colors">
            <span class="heading-3">{country.flag}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1"><span class="text-sm font-medium text-secondary-900 dark:text-white truncate">{country.name}</span><span class="text-xs font-semibold text-secondary-500">{country.sessions}</span></div>
              <div class="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class="h-full bg-theme-primary rounded-full" style={'width:' + country.percentage + '%'}></div></div>
            </div>
          </div>
        {/each}
      </div>
    </DashboardChartCard>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 card rounded-xl overflow-hidden">
      <div class="p-6 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
        <div><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.top_pages')}</h2><p class="text-sm text-secondary-500 dark:text-secondary-400">{t('dashboard.most_visited_pages')}</p></div>
        <button type="button" class="text-sm text-theme-primary font-medium hover:underline flex items-center gap-1">{t('dashboard.view_full_report')} <Icon icon={Icons.externalLink} width={14} height={14} /></button>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto" tabindex="0" role="region" aria-label={t('dashboard.top_pages')}>
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-800/50">
            <tr>
              <th class="text-left py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.page_name')}</th>
              <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.views')}</th>
              <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.unique')}</th>
              <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.avg_time')}</th>
              <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.bounce')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
            {#each topPages as page}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                <td class="py-4 px-6"><p class="text-sm font-medium text-secondary-900 dark:text-white">{page.title}</p><p class="text-xs text-secondary-400 mt-0.5">{page.path}</p></td>
                <td class="py-4 px-6 text-sm text-secondary-900 dark:text-white text-right font-medium">{page.views.toLocaleString()}</td>
                <td class="py-4 px-6 text-sm text-secondary-600 dark:text-secondary-400 text-right">{page.unique.toLocaleString()}</td>
                <td class="py-4 px-6 text-sm text-secondary-600 dark:text-secondary-400 text-right">{page.avgTime}</td>
                <td class="py-4 px-6 text-right"><span class={'text-xs font-medium px-2 py-1 rounded-full ' + bounceClass(page.bounce)}>{page.bounce}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <DashboardChartCard title={t('dashboard.sessions_by_hour')} subtitle={t('dashboard.peak_traffic_times')}>
      <div slot="action" class="flex items-center gap-2 text-sm bg-surface-100 dark:bg-surface-800 px-3 py-1 rounded-lg"><span class="text-secondary-500">{t('dashboard.peak')}:</span><span class="font-bold text-secondary-900 dark:text-white">3:00 PM</span></div>
      <ChartCanvas type="bar" data={hourlyData} height={280} />
      <div class="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
        <div class="flex items-center justify-between text-sm"><span class="text-secondary-500">{t('dashboard.lowest_traffic')}</span><span class="font-medium text-secondary-900 dark:text-white">3:00 AM (80)</span></div>
        <div class="flex items-center justify-between text-sm mt-2"><span class="text-secondary-500">{t('dashboard.average_per_hour')}</span><span class="font-medium text-secondary-900 dark:text-white">731</span></div>
      </div>
    </DashboardChartCard>
  </div>
</div>
