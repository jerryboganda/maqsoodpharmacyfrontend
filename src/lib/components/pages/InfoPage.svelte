<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import GalleryLightbox from './GalleryLightbox.svelte'
  import { Icons } from '../../icons'
  import { galleryCategories, galleryImages as galleryCatalog, type GalleryCategory } from '../../../data/gallery'
  import { translate, locale } from '../../stores/locale'
  import TypographyPage from './TypographyPage.svelte'

  export let path = '/pages/typography'

  type SettingsTab = 'account' | 'notifications' | 'billing' | 'security' | 'devices'
  type FaqCategory = { category: string; questions: [string, string][] }
  let galleryOpen = false
  let galleryIndex = 0
  let selectedGalleryCategory: GalleryCategory = 'all'
  let pricingFaq: number | null = 0
  let faqSearch = ''
  let faqOpen: number | null = 0
  let settingsTab: SettingsTab = 'account'
  let settingsMessage = ''
  let profileImage = '/assets/avatars/avatar1.jpg'

  $: localeVersion = $locale
  $: filteredGalleryImages = selectedGalleryCategory === 'all' ? galleryCatalog : galleryCatalog.filter((image) => image.category === selectedGalleryCategory)
  const plans = [
    { name: 'Starter', description: 'Perfect for individuals and small teams', price: '$9', popular: false, features: [['Up to 5 team members', true], ['10GB storage', true], ['Basic analytics', true], ['Email support', true], ['Custom domain', false], ['Advanced analytics', false], ['Priority support', false], ['API access', false]] },
    { name: 'Professional', description: 'For growing teams and businesses', price: '$29', popular: true, features: [['Up to 25 team members', true], ['100GB storage', true], ['Advanced analytics', true], ['Priority email support', true], ['Custom domain', true], ['API access', true], ['24/7 phone support', false], ['Dedicated manager', false]] },
    { name: 'Enterprise', description: 'For large organizations with advanced needs', price: '$99', popular: false, features: [['Unlimited team members', true], ['Unlimited storage', true], ['Advanced analytics & reporting', true], ['24/7 phone & email support', true], ['Custom domain & branding', true], ['Full API access', true], ['Dedicated account manager', true], ['Custom integrations', true]] },
  ]
  const pricingQuestions = [
    ['Can I change plans later?', 'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.'],
    ['What payment methods do you accept?', 'We accept all major credit cards, PayPal, and bank transfers for enterprise plans.'],
    ['Is there a free trial?', 'Yes, all plans come with a 14-day free trial. No credit card required.'],
  ]
  const faqs: FaqCategory[] = [
    { category: 'Getting started', questions: [['How do I customize the theme?', 'Open the theme customizer from the header and choose the color, mode, direction, layout, and card style.'], ['Can I use the dashboard without a backend?', 'Yes. This reference application uses local mock data and browser storage.'], ['How do I invite a teammate?', 'Open Contacts, choose Add contact, and complete the local form.']] },
    { category: 'Billing', questions: [['How does billing work?', 'The billing page displays the selected local plan and a representative invoice history.'], ['Can I cancel at any time?', 'Yes. The mock plan can be changed without an external service.'], ['Do you offer invoices?', 'Billing history is available in Account settings.']] },
    { category: 'Features', questions: [['Are the charts responsive?', 'Yes. The Chart.js wrappers resize with their cards and preserve tooltips.'], ['How do I switch to RTL?', 'Choose RTL in the theme customizer or select Arabic/Urdu in the language selector.'], ['Where is my data stored?', 'Theme, locale, and feature state are stored in localStorage keys preserved from the source app.'], ['Can I export table data?', 'Data and CRUD examples expose local export-ready shapes.']] },
    { category: 'Technical', questions: [['Which browsers are supported?', 'Current Chrome, Edge, Firefox, and Safari are supported by the client-only app.'], ['Can I run a production preview locally?', 'Run the SvelteKit build and preview scripts to serve the static output.'], ['Does this require an API?', 'No backend or authentication service is introduced by the reference dashboard.']] },
  ]
  $: filteredFaqs = faqs.map((category) => ({ ...category, questions: category.questions.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(faqSearch.toLowerCase())) })).filter((category) => category.questions.length > 0)
  $: pageTitle = path === '/pages/pricing' ? 'Pricing' : path === '/pages/account-settings' ? 'Account settings' : path === '/pages/gallery' ? 'Gallery' : path === '/pages/faq' ? 'Frequently asked questions' : 'Typography'

  const settingsTabs: { id: SettingsTab; label: string; icon: string }[] = [{ id: 'account', label: 'Account', icon: Icons.user }, { id: 'notifications', label: 'Notifications', icon: Icons.bell }, { id: 'billing', label: 'Billing', icon: Icons.creditCard }, { id: 'security', label: 'Security', icon: Icons.shield }, { id: 'devices', label: 'Devices', icon: Icons.devices }]
  const notificationSettings = [['Email notifications', 'Project updates and account activity'], ['Push notifications', 'Real-time alerts on this device'], ['SMS notifications', 'Important security events'], ['Marketing emails', 'Product news and offers'], ['Mentions and comments', 'Activity on content you follow'], ['Product updates', 'New Adminex features']]
  const devices = [{ name: 'MacBook Pro', type: 'Desktop', location: 'New York, USA', active: '2 min ago', current: true }, { name: 'iPhone 14', type: 'Mobile', location: 'New York, USA', active: '1 hour ago', current: false }, { name: 'iPad Air', type: 'Tablet', location: 'Los Angeles, USA', active: '2 days ago', current: false }]

  function saveSettings(): void { settingsMessage = 'Changes saved locally.'; window.setTimeout(() => (settingsMessage = ''), 2500) }
  function faqIndex(categoryIndex: number, questionIndex: number): number { return faqs.slice(0, categoryIndex).reduce((sum, category) => sum + category.questions.length, 0) + questionIndex }
