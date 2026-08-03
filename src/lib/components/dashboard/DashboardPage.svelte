<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'

  export let variant: 'overview' | 'analytics' | 'ecommerce' | 'crm' = 'overview'
  const t = translate
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const revenueData = { labels: months, datasets: [{ label: 'Revenue', data: [18500,22400,19800,28200,32100,28800,35200,38400,42100,39500,45200,48295], fill: true, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: .4, borderWidth: 2, pointRadius: 0 }] } as any
  const trafficData = { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [{ label: 'Visitors', data: [2400,3200,2800,3600,4100,3200,4800], fill: true, borderColor: 'rgb(99,102,241)', backgroundColor: 'rgba(99,102,241,.12)', tension: .4, borderWidth: 2, pointRadius: 0 }] } as any
  const barData = { labels: ['12AM','3AM','6AM','9AM','12PM','3PM','6PM','9PM'], datasets: [{ label: 'Sessions', data: [120,80,200,890,1240,1580,1120,680], backgroundColor: 'rgba(59,130,246,.8)', borderRadius: 6 }] } as any
  const pieData = { labels: ['Desktop','Mobile','Tablet'], datasets: [{ data: [58,35,7], backgroundColor: ['#3b82f6','#8b5cf6','#f59e0b'], borderWidth: 0 }] } as any

  const overviewStats = [
    { label: 'dashboard.visitors', value: '12,845', change: '+12%', icon: Icons.users, color: 'primary' },
    { label: 'dashboard.revenue', value: '$48,295', change: '+8%', icon: Icons.currencyDollar, color: 'success' },
    { label: 'dashboard.orders', value: '1,234', change: '-3%', icon: Icons.package, color: 'warning' },
    { label: 'dashboard.growth', value: '18.2%', change: '+4%', icon: Icons.trendingUp, color: 'info' },
  ]
  const analyticsStats = [
    { label: 'dashboard.total_visitors', value: '45,890', change: '+12.5%', icon: Icons.users, color: 'primary' },
    { label: 'dashboard.page_views', value: '128,430', change: '+8.2%', icon: Icons.eye, color: 'accent' },
    { label: 'dashboard.avg_session_duration', value: '4m 32s', change: '-2.4%', icon: Icons.clock, color: 'warning' },
    { label: 'dashboard.bounce_rate', value: '32.8%', change: '1.2%', icon: Icons.activity, color: 'success' },
  ]
  const ecommerceStats = [
    { label: 'dashboard.total_revenue', value: '$128,430', change: '+18.4%', icon: Icons.currencyDollar, color: 'success' },
    { label: 'dashboard.total_orders', value: '3,842', change: '+12.6%', icon: Icons.shoppingBag, color: 'primary' },
    { label: 'dashboard.average_order_value', value: '$84.32', change: '+4.1%', icon: Icons.creditCard, color: 'accent' },
    { label: 'dashboard.customers', value: '12,845', change: '+9.8%', icon: Icons.users, color: 'warning' },
  ]
  const crmStats = [
    { label: 'dashboard.total_leads', value: '2,480', change: '+14.2%', icon: Icons.users, color: 'primary' },
    { label: 'dashboard.deals_won', value: '$84,250', change: '+22.8%', icon: Icons.briefcase, color: 'success' },
    { label: 'dashboard.conversion_rate', value: '24.8%', change: '+3.4%', icon: Icons.trendingUp, color: 'accent' },
    { label: 'dashboard.active_customers', value: '1,842', change: '+8.1%', icon: Icons.contacts, color: 'warning' },
  ]
  $: stats = variant === 'analytics' ? analyticsStats : variant === 'ecommerce' ? ecommerceStats : variant === 'crm' ? crmStats : overviewStats
  $: title = variant === 'overview' ? 'header.top.dashboard' : variant === 'analytics' ? 'dashboard.analytics_overview' : variant === 'ecommerce' ? 'dashboard.ecommerce_overview' : 'dashboard.crm_overview'
  $: subtitle = variant === 'overview' ? 'dashboard.welcome_back' : variant === 'analytics' ? 'dashboard.monitor_performance' : 'dashboard.welcome_back'

  function percent(value: number): string { return String(value) + '%' }
  function statClasses(color: string): string { return ({ primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400', success: 'bg-success-100 dark:bg-success-900/40 text-success-600 dark:text-success-400', warning: 'bg-warning-100 dark:bg-warning-900/40 text-warning-600 dark:text-warning-400', info: 'bg-info-100 dark:bg-info-900/40 text-info-600 dark:text-info-400', accent: 'bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400' } as Record<string,string>)[color] ?? 'bg-theme-primary-light text-theme-primary' }
</script>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      {#if variant === 'analytics'}
        <div class="flex items-center gap-2"><h1 class="heading-2 text-secondary-900 dark:text-white">{t(title)}</h1><span class="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full"><span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Live</span></div>
      {:else}
        <h1 class="heading-2 text-secondary-900 dark:text-white">{t(title)}</h1>
      {/if}
      <p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t(subtitle)}</p>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"><Icon icon={Icons.calendar} width={16} height={16} />{variant === 'analytics' ? t('dashboard.last_14_days') : t('dashboard.last_30_days')}</button>
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">{variant === 'overview' ? t('dashboard.download_report') : 'Export'}</button>
    </div>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{#each stats as stat}<div class="card rounded-xl p-5 hover:shadow-md transition-shadow"><div class="flex items-center justify-between mb-4"><div class={`w-11 h-11 rounded-xl flex items-center justify-center ${statClasses(stat.color)}`}><Icon icon={stat.icon} width={20} height={20} /></div><button type="button" class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg" aria-label={`More options for ${t(stat.label)}`}><Icon icon={Icons.dotsVertical} width={16} height={16} className="text-secondary-400" /></button></div><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">{t(stat.label)}</p><div class="flex items-end justify-between mt-1"><p class="heading-3 text-secondary-900 dark:text-white">{stat.value}</p><span class={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${stat.change.startsWith('-') ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'}`}><Icon icon={stat.change.startsWith('-') ? Icons.arrowDownRight : Icons.arrowUpRight} width={12} height={12} />{stat.change}</span></div></div>{/each}</div>

  {#if variant === 'analytics'}<div class="bg-gradient-to-r from-theme-primary/10 to-purple-500/10 border border-theme-primary/20 rounded-xl p-4 flex items-start gap-4"><div class="p-2 bg-theme-primary/20 rounded-lg text-theme-primary"><Icon icon={Icons.sparkles} width={20} height={20} /></div><div><h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Traffic spike detected</h3><p class="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Visitors are 24% higher than the previous period.</p></div></div>{/if}

  {#if variant === 'ecommerce'}<div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><div class="xl:col-span-2 card rounded-xl p-6"><div class="flex items-center justify-between mb-6"><div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Sales overview</h3><p class="text-sm text-secondary-500 mt-0.5">Monthly revenue and order performance</p></div><span class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white rounded-lg">2024</span></div><ChartCanvas type="bar" data={barData} height={300} /></div><div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-5">Top products</h3><div class="space-y-4">{#each [{name:'Premium Plan',sales:'2,453',value:'$12,450',progress:85},{name:'Basic Plan',sales:'1,832',value:'$8,200',progress:65},{name:'Enterprise',sales:'945',value:'$24,500',progress:45},{name:'Starter Kit',sales:'632',value:'$3,150',progress:30}] as product}<div><div class="flex justify-between mb-2"><span class="text-sm font-medium text-secondary-900 dark:text-white">{product.name}</span><span class="text-sm text-secondary-500">{product.value}</span></div><div class="flex items-center gap-3"><div class="flex-1 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class="h-full bg-theme-primary rounded-full" style={`width:${product.progress}%`}></div></div><span class="text-xs text-secondary-400">{product.progress}%</span></div></div>{/each}</div></div></div>
  {:else if variant === 'crm'}<div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><div class="xl:col-span-2 card rounded-xl p-6"><div class="flex items-center justify-between mb-6"><div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Sales pipeline</h3><p class="text-sm text-secondary-500 mt-1">Track deals through every stage</p></div><button type="button" class="btn-theme-primary px-3 py-2 rounded-lg text-sm">Add deal</button></div><div class="grid grid-cols-4 gap-3">{#each [{name:'New',count:18,color:'bg-blue-500'},{name:'Qualified',count:12,color:'bg-purple-500'},{name:'Proposal',count:8,color:'bg-orange-500'},{name:'Won',count:24,color:'bg-emerald-500'}] as stage}<div class="rounded-xl bg-surface-50 dark:bg-surface-800/60 p-3"><div class="flex items-center gap-2"><span class={`w-2 h-2 rounded-full ${stage.color}`}></span><span class="text-xs font-semibold text-secondary-600 dark:text-secondary-300">{stage.name}</span></div><p class="heading-3 text-secondary-900 dark:text-white mt-3">{stage.count}</p><p class="text-xs text-secondary-400 mt-1">deals</p></div>{/each}</div><div class="mt-6"><ChartCanvas type="line" data={trafficData} height={240} showLegend={false} /></div></div><div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-5">Recent contacts</h3><div class="space-y-4">{#each ['Sarah Connor','John Smith','Mike Johnson','Emily Davis','Alex Morgan'] as contact, i}<div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center text-sm font-semibold">{contact.split(' ').map((v) => v[0]).join('')}</div><div class="min-w-0 flex-1"><p class="text-sm font-medium text-secondary-900 dark:text-white truncate">{contact}</p><p class="text-xs text-secondary-500">{['Design lead','Founder','Marketing','Operations','Sales'][i]}</p></div><Icon icon={Icons.chevronRight} className="w-4 h-4 text-secondary-400" /></div>{/each}</div></div></div>
  {:else if variant === 'analytics'}<div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><div class="xl:col-span-2 card rounded-xl p-6"><div class="flex items-center justify-between mb-6"><div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Traffic overview</h3><p class="text-sm text-secondary-500 mt-1">Compare traffic statistics</p></div><div class="flex gap-2"><button type="button" class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white rounded-lg">14 days</button><button type="button" class="px-3 py-1.5 text-xs font-medium text-secondary-500 rounded-lg">30 days</button></div></div><ChartCanvas type="line" data={trafficData} height={330} showLegend={false} /></div><div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Devices</h3><div class="mt-5"><ChartCanvas type="doughnut" data={pieData} height={230} /></div><div class="space-y-3 mt-5">{#each [['Desktop','58%','bg-blue-500'],['Mobile','35%','bg-purple-500'],['Tablet','7%','bg-orange-500']] as device}<div class="flex items-center justify-between text-sm"><span class="flex items-center gap-2 text-secondary-600 dark:text-secondary-300"><span class={`w-2 h-2 rounded-full ${device[2]}`}></span>{device[0]}</span><span class="font-semibold text-secondary-900 dark:text-white">{device[1]}</span></div>{/each}</div></div></div>
  {:else}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 card rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.revenue_overview')}</h3><p class="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">{t('dashboard.monthly_revenue_statistics')}</p></div>
          <div class="flex gap-2"><button type="button" class="px-3 py-1.5 text-xs font-medium bg-theme-primary text-white rounded-lg">{t('dashboard.monthly')}</button><button type="button" class="px-3 py-1.5 text-xs font-medium text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">{t('dashboard.weekly')}</button><button type="button" class="px-3 py-1.5 text-xs font-medium text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">{t('dashboard.daily')}</button></div>
        </div>
        <div class="h-72"><ChartCanvas type="line" data={revenueData} height={288} showLegend={false} /></div>
      </div>
      <div class="card rounded-xl p-6">
        <div class="flex items-center justify-between mb-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.top_products')}</h3><button type="button" class="text-sm text-theme-primary font-medium hover:underline">{t('dashboard.view_all')}</button></div>
        <div class="space-y-4">{#each [{name:'Premium Plan',value:'$12,450',progress:85},{name:'Basic Plan',value:'$8,200',progress:65},{name:'Enterprise',value:'$24,500',progress:45},{name:'Starter Kit',value:'$3,150',progress:30}] as product}<div><div class="flex justify-between mb-2"><span class="text-sm font-medium text-secondary-900 dark:text-white">{product.name}</span><span class="text-sm text-secondary-500 dark:text-secondary-400">{product.value}</span></div><div class="flex items-center gap-3"><div class="flex-1 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden"><div class="h-full bg-theme-primary rounded-full transition-all duration-500" style:width={percent(product.progress)}></div></div><span class="text-xs text-secondary-400 w-8">{product.progress}%</span></div></div>{/each}</div>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6">
        <div class="flex items-center justify-between mb-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.recent_activity')}</h3><button type="button" class="text-sm text-theme-primary font-medium hover:underline">{t('dashboard.view_all')}</button></div>
        <div class="space-y-4">{#each [{action:'New user registered',user:'Sarah Connor',time:'2 min ago',icon:Icons.user,iconBg:'bg-primary-100 dark:bg-primary-900/40',iconColor:'text-primary-600 dark:text-primary-400'},{action:'Order #1234 completed',user:'John Smith',time:'15 min ago',icon:Icons.circleCheck,iconBg:'bg-success-100 dark:bg-success-900/40',iconColor:'text-success-600 dark:text-success-400'},{action:'Payment received',user:'Mike Johnson',time:'1 hour ago',icon:Icons.creditCard,iconBg:'bg-accent-100 dark:bg-accent-900/40',iconColor:'text-accent-600 dark:text-accent-400'},{action:'New review posted',user:'Emily Davis',time:'2 hours ago',icon:Icons.star,iconBg:'bg-warning-100 dark:bg-warning-900/40',iconColor:'text-warning-600 dark:text-warning-400'}] as activity}<div class="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"><div class="w-10 h-10 rounded-xl {activity.iconBg} flex items-center justify-center flex-shrink-0"><Icon icon={activity.icon} width={20} height={20} className={activity.iconColor} /></div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-secondary-900 dark:text-white">{activity.action}</p><p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">by {activity.user}</p></div><div class="flex items-center gap-1 text-xs text-secondary-400"><Icon icon={Icons.clock} width={12} height={12} />{activity.time}</div></div>{/each}</div>
      </div>
      <div class="card rounded-xl p-6">
        <div class="flex items-center justify-between mb-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.performance')}</h3><span class="text-xs text-secondary-400">{t('dashboard.last_7_days')}</span></div>
        <div class="grid grid-cols-2 gap-4">{#each [['89%', 'dashboard.task_completion'], ['4.8', 'dashboard.customer_rating'], ['2.4k', 'dashboard.active_sessions'], ['98%', 'dashboard.uptime']] as metric}<div class="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50"><p class="heading-3 text-secondary-900 dark:text-white">{metric[0]}</p><p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t(metric[1])}</p></div>{/each}</div>
      </div>
    </div>
  {/if}</div>
