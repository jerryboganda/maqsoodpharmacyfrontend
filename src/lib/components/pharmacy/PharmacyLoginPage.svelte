<script lang="ts">
  import { goto } from '$app/navigation'
  import Logo from '../common/Logo.svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { session, login } from '../../stores/session'

  // Honest dev-mode note: the backend (rebuild/apps/api) has no real credential check yet --
  // SessionGuard always resolves the same seeded actor. These fields are kept for UX realism
  // and so the login form is ready the day real auth lands, but submitting signs you in as the
  // seeded `dev.owner` regardless of what's typed here. See stores/session.ts.
  let username = 'dev.owner'
  let password = ''
  let submitting = false
  let errorMessage = ''

  async function submit(): Promise<void> {
    submitting = true
    errorMessage = ''
    try {
      await login()
      await goto('/pharmacy')
    } catch {
      errorMessage = 'Could not reach the pharmacy API. Is it running on the configured PUBLIC_API_BASE_URL?'
    } finally {
      submitting = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4 bg-surface-100 dark:bg-surface-950 relative overflow-hidden">
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      class="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full opacity-20 blur-[120px]"
      style="background: radial-gradient(circle, rgb(var(--theme-primary)) 0%, transparent 70%)"
    ></div>
  </div>

  <div class="relative w-full max-w-[440px]">
    <div class="text-center mb-8">
      <a href="/pharmacy" class="inline-flex items-center justify-center gap-2">
        <Logo width={160} height={32} />
      </a>
      <p class="text-xs text-secondary-500 mt-2 uppercase tracking-wide font-semibold">Pharmacy Platform</p>
    </div>

    <div class="bg-white dark:bg-surface-900 rounded-[2rem] p-8 md:p-10 shadow-xl border border-surface-200 dark:border-surface-800">
      <div class="mb-6">
        <h1 class="heading-2 text-secondary-900 dark:text-white mb-2">Sign in</h1>
        <p class="text-body-sm text-secondary-500 dark:text-secondary-400">Access the pharmacy dashboard.</p>
      </div>

      <div class="mb-6 flex items-start gap-2 rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950 p-3">
        <Icon icon={Icons.infoCircle} className="w-4 h-4 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
        <p class="text-xs text-warning-700 dark:text-warning-300">
          Development mode: the backend does not check a password yet. Signing in resolves the seeded
          <code class="font-mono">dev.owner</code> user from the real database.
        </p>
      </div>

      <form class="space-y-5" on:submit|preventDefault={submit}>
        <div>
          <label for="username" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">Username</label>
          <input id="username" type="text" class="input-theme w-full" bind:value={username} required />
        </div>
        <div>
          <label for="password" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">Password</label>
          <input id="password" type="password" placeholder="········" class="input-theme w-full" bind:value={password} />
        </div>

        {#if errorMessage}
          <p class="text-sm text-danger-600 dark:text-danger-400">{errorMessage}</p>
        {/if}

        <button
          type="submit"
          class="w-full py-3.5 px-4 btn-theme-primary font-bold rounded-xl shadow-lg shadow-theme-primary/25 hover:shadow-theme-primary/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
          disabled={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {#if $session.status === 'authenticated' && $session.user}
        <p class="text-center text-sm text-success-600 dark:text-success-400 mt-6">
          Already signed in as {$session.user.displayName}. <a href="/pharmacy" class="font-semibold underline">Go to dashboard</a>
        </p>
      {/if}
    </div>
  </div>
</div>
