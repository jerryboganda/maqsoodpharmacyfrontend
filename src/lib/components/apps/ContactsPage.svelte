<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { contactsData, departments, statuses, roles, type Contact } from '../../../data'

  type ContactForm = Omit<Contact, 'id' | 'joinedDate' | 'lastActive'>
  const emptyForm: ContactForm = { name: '', email: '', phone: '', role: '', department: '', location: '', status: 'active', bio: '', avatar: '' }
  let contacts: Contact[] = contactsData.map((contact) => ({ ...contact }))
  let searchQuery = ''
  let filterDepartment = 'All'
  let filterStatus = 'All'
  let filterOpen = false
  let formOpen = false
  let viewOpen = false
  let deleteOpen = false
  let editMode = false
  let selected: Contact | null = null
  let toDelete: Contact | null = null
  let formData: ContactForm = { ...emptyForm }
  let formErrors: Record<string, string> = {}
  let avatarPreview = ''

  $: filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query || [contact.name, contact.email, contact.role, contact.department].some((value) => value.toLowerCase().includes(query))
    const matchesDepartment = filterDepartment === 'All' || contact.department === filterDepartment
    const matchesStatus = filterStatus === 'All' || contact.status === filterStatus.toLowerCase()
    return matchesSearch && matchesDepartment && matchesStatus
  })
  $: activeFilterCount = [filterDepartment, filterStatus].filter((value) => value !== 'All').length

  function initials(name: string): string { return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() }
  function statusClass(status: Contact['status']): string {
    return status === 'active' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : status === 'pending' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400'
  }
  function openAdd(): void { editMode = false; selected = null; formData = { ...emptyForm }; formErrors = {}; avatarPreview = ''; formOpen = true }
  function openEdit(contact: Contact): void { editMode = true; selected = contact; formData = { name: contact.name, email: contact.email, phone: contact.phone, role: contact.role, department: contact.department, location: contact.location, status: contact.status, bio: contact.bio, avatar: contact.avatar }; avatarPreview = contact.avatar; formErrors = {}; formOpen = true }
  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format'
    if (!formData.phone.trim()) errors.phone = 'Phone is required'
    if (!formData.role.trim()) errors.role = 'Role is required'
    if (!formData.department.trim()) errors.department = 'Department is required'
    if (!formData.location.trim()) errors.location = 'Location is required'
    formErrors = errors
    return Object.keys(errors).length === 0
  }
  function submitForm(): void {
    if (!validate()) return
    if (editMode && selected) {
      contacts = contacts.map((contact) => contact.id === selected?.id ? { ...contact, ...formData, avatar: formData.avatar || contact.avatar } : contact)
    } else {
      const id = Math.max(...contacts.map((contact) => contact.id), 0) + 1
      contacts = [{ ...formData, id, avatar: formData.avatar || '/assets/avatars/avatar7.jpg', joinedDate: new Date().toISOString().slice(0, 10), lastActive: 'Just now' }, ...contacts]
    }
    formOpen = false
  }
  function handleImage(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { formErrors = { ...formErrors, avatar: 'Please select an image file' }; return }
    if (file.size > 5 * 1024 * 1024) { formErrors = { ...formErrors, avatar: 'Image size should be less than 5MB' }; return }
    const reader = new FileReader()
    reader.onload = () => { avatarPreview = String(reader.result); formData = { ...formData, avatar: avatarPreview } }
    reader.readAsDataURL(file)
  }
  function clearFilters(): void { filterDepartment = 'All'; filterStatus = 'All' }
</script>