</script>

<svelte:head><title>{pageTitle} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Adminex</title></svelte:head>

{#if path === '/pages/gallery'}
  <div class="space-y-6 animate-fade-in">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">{translate('gallery.title')}</h1>
      <p class="mt-2 text-body-sm text-secondary-600 dark:text-secondary-400">{translate('gallery.description')}</p>
    </div>
    <div class="card rounded-xl p-4">
      <div class="flex flex-wrap gap-2">
        {#each galleryCategories as category}
          <button type="button" class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${selectedGalleryCategory === category ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700'}`} on:click={() => { selectedGalleryCategory = category; galleryIndex = 0 }} aria-pressed={selectedGalleryCategory === category}>
            {category}
          </button>
        {/each}
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each filteredGalleryImages as image}
        <button type="button" class="group relative aspect-square overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800 border-0 p-0 text-left" aria-label={`Open ${image.title}`} on:click={() => { galleryIndex = filteredGalleryImages.findIndex((item) => item.id === image.id); galleryOpen = true }}>
          <img src={`${image.src}?w=400&h=400&fit=crop`} alt={image.title} class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer" data-lightboxjs="gallery-lightbox" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div class="absolute bottom-0 left-0 right-0 p-4">
              <h3 class="text-white font-semibold text-sm">{image.title}</h3>
              <p class="text-white/80 text-xs capitalize">{image.category}</p>
            </div>
          </div>
        </button>
      {/each}
    </div>
    {#if filteredGalleryImages.length === 0}
      <div class="card rounded-xl p-12 text-center">
        <p class="text-secondary-500 dark:text-secondary-400">{translate('gallery.no_images')}</p>
      </div>
    {/if}
  </div>
  <GalleryLightbox bind:open={galleryOpen} bind:index={galleryIndex} images={filteredGalleryImages} />
{:else if path === '/pages/pricing'}
  <div class="space-y-12">
    <div class="text-center max-w-3xl mx-auto">
      <span class="inline-block py-1 px-3 rounded-full bg-theme-primary/10 text-theme-primary text-sm font-semibold mb-4">Pricing</span>
      <h1 class="heading-2 text-secondary-900 dark:text-white mb-6">Simple, transparent pricing</h1>
      <p class="text-body-sm text-secondary-600 dark:text-secondary-400">Choose the perfect plan for your needs. No hidden fees.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {#each plans as plan}
        <div class={'relative rounded-[2rem] p-8 flex flex-col transition-all duration-300 ' + (plan.popular ? 'bg-white dark:bg-surface-900 shadow-2xl shadow-theme-primary/10 border-2 border-theme-primary scale-105 z-10' : 'bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 hover:border-theme-primary/30 hover:shadow-xl')}>
          {#if plan.popular}
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-primary text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg shadow-theme-primary/20">Most Popular</div>
          {/if}

          <div class="mb-8">
            <h3 class="heading-5 text-secondary-900 dark:text-white mb-2">{plan.name}</h3>
            <p class="text-body-sm text-secondary-500 dark:text-secondary-400 h-10">{plan.description}</p>
          </div>

          <div class="mb-8">
            <div class="flex items-baseline">
              <span class="text-display-price text-secondary-900 dark:text-white tracking-tight">{plan.price}</span>
              <span class="text-body-sm text-secondary-500 dark:text-secondary-400 ml-2">/month</span>
            </div>
          </div>

          <div class="flex-grow space-y-4 mb-8">
            {#each plan.features as feature}
              <div class="flex items-center gap-3">
                {#if feature[1]}
                  <div class="w-6 h-6 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0"><Icon icon={Icons.check} className="w-4 h-4 text-theme-primary" /></div>
                {:else}
                  <div class="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center flex-shrink-0"><Icon icon={Icons.x} className="w-4 h-4 text-secondary-400 dark:text-secondary-600" /></div>
                {/if}
                <span class={'text-sm ' + (feature[1] ? 'text-secondary-700 dark:text-secondary-300 font-medium' : 'text-secondary-400 dark:text-secondary-600')}>{feature[0]}</span>
              </div>
            {/each}
          </div>

          <button type="button" class={'w-full py-4 rounded-xl font-bold transition-all duration-200 ' + (plan.popular ? 'bg-theme-primary text-white hover:brightness-90 shadow-lg shadow-theme-primary/25 hover:shadow-theme-primary/40' : 'bg-white dark:bg-surface-800 text-secondary-900 dark:text-white border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700')}>Get Started</button>
        </div>
      {/each}
    </div>

    <div class="max-w-3xl mx-auto">
      <h2 class="text-xl font-bold text-secondary-900 dark:text-white mb-6 text-center">Frequently Asked Questions</h2>
      <div class="space-y-4">
        {#each pricingQuestions as faq, index}
          <div class={'rounded-2xl border transition-all duration-300 overflow-hidden ' + (pricingFaq === index ? 'bg-surface-50 dark:bg-surface-950 border-theme-primary/30 shadow-lg shadow-theme-primary/5' : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-theme-primary/20')}>
            <button type="button" class="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none" aria-expanded={pricingFaq === index} on:click={() => (pricingFaq = pricingFaq === index ? null : index)}>
              <span class="text-lg font-bold text-secondary-900 dark:text-white pr-8">{faq[0]}</span>
              <div class={'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ' + (pricingFaq === index ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-500 dark:text-secondary-400')}>
                <Icon icon={pricingFaq === index ? Icons.minus : Icons.plus} width={18} height={18} />
              </div>
            </button>
            <div class={'grid transition-[grid-template-rows] duration-300 ease-out ' + (pricingFaq === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div class="overflow-hidden">
                <div class="px-8 pb-8 pt-0 text-secondary-600 dark:text-secondary-400 leading-relaxed">{faq[1]}</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{:else if path === '/pages/faq'}
  <div class="space-y-6 max-w-4xl mx-auto animate-fade-in"><div class="text-center"><h1 class="heading-2 text-secondary-900 dark:text-white">Frequently asked questions</h1><p class="mt-2 text-body-sm text-secondary-600 dark:text-secondary-400">Find answers about the Adminex dashboard, data, and customization.</p></div><div class="card rounded-xl p-4"><div class="relative"><Icon icon={Icons.search} width={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" /><label class="sr-only" for="faq-search">Search frequently asked questions</label><input id="faq-search" bind:value={faqSearch} placeholder="Search questions and answers" class="w-full pl-12 pr-4 py-3 input-theme" /></div></div>{#if filteredFaqs.length}<div class="space-y-8">{#each filteredFaqs as category, categoryIndex}<div><h2 class="heading-4 text-secondary-900 dark:text-white mb-4">{category.category}</h2><div class="space-y-3">{#each category.questions as faq, questionIndex}<div class="card rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700"><button type="button" class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-50 dark:hover:bg-surface-800" aria-expanded={faqOpen === faqIndex(categoryIndex, questionIndex)} on:click={() => { const index = faqIndex(categoryIndex, questionIndex); faqOpen = faqOpen === index ? null : index }}><h3 class="text-base font-semibold text-secondary-900 dark:text-white pr-4">{faq[0]}</h3><Icon icon={faqOpen === faqIndex(categoryIndex, questionIndex) ? Icons.chevronUp : Icons.chevronDown} width={20} className="text-secondary-400 shrink-0" /></button>{#if faqOpen === faqIndex(categoryIndex, questionIndex)}<div class="px-6 pb-4 pt-2"><p class="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">{faq[1]}</p></div>{/if}</div>{/each}</div></div>{/each}</div>{:else}<div class="card rounded-xl p-12 text-center text-secondary-500">No questions match ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ{faqSearch}ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â.</div>{/if}<div class="card rounded-xl p-8 text-center bg-gradient-to-r from-theme-primary/10 to-theme-primary/5 border border-theme-primary/20"><h2 class="heading-4 text-secondary-900 dark:text-white mb-2">Still have questions?</h2><p class="text-body text-secondary-600 dark:text-secondary-400 mb-4">Our support team can help you understand the local reference behavior.</p><button type="button" class="px-6 py-3 bg-theme-primary text-white rounded-xl text-base font-semibold">Contact support</button></div></div>
{:else if path === '/pages/account-settings'}
  <div class="space-y-6 animate-fade-in"><div><h1 class="heading-2 text-secondary-900 dark:text-white">Account settings</h1><p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">Manage your profile, preferences, billing, security, and connected devices.</p></div><div class="grid grid-cols-1 lg:grid-cols-4 gap-6"><div class="lg:col-span-1"><div class="card rounded-xl p-2 space-y-1">{#each settingsTabs as tab}<button type="button" class={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${settingsTab === tab.id ? 'bg-theme-primary text-white' : 'text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800'}`} on:click={() => (settingsTab = tab.id)}><Icon icon={tab.icon} width={20} /><span class="font-medium">{tab.label}</span></button>{/each}</div></div><div class="lg:col-span-3"><div class="card rounded-xl p-6">{#if settingsTab === 'account'}<div class="space-y-6"><div><h2 class="heading-4 text-secondary-900 dark:text-white mb-1">Personal information</h2><p class="text-sm text-secondary-500">Update the profile displayed across the local workspace.</p></div><div><p class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Profile photo</p><div class="flex items-center gap-4"><img src={profileImage} alt="Profile" class="w-20 h-20 rounded-full object-cover" /><label class="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2"><Icon icon={Icons.upload} width={16} />Upload new photo<input type="file" accept="image/*" class="sr-only" on:change={(event) => { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (file) profileImage = URL.createObjectURL(file) }} /></label></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="field-label" for="account-first">First name</label><input id="account-first" class="input-theme" value="John" /></div><div><label class="field-label" for="account-last">Last name</label><input id="account-last" class="input-theme" value="Doe" /></div><div class="md:col-span-2"><label class="field-label" for="account-email">Email address</label><input id="account-email" type="email" class="input-theme" value="john.doe@example.com" /></div><div class="md:col-span-2"><label class="field-label" for="account-bio">Bio</label><textarea id="account-bio" rows="3" class="input-theme resize-none">Software developer and tech enthusiast</textarea></div></div><div class="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700"><button type="button" class="px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded-lg">Cancel</button><button type="button" on:click={saveSettings} class="px-4 py-2 bg-theme-primary text-white rounded-lg">Save changes</button></div></div>{:else if settingsTab === 'notifications'}<div class="space-y-6"><div><h2 class="heading-4 text-secondary-900 dark:text-white mb-1">Notification preferences</h2><p class="text-sm text-secondary-500">Choose which local notifications you receive.</p></div><div class="space-y-4">{#each notificationSettings as setting}<label class="flex items-start justify-between py-3 border-b border-surface-200 dark:border-surface-700 last:border-0 cursor-pointer"><span class="flex-1"><span class="block font-medium text-secondary-900 dark:text-white mb-0.5">{setting[0]}</span><span class="block text-sm text-secondary-600 dark:text-secondary-400">{setting[1]}</span></span><input type="checkbox" checked class="mt-1 h-4 w-4 text-theme-primary" /></label>{/each}</div></div>{:else if settingsTab === 'billing'}<div class="space-y-6"><div><h2 class="heading-4 text-secondary-900 dark:text-white mb-1">Billing and subscription</h2><p class="text-sm text-secondary-500">Review the active local plan and billing history.</p></div><div class="p-6 bg-gradient-to-r from-theme-primary/10 to-theme-primary/5 border border-theme-primary/20 rounded-xl flex items-start justify-between"><div><h3 class="heading-4 text-secondary-900 dark:text-white mb-1">Professional plan</h3><p class="text-sm text-secondary-500">Next billing date: January 12, 2026</p><button type="button" class="mt-4 px-4 py-2 bg-white dark:bg-surface-800 text-theme-primary rounded-lg font-medium">Upgrade plan</button></div><div class="text-right"><div class="heading-3 text-secondary-900 dark:text-white">$29</div><div class="text-sm text-secondary-500">per month</div></div></div><div><h3 class="font-semibold text-secondary-900 dark:text-white mb-3">Payment method</h3><div class="p-4 border border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-between"><div class="flex items-center gap-3"><Icon icon={Icons.creditCard} width={24} className="text-secondary-600" /><div><div class="font-medium text-secondary-900 dark:text-white">ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ 4242</div><div class="text-sm text-secondary-600 dark:text-secondary-400">Expires 12/27</div></div></div><button type="button" class="text-sm text-theme-primary">Edit</button></div></div><div><h3 class="font-semibold text-secondary-900 dark:text-white mb-3">Billing history</h3><table class="w-full"><thead class="bg-surface-50 dark:bg-surface-800"><tr><th class="px-4 py-3 text-left text-xs font-medium text-secondary-500">Date</th><th class="px-4 py-3 text-left text-xs font-medium text-secondary-500">Description</th><th class="px-4 py-3 text-left text-xs font-medium text-secondary-500">Amount</th><th class="px-4 py-3 text-left text-xs font-medium text-secondary-500">Status</th></tr></thead><tbody class="divide-y divide-surface-200 dark:divide-surface-700">{#each [['Dec 12, 2025','Professional plan','$29','Paid'],['Nov 12, 2025','Professional plan','$29','Paid'],['Oct 12, 2025','Professional plan','$29','Paid']] as invoice}<tr><td class="px-4 py-3 text-sm">{invoice[0]}</td><td class="px-4 py-3 text-sm">{invoice[1]}</td><td class="px-4 py-3 text-sm">{invoice[2]}</td><td class="px-4 py-3 text-sm text-success-600">{invoice[3]}</td></tr>{/each}</tbody></table></div></div>{:else if settingsTab === 'security'}<div class="space-y-6"><div><h2 class="heading-4 text-secondary-900 dark:text-white mb-1">Security settings</h2><p class="text-sm text-secondary-500">Keep this mock account protected with local validation.</p></div><div class="space-y-4"><div><label class="field-label" for="current-password">Current password</label><input id="current-password" type="password" class="input-theme" /></div><div><label class="field-label" for="new-password">New password</label><input id="new-password" type="password" class="input-theme" /></div><div><label class="field-label" for="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" class="input-theme" /></div><button type="button" on:click={saveSettings} class="px-4 py-2 bg-theme-primary text-white rounded-lg">Update password</button></div><div class="pt-6 border-t border-surface-200 dark:border-surface-700 flex items-start justify-between"><div><h3 class="font-semibold text-secondary-900 dark:text-white flex items-center gap-2"><Icon icon={Icons.shield} width={20} />Two-factor authentication</h3><p class="text-sm text-secondary-500 mt-1">Add a second step to the local sign-in experience.</p></div><button type="button" class="px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded-lg">Enable</button></div></div>{:else}<div class="space-y-6"><div><h2 class="heading-4 text-secondary-900 dark:text-white mb-1">Connected devices</h2><p class="text-sm text-secondary-500">Review active sessions for this browser profile.</p></div><div class="space-y-3">{#each devices as device}<div class="p-4 border border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-between"><div class="flex items-start gap-3"><div class="p-2 bg-surface-100 dark:bg-surface-800 rounded-lg"><Icon icon={Icons.devices} width={20} className="text-secondary-600" /></div><div><div class="font-medium text-secondary-900 dark:text-white flex items-center gap-2">{device.name}{#if device.current}<span class="px-2 py-0.5 bg-success-100 text-success-700 text-xs rounded-full">Current</span>{/if}</div><div class="text-sm text-secondary-600 dark:text-secondary-400 mt-1">{device.type} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {device.location}</div><div class="text-xs text-secondary-500 mt-0.5">Last active {device.active}</div></div></div>{#if !device.current}<button type="button" class="text-sm text-danger-600">Remove</button>{/if}</div>{/each}</div></div>{/if}{#if settingsMessage}<p class="mt-6 text-sm text-success-600">{settingsMessage}</p>{/if}</div></div></div></div>
{:else if path === '/pages/typography'}
  <TypographyPage />
{:else}
  <div class="space-y-6 animate-fade-in"><div><h1 class="heading-2 text-secondary-900 dark:text-white">Typography guide</h1><p class="text-body-sm text-secondary-600 dark:text-secondary-400 mt-2">Adminex typography specimens and shared design tokens.</p><p class="text-caption text-secondary-500 dark:text-secondary-400 mt-1">Adminex ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· route <code>/pages/typography</code></p></div><div class="card rounded-xl p-6 space-y-5"><h2 class="heading-4 text-secondary-900 dark:text-white">Marketing display</h2><div class="space-y-6"><div><div class="text-caption text-secondary-500">.text-display-hero</div><div class="text-display-hero text-secondary-900 dark:text-white">Build better workspaces</div></div><div><div class="text-caption text-secondary-500">.text-display-section</div><div class="text-display-section text-secondary-900 dark:text-white">One system, every workflow</div></div><div><div class="text-caption text-secondary-500">.text-display-price</div><div class="text-display-price text-secondary-900 dark:text-white">$29</div></div><div><div class="text-caption text-secondary-500">.text-lead</div><p class="text-lead text-secondary-600 dark:text-secondary-400 max-w-3xl">A clear type scale keeps every dashboard card, table, form, and feature module readable.</p></div></div></div><div class="card rounded-xl p-6 space-y-5"><h2 class="heading-4 text-secondary-900 dark:text-white">Headings</h2><div class="space-y-4"><div><div class="text-caption text-secondary-500">.heading-1</div><div class="heading-1 text-secondary-900 dark:text-white">Heading one</div></div><div><div class="text-caption text-secondary-500">.heading-2</div><div class="heading-2 text-secondary-900 dark:text-white">Heading two</div></div><div><div class="text-caption text-secondary-500">.heading-3</div><div class="heading-3 text-secondary-900 dark:text-white">Heading three</div></div><div><div class="text-caption text-secondary-500">.heading-4</div><div class="heading-4 text-secondary-900 dark:text-white">Heading four</div></div><div><div class="text-caption text-secondary-500">.heading-5</div><div class="heading-5 text-secondary-900 dark:text-white">Heading five</div></div></div></div><div class="card rounded-xl p-6 space-y-5"><h2 class="heading-4 text-secondary-900 dark:text-white">Body and UI text</h2><div class="space-y-3"><p class="text-body text-secondary-600 dark:text-secondary-400">Body text explains the product and keeps reading comfortable across all supported breakpoints.</p><p class="text-body-sm text-secondary-600 dark:text-secondary-400">Small body text supports labels, descriptions, and table content.</p><p class="text-caption text-secondary-500">Caption text is reserved for metadata and supporting details.</p><div class="flex flex-wrap gap-3"><span class="text-ui px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800">.text-ui</span><span class="text-ui-sm px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800">.text-ui-sm</span><span class="text-ui-xs px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800">.text-ui-xs</span><span class="text-ui-2xs px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800">.text-ui-2xs</span></div></div></div><div class="card rounded-xl p-6 space-y-5"><h2 class="heading-4 text-secondary-900 dark:text-white">Emphasis</h2><p class="text-body text-secondary-600 dark:text-secondary-400">Readable copy may include <strong>strong emphasis</strong>, <b>bold labels</b>, and <span class="text-strong text-secondary-900 dark:text-white">strong UI text</span>.</p><p class="text-body-sm text-secondary-600 dark:text-secondary-400">The same tokens are used by navigation, charts, tables, and settings.</p></div></div>
{/if}

<style>
  .field-label { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: rgb(71 85 105); }
  :global(.dark) .field-label { color: rgb(203 213 225); }
</style>











