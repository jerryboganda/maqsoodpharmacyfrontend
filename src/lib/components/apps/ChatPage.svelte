<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { goto } from '$app/navigation'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'
  import { chatConversations, chatMessages, chatUsers, currentUser, statusColors, type ChatConversation, type ChatMessage, type ChatUser } from '../../../data/chat'

  const t = translate
  let conversations: ChatConversation[] = chatConversations.map((conversation) => ({ ...conversation, participants: [...conversation.participants] }))
  let messageSets: Record<string, ChatMessage[]> = Object.fromEntries(Object.entries(chatMessages).map(([key, value]) => [key, value.map((message) => ({ ...message }))]))
  let selectedConversation: ChatConversation | null = conversations[0] ?? null
  let selectedMessages: ChatMessage[] = messageSets[selectedConversation?.id ?? 'conv-1'] ?? []
  let newMessage = ''
  let searchQuery = ''
  let showMobileChat = false
  let showUserInfo = false
  let showNewChatMenu = false
  let showChatMenu = false
  let selectedInfo: { name: string; avatar?: string; status: ChatUser['status'] | null; subtitle: string } | null = null
  let messagesElement: HTMLDivElement

  $: filteredConversations = conversations.filter((conversation) => {
    const name = conversation.isGroup ? conversation.groupName ?? '' : conversation.participants[0]?.name ?? ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })
  $: selectedMessages = selectedConversation ? messageSets[selectedConversation.id] ?? [] : []
  $: selectedInfo = selectedConversation ? getConversationInfo(selectedConversation) : null

  onMount(() => {
    const closeMenus = () => {
      showNewChatMenu = false
      showChatMenu = false
    }
    document.addEventListener('click', closeMenus)
    void tick().then(() => { if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight })
    return () => document.removeEventListener('click', closeMenus)
  })

  function getConversationInfo(conversation: ChatConversation): { name: string; avatar?: string; status: ChatUser['status'] | null; subtitle: string } {
    if (conversation.isGroup) {
      return { name: conversation.groupName ?? 'Group Chat', avatar: conversation.groupAvatar, status: null, subtitle: conversation.participants.length + 1 + ' ' + t('apps.chat.members') }
    }
    const user = conversation.participants[0]
    return {
      name: user?.name ?? 'Unknown',
      avatar: user?.avatar,
      status: user?.status ?? null,
      subtitle: user?.status === 'online' ? t('apps.chat.online') : user?.lastSeen ?? t('apps.chat.offline'),
    }
  }

  function getSender(senderId: string): ChatUser {
    return senderId === currentUser.id ? currentUser : chatUsers.find((user) => user.id === senderId) ?? currentUser
  }

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp)
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (days === 1) return t('notes.yesterday')
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function selectConversation(conversation: ChatConversation): void {
    selectedConversation = conversation
    showMobileChat = true
    conversations = conversations.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item)
    void tick().then(() => { if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight })
  }

  function sendMessage(): void {
    if (!newMessage.trim() || !selectedConversation) return
    const message: ChatMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sent',
    }
    messageSets = { ...messageSets, [selectedConversation.id]: [...(messageSets[selectedConversation.id] ?? []), message] }
    conversations = conversations.map((item) => item.id === selectedConversation?.id ? { ...item, lastMessage: message } : item)
    newMessage = ''
    void tick().then(() => { if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight })
  }

  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }
