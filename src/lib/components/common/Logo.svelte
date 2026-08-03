<script lang="ts">
  import { theme } from '../../stores/theme'

  export let className = ''
  export let width = 125
  export let height = 24
  export let showText = true

  $: logoSrc = $theme.mode === 'dark' ? '/assets/logo/logo-dark.svg' : '/assets/logo/logo.svg'
</script>

{#if showText}
  <img src={logoSrc} alt="Adminex" class={className} style={`width:${width}px;height:${height}px`} />
{:else}
  <img src="/assets/logo/logomark.svg" alt="Adminex" class={className} style={`width:${height}px;height:${height}px`} />
{/if}
