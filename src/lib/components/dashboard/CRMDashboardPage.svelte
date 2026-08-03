<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import DashboardStatCard from './DashboardStatCard.svelte'
  import DashboardChartCard from './DashboardChartCard.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'
  import { pipeline, crmContacts, activities } from '../../../data/crm'

  const t = translate
  const leadData = {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    datasets: [{ label: 'Leads', data: [45, 68, 52, 84, 72, 96], fill: true, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', tension: 0.4, borderWidth: 2, pointRadius: 0 }],
  } as any
  const activityIcons: Record<string, string> = { call: Icons.phone, email: Icons.mail, meeting: Icons.calendar, task: Icons.briefcase }
  const statusColors: Record<string, string> = { hot: 'bg-red-500', warm: 'bg-orange-500', new: 'bg-blue-500' }
  const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

  function contactStatusClass(status: string): string {
    return status === 'hot'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : status === 'warm'
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }
</script>

<svelte:head><title>CRM Pipeline - Adminex</title></svelte:head>

<div class="animate-fade-in space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div><h1 class="heading-2 text-secondary-900 dark:text-white">{t('dashboard.crm_pipeline')}</h1><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('dashboard.manage_deals')}</p></div>
    <div class="flex items-center gap-3">
      <div class="relative hidden sm:block"><Icon icon={Icons.search} width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" /><input type="text" placeholder={t('dashboard.search_contacts')} class="pl-9 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 w-64 transition-all focus:w-72" /></div>
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-theme-primary/20"><Icon icon={Icons.plus} width={16} height={16} />{t('dashboard.new_deal')}</button>
    </div>
  </div>

  <div class="space-y-4">
    <div class="flex items-center justify-between"><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.deal_pipeline')}</h2><div class="flex items-center gap-4 text-sm bg-surface-100 dark:bg-surface-800 px-3 py-1.5 rounded-lg"><span class="text-secondary-500">{t('dashboard.total_value')}:</span><span class="font-bold text-secondary-900 dark:text-white">$573,000</span></div></div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-2">
      {#each pipeline as stage}
        <div class="flex flex-col h-full min-w-[280px]">
          <div class={'rounded-t-xl ' + stage.headerBg + ' p-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between'}>
            <div class="flex items-center gap-2"><span class={'w-2.5 h-2.5 rounded-full ' + stage.color + ' ring-2 ring-white dark:ring-surface-900'}></span><span class="font-semibold text-secondary-900 dark:text-white text-sm">{stage.stage}</span></div>
            <span class="text-xs font-bold text-secondary-600 dark:text-secondary-300 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">{stage.deals.length}</span>
          </div>
          <div class="bg-surface-50 dark:bg-surface-800/30 rounded-b-xl p-3 space-y-3 flex-1 border border-t-0 border-surface-200 dark:border-surface-700">
            {#each stage.deals as deal}
              <div class="bg-white dark:bg-surface-800 p-3 rounded-lg shadow-sm border border-surface-100 dark:border-surface-700 cursor-pointer hover:shadow-md hover:border-theme-primary/30 transition-all group">
                <div class="flex items-start justify-between mb-2"><h4 class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">{deal.company}</h4><button type="button" aria-label="Deal options" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-all"><Icon icon={Icons.dotsVertical} width={14} height={14} className="text-secondary-400" /></button></div>
                <p class="text-lg font-bold text-secondary-900 dark:text-white mb-1">{deal.value}</p>
                <div class="flex items-center gap-2 mb-3"><div class="w-5 h-5 rounded-full bg-theme-primary/10 flex items-center justify-center text-ui-2xs font-bold text-theme-primary">{deal.contact.charAt(0)}</div><p class="text-xs text-secondary-500">{deal.contact}</p></div>
                <div class="flex items-center justify-between pt-2 border-t border-surface-100 dark:border-surface-700"><span class="text-ui-2xs font-medium text-secondary-400 bg-surface-100 dark:bg-surface-700/50 px-1.5 py-0.5 rounded">{deal.days} days</span><Icon icon={Icons.chevronRight} width={14} height={14} className="text-secondary-300 group-hover:translate-x-1 transition-transform" /></div>
              </div>
            {/each}
            <button type="button" class="w-full py-2 text-xs font-medium text-secondary-500 hover:text-theme-primary hover:bg-white dark:hover:bg-surface-800 border border-dashed border-surface-300 dark:border-surface-600 rounded-lg transition-all flex items-center justify-center gap-1"><Icon icon={Icons.plus} width={12} height={12} />{t('dashboard.add_deal')}</button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <DashboardChartCard title={t('dashboard.todays_schedule')} subtitle={activities.filter((activity) => !activity.done).length + ' ' + t('dashboard.tasks_remaining')} className="h-full">
      <div class="space-y-4">
        {#each activities as activity}
          <div class={'flex gap-3 p-3 rounded-xl transition-all ' + (activity.done ? 'opacity-60 bg-surface-50 dark:bg-surface-800/30' : 'bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm hover:shadow-md')}>
            <div class={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (activity.done ? 'bg-green-100 dark:bg-green-900/30' : 'bg-surface-100 dark:bg-surface-700')}>
              {#if activity.done}<Icon icon={Icons.check} width={18} height={18} className="text-green-600" />{:else}<Icon icon={activityIcons[activity.type]} width={18} height={18} className="text-secondary-500" />{/if}
            </div>
            <div class="flex-1 min-w-0"><div class="flex items-center justify-between mb-0.5"><p class={'text-sm font-semibold ' + (activity.done ? 'line-through text-secondary-400' : 'text-secondary-900 dark:text-white')}>{activity.title}</p><span class="text-xs font-medium text-secondary-400 bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">{activity.time}</span></div><p class="text-xs text-secondary-500 truncate">{activity.description}</p></div>
          </div>
        {/each}
      </div>
    </DashboardChartCard>

    <DashboardChartCard title={t('dashboard.key_contacts')} subtitle={t('dashboard.recent_interactions')}>
      <div slot="action"><button type="button" class="text-xs text-theme-primary font-medium hover:underline">{t('dashboard.view_all')}</button></div>
      <div class="space-y-4">
        {#each crmContacts as contact, index}
          <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-all group border border-transparent hover:border-surface-200 dark:hover:border-surface-700">
            <div class="relative"><div class={'w-12 h-12 rounded-full ' + avatarColors[index % avatarColors.length] + ' flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white dark:ring-surface-800'}>{contact.avatar}</div><span class={'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ' + statusColors[contact.status] + ' border-2 border-white dark:border-surface-900'}></span></div>
            <div class="flex-1 min-w-0"><div class="flex items-center justify-between mb-0.5"><p class="text-sm font-bold text-secondary-900 dark:text-white truncate">{contact.name}</p><span class={'text-ui-2xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ' + contactStatusClass(contact.status)}>{contact.status}</span></div><p class="text-xs text-secondary-500 font-medium truncate">{contact.role}</p><p class="text-xs text-secondary-400 truncate">{contact.company}</p></div>
            <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button type="button" aria-label="Call contact" class="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors text-secondary-500 hover:text-theme-primary"><Icon icon={Icons.phone} width={14} height={14} /></button><button type="button" aria-label="Email contact" class="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors text-secondary-500 hover:text-theme-primary"><Icon icon={Icons.mail} width={14} height={14} /></button></div>
          </div>
        {/each}
      </div>
    </DashboardChartCard>

    <div class="space-y-6">
      <DashboardStatCard label={t('dashboard.total_leads')} value="384" change="23.5%" icon={Icons.users} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
      <DashboardStatCard label={t('dashboard.conversion_rate')} value="24.8%" change="1.2%" icon={Icons.trendingUp} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" />
      <DashboardChartCard title={t('dashboard.lead_trend')} subtitle={t('dashboard.last_6_weeks')}>
        <ChartCanvas type="line" data={leadData} height={140} options={{ plugins: { legend: { display: false } } }} />
      </DashboardChartCard>
      <div class="card rounded-xl p-5">
        <h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-4">{t('dashboard.lead_sources')}</h3>
        <div class="space-y-3">
          {#each [{ source: t('dashboard.website'), value: 45, color: 'bg-blue-500' }, { source: t('dashboard.referral'), value: 28, color: 'bg-green-500' }, { source: t('dashboard.social'), value: 18, color: 'bg-purple-500' }, { source: t('dashboard.other'), value: 9, color: 'bg-orange-500' }] as source}
            <div><div class="flex items-center justify-between mb-1"><div class="flex items-center gap-2"><span class={'w-2 h-2 rounded-full ' + source.color}></span><span class="text-xs font-medium text-secondary-700 dark:text-secondary-300">{source.source}</span></div><span class="text-xs font-bold text-secondary-900 dark:text-white">{source.value}%</span></div><div class="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class={'h-full rounded-full ' + source.color} style={'width:' + source.value + '%'}></div></div></div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

