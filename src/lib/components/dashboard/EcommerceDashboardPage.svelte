<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import DashboardStatCard from './DashboardStatCard.svelte'
  import DashboardChartCard from './DashboardChartCard.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'
  import { products, orders, orderStatusConfig, stockStatusConfig } from '../../../data/ecommerce'

  const t = translate
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [{ label: 'Revenue', data: [32000, 42000, 38000, 52000, 48000, 61000, 68000], borderColor: '#22c55e', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, pointRadius: 0 }],
  } as any
  const categoryData = {
    labels: ['Electronics', 'Fashion', 'Home', 'Sports'],
    datasets: [{ data: [35, 25, 22, 18], backgroundColor: ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316'], borderWidth: 0, cutout: '70%' }],
  } as any

  function statusIcon(status: string): string {
    return status === 'delivered' ? Icons.check : status === 'shipped' ? Icons.truck : Icons.clock
  }
</script>
<div class="animate-fade-in space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div><h1 class="heading-2 text-secondary-900 dark:text-white">{t('dashboard.ecommerce_overview')}</h1><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('dashboard.manage_store')}</p></div>
    <div class="flex items-center gap-3">
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"><Icon icon={Icons.filter} width={16} height={16} />{t('dashboard.filter')}</button>
      <button type="button" class="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-theme-primary/20"><Icon icon={Icons.plus} width={16} height={16} />{t('dashboard.add_product')}</button>
    </div>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
    <div class="xl:col-span-3 space-y-6">
      <div class="card rounded-xl overflow-hidden">
        <div class="p-6 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
          <div><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.top_products')}</h2><p class="text-sm text-secondary-500 dark:text-secondary-400">{t('dashboard.best_selling_items')}</p></div>
          <button type="button" class="text-sm text-theme-primary font-medium hover:underline flex items-center gap-1">{t('dashboard.view_all')} <Icon icon={Icons.chevronRight} width={16} height={16} /></button>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="overflow-x-auto" tabindex="0" role="region" aria-label={t('dashboard.top_products')}>
          <table class="w-full">
            <thead class="bg-surface-50 dark:bg-surface-800/50">
              <tr>
                <th class="text-left py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.product')}</th>
                <th class="text-left py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.sku')}</th>
                <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.price')}</th>
                <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.stock')}</th>
                <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.sold')}</th>
                <th class="text-center py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.rating')}</th>
                <th class="text-right py-3 px-6 text-xs font-semibold text-secondary-500 uppercase tracking-wider">{t('dashboard.status')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              {#each products as product}
                <tr class="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td class="py-4 px-6"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center"><Icon icon={Icons.image} width={20} height={20} className="text-secondary-400" /></div><p class="text-sm font-medium text-secondary-900 dark:text-white">{product.name}</p></div></td>
                  <td class="py-4 px-6 text-sm text-secondary-500 font-mono">{product.sku}</td>
                  <td class="py-4 px-6 text-sm font-semibold text-secondary-900 dark:text-white text-right">{'$' + product.price}</td>
                  <td class="py-4 px-6 text-sm text-secondary-600 dark:text-secondary-400 text-right">{product.stock}</td>
                  <td class="py-4 px-6 text-sm text-secondary-600 dark:text-secondary-400 text-right">{product.sold}</td>
                  <td class="py-4 px-6 text-center"><span class="inline-flex items-center gap-1 text-sm bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg text-yellow-700 dark:text-yellow-400"><Icon icon={Icons.star} width={14} height={14} className="text-yellow-400 fill-yellow-400" />{product.rating}</span></td>
                  <td class="py-4 px-6 text-right"><span class={'text-xs font-medium px-2.5 py-1 rounded-full ' + stockStatusConfig[product.status || 'active'].color}>{stockStatusConfig[product.status || 'active'].label}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card rounded-xl overflow-hidden">
        <div class="p-6 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
          <div><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('dashboard.recent_orders')}</h2><p class="text-sm text-secondary-500 dark:text-secondary-400">{t('dashboard.latest_transactions')}</p></div>
          <button type="button" class="text-sm text-theme-primary font-medium hover:underline flex items-center gap-1">{t('dashboard.view_all')} <Icon icon={Icons.chevronRight} width={16} height={16} /></button>
        </div>
        <div class="divide-y divide-surface-100 dark:divide-surface-800">
          {#each orders as order}
            {@const status = orderStatusConfig[order.status]}
            <div class="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors group">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class={'w-12 h-12 rounded-xl ' + status.bg + ' flex items-center justify-center transition-transform group-hover:scale-110'}><Icon icon={statusIcon(order.status)} width={24} height={24} className={status.color} /></div>
                  <div><div class="flex items-center gap-2 mb-1"><span class="text-sm font-bold text-secondary-900 dark:text-white">{order.id}</span><span class={'text-xs font-medium px-2 py-0.5 rounded-full ' + status.bg + ' ' + status.color + ' border border-current/10'}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></div><p class="text-sm text-secondary-500">{order.customer} · <span class="text-secondary-400">{order.items} items</span></p></div>
                </div>
                <div class="text-right"><p class="text-base font-bold text-secondary-900 dark:text-white">{'$' + order.total.toFixed(2)}</p><p class="text-xs text-secondary-400 mt-1">{order.date}</p></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="xl:col-span-1 space-y-6">
      <div class="space-y-4">
        <DashboardStatCard label={t('dashboard.total_revenue')} value="$84,245" change="12.5%" icon={Icons.currencyDollar} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" showMenu={false} />
        <DashboardStatCard label={t('dashboard.total_orders')} value="2,845" change="8.1%" icon={Icons.shopping} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" showMenu={false} />
        <DashboardStatCard label={t('dashboard.products_sold')} value="5,428" change="2.3%" isPositive={false} icon={Icons.package} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" showMenu={false} />
        <DashboardStatCard label={t('dashboard.growth_rate')} value="+15.3%" change="4.2%" icon={Icons.trendingUp} iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-600 dark:text-orange-400" showMenu={false} />
      </div>

      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-2"><h3 class="text-sm font-semibold text-secondary-900 dark:text-white">{t('dashboard.monthly_goal')}</h3><span class="text-xs font-medium text-secondary-500">85%</span></div>
        <div class="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-2"><div class="h-full bg-theme-primary rounded-full" style="width:85%"></div></div>
        <p class="text-xs text-secondary-500">$84,245 / $100,000</p>
      </div>

      <DashboardChartCard title={t('dashboard.revenue_trend')} subtitle={t('dashboard.last_7_months')}>
        <ChartCanvas type="line" data={revenueData} height={180} options={{ plugins: { legend: { display: false } } }} />
      </DashboardChartCard>

      <DashboardChartCard title={t('dashboard.by_category')} subtitle={t('dashboard.sales_distribution')}>
        <div class="flex justify-center mb-6"><ChartCanvas type="doughnut" data={categoryData} height={160} /></div>
        <div class="grid grid-cols-2 gap-3">
          {#each [{ name: 'Electronics', color: '#3b82f6' }, { name: 'Fashion', color: '#8b5cf6' }, { name: 'Home', color: '#22c55e' }, { name: 'Sports', color: '#f97316' }] as category}
            <div class="flex items-center gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50"><span class="w-2.5 h-2.5 rounded-full" style={'background-color:' + category.color}></span><span class="text-xs font-medium text-secondary-700 dark:text-secondary-300 truncate">{category.name}</span></div>
          {/each}
        </div>
      </DashboardChartCard>
    </div>
  </div>
</div>

