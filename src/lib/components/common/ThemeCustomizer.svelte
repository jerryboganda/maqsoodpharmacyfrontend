<script lang="ts">
  import { locale, translate } from '../../stores/locale'
  import { theme, setCardStyle, setColor, setContainer, setDirection, setMode, setSidebarCollapsed, setSidebarLayout, resetTheme } from '../../stores/theme'
  import type { ThemeColor } from '../../../types/theme'

  let isOpen = false

  const themeColors: { value: ThemeColor; className: string }[] = [
    { value: 'blue', className: 'bg-blue-500' },
    { value: 'purple', className: 'bg-purple-500' },
    { value: 'green', className: 'bg-green-500' },
    { value: 'orange', className: 'bg-orange-500' },
    { value: 'red', className: 'bg-red-500' },
    { value: 'cyan', className: 'bg-cyan-500' },
  ]

  $: isRtl = $theme.direction === 'rtl'
  $: directionLocked = $locale === 'ar' || $locale === 'ur'
  const t = translate
</script>

<button
  type="button"
  on:click={() => (isOpen = true)}
  class={'fixed top-1/2 -translate-y-1/2 z-[1080] bg-theme-primary text-white p-3 shadow-lg hover:shadow-xl transition-all ' + (isRtl ? 'left-0 rounded-r-lg' : 'right-0 rounded-l-lg')}
  aria-label={t('theme.open_customizer')}
>
  <svg class="w-5 h-5 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
</button>

{#if isOpen}
  <div class="fixed inset-0 bg-black/50 z-[1080] transition-opacity" on:click={() => (isOpen = false)} role="presentation"></div>
{/if}

<div
  class={'fixed top-0 h-full w-80 bg-white dark:bg-surface-900 shadow-2xl z-[1090] transform transition-transform duration-300 ' + (isRtl ? 'left-0' : 'right-0') + ' ' + (isOpen ? 'translate-x-0' : isRtl ? '-translate-x-full' : 'translate-x-full')}
>
  <div class="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
    <h2 class="heading-5 text-secondary-900 dark:text-white">{t('theme.title')}</h2>
    <button type="button" on:click={() => (isOpen = false)} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors" aria-label={t('theme.close_customizer')}>
      <svg class="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <div class="p-4 space-y-6 h-[calc(100%-130px)] overflow-y-auto scrollbar-thin">
    <div>
      <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.mode')}</h3>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          on:click={() => setMode('light')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.mode === 'light' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span class="text-label">{t('theme.light')}</span>
        </button>
        <button
          type="button"
          on:click={() => setMode('dark')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.mode === 'dark' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span class="text-label">{t('theme.dark')}</span>
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.direction')}</h3>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={directionLocked}
          aria-disabled={directionLocked}
          on:click={() => setDirection('ltr')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.direction === 'ltr' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600') + (directionLocked ? ' opacity-60 cursor-not-allowed pointer-events-none' : '')}
        >
          <span class="text-label">{t('theme.ltr')}</span>
        </button>
        <button
          type="button"
          disabled={directionLocked}
          aria-disabled={directionLocked}
          on:click={() => setDirection('rtl')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.direction === 'rtl' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600') + (directionLocked ? ' opacity-60 cursor-not-allowed pointer-events-none' : '')}
        >
          <span class="text-label">{t('theme.rtl')}</span>
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.colors')}</h3>
      <div class="grid grid-cols-6 gap-2">
        {#each themeColors as color}
          <button
            type="button"
            title={t('theme.color.' + color.value)}
            aria-label={t('theme.color.' + color.value)}
            on:click={() => setColor(color.value)}
            class={'w-8 h-8 rounded-full ' + color.className + ' transition-transform hover:scale-110' + ($theme.color === color.value ? ' ring-2 ring-offset-2 ring-secondary-400 dark:ring-offset-surface-900' : '')}
          ></button>
        {/each}
      </div>
    </div>

    <div>
      <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.sidebar_layout')}</h3>
      <p class="text-caption text-secondary-400 dark:text-secondary-500 mb-3 -mt-1">{t('theme.applied_full_layout')}</p>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          on:click={() => setSidebarLayout('vertical')}
          class={'p-3 rounded-lg border transition-all ' + ($theme.sidebarLayout === 'vertical' ? 'border-theme-primary bg-theme-primary-light' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')}
        >
          <div class={'w-full h-12 rounded border-2 border-dashed ' + ($theme.sidebarLayout === 'vertical' ? 'border-theme-primary' : 'border-surface-300 dark:border-surface-600') + ' flex flex-row'}>
            <div class="w-1/4 h-full bg-surface-300 dark:bg-surface-600 rounded-sm"></div>
          </div>
          <span class={'text-caption font-medium mt-2 block ' + ($theme.sidebarLayout === 'vertical' ? 'text-theme-primary' : 'text-secondary-500')}>{t('theme.vertical')}</span>
        </button>
        <button
          type="button"
          on:click={() => setSidebarLayout('horizontal')}
          class={'p-3 rounded-lg border transition-all ' + ($theme.sidebarLayout === 'horizontal' ? 'border-theme-primary bg-theme-primary-light' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')}
        >
          <div class={'w-full h-12 rounded border-2 border-dashed ' + ($theme.sidebarLayout === 'horizontal' ? 'border-theme-primary' : 'border-surface-300 dark:border-surface-600') + ' flex flex-col'}>
            <div class="w-full h-1/4 bg-surface-300 dark:bg-surface-600 rounded-sm"></div>
          </div>
          <span class={'text-caption font-medium mt-2 block ' + ($theme.sidebarLayout === 'horizontal' ? 'text-theme-primary' : 'text-secondary-500')}>{t('theme.horizontal')}</span>
        </button>
      </div>
    </div>

    {#if $theme.sidebarLayout === 'vertical'}
      <div>
        <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.sidebar_style')}</h3>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            on:click={() => setSidebarCollapsed(false)}
            class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + (!$theme.sidebarCollapsed ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
          ><span class="text-label">{t('theme.full')}</span></button>
          <button
            type="button"
            on:click={() => setSidebarCollapsed(true)}
            class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.sidebarCollapsed ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
          ><span class="text-label">{t('theme.mini')}</span></button>
        </div>
      </div>
    {/if}

    <div>
      <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.container')}</h3>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          on:click={() => setContainer('full')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.container === 'full' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
        ><span class="text-label">{t('theme.full_width')}</span></button>
        <button
          type="button"
          on:click={() => setContainer('boxed')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.container === 'boxed' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
        ><span class="text-label">{t('theme.boxed')}</span></button>
      </div>
    </div>

    <div>
      <h3 class="text-label text-secondary-500 dark:text-secondary-400 mb-3">{t('theme.card_style')}</h3>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          on:click={() => setCardStyle('shadow')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.cardStyle === 'shadow' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
        ><span class="text-label">{t('theme.shadow')}</span></button>
        <button
          type="button"
          on:click={() => setCardStyle('border')}
          class={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border transition-all ' + ($theme.cardStyle === 'border' ? 'border-theme-primary bg-theme-primary-light text-theme-primary' : 'border-surface-200 dark:border-surface-700 text-secondary-600 dark:text-secondary-400 hover:border-surface-300 dark:hover:border-surface-600')}
        ><span class="text-label">{t('theme.border')}</span></button>
      </div>
    </div>
  </div>

  <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
    <button type="button" on:click={resetTheme} class="w-full py-2.5 px-4 bg-danger-500 hover:bg-danger-600 text-white rounded-lg font-medium transition-colors">{t('theme.reset')}</button>
  </div>
</div>

