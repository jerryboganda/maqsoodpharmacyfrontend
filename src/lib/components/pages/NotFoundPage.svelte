<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'

  const t = translate
</script>
<div class="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-4 overflow-hidden relative">
  <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-pulse"></div>
  <div class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

  <div class="text-center relative z-10 max-w-lg mx-auto animate-fade-in">
    <div class="mb-8 relative inline-block">
      <div class="w-32 h-32 bg-surface-100 dark:bg-surface-900 rounded-full flex items-center justify-center mx-auto relative z-10 shadow-xl border border-surface-200 dark:border-surface-800">
        <Icon icon={Icons.search} width={64} height={64} className="text-accent-500" />
      </div>
      <div class="absolute -top-4 -right-4 p-3 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-100 dark:border-surface-700 animate-bounce delay-100">
        <Icon icon={Icons.help} width={24} height={24} className="text-warning-500" />
      </div>
      <div class="absolute -bottom-2 -left-4 p-3 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-100 dark:border-surface-700 animate-bounce delay-300">
        <Icon icon={Icons.alertTriangle} width={24} height={24} className="text-danger-500" />
      </div>
    </div>

    <h1 class="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-accent-600 mb-2">404</h1>
    <h2 class="heading-4 text-secondary-900 dark:text-white mb-4">{t('errors.404_title')}</h2>
    <p class="text-body text-secondary-600 dark:text-secondary-400 mb-8 leading-relaxed">{t('errors.404_message')}</p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="/" class="flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-accent-500/20 hover:shadow-accent-500/40 hover:-translate-y-0.5">
        <Icon icon={Icons.home} width={20} height={20} />
        {t('errors.go_home')}
      </a>
      <a href="/dashboard" class="flex items-center gap-2 px-6 py-3 bg-white dark:bg-surface-800 text-secondary-900 dark:text-white rounded-xl font-semibold border border-surface-200 dark:border-surface-700 hover:border-accent-500 dark:hover:border-accent-500 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md">
        <Icon icon={Icons.dashboard} width={20} height={20} />
        {t('header.top.dashboard')}
      </a>
    </div>
  </div>
</div>

