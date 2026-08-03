<script lang="ts">
  import { page } from '$app/state'
</script>

<svelte:head>
  <title>{page.status ?? 404} - Adminex</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-surface-100 p-8 dark:bg-surface-950">
  <section class="card max-w-lg p-8 text-center">
    <p class="text-label text-theme-primary">{page.status ?? 404}</p>
    <h1 class="heading-2 mt-2 text-secondary-900 dark:text-white">Page not found</h1>
    <p class="text-body mt-3 text-secondary-600 dark:text-secondary-400">
      {page.error?.message ?? 'The requested page could not be found.'}
    </p>
    <a class="btn-theme-primary mt-6 inline-flex" href="/">Return home</a>
  </section>
</main>
