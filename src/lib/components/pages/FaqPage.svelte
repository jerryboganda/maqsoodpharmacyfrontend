<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  type FaqEntry = { question: string; answer: string }
  type FaqCategory = { category: string; questions: FaqEntry[] }

  const t = translate
  let searchQuery = ''
  let openIndex: number | null = 0
  $: currentLocale = $locale

  const faqsData = [
    {
      categoryKey: 'faq.category.getting_started',
      questions: [
        { questionKey: 'faq.getting_started.q1.question', answerKey: 'faq.getting_started.q1.answer' },
        { questionKey: 'faq.getting_started.q2.question', answerKey: 'faq.getting_started.q2.answer' },
        { questionKey: 'faq.getting_started.q3.question', answerKey: 'faq.getting_started.q3.answer' },
      ],
    },
    {
      categoryKey: 'faq.category.billing',
      questions: [
        { questionKey: 'faq.billing.q1.question', answerKey: 'faq.billing.q1.answer' },
        { questionKey: 'faq.billing.q2.question', answerKey: 'faq.billing.q2.answer' },
        { questionKey: 'faq.billing.q3.question', answerKey: 'faq.billing.q3.answer' },
      ],
    },
    {
      categoryKey: 'faq.category.features',
      questions: [
        { questionKey: 'faq.features.q1.question', answerKey: 'faq.features.q1.answer' },
        { questionKey: 'faq.features.q2.question', answerKey: 'faq.features.q2.answer' },
        { questionKey: 'faq.features.q3.question', answerKey: 'faq.features.q3.answer' },
        { questionKey: 'faq.features.q4.question', answerKey: 'faq.features.q4.answer' },
      ],
    },
    {
      categoryKey: 'faq.category.technical',
      questions: [
        { questionKey: 'faq.technical.q1.question', answerKey: 'faq.technical.q1.answer' },
        { questionKey: 'faq.technical.q2.question', answerKey: 'faq.technical.q2.answer' },
        { questionKey: 'faq.technical.q3.question', answerKey: 'faq.technical.q3.answer' },
      ],
    },
  ]

  $: faqs = faqsData.map((category) => ({
    category: t(category.categoryKey),
    questions: category.questions.map((question) => ({
      question: t(question.questionKey),
      answer: t(question.answerKey),
    })),
  })) as FaqCategory[]

  $: filteredFaqs = faqs
    .map((category) => ({
      ...category,
      questions: category.questions.filter((question) => (question.question + ' ' + question.answer).toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((category) => category.questions.length > 0)

  function faqGlobalIndex(categoryIndex: number, questionIndex: number): number {
    return faqs.slice(0, categoryIndex).reduce((sum, category) => sum + category.questions.length, 0) + questionIndex
  }
</script>

<svelte:head><title>{t('faq.title')} · Adminex</title></svelte:head>

<div class="space-y-6 max-w-4xl mx-auto" data-locale={currentLocale}>
  <div class="text-center">
    <h1 class="heading-2 text-secondary-900 dark:text-white">{t('faq.title')}</h1>
    <p class="mt-2 text-body-sm text-secondary-600 dark:text-secondary-400">{t('faq.description')}</p>
  </div>

  <div class="card rounded-xl p-4">
    <div class="relative">
      <Icon icon={Icons.search} width={20} height={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" />
      <label class="sr-only" for="faq-search">Search for questions</label>
      <input id="faq-search" type="text" bind:value={searchQuery} placeholder={t('faq.search_placeholder')} class="w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
    </div>
  </div>

  {#if filteredFaqs.length > 0}
    <div class="space-y-8">
      {#each filteredFaqs as category, categoryIndex}
        <div>
          <h2 class="heading-4 text-secondary-900 dark:text-white mb-4">{category.category}</h2>
          <div class="space-y-3">
            {#each category.questions as faq, questionIndex}
              {@const globalIndex = faqGlobalIndex(categoryIndex, questionIndex)}
              {@const isOpen = openIndex === globalIndex}
              <div class="card rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
                <button type="button" aria-expanded={isOpen} on:click={() => (openIndex = isOpen ? null : globalIndex)} class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <h3 class="text-base font-semibold text-secondary-900 dark:text-white pr-4">{faq.question}</h3>
                  <Icon icon={Icons.chevronDown} width={20} height={20} className={'text-secondary-400 flex-shrink-0 transition-transform ' + (isOpen ? 'rotate-180' : '')} />
                </button>
                {#if isOpen}
                  <div class="px-6 pb-4 pt-2">
                    <p class="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">{faq.answer}</p>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="card rounded-xl p-12 text-center">
      <p class="text-secondary-500 dark:text-secondary-400">{t('faq.no_results', { query: searchQuery })}</p>
    </div>
  {/if}

  <div class="card rounded-xl p-8 text-center bg-gradient-to-r from-theme-primary/10 to-theme-primary/5 dark:from-theme-primary/20 dark:to-theme-primary/10 border border-theme-primary/20">
    <h3 class="heading-4 text-secondary-900 dark:text-white mb-2">{t('faq.still_questions')}</h3>
    <p class="text-body text-secondary-600 dark:text-secondary-400 mb-4">{t('faq.still_questions_desc')}</p>
    <button type="button" class="px-6 py-3 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-xl text-base font-semibold transition-colors">{t('faq.contact_support')}</button>
  </div>
</div>

