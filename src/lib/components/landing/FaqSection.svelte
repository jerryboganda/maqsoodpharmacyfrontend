<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  const t = translate
  let faqOpen: number | null = 0
  $: currentLocale = $locale
  const faqs = [
    ['landing.faq.items.free_template.question', 'landing.faq.items.free_template.answer'],
    ['landing.faq.items.commercial_use.question', 'landing.faq.items.commercial_use.answer'],
    ['landing.faq.items.support.question', 'landing.faq.items.support.answer'],
    ['landing.faq.items.react_version.question', 'landing.faq.items.react_version.answer'],
    ['landing.faq.items.typescript_required.question', 'landing.faq.items.typescript_required.answer'],
    ['landing.faq.items.updates.question', 'landing.faq.items.updates.answer'],
  ]
</script>

<section id="faq" data-locale={currentLocale} class="py-24 px-4 bg-white dark:bg-surface-900 scroll-mt-24">
  <div class="max-w-4xl mx-auto"><div class="text-center mb-16"><div class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm mb-6"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-theme-primary"></span></span><span class="text-sm font-semibold text-secondary-600 dark:text-secondary-300">{t('landing.faq.badge')}</span></div><h2 class="text-display-section text-secondary-900 dark:text-white mb-6">{t('landing.faq.title_prefix')} <span class="text-gradient">{t('landing.faq.title_emphasis')}</span></h2><p class="text-lead text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">{t('landing.faq.subtitle')}</p></div>
    <div class="space-y-4">
      {#each faqs as faq, index}<div class={`rounded-2xl border transition-all duration-300 overflow-hidden ${faqOpen === index ? 'bg-surface-50 dark:bg-surface-950 border-theme-primary/30 shadow-lg shadow-theme-primary/5' : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-theme-primary/20'}`}><button type="button" aria-expanded={faqOpen === index} on:click={() => (faqOpen = faqOpen === index ? null : index)} class="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none"><span class="heading-5 text-secondary-900 dark:text-white pr-8">{t(faq[0])}</span><div class={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${faqOpen === index ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-500 dark:text-secondary-400'}`}>{#if faqOpen === index}<Icon icon={Icons.minus} width={18} height={18} />{:else}<Icon icon={Icons.plus} width={18} height={18} />{/if}</div></button><div class={`grid transition-[grid-template-rows] duration-300 ease-out ${faqOpen === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div class="overflow-hidden"><div class="px-8 pb-8 pt-0 text-body text-secondary-600 dark:text-secondary-400 leading-relaxed">{t(faq[1])}</div></div></div></div>{/each}
    </div>
  </div>
</section>
