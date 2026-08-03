<script lang="ts">
  import IconifyIcon from '@iconify/svelte'

  export let icon: string
  export let className = ''
  export let width: number | string | undefined = undefined
  export let height: number | string | undefined = undefined
  export let style = ''
</script>

<IconifyIcon {icon} class={`iconify iconify--${icon.split(':')[0]} ${className}`.trim()} {width} {height} {style} aria-hidden="true" />
