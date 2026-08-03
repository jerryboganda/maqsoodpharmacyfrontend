<script lang="ts">
  import ChartCanvas from '../common/ChartCanvas.svelte'
  import { locale, translate } from '../../stores/locale'

  export let path = '/charts/line'

  const t = translate
  const colors = {
    blue: { solid: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)' },
    purple: { solid: '#8b5cf6', light: 'rgba(139, 92, 246, 0.1)' },
    green: { solid: '#22c55e', light: 'rgba(34, 197, 94, 0.1)' },
    orange: { solid: '#f97316', light: 'rgba(249, 115, 22, 0.1)' },
    cyan: { solid: '#06b6d4', light: 'rgba(6, 182, 212, 0.1)' },
    pink: { solid: '#ec4899', light: 'rgba(236, 72, 153, 0.1)' },
  }

  $: weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat($locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + index)))
  $: weekdayLabels5 = weekdayLabels.slice(0, 5)
  $: monthLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat($locale, { month: 'short' }).format(new Date(2024, index, 1)))
  $: monthLabels6 = monthLabels.slice(0, 6)

  $: basic = {
    labels: weekdayLabels,
    datasets: [{ label: t('charts.dataset.visitors'), data: [4200, 5100, 4600, 5900, 7200, 6800, 6100], borderColor: colors.blue.solid, backgroundColor: colors.blue.light, tension: 0.35, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6 }],
  }
  $: multi = {
    labels: monthLabels6,
    datasets: [
      { label: t('charts.dataset.signups'), data: [320, 410, 380, 520, 610, 590], borderColor: colors.green.solid, backgroundColor: colors.green.light, tension: 0.3, borderWidth: 2, pointRadius: 3 },
      { label: t('charts.dataset.purchases'), data: [180, 240, 220, 310, 420, 400], borderColor: colors.purple.solid, backgroundColor: colors.purple.light, tension: 0.3, borderWidth: 2, pointRadius: 3 },
    ],
  }
  $: stepped = {
    labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
    datasets: [{ label: t('charts.dataset.queue_size'), data: [12, 14, 9, 18, 22, 17, 11, 8], borderColor: colors.orange.solid, backgroundColor: colors.orange.light, borderWidth: 2, pointRadius: 0, stepped: true }],
  }
  $: revenue = {
    labels: monthLabels,
    datasets: [{ label: t('charts.dataset.revenue'), data: [18500, 22400, 19800, 28200, 32100, 28800, 35200], fill: true, borderColor: colors.blue.solid, backgroundColor: colors.blue.light, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 6 }],
  }
  $: stackedAreas = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      { label: t('charts.dataset.subscriptions'), data: [12000, 15500, 17800, 21000], fill: true, borderColor: colors.purple.solid, backgroundColor: colors.purple.light, tension: 0.35, borderWidth: 2, pointRadius: 0 },
      { label: t('charts.dataset.one_time'), data: [6500, 6900, 7200, 8300], fill: true, borderColor: colors.green.solid, backgroundColor: colors.green.light, tension: 0.35, borderWidth: 2, pointRadius: 0 },
    ],
  }
  $: categoryLabels = [
    t('charts.category.shoes'),
    t('charts.category.bags'),
    t('charts.category.watches'),
    t('charts.category.hoodies'),
    t('charts.category.caps'),
    t('charts.category.sunglasses'),
  ]
  $: columns = {
    labels: categoryLabels,
    datasets: [{ label: t('charts.dataset.sales'), data: [1200, 950, 780, 1400, 620, 860], backgroundColor: [colors.blue.solid, colors.purple.solid, colors.green.solid, colors.orange.solid, colors.cyan.solid, colors.pink.solid], borderRadius: 10, borderSkipped: false }],
  }
  $: stackedColumns = {
    labels: monthLabels6,
    datasets: [
      { label: t('charts.dataset.desktop'), data: [320, 380, 410, 520, 610, 590], backgroundColor: colors.blue.solid, borderRadius: 8 },
      { label: t('charts.dataset.mobile'), data: [280, 340, 360, 470, 540, 510], backgroundColor: colors.purple.solid, borderRadius: 8 },
    ],
  }
  const stackedOptions = { scales: { x: { stacked: true }, y: { stacked: true } } }
  $: pie = {
    labels: [t('charts.source.organic'), t('charts.source.paid'), t('charts.source.referral'), t('charts.source.email')],
    datasets: [{ data: [42, 28, 18, 12], backgroundColor: [colors.blue.solid, colors.purple.solid, colors.green.solid, colors.orange.solid], borderWidth: 0 }],
  }
  const doughnut = {
    labels: ['Chrome', 'Safari', 'Firefox', 'Edge'],
    datasets: [{ data: [58, 19, 14, 9], backgroundColor: [colors.blue.solid, colors.cyan.solid, colors.orange.solid, colors.purple.solid], borderWidth: 0 }],
  }
  $: radar = {
    labels: [
      t('charts.radar.axis.design'),
      t('charts.radar.axis.performance'),
      t('charts.radar.axis.security'),
      t('charts.radar.axis.usability'),
      t('charts.radar.axis.support'),
      t('charts.radar.axis.features'),
    ],
    datasets: [
      { label: t('charts.radar.product_a'), data: [78, 82, 74, 88, 70, 85], borderColor: colors.blue.solid, backgroundColor: colors.blue.light, borderWidth: 2, pointRadius: 2 },
      { label: t('charts.radar.product_b'), data: [72, 76, 81, 79, 78, 73], borderColor: colors.purple.solid, backgroundColor: colors.purple.light, borderWidth: 2, pointRadius: 2 },
    ],
  }
  const candlestick = {
    datasets: [{
      label: 'AAPL (Demo)',
      data: [
        { x: 0, o: 185, h: 192, l: 182, c: 190 },
        { x: 1, o: 190, h: 195, l: 188, c: 191 },
        { x: 2, o: 191, h: 193, l: 186, c: 187 },
        { x: 3, o: 187, h: 189, l: 180, c: 183 },
        { x: 4, o: 183, h: 188, l: 181, c: 186 },
      ],
      borderColors: { up: '#16a34a', down: '#dc2626', unchanged: '#64748b' },
      backgroundColors: { up: 'rgba(34, 197, 94, 0.35)', down: 'rgba(239, 68, 68, 0.35)', unchanged: 'rgba(100, 116, 139, 0.25)' },
    }],
  }
  $: candlestickOptions = {
    scales: {
      x: { type: 'linear', ticks: { callback: (value: string | number) => weekdayLabels5[Number(value)] ?? '' } },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: { raw: { o: number; h: number; l: number; c: number } }) => {
            const value = context.raw
            return t('charts.candlestick.tooltip_ohlc', { o: value.o, h: value.h, l: value.l, c: value.c })
          },
        },
      },
    },
  }

  $: header = path === '/charts/line'
    ? { title: t('charts.line_chart'), subtitle: t('charts.line.subtitle') }
    : path === '/charts/area'
      ? { title: t('charts.area_chart'), subtitle: t('charts.area.subtitle') }
      : path === '/charts/columns'
        ? { title: t('charts.columns.title'), subtitle: t('charts.columns.subtitle') }
        : path === '/charts/pie'
          ? { title: t('charts.pie_doughnut.title'), subtitle: t('charts.pie_doughnut.subtitle') }
          : path === '/charts/radar'
            ? { title: t('charts.radar.title'), subtitle: t('charts.radar.subtitle') }
            : { title: t('charts.candlestick_chart'), subtitle: t('charts.candlestick.subtitle') }
