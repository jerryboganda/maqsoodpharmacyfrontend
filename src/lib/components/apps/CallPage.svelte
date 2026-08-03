<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { chatUsers, currentUser, type ChatUser } from '../../../data/chat'
  import { translate, locale } from '../../stores/locale'

  export let mode: 'voice' | 'video' = 'voice'

  const waveBarHeights = [24, 16, 32, 20, 28]
  let callee: ChatUser = chatUsers[0]
  let isMuted = false
  let isSpeakerOn = true
  let isVideoOn = true
  let isScreenSharing = false
  let callDuration = 0
  let callStatus: 'connecting' | 'ringing' | 'connected' = 'connecting'
  let isFullscreen = false
  let showControls = true
  let showSettings = false
  let container: HTMLDivElement
  let localeVersion = $locale

  $: localeVersion = $locale
  $: t = (key: string) => translate(key)

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function endCall(): void {
    void goto('/app/chat')
  }

  async function toggleFullscreen(): Promise<void> {
    if (!container) return
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Fullscreen can be unavailable in a browser automation context.
    }
  }

  onMount(() => {
    const userId = new URLSearchParams(window.location.search).get('user') || 'user-1'
    callee = chatUsers.find((user) => user.id === userId) ?? chatUsers[0]

    const connectTimer = window.setTimeout(() => (callStatus = 'ringing'), 1500)
    const fullscreenListener = () => (isFullscreen = Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', fullscreenListener)

    let durationTimer: number | undefined
    const ringTimer = window.setTimeout(() => {
      callStatus = 'connected'
      durationTimer = window.setInterval(() => (callDuration += 1), 1000)
    }, 4000)

    return () => {
      window.clearTimeout(connectTimer)
      window.clearTimeout(ringTimer)
      if (durationTimer !== undefined) window.clearInterval(durationTimer)
      document.removeEventListener('fullscreenchange', fullscreenListener)
    }
  })
</script>

{#if mode === 'voice'}
  <div class="h-[calc(100vh-7rem)] flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 animate-fade-in rounded-2xl overflow-hidden">
    <div class="text-center">
      <div class="relative mx-auto mb-6">
        {#if callStatus === 'ringing'}
          <div class="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-theme-primary/20 animate-ping" style="animation-duration: 2s"></div>
          <div class="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-theme-primary/10 animate-ping" style="animation-duration: 2s; animation-delay: 0.5s"></div>
        {/if}
        {#if callStatus === 'connected'}
          <div class="absolute -inset-2 rounded-full bg-success-500/20 animate-pulse"></div>
        {/if}
        <img src={callee.avatar} alt={callee.name} class="relative w-32 h-32 rounded-full object-cover ring-4 ring-white/20 mx-auto" />
      </div>

      <h2 class="heading-3 text-white mb-1">{callee.name}</h2>
      <p class="text-sm text-secondary-400 mb-2">{callee.role}</p>
      <div class="mb-8">
        {#if callStatus === 'connecting'}
          <p class="text-secondary-400 text-sm">{t('apps.chat.connecting_status')}</p>
        {:else if callStatus === 'ringing'}
          <p class="text-secondary-400 text-sm">{t('apps.chat.ringing_status')}</p>
        {:else}
          <p class="text-success-400 text-sm font-medium">{formatDuration(callDuration)}</p>
        {/if}
      </div>

      {#if callStatus === 'connected' && !isMuted}
        <div class="flex items-center justify-center gap-1 mb-8 h-8">
          {#each waveBarHeights as height, index}
            <div class="w-1 bg-theme-primary rounded-full animate-pulse" style={`height: ${height}px; animation-delay: ${index * 0.1}s; animation-duration: 0.5s`}></div>
          {/each}
        </div>
      {/if}

      <div class="flex items-center justify-center gap-4">
        <button type="button" class={`p-4 rounded-full transition-all ${isMuted ? 'bg-danger-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isMuted ? t('apps.chat.unmute') : t('apps.chat.mute_audio')} aria-label={isMuted ? t('apps.chat.unmute') : t('apps.chat.mute_audio')} on:click={() => (isMuted = !isMuted)}>
          <Icon icon={Icons.microphone} className="w-6 h-6" width={24} height={24} />
        </button>
        <button type="button" class={`p-4 rounded-full transition-all ${!isSpeakerOn ? 'bg-danger-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} aria-label="Toggle speaker" on:click={() => (isSpeakerOn = !isSpeakerOn)}>
          <Icon icon={Icons.volume} className="w-6 h-6" width={24} height={24} />
        </button>
        <button type="button" class="p-4 bg-danger-500 text-white rounded-full hover:bg-danger-600 transition-colors" title={t('apps.chat.end_call')} aria-label={t('apps.chat.end_call')} on:click={endCall}>
          <Icon icon={Icons.phoneOff} className="w-6 h-6" width={24} height={24} />
        </button>
        <button type="button" class="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors" title={t('apps.chat.add_person_button')} aria-label={t('apps.chat.add_person_button')}>
          <Icon icon={Icons.userPlus} className="w-6 h-6" width={24} height={24} />
        </button>
        <button type="button" class="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors" title={t('apps.chat.open_chat')} aria-label={t('apps.chat.open_chat')} on:click={endCall}>
          <Icon icon={Icons.message} className="w-6 h-6" width={24} height={24} />
        </button>
      </div>

      <div class="mt-12 flex items-center justify-center gap-3">
        <img src={currentUser.avatar} alt={currentUser.name} class="w-10 h-10 rounded-full object-cover ring-2 ring-white/20" />
        <div class="text-start">
          <p class="text-sm text-white font-medium">{currentUser.name}</p>
          <p class="text-xs text-secondary-400">{isMuted ? t('apps.chat.muted') : t('apps.chat.speaking')}</p>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div bind:this={container} role="application" aria-label="Video call" class={`relative bg-surface-900 animate-fade-in overflow-hidden ${isFullscreen ? 'h-screen rounded-none' : 'h-[calc(100vh-7rem)] rounded-2xl'}`} on:mousemove={() => (showControls = true)}>
    <div class="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900">
      {#if callStatus === 'connected'}
        <div class="w-full h-full flex items-center justify-center">
          <img src={callee.avatar} alt={callee.name} class="w-48 h-48 rounded-full object-cover ring-4 ring-white/10" />
        </div>
      {:else}
        <div class="w-full h-full flex flex-col items-center justify-center">
          <div class="relative mb-6">
            {#if callStatus === 'ringing'}
              <div class="absolute inset-0 w-32 h-32 rounded-full bg-theme-primary/20 animate-ping" style="animation-duration: 2s"></div>
              <div class="absolute inset-0 w-32 h-32 rounded-full bg-theme-primary/10 animate-ping" style="animation-duration: 2s; animation-delay: 0.5s"></div>
            {/if}
            <img src={callee.avatar} alt={callee.name} class="relative w-32 h-32 rounded-full object-cover ring-4 ring-white/20" />
          </div>
          <h2 class="text-xl font-semibold text-white mb-1">{callee.name}</h2>
          <p class="text-sm text-secondary-400">{callStatus === 'connecting' ? t('apps.chat.connecting_status') : t('apps.chat.ringing_status')}</p>
        </div>
      {/if}
    </div>

    <div class="absolute bottom-24 right-4 w-40 h-28 bg-surface-800 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-xl">
      {#if isVideoOn}
        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-theme-primary/20 to-theme-primary/5">
          <img src={currentUser.avatar} alt="You" class="w-16 h-16 rounded-full object-cover" />
        </div>
      {:else}
        <div class="w-full h-full flex items-center justify-center bg-surface-800">
          <div class="text-center">
            <Icon icon={Icons.video} className="w-8 h-8 text-secondary-500 mx-auto mb-1" width={32} height={32} />
            <p class="text-xs text-secondary-500">{t('apps.chat.camera_off')}</p>
          </div>
        </div>
      {/if}
      {#if isMuted}
        <div class="absolute bottom-2 right-2 p-1 bg-danger-500 rounded-full">
          <Icon icon={Icons.microphone} className="w-3 h-3 text-white" width={12} height={12} />
        </div>
      {/if}
    </div>

    <div class={`absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
      <div class="flex items-center gap-3">
        <img src={callee.avatar} alt={callee.name} class="w-10 h-10 rounded-full object-cover ring-2 ring-white/20" />
        <div>
          <h3 class="text-sm font-medium text-white">{callee.name}</h3>
          {#if callStatus === 'connected'}
            <p class="text-xs text-success-400">{formatDuration(callDuration)}</p>
          {:else}
            <p class="text-xs text-secondary-400">{callStatus === 'connecting' ? t('apps.chat.connecting_status') : t('apps.chat.ringing_status')}</p>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <button type="button" on:click|stopPropagation={() => (showSettings = !showSettings)} class="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors" aria-label={t('apps.chat.call_settings')}>
            <Icon icon={Icons.settings} className="w-5 h-5" width={20} height={20} />
          </button>
          {#if showSettings}
            <div class="absolute right-0 top-full mt-2 w-64 bg-surface-800 rounded-xl shadow-lg border border-surface-700 py-2 z-50" role="dialog" tabindex="-1" aria-label={t('apps.chat.call_settings')} on:click|stopPropagation on:keydown|stopPropagation={() => {}}>
              <div class="px-4 py-2 border-b border-surface-700"><h4 class="text-sm font-medium text-white">{t('apps.chat.call_settings')}</h4></div>
              <div class="p-2 space-y-1">
                <button type="button" class="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary-300 hover:bg-surface-700 rounded-lg transition-colors text-start"><Icon icon={Icons.camera} className="w-4 h-4" width={16} height={16} /><span>{t('apps.chat.camera_default')}</span></button>
                <button type="button" class="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary-300 hover:bg-surface-700 rounded-lg transition-colors text-start"><Icon icon={Icons.microphone} className="w-4 h-4" width={16} height={16} /><span>{t('apps.chat.microphone_default')}</span></button>
                <button type="button" class="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary-300 hover:bg-surface-700 rounded-lg transition-colors text-start"><Icon icon={Icons.volume} className="w-4 h-4" width={16} height={16} /><span>{t('apps.chat.speaker_default')}</span></button>
                <button type="button" class="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary-300 hover:bg-surface-700 rounded-lg transition-colors text-start"><Icon icon={Icons.volume} className="w-4 h-4" width={16} height={16} /><span>{t('apps.chat.test_audio')}</span></button>
              </div>
            </div>
          {/if}
        </div>
        <button type="button" on:click={toggleFullscreen} class="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors" title={isFullscreen ? t('apps.chat.exit_fullscreen') : t('apps.chat.enter_fullscreen')} aria-label={isFullscreen ? t('apps.chat.exit_fullscreen') : t('apps.chat.enter_fullscreen')}>
          <Icon icon={isFullscreen ? Icons.minimize : Icons.maximize} className="w-5 h-5" width={20} height={20} />
        </button>
      </div>
    </div>

    <div class={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
      <div class="flex items-center justify-center gap-3">
        <button type="button" on:click={() => (isMuted = !isMuted)} class={`p-4 rounded-full transition-all ${isMuted ? 'bg-danger-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isMuted ? t('apps.chat.unmute') : t('apps.chat.mute_audio')} aria-label={isMuted ? t('apps.chat.unmute') : t('apps.chat.mute_audio')}><Icon icon={Icons.microphone} className="w-5 h-5" width={20} height={20} /></button>
        <button type="button" on:click={() => (isVideoOn = !isVideoOn)} class={`p-4 rounded-full transition-all ${!isVideoOn ? 'bg-danger-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isVideoOn ? t('apps.chat.turn_off_camera') : t('apps.chat.turn_on_camera')} aria-label={isVideoOn ? t('apps.chat.turn_off_camera') : t('apps.chat.turn_on_camera')}><Icon icon={Icons.video} className="w-5 h-5" width={20} height={20} /></button>
        <button type="button" on:click={() => (isScreenSharing = !isScreenSharing)} class={`p-4 rounded-full transition-all ${isScreenSharing ? 'bg-theme-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isScreenSharing ? t('apps.chat.stop_sharing') : t('apps.chat.share_screen')} aria-label={isScreenSharing ? t('apps.chat.stop_sharing') : t('apps.chat.share_screen')}><Icon icon={Icons.screenShare} className="w-5 h-5" width={20} height={20} /></button>
        <button type="button" on:click={endCall} class="p-4 bg-danger-500 text-white rounded-full hover:bg-danger-600 transition-colors" title={t('apps.chat.end_call')} aria-label={t('apps.chat.end_call')}><Icon icon={Icons.phoneOff} className="w-5 h-5" width={20} height={20} /></button>
        <button type="button" class="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors" title={t('apps.chat.add_person_button')} aria-label={t('apps.chat.add_person_button')}><Icon icon={Icons.userPlus} className="w-5 h-5" width={20} height={20} /></button>
        <button type="button" on:click={endCall} class="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors" title={t('apps.chat.open_chat')} aria-label={t('apps.chat.open_chat')}><Icon icon={Icons.message} className="w-5 h-5" width={20} height={20} /></button>
        <button type="button" class="p-4 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors" title={t('apps.chat.more_options')} aria-label={t('apps.chat.more_options')}><Icon icon={Icons.dotsVertical} className="w-5 h-5" width={20} height={20} /></button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Keep the call surface visually independent from the dashboard canvas. */
</style>









