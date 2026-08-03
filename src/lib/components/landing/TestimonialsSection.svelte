<script lang="ts">
  import { onMount } from 'svelte'
  import Swiper from 'swiper'
  import { Autoplay, Pagination } from 'swiper/modules'
  import 'swiper/css'
  import 'swiper/css/pagination'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'
  import { testimonials } from '../../../data/testimonials'

  const t = translate
  let swiperRoot: HTMLElement
  let swiper: Swiper | undefined
  $: currentLocale = $locale

  onMount(() => {
    swiper = new Swiper(swiperRoot, {
      modules: [Autoplay, Pagination], spaceBetween: 24, slidesPerView: 1,
      pagination: { clickable: true, dynamicBullets: true },
      autoplay: { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
      breakpoints: { 640: { slidesPerView: 1, spaceBetween: 24 }, 768: { slidesPerView: 2, spaceBetween: 32 }, 1024: { slidesPerView: 3, spaceBetween: 32 } },
    })
    return () => swiper?.destroy()
  })
</script>

<section id="testimonials" data-locale={currentLocale} class="py-24 px-4 bg-surface-50 dark:bg-surface-950 scroll-mt-24 overflow-hidden relative">
  <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
  <div class="absolute top-1/4 left-0 w-[500px] h-[500px] bg-theme-primary/5 rounded-full blur-[100px] -translate-x-1/2 pointer-events-none"></div><div class="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-theme-accent/5 rounded-full blur-[100px] translate-x-1/2 pointer-events-none"></div>
  <div class="max-w-7xl mx-auto relative z-10">
    <div class="text-center mb-20"><div class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm mb-6"><Icon icon={Icons.heartFilled} className="w-4 h-4 text-rose-500" /><span class="text-sm font-semibold text-secondary-600 dark:text-secondary-300">{t('landing.testimonials.badge')}</span></div><h2 class="text-display-section text-secondary-900 dark:text-white mb-6">{t('landing.testimonials.title_prefix')} <span class="text-theme-primary">{t('landing.testimonials.title_emphasis')}</span> {t('landing.testimonials.title_suffix')}</h2><p class="text-lead text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto leading-relaxed">{t('landing.testimonials.subtitle')}</p></div>
    <div bind:this={swiperRoot} class="swiper !pb-16 !overflow-visible testimonials-swiper"><div class="swiper-wrapper">{#each testimonials as testimonial}<div class="swiper-slide h-auto"><div class="group h-full rounded-[2rem] bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 p-8 flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"><div class="absolute top-8 right-8 text-surface-100 dark:text-surface-800 group-hover:text-theme-primary/10 transition-colors duration-300 transform group-hover:scale-110"><Icon icon={Icons.quote} className="w-20 h-20 rotate-12" /></div><div class="relative z-10 flex flex-col h-full"><div class="mb-6 flex gap-1">{#each Array(5) as _}<Icon icon={Icons.starFilled} className="w-4 h-4 text-amber-400" />{/each}</div><div class="flex-grow mb-8"><p class="text-body font-medium text-secondary-700 dark:text-secondary-200 leading-relaxed font-display">&quot;{t(testimonial.quoteKey)}&quot;</p></div><div class="flex items-center gap-4 mt-auto border-t border-surface-100 dark:border-surface-800 pt-6"><img src={testimonial.avatar} alt={testimonial.name} class="w-12 h-12 rounded-full object-cover ring-4 ring-surface-50 dark:ring-surface-900" /><div><p class="font-bold text-secondary-900 dark:text-white text-sm">{testimonial.name}</p><p class="text-xs text-secondary-500 dark:text-secondary-400 font-medium bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-full inline-block mt-1">{t(testimonial.roleKey)}</p></div></div></div></div></div>{/each}</div></div>
  </div>
</section>