</script>
<div class="space-y-6">
  <div>
    <h1 class="heading-2 text-secondary-900 dark:text-white">{header.title}</h1>
    <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">{header.subtitle}</p>
  </div>

  {#if path === '/charts/line'}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.line.basic.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.line.basic.desc')}</p><div class="mt-4"><ChartCanvas type="line" data={basic as any} height={320} /></div></div>
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.line.multi.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.line.multi.desc')}</p><div class="mt-4"><ChartCanvas type="line" data={multi as any} height={320} /></div></div>
      <div class="card rounded-xl p-6 xl:col-span-2"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.line.stepped.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.line.stepped.desc')}</p><div class="mt-4"><ChartCanvas type="line" data={stepped as any} height={320} /></div></div>
    </div>
  {:else if path === '/charts/area'}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.area.single.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.area.single.desc')}</p><div class="mt-4"><ChartCanvas type="line" data={revenue as any} height={320} showLegend={false} /></div></div>
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.area.multi.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.area.multi.desc')}</p><div class="mt-4"><ChartCanvas type="line" data={stackedAreas as any} height={320} showLegend={false} /></div></div>
    </div>
  {:else if path === '/charts/columns'}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.columns.columns.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.columns.columns.desc')}</p><div class="mt-4"><ChartCanvas type="bar" data={columns as any} height={320} /></div></div>
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.columns.stacked.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.columns.stacked.desc')}</p><div class="mt-4"><ChartCanvas type="bar" data={stackedColumns as any} options={stackedOptions as any} height={320} /></div></div>
    </div>
  {:else if path === '/charts/pie'}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.pie.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.pie.desc')}</p><div class="mt-4"><ChartCanvas type="pie" data={pie as any} height={300} /></div></div>
      <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.doughnut.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.doughnut.desc')}</p><div class="mt-4"><ChartCanvas type="doughnut" data={doughnut as any} height={300} centerText="58%" centerSubtext="Chrome" /></div></div>
    </div>
  {:else if path === '/charts/radar'}
    <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.radar.comparison.title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.radar.comparison.desc')}</p><div class="mt-4"><ChartCanvas type="radar" data={radar as any} height={360} /></div></div>
  {:else}
    <div class="card rounded-xl p-6"><h2 class="heading-5 text-secondary-900 dark:text-white">{t('charts.candlestick.demo_title')}</h2><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('charts.candlestick.demo_desc')}</p><div class="mt-4"><ChartCanvas type="candlestick" data={candlestick as any} options={candlestickOptions as any} height={420} /></div></div>
  {/if}
</div>


