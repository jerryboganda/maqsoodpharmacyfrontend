<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from './Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, setLocale, translate, type Locale } from '../../stores/locale'

  type Option = { locale: Locale; label: string; subLabel?: string; flagSrc: string }
  const options: Option[] = [
    { locale: 'en', label: 'English', subLabel: '(USA)', flagSrc: '/assets/flags/usa.png' },
    { locale: 'fr', label: 'Français', subLabel: '(France)', flagSrc: '/assets/flags/france.png' },
    { locale: 'hi-IN', label: 'हिन्दी', subLabel: '(भारत)', flagSrc: '/assets/flags/india.png' },
    { locale: 'zh-CN', label: '中文', subLabel: '(中国)', flagSrc: '/assets/flags/china.png' },
    { locale: 'ja', label: '日本語', subLabel: '(日本)', flagSrc: '/assets/flags/japan.png' },
    { locale: 'ur', label: 'اردو', subLabel: '(پاکستان)', flagSrc: '/assets/flags/pakistan.png' },
    { locale: 'pt', label: 'Português', subLabel: '(Portugal)', flagSrc: '/assets/flags/portugal.png' },
    { locale: 'ru', label: 'Русский', subLabel: '(Россия)', flagSrc: '/assets/flags/russia.png' },
    { locale: 'es', label: 'Español', subLabel: '(España)', flagSrc: '/assets/flags/spain.png' },
    { locale: 'ar', label: 'العربية', subLabel: '(الإمارات)', flagSrc: '/assets/flags/uae.png' },
  ]
  let open = false
  let failed = new Set<string>()
  $: active = options.find((option) => option.locale === $locale) ?? options[0]

  function closeOnOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!target.closest('[data-language-switcher]')) open = false
  }

  onMount(() => {
    document.addEventListener('click', closeOnOutside)
    return () => document.removeEventListener('click', closeOnOutside)
  })

  function choose(value: Locale): void {
    setLocale(value)
    open = false
  }

  function markFailed(value: string): void {
    failed = new Set([...failed, value])
  }
</script>

<div class="relative" data-language-switcher>
  <button type="button" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" on:click|stopPropagation={() => (open = !open)} aria-haspopup="menu" aria-expanded={open} title={translate('language')}>
    {#if failed.has(active.flagSrc)}
      <span class="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200 text-ui-3xs flex items-center justify-center">{active.locale.toUpperCase()}</span>
    {:else}
      <img src={active.flagSrc} alt={active.label} class="w-6 h-6 rounded-full object-cover" on:error={() => markFailed(active.flagSrc)} />
    {/if}
  </button>
  {#if open}
    <div class="absolute right-0 mt-2 w-56 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl py-2 px-1 z-[1035]" role="menu">
      {#each options as option}
        <button type="button" class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary-700 dark:text-secondary-200 hover:bg-surface-50 dark:hover:bg-surface-800 text-left ${option.locale === $locale ? 'text-theme-primary' : ''}`} on:click={() => choose(option.locale)} role="menuitem">
          {#if failed.has(option.flagSrc)}
            <span class="w-5 h-5 rounded-full bg-surface-200 dark:bg-surface-800 text-ui-3xs flex items-center justify-center">{option.locale.toUpperCase()}</span>
          {:else}
            <img src={option.flagSrc} alt={option.label} class="w-5 h-5 rounded-full object-cover shadow-sm" on:error={() => markFailed(option.flagSrc)} loading="lazy" />
          {/if}
          <span class="font-medium">{option.label}</span>
          <span class="text-secondary-400 dark:text-secondary-500 font-normal">{option.subLabel}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
