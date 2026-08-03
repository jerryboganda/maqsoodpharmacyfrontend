<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'

  export let open = false
  export let index = 0
  export let images: { src: string; title?: string }[] = []

  let closeButton: HTMLButtonElement
  let previousFocus: HTMLElement | null = null
  const fallbackImages = Array.from({ length: 16 }, (_, itemIndex) => ({ src: `/assets/gallery/gallery_${itemIndex + 1}.webp` }))
  $: activeImages = images.length ? images : fallbackImages

  $: currentImage = activeImages[Math.max(0, Math.min(index, activeImages.length - 1))]?.src ?? fallbackImages[0].src

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  $: if (open) {
    previousFocus ??= document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    setTimeout(() => closeButton?.focus(), 0)
  } else if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    previousFocus?.focus()
    previousFocus = null
  }

  function close(): void { open = false }
  function next(): void { index = (index + 1) % images.length }
  function previous(): void { index = (index - 1 + images.length) % images.length }
</script>

{#if open}
  <div class="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Gallery lightbox">
    <button type="button" class="absolute inset-0 cursor-default" aria-label="Close gallery" on:click={close}></button>
    <div class="relative z-10 flex max-h-full w-full max-w-5xl items-center justify-center">
      <button bind:this={closeButton} type="button" class="absolute right-0 top-0 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Close gallery" on:click={close}><Icon icon={Icons.close} className="h-6 w-6" /></button>
      <button type="button" class="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:left-5" aria-label="Previous image" on:click={previous}><Icon icon={Icons.chevronLeft} className="h-6 w-6" /></button>
      <img src={currentImage} alt={`Gallery image ${index + 1}`} class="max-h-[85vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl" />
      <button type="button" class="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:right-5" aria-label="Next image" on:click={next}><Icon icon={Icons.chevronRight} className="h-6 w-6" /></button>
    </div>
  </div>
{/if}






