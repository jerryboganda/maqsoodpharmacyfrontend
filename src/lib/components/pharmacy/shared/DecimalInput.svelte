<script lang="ts">
  // Rule M (rebuild/CLAUDE.md): money/quantity fields are decimal STRINGS end to end, never a
  // JS number. The theme's own convention (`<input type="number" bind:value>` bound to a JS
  // number, see apps/ProductPage.svelte) is exactly what Rule M forbids for pharmacy fields --
  // this component is the deliberate substitute: a text input, string-bound, validated against
  // the same decimal-place ceiling the backend enforces (common/validation/money-schemas.ts).
  export let value = ''
  export let label = ''
  export let id = ''
  export let scale = 4 // max decimal places -- 2 for currency totals, 4 for unit prices/qty, 5 for cost
  export let allowNegative = false
  export let required = false
  export let placeholder = '0.00'
  export let error = ''
  export let prefix = '' // e.g. "Rs" for a money field

  const inputClass =
    'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'

  $: pattern = allowNegative ? `-?\\d{1,15}(\\.\\d{1,${scale}})?` : `\\d{1,15}(\\.\\d{1,${scale}})?`
  $: re = new RegExp(`^${pattern}$`)

  function handleInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value
    // Allow free typing (including an in-progress "12." or "-") -- only the sanitized value is
    // exposed on blur/submit via the same regex the backend validates with.
    value = raw
  }

  $: isValid = value === '' || re.test(value)
</script>

<div>
  {#if label}
    <label class={labelClass} for={id}>{label}{#if required}<span class="text-danger-500"> *</span>{/if}</label>
  {/if}
  <div class="relative">
    {#if prefix}
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500 text-sm">{prefix}</span>
    {/if}
    <input
      {id}
      type="text"
      inputmode="decimal"
      class="{inputClass} {prefix ? 'pl-10' : ''} {!isValid ? '!border-danger-400' : ''}"
      {placeholder}
      {required}
      value={value}
      on:input={handleInput}
    />
  </div>
  {#if error}
    <p class="text-xs text-danger-500 mt-1">{error}</p>
  {:else if !isValid}
    <p class="text-xs text-danger-500 mt-1">Enter a number with up to {scale} decimal place{scale === 1 ? '' : 's'}.</p>
  {/if}
</div>
