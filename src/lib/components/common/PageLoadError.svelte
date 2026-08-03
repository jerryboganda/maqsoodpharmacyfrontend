<script lang="ts">
  function reloadPage(): void {
    window.location.reload()
  }
</script>

<main class="flex min-h-[400px] items-center justify-center p-8">
  <section class="card max-w-lg p-8 text-center" role="alert">
    <p class="text-label text-theme-primary">Unable to load page</p>
    <h1 class="heading-2 mt-2 text-secondary-900 dark:text-white">Something went wrong</h1>
    <p class="text-body mt-3 text-secondary-600 dark:text-secondary-400">
      The requested page could not be loaded. Please check your connection and try again.
    </p>
    <button class="btn-theme-primary mt-6 inline-flex" type="button" on:click={reloadPage}>Try again</button>
  </section>
</main>
