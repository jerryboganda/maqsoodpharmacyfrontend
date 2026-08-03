<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { emailsData, emailLabels, type Email } from '../../../data'

  let emails: Email[] = emailsData.map((email) => ({ ...email, labels: [...email.labels] }))
  let selectedFolder: Email['folder'] = 'inbox'
  let selectedEmail: Email | null = null
  let searchQuery = ''
  let composeOpen = false
  let selectedEmails: number[] = []
  let composeTo = ''
  let composeSubject = ''
  let composeBody = ''
  let composeStatus = ''

  const folders: { id: Email['folder']; label: string; icon: string; count: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: Icons.inbox, count: 3 },
    { id: 'sent', label: 'Sent', icon: Icons.sent, count: 0 },
    { id: 'drafts', label: 'Drafts', icon: Icons.drafts, count: 2 },
    { id: 'spam', label: 'Spam', icon: Icons.spam, count: 0 },
    { id: 'trash', label: 'Trash', icon: Icons.trash, count: 0 },
  ]

  $: filteredEmails = emails.filter((email) => {
    const query = searchQuery.trim().toLowerCase()
    return email.folder === selectedFolder &&
      (!query || email.subject.toLowerCase().includes(query) || email.from.name.toLowerCase().includes(query) || email.preview.toLowerCase().includes(query))
  })

  function unreadCount(folder: Email['folder']): number {
    return emails.filter((email) => email.folder === folder && !email.isRead).length
  }

  function labelColor(labelId: string): string {
    return emailLabels.find((label) => label.id === labelId)?.color ?? 'bg-secondary-500'
  }

  function initials(name: string): string {
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  }

  function openEmail(email: Email): void {
    selectedEmail = email
    emails = emails.map((item) => item.id === email.id ? { ...item, isRead: true } : item)
  }

  function toggleStar(event: MouseEvent, id: number): void {
    event.stopPropagation()
    emails = emails.map((email) => email.id === id ? { ...email, isStarred: !email.isStarred } : email)
    if (selectedEmail?.id === id) selectedEmail = emails.find((email) => email.id === id) ?? selectedEmail
  }

  function toggleSelected(event: MouseEvent, id: number): void {
    event.stopPropagation()
    selectedEmails = selectedEmails.includes(id) ? selectedEmails.filter((value) => value !== id) : [...selectedEmails, id]
  }

  function deleteSelected(): void {
    emails = emails.map((email) => selectedEmails.includes(email.id) ? { ...email, folder: 'trash' } : email)
    selectedEmails = []
    selectedEmail = null
  }

  function submitCompose(): void {
    if (!composeTo.trim() || !composeSubject.trim()) {
      composeStatus = 'Recipient and subject are required.'
      return
    }
    const now = new Date()
    emails = [{
      id: Math.max(...emails.map((email) => email.id), 0) + 1,
      from: { name: 'Me', email: 'me@company.com', avatar: '/assets/avatars/avatar7.jpg' },
      to: composeTo,
      subject: composeSubject,
      preview: composeBody.slice(0, 100),
      body: `<p>${composeBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      isRead: true,
      isStarred: false,
      hasAttachment: false,
      labels: ['work'],
      folder: 'sent',
    }, ...emails]
    composeStatus = 'Message saved to Sent.'
    composeTo = ''
    composeSubject = ''
    composeBody = ''
    setTimeout(() => { composeOpen = false; composeStatus = '' }, 600)
  }
</script>

<svelte:head><title>Email · Adminex</title></svelte:head>

<div class="h-[calc(100vh-112px)] min-h-[620px] flex animate-fade-in card rounded-xl overflow-hidden">
  <aside class="hidden md:flex w-56 lg:w-60 shrink-0 bg-white dark:bg-surface-900 border-e border-surface-200 dark:border-surface-700 flex-col overflow-hidden">
    <div class="p-4">
      <button type="button" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-primary text-white rounded-xl text-label hover:opacity-90" on:click={() => (composeOpen = true)}>
        <Icon icon={Icons.plus} width={20} height={20} /> Compose
      </button>
    </div>
    <nav class="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Mailbox folders">
      <p class="px-3 py-2 text-label-sm text-secondary-400">Folders</p>
      {#each folders as folder}
        <button type="button" class={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-label transition-colors ${selectedFolder === folder.id ? 'bg-theme-primary-light text-theme-primary' : 'text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800'}`} on:click={() => { selectedFolder = folder.id; selectedEmail = null }}>
          <span class="flex items-center gap-3"><Icon icon={folder.icon} width={20} height={20} />{folder.label}</span>
          {#if unreadCount(folder.id) > 0}<span class="px-2 py-0.5 text-caption font-semibold bg-theme-primary text-white rounded-full">{unreadCount(folder.id)}</span>{/if}
        </button>
      {/each}
      <p class="px-3 py-2 mt-4 text-label-sm text-secondary-400">Labels</p>
      {#each emailLabels as label}
        <button type="button" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-label text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800"><span class={`w-3 h-3 rounded-full ${label.color}`}></span>{label.label}</button>
      {/each}
    </nav>
  </aside>

  <section class={`w-full md:w-80 lg:w-96 shrink-0 flex-col bg-white dark:bg-surface-900 ${selectedEmail ? 'hidden md:flex' : 'flex'} border-e border-surface-200 dark:border-surface-700`} aria-label="Email list">
    <div class="h-14 px-4 flex items-center justify-between border-b border-surface-200 dark:border-surface-700">
      <div class="flex items-center gap-2">
        {#if selectedEmails.length > 0}
          <span class="text-body-sm text-secondary-600 dark:text-secondary-400">{selectedEmails.length} selected</span>
          <button type="button" aria-label="Delete selected emails" class="p-2 hover:bg-danger-50 rounded-lg text-secondary-500 hover:text-danger-600" on:click={deleteSelected}><Icon icon={Icons.trash} width={20} height={20} /></button>
        {:else}
          <button type="button" aria-label="Refresh email list" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-500"><Icon icon={Icons.refresh} width={20} height={20} /></button>
        {/if}
      </div>
      <div class="relative flex-1 max-w-md ms-4">
        <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
        <input type="search" bind:value={searchQuery} placeholder="Search mail" aria-label="Search mail" class="w-full ps-10 pe-4 py-2 bg-surface-50 dark:bg-surface-800 border-0 rounded-lg text-body-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20" />
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      {#if filteredEmails.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-center p-8"><Icon icon={Icons.inbox} width={64} height={64} className="text-secondary-300 dark:text-secondary-600 mb-4" /><p class="text-secondary-500 font-medium">No emails found</p><p class="text-body-sm text-secondary-400 mt-1">{searchQuery ? 'Try another search.' : 'This folder is empty.'}</p></div>
      {:else}
        {#each filteredEmails as email}
          <div role="button" tabindex="0" class={`flex items-center gap-3 px-4 py-3 border-b border-surface-100 dark:border-surface-800 cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-theme-primary-light' : email.isRead ? 'hover:bg-surface-50 dark:hover:bg-surface-800/50' : 'bg-surface-50 dark:bg-surface-800/30 hover:bg-surface-100 dark:hover:bg-surface-800'}`} on:click={() => openEmail(email)} on:keydown={(event) => event.key === 'Enter' && openEmail(email)}>
            <button type="button" aria-label={`Select ${email.subject}`} class={`w-5 h-5 rounded border flex items-center justify-center ${selectedEmails.includes(email.id) ? 'bg-theme-primary border-theme-primary text-white' : 'border-surface-300 dark:border-surface-600 hover:border-theme-primary'}`} on:click={(event) => toggleSelected(event, email.id)}>{#if selectedEmails.includes(email.id)}<Icon icon={Icons.check} width={12} height={12} />{/if}</button>
            <button type="button" aria-label={`${email.isStarred ? 'Unstar' : 'Star'} ${email.subject}`} class="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded" on:click={(event) => toggleStar(event, email.id)}><Icon icon={Icons.star} className={`w-5 h-5 ${email.isStarred ? 'text-warning-500' : 'text-secondary-400'}`} /></button>
            <img src={email.from.avatar} alt={email.from.name} class="w-10 h-10 rounded-full object-cover" />
            <div class="flex-1 min-w-0"><div class="flex items-center justify-between gap-2"><p class={`text-body-sm truncate ${email.isRead ? 'text-secondary-700 dark:text-secondary-300' : 'font-semibold text-secondary-900 dark:text-white'}`}>{email.from.name}</p><span class="text-caption text-secondary-500 whitespace-nowrap">{email.date}</span></div><p class={`text-body-sm truncate ${email.isRead ? 'text-secondary-600 dark:text-secondary-400' : 'font-medium text-secondary-800 dark:text-secondary-200'}`}>{email.subject}</p><p class="text-caption text-secondary-500 truncate mt-0.5">{email.preview}</p></div>
            <div class="flex items-center gap-1">{#if email.hasAttachment}<Icon icon={Icons.paperclip} className="w-4 h-4 text-secondary-400" />{/if}{#each email.labels.slice(0, 2) as label}<span class={`w-2 h-2 rounded-full ${labelColor(label)}`}></span>{/each}</div>
          </div>
        {/each}
      {/if}
    </div>
  </section>

  {#if selectedEmail}
    <section class="flex-1 min-w-0 flex flex-col bg-white dark:bg-surface-900 overflow-hidden" aria-label="Email details">
      <div class="h-14 px-4 flex items-center justify-between border-b border-surface-200 dark:border-surface-700"><button type="button" class="md:hidden p-2" aria-label="Back to email list" on:click={() => (selectedEmail = null)}><Icon icon={Icons.arrowLeft} /></button><div class="flex items-center gap-2 ms-auto"><button type="button" aria-label="Archive email" class="p-2 hover:bg-surface-100 rounded-lg"><Icon icon={Icons.archive} /></button><button type="button" aria-label="Delete email" class="p-2 hover:bg-danger-50 rounded-lg"><Icon icon={Icons.trash} /></button><button type="button" aria-label="More email actions" class="p-2 hover:bg-surface-100 rounded-lg"><Icon icon={Icons.dotsVertical} /></button></div></div>
      <div class="flex-1 overflow-y-auto p-6"><div class="flex items-start justify-between gap-4 mb-6"><h1 class="heading-4 text-secondary-900 dark:text-white">{selectedEmail.subject}</h1><div class="flex items-center gap-2">{#each selectedEmail.labels as label}{#if emailLabels.find((item) => item.id === label)}<span class={`px-2 py-0.5 text-caption font-medium text-white rounded ${labelColor(label)}`}>{emailLabels.find((item) => item.id === label)?.label}</span>{/if}{/each}</div></div><div class="flex items-center justify-between mb-6 pb-6 border-b border-surface-200 dark:border-surface-700"><div class="flex items-center gap-3"><img src={selectedEmail.from.avatar} alt={selectedEmail.from.name} class="w-12 h-12 rounded-full object-cover" /><div><p class="font-semibold text-secondary-900 dark:text-white">{selectedEmail.from.name}</p><p class="text-body-sm text-secondary-500">{selectedEmail.from.email}</p></div></div><div class="text-end"><p class="text-body-sm text-secondary-500">{selectedEmail.date}</p><p class="text-caption text-secondary-400">{selectedEmail.time}</p></div></div><div class="prose prose-sm dark:prose-invert max-w-none text-secondary-700 dark:text-secondary-300">{@html selectedEmail.body}</div>{#if selectedEmail.hasAttachment}<div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700"><p class="text-label text-secondary-900 dark:text-white mb-3">Attachments</p><div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl w-fit"><div class="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center"><Icon icon={Icons.file} className="w-5 h-5 text-danger-600" /></div><div><p class="text-label text-secondary-900 dark:text-white">Document.pdf</p><p class="text-caption text-secondary-500">245 KB</p></div></div></div>{/if}</div>
      <div class="p-4 border-t border-surface-200 dark:border-surface-700"><div class="flex items-center gap-2"><button type="button" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-label"><Icon icon={Icons.arrowLeft} className="w-4 h-4" />Reply</button><button type="button" class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-label"><Icon icon={Icons.share} className="w-4 h-4" />Forward</button></div></div>
    </section>
  {:else}
    <div class="hidden md:flex flex-1 items-center justify-center bg-white dark:bg-surface-900"><div class="text-center"><Icon icon={Icons.mail} width={80} height={80} className="mx-auto text-secondary-300 dark:text-secondary-600 mb-4" /><p class="text-secondary-500 font-medium">Select an email</p><p class="text-body-sm text-secondary-400 mt-1">Choose a message from the list.</p></div></div>
  {/if}
</div>

{#if composeOpen}
  <div class="fixed inset-0 z-[1050] flex items-end sm:items-center justify-center p-0 sm:p-4"><button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close compose dialog" on:click={() => (composeOpen = false)}></button><form class="relative w-full sm:max-w-2xl bg-white dark:bg-surface-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden" on:submit|preventDefault={submitCompose}><div class="flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700"><h2 class="heading-5 text-secondary-900 dark:text-white">New message</h2><button type="button" aria-label="Close compose" class="p-2" on:click={() => (composeOpen = false)}><Icon icon={Icons.x} /></button></div><div class="p-5 space-y-4"><label class="block text-sm"><span class="text-secondary-600 dark:text-secondary-300">To</span><input bind:value={composeTo} type="email" class="input-theme mt-1" placeholder="recipient@example.com" /></label><label class="block text-sm"><span class="text-secondary-600 dark:text-secondary-300">Subject</span><input bind:value={composeSubject} class="input-theme mt-1" placeholder="Subject" /></label><label class="block text-sm"><span class="text-secondary-600 dark:text-secondary-300">Message</span><textarea bind:value={composeBody} rows="8" class="input-theme mt-1" placeholder="Write a message..."></textarea></label>{#if composeStatus}<p class="text-sm text-danger-600">{composeStatus}</p>{/if}</div><div class="flex justify-end gap-3 px-5 py-4 border-t border-surface-200 dark:border-surface-700"><button type="button" class="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700" on:click={() => (composeOpen = false)}>Cancel</button><button type="submit" class="btn-theme-primary px-5 py-2 rounded-lg">Send</button></div></form></div>
{/if}