<svelte:head><title>Contacts · Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 class="heading-2 text-secondary-900 dark:text-white">Contacts</h1><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">Manage your contacts and connections</p></div><div class="flex items-center gap-3"><span class="text-sm text-secondary-500">{filteredContacts.length} contacts</span><button type="button" class="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium" on:click={openAdd}><Icon icon={Icons.plus} width={16} height={16} />Add contact</button></div></div>

  <div class="card rounded-xl p-4"><div class="flex flex-col sm:flex-row gap-4"><div class="flex-1 relative"><Icon icon={Icons.search} width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" /><input bind:value={searchQuery} type="search" placeholder="Search contacts" aria-label="Search contacts" class="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20" /></div><div class="relative"><button type="button" class={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium ${activeFilterCount ? 'bg-theme-primary-light border-theme-primary/30 text-theme-primary' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-secondary-700 dark:text-secondary-300'}`} on:click={() => (filterOpen = !filterOpen)}><Icon icon={Icons.filter} width={16} height={16} />Filter{#if activeFilterCount}<span class="w-5 h-5 flex items-center justify-center bg-theme-primary text-white text-xs rounded-full">{activeFilterCount}</span>{/if}<Icon icon={Icons.chevronDown} width={16} height={16} className={filterOpen ? 'rotate-180' : ''} /></button>{#if filterOpen}<div class="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-surface-900 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 z-20 p-4 space-y-4"><div class="flex items-center justify-between"><h2 class="text-sm font-semibold text-secondary-900 dark:text-white">Filters</h2>{#if activeFilterCount}<button type="button" class="text-xs text-theme-primary" on:click={clearFilters}>Clear all</button>{/if}</div><label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300">Department<select bind:value={filterDepartment} class="input-theme mt-2"><option value="All">All</option>{#each departments.filter((department) => department !== 'All') as department}<option value={department}>{department}</option>{/each}</select></label><label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300">Status<select bind:value={filterStatus} class="input-theme mt-2"><option value="All">All</option>{#each statuses.filter((status) => status !== 'All') as status}<option value={status}>{status}</option>{/each}</select></label><button type="button" class="w-full px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium" on:click={() => (filterOpen = false)}>Apply</button></div>{/if}</div></div></div>

  <div class="card rounded-xl overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><thead><tr class="bg-surface-50 dark:bg-surface-800/50"><th class="text-left px-6 py-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Contact</th><th class="text-left px-6 py-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Phone</th><th class="text-left px-6 py-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Role</th><th class="text-left px-6 py-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Department</th><th class="text-left px-6 py-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th><th class="text-right px-6 py-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th></tr></thead><tbody class="divide-y divide-surface-200 dark:divide-surface-700">{#each filteredContacts as contact}<tr class="hover:bg-surface-50 dark:hover:bg-surface-800/50"><td class="px-6 py-4"><div class="flex items-center gap-3"><img src={contact.avatar} alt={contact.name} class="w-10 h-10 rounded-full object-cover ring-2 ring-surface-100 dark:ring-surface-700" /><div><p class="text-sm font-medium text-secondary-900 dark:text-white">{contact.name}</p><p class="text-xs text-secondary-500">{contact.email}</p></div></div></td><td class="px-6 py-4 text-sm text-secondary-600 dark:text-secondary-400">{contact.phone}</td><td class="px-6 py-4 text-sm text-secondary-900 dark:text-white">{contact.role}</td><td class="px-6 py-4 text-sm text-secondary-600 dark:text-secondary-400">{contact.department}</td><td class="px-6 py-4"><span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusClass(contact.status)}`}>{contact.status}</span></td><td class="px-6 py-4"><div class="flex items-center justify-end gap-1"><button type="button" aria-label={`View ${contact.name}`} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg text-secondary-500 hover:text-theme-primary" on:click={() => { selected = contact; viewOpen = true }}><Icon icon={Icons.eye} width={16} height={16} /></button><button type="button" aria-label={`Edit ${contact.name}`} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg text-secondary-500 hover:text-info-600" on:click={() => openEdit(contact)}><Icon icon={Icons.edit} width={16} height={16} /></button><button type="button" aria-label={`Delete ${contact.name}`} class="p-2 hover:bg-danger-50 rounded-lg text-secondary-500 hover:text-danger-600" on:click={() => { toDelete = contact; deleteOpen = true }}><Icon icon={Icons.trash} width={16} height={16} /></button></div></td></tr>{/each}</tbody></table></div>{#if filteredContacts.length === 0}<div class="py-12 text-center"><Icon icon={Icons.user} width={48} height={48} className="mx-auto text-secondary-300 mb-3" /><p class="text-secondary-500">No contacts found</p><button type="button" class="mt-4 text-sm text-theme-primary" on:click={clearFilters}>Clear filters</button></div>{/if}</div>
</div>

{#if formOpen}
  <div class="fixed inset-0 z-[1050] flex items-center justify-center p-4"><button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close contact form" on:click={() => (formOpen = false)}></button><div class="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"><div class="sticky top-0 bg-white dark:bg-surface-900 px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between z-10"><div><h2 class="text-lg font-bold text-secondary-900 dark:text-white">{editMode ? 'Edit contact' : 'Add contact'}</h2><p class="text-sm text-secondary-500 mt-0.5">Keep contact details up to date.</p></div><button type="button" aria-label="Close" class="p-2" on:click={() => (formOpen = false)}><Icon icon={Icons.x} width={20} height={20} /></button></div><form class="p-6" on:submit|preventDefault={submitForm}><div class="mb-6 flex items-start gap-4"><div class="relative"><div class="w-24 h-24 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-surface-300 dark:border-surface-600">{#if avatarPreview}<img src={avatarPreview} alt="Preview" class="w-full h-full object-cover" />{:else}<span class="text-2xl font-bold text-secondary-400">{initials(formData.name || 'New Contact')}</span>{/if}</div></div><div><p class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Profile photo</p><input type="file" accept="image/*" on:change={handleImage} class="block w-full text-sm text-secondary-500" />{#if formErrors.avatar}<p class="text-xs text-danger-500 mt-1">{formErrors.avatar}</p>{/if}</div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">{#each [{key:'name',label:'Name',placeholder:'Full name'},{key:'email',label:'Email',placeholder:'name@example.com'},{key:'phone',label:'Phone',placeholder:'+1 (555) 000-0000'},{key:'location',label:'Location',placeholder:'City, Country'}] as field}<label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300">{field.label}<input bind:value={formData[field.key as keyof ContactForm]} type={field.key === 'email' ? 'email' : 'text'} placeholder={field.placeholder} class={`input-theme mt-1 ${formErrors[field.key] ? 'border-danger-500' : ''}`} />{#if formErrors[field.key]}<span class="text-xs text-danger-500 mt-1 block">{formErrors[field.key]}</span>{/if}</label>{/each}<label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300">Role<select bind:value={formData.role} class="input-theme mt-1"><option value="">Choose role</option>{#each roles as role}<option value={role}>{role}</option>{/each}</select>{#if formErrors.role}<span class="text-xs text-danger-500 mt-1 block">{formErrors.role}</span>{/if}</label><label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300">Department<select bind:value={formData.department} class="input-theme mt-1"><option value="">Choose department</option>{#each departments.filter((department) => department !== 'All') as department}<option value={department}>{department}</option>{/each}</select>{#if formErrors.department}<span class="text-xs text-danger-500 mt-1 block">{formErrors.department}</span>{/if}</label><label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300">Status<select bind:value={formData.status} class="input-theme mt-1"><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select></label><label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 sm:col-span-2">Bio<textarea bind:value={formData.bio} rows="3" class="input-theme mt-1" placeholder="Short biography"></textarea></label></div><div class="flex gap-3 mt-6 pt-6 border-t border-surface-200 dark:border-surface-700"><button type="button" class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl" on:click={() => (formOpen = false)}>Cancel</button><button type="submit" class="flex-1 px-4 py-2.5 bg-theme-primary text-white rounded-xl">{editMode ? 'Update contact' : 'Add contact'}</button></div></form></div></div>
{/if}

{#if viewOpen && selected}
  <div class="fixed inset-0 z-[1050] flex items-center justify-center p-4"><button type="button" class="absolute inset-0 bg-black/50" aria-label="Close contact details" on:click={() => (viewOpen = false)}></button><div class="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6"><button type="button" class="absolute top-4 right-4 p-2" aria-label="Close" on:click={() => (viewOpen = false)}><Icon icon={Icons.x} /></button><div class="text-center"><img src={selected.avatar} alt={selected.name} class="w-20 h-20 mx-auto rounded-full object-cover" /><h2 class="heading-4 text-secondary-900 dark:text-white mt-4">{selected.name}</h2><p class="text-sm text-secondary-500">{selected.role} · {selected.department}</p><span class={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusClass(selected.status)}`}>{selected.status}</span></div><div class="mt-6 space-y-3 text-sm"><p class="flex gap-3"><Icon icon={Icons.mail} className="w-4 h-4 text-secondary-400" />{selected.email}</p><p class="flex gap-3"><Icon icon={Icons.phone} className="w-4 h-4 text-secondary-400" />{selected.phone}</p><p class="flex gap-3"><Icon icon={Icons.mapPoint} className="w-4 h-4 text-secondary-400" />{selected.location}</p><p class="text-secondary-600 dark:text-secondary-300 pt-3 border-t border-surface-200 dark:border-surface-700">{selected.bio}</p></div></div></div>
{/if}

{#if deleteOpen && toDelete}
  <div class="fixed inset-0 z-[1060] flex items-center justify-center p-4"><button type="button" class="absolute inset-0 bg-black/50" aria-label="Close delete dialog" on:click={() => (deleteOpen = false)}></button><div class="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6 text-center"><div class="w-14 h-14 mx-auto rounded-full bg-danger-100 flex items-center justify-center"><Icon icon={Icons.alertTriangle} width={28} height={28} className="text-danger-600" /></div><h2 class="heading-5 text-secondary-900 dark:text-white mt-4">Delete contact?</h2><p class="text-sm text-secondary-500 mt-2">This will remove {toDelete.name} from your contacts.</p><div class="flex gap-3 mt-6"><button type="button" class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl" on:click={() => (deleteOpen = false)}>Cancel</button><button type="button" class="flex-1 px-4 py-2.5 bg-danger-600 text-white rounded-xl" on:click={() => { contacts = contacts.filter((contact) => contact.id !== toDelete?.id); deleteOpen = false; toDelete = null }}>Delete</button></div></div></div>
{/if}
