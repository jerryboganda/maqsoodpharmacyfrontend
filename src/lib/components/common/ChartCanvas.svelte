<script lang="ts">
  import { onMount } from 'svelte'
  import { Chart, registerables, type ChartData, type ChartOptions, type ChartType } from 'chart.js'
  import { CandlestickController, CandlestickElement, OhlcController, OhlcElement } from 'chartjs-chart-financial'

  Chart.register(...registerables)
  Chart.register(CandlestickController, CandlestickElement, OhlcController, OhlcElement)

  export let type: ChartType | 'candlestick' = 'line'
  export let data: ChartData = { labels: [], datasets: [] }
  export let options: ChartOptions = {}
  export let height = 280
  export let centerText: string | undefined = undefined
  export let centerSubtext: string | undefined = undefined
  export let showLegend = true

  let canvas: HTMLCanvasElement
  let chart: Chart | undefined
  let skipInitialReactiveUpdate = false

  const tooltipOptions = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    titleFont: { size: 13 },
    bodyFont: { size: 12 },
    cornerRadius: 8,
  }

  const axisOptions = {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
      border: { display: false },
      ticks: { color: '#94a3b8', font: { size: 11 } },
    },
  }

  function resolvedOptions(): ChartOptions {
    const horizontal = (options as ChartOptions & { indexAxis?: 'x' | 'y' }).indexAxis === 'y'
    let defaults: ChartOptions

    if (type === 'line') {
      defaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: showLegend,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              color: '#64748b',
              font: { size: 12 },
            },
          },
          tooltip: tooltipOptions,
        },
        scales: axisOptions,
        interaction: { intersect: false, mode: 'index' },
      }
    } else if (type === 'bar') {
      defaults = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: { legend: { display: false }, tooltip: tooltipOptions },
        scales: {
          x: { ...axisOptions.x, grid: { display: horizontal, color: 'rgba(148, 163, 184, 0.1)' } },
          y: { ...axisOptions.y, grid: { display: !horizontal, color: 'rgba(148, 163, 184, 0.1)' } },
        },
      }
    } else if (type === 'radar') {
      defaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              color: '#64748b',
              font: { size: 12 },
            },
          },
          tooltip: tooltipOptions,
        },
        scales: {
          r: {
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            angleLines: { color: 'rgba(148, 163, 184, 0.15)' },
            pointLabels: { color: '#94a3b8', font: { size: 11 } },
            ticks: { color: '#94a3b8', backdropColor: 'transparent', font: { size: 10 } },
          },
        },
      }
    } else if (type === 'candlestick') {
      defaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipOptions },
        scales: {
          x: { type: 'linear', grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
          y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        },
      }
    } else if (type === 'doughnut') {
      defaults = ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { legend: { display: false }, tooltip: tooltipOptions },
      } as ChartOptions)
    } else {
      defaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipOptions },
      }
    }

    return { ...defaults, ...options }
  }

  onMount(() => {
    chart = new Chart(canvas, { type: type as ChartType, data, options: resolvedOptions() })
    // Chart.js starts the initial animation when the instance is created. The
    // first Svelte reactive pass must not cancel it with update('none'); later
    // prop/locale/theme changes still use the non-animated update path below.
    skipInitialReactiveUpdate = true
    return () => chart?.destroy()
  })

  $: if (chart) {
    if (skipInitialReactiveUpdate) {
      skipInitialReactiveUpdate = false
    } else {
      chart.data = data
      chart.options = resolvedOptions()
      chart.update('none')
    }
  }
</script>

<div style={'height:' + height + 'px'} class="w-full relative">
  <canvas bind:this={canvas}></canvas>
  {#if centerText || centerSubtext}
    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      {#if centerText}<span class="heading-3 text-secondary-900 dark:text-white">{centerText}</span>{/if}
      {#if centerSubtext}<span class="text-sm text-secondary-500 dark:text-secondary-400">{centerSubtext}</span>{/if}
    </div>
  {/if}
</div>



