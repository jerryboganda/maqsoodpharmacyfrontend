<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import Logo from '../common/Logo.svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { session, login, changePassword, restoreSession } from '../../stores/session'
  import { ApiError, ApiNetworkError } from '../../api'
  import { toast } from '../../stores/toast'

  // Revalidates a token already sitting in sessionStorage (e.g. this tab still has one from
  // before a reload) against the backend, so "Already signed in" below reflects a real, live
  // session rather than stale client state. Note: GET /identity/me does not report
  // `mustChangePassword` (only the login response does), so a restored session can't re-enter the
  // change-password gate -- that only fires immediately after a fresh POST /auth/login.
  onMount(() => {
    void restoreSession()
  })

  // 'login' -- username/password form. 'changePassword' -- entered only when the login response's
  // `mustChangePassword` flag is true; this is still an authenticated session (login already
  // returned a real token), it's just gated behind POST /auth/password/change before the
  // dashboard is reachable.
  let view: 'login' | 'changePassword' = 'login'

  let username = ''
  let password = ''
  let submitting = false
  let errorMessage = ''
  /** Distinguishes a lockout (wait it out) from a plain wrong-password/unreachable-API message,
   *  which get a different visual treatment below. */
  let errorKind: '' | 'locked' | 'other' = ''

  let currentPassword = ''
  let newPassword = ''
  let confirmPassword = ''
  let changingPassword = false
  let changeError = ''
  let changeFieldError = ''

  async function submitLogin(): Promise<void> {
    submitting = true
    errorMessage = ''
    errorKind = ''
    try {
      const { mustChangePassword } = await login(username, password)
      if (mustChangePassword) {
        // The user just typed this password successfully -- pre-fill it as the "current
        // password" for the change form below rather than making them retype it immediately.
        currentPassword = password
        password = ''
        view = 'changePassword'
      } else {
        await goto('/pharmacy')
      }
    } catch (err) {
      if (err instanceof ApiNetworkError) {
        errorMessage = err.message
        errorKind = 'other'
      } else if (err instanceof ApiError && err.code === 'AUTH.ACCOUNT_LOCKED') {
        errorMessage = err.detail
        errorKind = 'locked'
      } else if (err instanceof ApiError) {
        // AUTH.INVALID_CREDENTIALS (wrong username or password) and any other backend rejection
        // share the same plain red-text treatment -- the backend's own detail text already
        // avoids saying which of username/password was wrong.
        errorMessage = err.detail || err.message
        errorKind = 'other'
      } else {
        errorMessage = 'Could not sign in. Please try again.'
        errorKind = 'other'
      }
    } finally {
      submitting = false
    }
  }

  async function submitChangePassword(): Promise<void> {
    changeError = ''
    changeFieldError = ''
    if (newPassword.length < 12) {
      changeFieldError = 'New password must be at least 12 characters.'
      return
    }
    if (newPassword === currentPassword) {
      changeFieldError = 'New password must be different from the current password.'
      return
    }
    if (newPassword !== confirmPassword) {
      changeFieldError = 'New password and confirmation do not match.'
      return
    }
    changingPassword = true
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password changed.')
      await goto('/pharmacy')
    } catch (err) {
      if (err instanceof ApiNetworkError) {
        changeError = err.message
      } else if (err instanceof ApiError) {
        changeError = err.fieldErrors?.[0]?.message || err.detail || err.message
      } else {
        changeError = 'Could not change the password. Please try again.'
      }
    } finally {
      changingPassword = false
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
      {#if view === 'login'}
        <div class="mb-6">
          <h1 class="heading-2 text-secondary-900 dark:text-white mb-2">Sign in</h1>
          <p class="text-body-sm text-secondary-500 dark:text-secondary-400">Access the pharmacy dashboard.</p>
        </div>

        {#if errorKind === 'locked'}
          <div class="mb-6 flex items-start gap-2 rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950 p-3">
            <Icon icon={Icons.lock} className="w-4 h-4 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
            <p class="text-xs text-warning-700 dark:text-warning-300">{errorMessage}</p>
          </div>
        {/if}

        <form class="space-y-5" on:submit|preventDefault={submitLogin}>
          <div>
            <label for="username" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">Username</label>
            <input
              id="username"
              type="text"
              class="input-theme w-full"
              bind:value={username}
              autocomplete="username"
              required
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">Password</label>
            <input
              id="password"
              type="password"
              placeholder="········"
              class="input-theme w-full"
              bind:value={password}
              autocomplete="current-password"
              required
            />
          </div>

          {#if errorMessage && errorKind === 'other'}
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

        {#if $session.status === 'authenticated' && $session.user && !$session.mustChangePassword}
          <p class="text-center text-sm text-success-600 dark:text-success-400 mt-6">
            Already signed in as {$session.user.displayName}. <a href="/pharmacy" class="font-semibold underline">Go to dashboard</a>
          </p>
        {/if}
      {:else}
        <div class="mb-6">
          <h1 class="heading-2 text-secondary-900 dark:text-white mb-2">Change your password</h1>
          <p class="text-body-sm text-secondary-500 dark:text-secondary-400">
            This account must set a new password before continuing.
          </p>
        </div>

        <form class="space-y-5" on:submit|preventDefault={submitChangePassword}>
          <div>
            <label for="currentPassword" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              class="input-theme w-full"
              bind:value={currentPassword}
              autocomplete="current-password"
              required
            />
          </div>
          <div>
            <label for="newPassword" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              class="input-theme w-full"
              bind:value={newPassword}
              autocomplete="new-password"
              minlength="12"
              required
            />
            <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1.5">At least 12 characters.</p>
          </div>
          <div>
            <label for="confirmPassword" class="block text-sm font-semibold text-secondary-900 dark:text-secondary-200 mb-2">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              class="input-theme w-full"
              bind:value={confirmPassword}
              autocomplete="new-password"
              required
            />
          </div>

          {#if changeFieldError || changeError}
            <p class="text-sm text-danger-600 dark:text-danger-400">{changeFieldError || changeError}</p>
          {/if}

          <button
            type="submit"
            class="w-full py-3.5 px-4 btn-theme-primary font-bold rounded-xl shadow-lg shadow-theme-primary/25 hover:shadow-theme-primary/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
            disabled={changingPassword}
          >
            {changingPassword ? 'Changing password…' : 'Change password & continue'}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>
