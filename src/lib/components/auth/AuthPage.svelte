<script lang="ts">
  import { goto } from '$app/navigation'
  import Icon from '../common/Icon.svelte'
  import Logo from '../common/Logo.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'

  export let kind: 'login' | 'register' | 'forgot' = 'login'
  export let card = false

  const t = translate
  let email = 'john@example.com'
  let password = '123456789'
  let firstName = 'John'
  let lastName = 'Doe'
  const year = new Date().getFullYear()

  $: heading = kind === 'login' ? 'auth.login.title' : kind === 'register' ? 'auth.register.title' : 'auth.forgot_password.title'
  $: subtitle = kind === 'login' ? 'auth.login.subtitle' : kind === 'register' ? 'auth.register.subtitle' : 'auth.forgot_password.subtitle'
    $: emoji = kind === 'login' ? String.fromCodePoint(0x1f44b) : kind === 'register' ? String.fromCodePoint(0x1f680) : String.fromCodePoint(0x1f512)

  function submit(): void {
    if (kind === 'forgot') goto('/auth/login')
    else goto('/dashboard')
  }
</script>
{#if card}
  <div class="min-h-screen flex items-center justify-center p-4 bg-surface-100 dark:bg-surface-950 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full opacity-20 blur-[120px]"
        style="background: radial-gradient(circle, rgb(var(--theme-primary)) 0%, transparent 70%)"
      ></div>
      <div
        class="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full opacity-20 blur-[120px]"
        style="background: radial-gradient(circle, rgb(var(--theme-accent)) 0%, transparent 70%)"
      ></div>
    </div>

    <div class="relative w-full max-w-[480px]">
      <div class="text-center mb-8">
        <a href="/" class="inline-flex items-center justify-center">
          <Logo width={160} height={32} />
        </a>
      </div>

      <div class="bg-white dark:bg-surface-900 rounded-[2rem] p-8 md:p-10 shadow-xl border border-surface-200 dark:border-surface-800">
        {@render AuthForm()}
      </div>

      <div class="text-center mt-8 space-y-2">
        <p class="text-sm text-secondary-500 dark:text-secondary-400">
          {t('footer.copyright_all_rights', { year })}
        </p>
        <div class="flex justify-center gap-4 text-sm">
          <a href="/pages/faq" class="text-secondary-500 hover:text-theme-primary transition-colors">{t('pages.privacy_policy')}</a>
          <span class="text-surface-300">&#8226;</span>
          <a href="/pages/faq" class="text-secondary-500 hover:text-theme-primary transition-colors">{t('pages.terms_of_service')}</a>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen flex bg-surface-50 dark:bg-surface-950">
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-secondary-900 p-12 flex-col justify-between">
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div class="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-theme-primary/10 blur-[100px]"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-theme-accent/10 blur-[100px]"></div>
      </div>

      <div class="relative z-10">
        <a href="/" class="inline-block">
          <img src="/assets/logo/logo-dark.svg" alt={t('brand.name')} width="160" height="32" />
        </a>
      </div>

      <div class="relative z-10 space-y-8">
        <h2 class="text-display-section text-white">
          {t('auth.side.title_prefix')} <br />
          <span class="text-gradient">{t('auth.side.title_emphasis')}</span>
        </h2>
        <p class="text-lead text-secondary-200/80 max-w-md leading-relaxed">
          {t('auth.side.subtitle')}
        </p>

        <div class="flex gap-4 pt-4">
          <div class="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <div class="w-2 h-2 rounded-full bg-theme-primary"></div>
            <span class="text-sm text-white font-medium">{t('nav.analytics')}</span>
          </div>
          <div class="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <div class="w-2 h-2 rounded-full bg-theme-accent"></div>
            <span class="text-sm text-white font-medium">{t('nav.crm')}</span>
          </div>
          <div class="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span class="text-sm text-white font-medium">{t('nav.ecommerce_title')}</span>
          </div>
        </div>
      </div>

      <div class="relative z-10 flex justify-between items-end">
        <p class="text-secondary-200/60 text-sm">
          {t('footer.copyright_all_rights', { year })}
        </p>
        <div class="flex gap-4">
          <div class="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
            </svg>
          </div>
          <div class="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center p-8 lg:p-12 bg-surface-50 dark:bg-surface-950">
      <div class="w-full max-w-[440px]">
        {@render AuthForm()}
      </div>
    </div>
  </div>
{/if}

{#snippet AuthForm()}
  <div class="animate-fade-in">
    <div class="mb-8">
      <h1 class="heading-2 text-secondary-900 dark:text-white mb-2">{t(heading)} {emoji}</h1>
      <p class="text-body-sm text-secondary-500 dark:text-secondary-400">{t(subtitle)}</p>
    </div>

    <form class="space-y-5" on:submit|preventDefault={submit}>
      {#if kind === 'register'}
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">{t('common.first_name')}</label>
            <input id="firstName" type="text" placeholder="John" class="input-theme w-full" bind:value={firstName} required />
          </div>
          <div>
            <label for="lastName" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">{t('common.last_name')}</label>
            <input id="lastName" type="text" placeholder="Doe" class="input-theme w-full" bind:value={lastName} required />
          </div>
        </div>
      {/if}

      <div>
        <label for="email" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">{t('auth.email_address')}</label>
        <input id="email" type="email" placeholder="name@example.com" class="input-theme w-full" bind:value={email} required />
      </div>

      {#if kind !== 'forgot'}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label for="password" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200">{t('common.password')}</label>
            {#if kind === 'login'}
              <a href="/auth/forgot-password" class="text-sm font-medium text-theme-primary hover:text-theme-primary/80 transition-colors">{t('auth.login.forgot_password')}</a>
            {/if}
          </div>
          <input id="password" type="password" placeholder="........" class="input-theme w-full" bind:value={password} required />
          {#if kind === 'register'}
            <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">{t('auth.register.password_hint_min8')}</p>
          {/if}
        </div>
      {/if}

      {#if kind === 'login'}
        <div class="flex items-center">
          <input id="remember" type="checkbox" class="checkbox-theme" />
          <label for="remember" class="ml-2 text-sm text-secondary-500 dark:text-secondary-400">{t('auth.login.remember_me_30')}</label>
        </div>
      {/if}

      {#if kind === 'register'}
        <div class="flex items-start">
          <input id="terms" type="checkbox" class="checkbox-theme mt-1" />
          <label for="terms" class="ml-2 text-sm text-secondary-500 dark:text-secondary-400 leading-relaxed">
            {t('auth.register.agree_prefix')}{' '}
            <a href="/terms" class="text-theme-primary font-medium hover:text-theme-primary/80 hover:underline transition-colors">{t('auth.register.terms_of_service')}</a>{' '}
            {t('auth.register.and')}{' '}
            <a href="/privacy" class="text-theme-primary font-medium hover:text-theme-primary/80 hover:underline transition-colors">{t('auth.register.privacy_policy')}</a>
          </label>
        </div>
      {/if}

      <button type="submit" class="w-full py-3.5 px-4 btn-theme-primary font-bold rounded-xl shadow-lg shadow-theme-primary/25 hover:shadow-theme-primary/40 transform hover:-translate-y-0.5 transition-all">
        {kind === 'login' ? t('auth.login.sign_in') : kind === 'register' ? t('auth.register.create_account') : t('auth.forgot_password.submit')}
      </button>
    </form>

    {#if kind !== 'forgot'}
      <div class="my-8 flex items-center gap-4">
        <div class="h-px flex-1 bg-surface-200 dark:bg-surface-700"></div>
        <span class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">{kind === 'login' ? t('auth.login.or_continue_with') : t('auth.register.or_sign_up_with')}</span>
        <div class="h-px flex-1 bg-surface-200 dark:bg-surface-700"></div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button type="button" class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          <span class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">Google</span>
        </button>
        <button type="button" class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group">
          <svg class="w-5 h-5 text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"></path>
          </svg>
          <span class="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-theme-primary transition-colors">GitHub</span>
        </button>
      </div>
    {/if}

    <div class={kind === 'forgot' ? 'mt-8 text-center' : 'mt-8 text-center text-sm text-secondary-500 dark:text-secondary-400'}>
      {#if kind === 'login'}
        {t('auth.login.no_account')}{' '}
        <a href="/auth/register" class="text-theme-primary font-bold hover:text-theme-primary/80 hover:underline transition-colors">{t('auth.login.create_account')}</a>
      {:else if kind === 'register'}
        {t('auth.register.already_have_account')}{' '}
        <a href="/auth/login" class="text-theme-primary font-bold hover:text-theme-primary/80 hover:underline transition-colors">{t('auth.register.sign_in')}</a>
      {:else}
        <a href="/auth/login" class="inline-flex items-center gap-2 text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors">
          <Icon icon={Icons.chevronLeft} width={16} height={16} />
          {t('auth.forgot_password.back_to_login')}
        </a>
      {/if}
    </div>
  </div>
{/snippet}