</script>
<div class="h-[calc(100vh-7rem)] flex animate-fade-in card rounded-xl overflow-hidden">
  <div class={'w-full md:w-80 lg:w-96 flex-shrink-0 bg-white dark:bg-surface-900 border-e border-surface-200 dark:border-surface-700 flex flex-col ' + (showMobileChat ? 'hidden md:flex' : 'flex')}>
    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('apps.chat.chats')}</h1>
        <div class="relative">
          <button type="button" aria-label="New chat" on:click|stopPropagation={() => { showNewChatMenu = !showNewChatMenu; showChatMenu = false }} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
            <Icon icon={Icons.plus} width={20} height={20} className="text-secondary-600 dark:text-secondary-400" />
          </button>
          {#if showNewChatMenu}
            <div class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-50">
              <button type="button" class="w-full px-4 py-2 text-sm text-start text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-700" on:click={() => (showNewChatMenu = false)}>{t('apps.chat.new_chat')}</button>
              <button type="button" class="w-full px-4 py-2 text-sm text-start text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-700" on:click={() => (showNewChatMenu = false)}>{t('apps.chat.new_group')}</button>
            </div>
          {/if}
        </div>
      </div>
      <div class="relative">
        <Icon icon={Icons.search} width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
        <input bind:value={searchQuery} type="text" placeholder={t('apps.chat.search_placeholder')} class="w-full pl-10 pr-4 py-2.5 bg-surface-100 dark:bg-surface-800 border-0 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20" aria-label={t('apps.chat.search_placeholder')} />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      {#each filteredConversations as conversation}
        {@const info = getConversationInfo(conversation)}
        {@const isSelected = selectedConversation?.id === conversation.id}
        {@const isOwnMessage = conversation.lastMessage?.senderId === currentUser.id}
        <button type="button" on:click={() => selectConversation(conversation)} class={'w-full flex items-center gap-3 p-4 text-start transition-colors ' + (isSelected ? 'bg-theme-primary-light dark:bg-theme-primary/10' : 'hover:bg-surface-50 dark:hover:bg-surface-800')}>
          <div class="relative flex-shrink-0">
            {#if conversation.isGroup}
              <div class="w-11 h-11 rounded-full bg-theme-primary flex items-center justify-center"><Icon icon={Icons.users} width={20} height={20} className="text-white" /></div>
            {:else}
              <img src={info.avatar} alt={info.name} class="w-11 h-11 rounded-full object-cover" />
            {/if}
            {#if info.status}<span class={'absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-surface-900 ' + statusColors[info.status]}></span>{/if}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <span class={'text-ui font-medium truncate ' + (isSelected ? 'text-theme-primary' : 'text-secondary-900 dark:text-white')}>{info.name}</span>
              <span class="text-ui-sm text-secondary-500 dark:text-secondary-400 flex-shrink-0">{formatTime(conversation.lastMessage?.timestamp ?? '')}</span>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-sm text-secondary-500 dark:text-secondary-400 truncate">{#if isOwnMessage}<span class="text-secondary-400">{t('apps.chat.you')}:</span>{' '}{/if}{conversation.lastMessage?.content}</p>
              {#if conversation.unreadCount > 0}<span class="w-5 h-5 flex items-center justify-center bg-theme-primary text-white text-xs font-medium rounded-full flex-shrink-0">{conversation.unreadCount}</span>{/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  {#if selectedConversation}
    <div class={'flex-1 flex flex-col bg-surface-50 dark:bg-surface-950 ' + (showMobileChat ? 'flex' : 'hidden md:flex')}>
      <div class="h-16 px-4 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <button type="button" aria-label="Back to chats" on:click={() => (showMobileChat = false)} class="md:hidden p-2 -ms-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"><Icon icon={Icons.chevronLeft} width={20} height={20} className="text-secondary-600 dark:text-secondary-400" /></button>
          <div class="relative">
            {#if selectedConversation.isGroup}
              <div class="w-10 h-10 rounded-full bg-theme-primary flex items-center justify-center"><Icon icon={Icons.users} width={20} height={20} className="text-white" /></div>
            {:else}
              <img src={selectedInfo?.avatar} alt={selectedInfo?.name} class="w-10 h-10 rounded-full object-cover" />
            {/if}
            {#if selectedInfo?.status}<span class={'absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-surface-900 ' + statusColors[selectedInfo.status]}></span>{/if}
          </div>
          <div><h2 class="text-ui font-semibold text-secondary-900 dark:text-white">{selectedInfo?.name}</h2><p class="text-ui-sm text-secondary-500 dark:text-secondary-400">{selectedInfo?.subtitle}</p></div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" aria-label="Voice call" on:click={() => void goto('/app/chat/voice-call?user=' + (selectedConversation?.participants[0]?.id ?? 'user-1'))} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"><Icon icon={Icons.phone} width={20} height={20} className="text-secondary-600 dark:text-secondary-400" /></button>
          <button type="button" aria-label="Video call" on:click={() => void goto('/app/chat/video-call?user=' + (selectedConversation?.participants[0]?.id ?? 'user-1'))} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"><Icon icon={Icons.video} width={20} height={20} className="text-secondary-600 dark:text-secondary-400" /></button>
          <button type="button" aria-label="Contact info" on:click={() => (showUserInfo = !showUserInfo)} class={'p-2 rounded-lg transition-colors ' + (showUserInfo ? 'bg-theme-primary-light text-theme-primary' : 'hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-600 dark:text-secondary-400')}><Icon icon={Icons.infoCircle} width={20} height={20} /></button>
          <div class="relative">
            <button type="button" aria-label="Chat actions" on:click|stopPropagation={() => { showChatMenu = !showChatMenu; showNewChatMenu = false }} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"><Icon icon={Icons.dots} width={20} height={20} className="text-secondary-600 dark:text-secondary-400" /></button>
            {#if showChatMenu}
              <div class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-50">
                <button type="button" class="w-full px-4 py-2 text-sm text-start text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-700" on:click={() => (showChatMenu = false)}>{t('apps.chat.view_profile')}</button>
                <button type="button" class="w-full px-4 py-2 text-sm text-start text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-700" on:click={() => (showChatMenu = false)}>{t('apps.chat.search_in_chat')}</button>
                <button type="button" class="w-full px-4 py-2 text-sm text-start text-secondary-700 dark:hover:bg-surface-700" on:click={() => (showChatMenu = false)}>{t('apps.chat.mute_notifications')}</button>
                <hr class="my-1 border-surface-200 dark:border-surface-700" />
                <button type="button" class="w-full px-4 py-2 text-sm text-start text-red-600 hover:bg-surface-100 dark:hover:bg-surface-700" on:click={() => (showChatMenu = false)}>{t('apps.chat.delete_chat')}</button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div bind:this={messagesElement} role="region" aria-label="Conversation messages" class="relative flex-1 overflow-y-auto p-4 space-y-4">
        <button type="button" class="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-theme-primary" on:click={() => { if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight }}>Jump to latest message</button>
        {#each selectedMessages as message, index}
          {@const isOwn = message.senderId === currentUser.id}
          {@const sender = getSender(message.senderId)}
          {@const showAvatar = !isOwn && (index === 0 || selectedMessages[index - 1]?.senderId !== message.senderId)}
          {@const showTime = index === selectedMessages.length - 1 || selectedMessages[index + 1]?.senderId !== message.senderId}
          <div class={'flex items-end gap-2 ' + (isOwn ? 'justify-end' : 'justify-start')}>
            {#if !isOwn}
              <div class="w-8 flex-shrink-0">{#if showAvatar}<img src={sender.avatar} alt={sender.name} class="w-8 h-8 rounded-full object-cover" />{/if}</div>
            {/if}
            <div class={'max-w-[70%] ' + (isOwn ? 'items-end' : 'items-start')}>
              {#if selectedConversation.isGroup && !isOwn && showAvatar}<p class="text-xs text-secondary-500 dark:text-secondary-400 mb-1 ms-3">{sender.name}</p>{/if}
              <div class={'px-4 py-2.5 rounded-2xl ' + (isOwn ? 'bg-theme-primary text-white rounded-br-md' : 'bg-white dark:bg-surface-800 text-secondary-900 dark:text-white rounded-bl-md shadow-sm')}>
                <p class={'text-sm whitespace-pre-wrap ' + (isOwn ? 'text-white' : '')}>{message.content}</p>
                {#if message.attachments && message.attachments.length > 0}
                  <div class="mt-2 space-y-2">
                    {#each message.attachments as attachment}
                      <div class={'flex items-center gap-3 p-2 rounded-lg ' + (isOwn ? 'bg-white/10' : 'bg-surface-100 dark:bg-surface-700')}>
                        <div class={'p-2 rounded-lg ' + (isOwn ? 'bg-white/20' : 'bg-theme-primary-light')}><Icon icon={Icons.file} width={20} height={20} className={isOwn ? 'text-white' : 'text-theme-primary'} /></div>
                        <div class="flex-1 min-w-0"><p class={'text-sm font-medium truncate ' + (isOwn ? 'text-white' : 'text-secondary-900 dark:text-white')}>{attachment.name}</p><p class={'text-xs ' + (isOwn ? 'text-white/70' : 'text-secondary-500 dark:text-secondary-400')}>{attachment.size}</p></div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
              {#if showTime}
                <div class={'flex items-center gap-1 mt-1 ' + (isOwn ? 'justify-end' : 'justify-start') + ' px-1'}>
                  <span class="text-xs text-secondary-400">{formatTime(message.timestamp)}</span>
                  {#if isOwn}<Icon icon={message.status === 'sent' ? Icons.check : Icons.checks} width={16} height={16} className={message.status === 'read' ? 'text-theme-primary' : 'text-secondary-400'} />{/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
        <div></div>
      </div>

      <div class="p-4 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700">
        <div class="flex items-end gap-3">
          <div class="flex gap-1">
            <button type="button" aria-label="Attach file" class="p-2.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"><Icon icon={Icons.paperclip} width={20} height={20} className="text-secondary-500 dark:text-secondary-400" /></button>
            <button type="button" aria-label="Attach image" class="p-2.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"><Icon icon={Icons.photo} width={20} height={20} className="text-secondary-500 dark:text-secondary-400" /></button>
          </div>
          <div class="flex-1 relative">
            <textarea bind:value={newMessage} on:keydown={handleKeyPress} placeholder={t('apps.chat.type_message')} rows="1" class="w-full px-4 py-3 bg-surface-100 dark:bg-surface-800 border-0 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 resize-none" style="min-height:48px;max-height:120px"></textarea>
            <button type="button" aria-label="Add emoji" class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors"><Icon icon={Icons.moodSmile} width={20} height={20} className="text-secondary-400" /></button>
          </div>
          <button type="button" aria-label="Send message" on:click={sendMessage} disabled={!newMessage.trim()} class="p-3 bg-theme-primary text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"><Icon icon={Icons.send} width={20} height={20} /></button>
        </div>
      </div>
    </div>
  {/if}

  {#if showUserInfo && selectedConversation && selectedInfo}
    <div class="w-72 bg-white dark:bg-surface-900 border-s border-surface-200 dark:border-surface-700 flex-shrink-0 hidden lg:block">
      <div class="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between"><h3 class="text-ui font-semibold text-secondary-900 dark:text-white">{selectedConversation.isGroup ? t('apps.chat.group_info') : t('apps.chat.contact_info')}</h3><button type="button" aria-label="Close contact info" on:click={() => (showUserInfo = false)} class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"><Icon icon={Icons.x} width={20} height={20} className="text-secondary-500" /></button></div>
      <div class="p-4 text-center border-b border-surface-200 dark:border-surface-700"><img src={selectedInfo.avatar} alt={selectedInfo.name} class="w-16 h-16 mx-auto mb-3 rounded-full object-cover" /><h4 class="text-ui font-semibold text-secondary-900 dark:text-white">{selectedInfo.name}</h4><p class="text-ui-sm text-secondary-500 dark:text-secondary-400">{selectedInfo.subtitle}</p></div>
      {#if selectedConversation.isGroup}
        <div class="p-4"><h5 class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">{t('apps.chat.members')} ({selectedConversation.participants.length + 1})</h5><div class="space-y-3"><div class="flex items-center gap-3"><img src={currentUser.avatar} alt={currentUser.name} class="w-10 h-10 rounded-full object-cover" /><div class="flex-1"><p class="text-sm font-medium text-secondary-900 dark:text-white">{currentUser.name} ({t('apps.chat.you')})</p><p class="text-xs text-secondary-500 dark:text-secondary-400">{currentUser.role}</p></div></div>{#each selectedConversation.participants as user}<div class="flex items-center gap-3"><div class="relative"><img src={user.avatar} alt={user.name} class="w-10 h-10 rounded-full object-cover" /><span class={'absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-surface-900 ' + statusColors[user.status]}></span></div><div class="flex-1"><p class="text-sm font-medium text-secondary-900 dark:text-white">{user.name}</p><p class="text-xs text-secondary-500 dark:text-secondary-400">{user.role}</p></div></div>{/each}</div></div>
      {:else}
        <div class="p-4 space-y-4"><div><p class="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">{t('apps.chat.role')}</p><p class="text-sm text-secondary-900 dark:text-white">{selectedConversation.participants[0]?.role}</p></div><div><p class="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">{t('apps.chat.status')}</p><div class="flex items-center gap-2"><span class={'w-2 h-2 rounded-full ' + statusColors[selectedConversation.participants[0]?.status ?? 'offline']}></span><span class="text-sm text-secondary-900 dark:text-white capitalize">{selectedConversation.participants[0]?.status}</span></div></div></div>
      {/if}
    </div>
  {/if}
</div>


