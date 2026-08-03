<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { translate } from '../../stores/locale'

  const t = translate

  export let path = '/tables/simple'
  $: pageTitle = path === '/tables/simple' ? 'Simple table' : path === '/tables/data' ? 'Data table' : 'CRUD table'

  type Status = 'Active' | 'Invited' | 'Suspended'
  type Row = { id: string; name: string; email: string; team: string; role?: string; createdAt: string; status: Status }
  type SortKey = 'name' | 'email' | 'team' | 'createdAt'
  type FormValues = { name: string; email: string; team: string; status: Status }

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const simpleRows: Row[] = [
    { id: 'U-1001', name: 'Ava Johnson', email: 'ava@example.com', role: 'Admin', team: 'Operations', createdAt: '2025-11-12', status: 'Active' },
    { id: 'U-1002', name: 'Noah Smith', email: 'noah@example.com', role: 'Manager', team: 'Sales', createdAt: '2025-10-03', status: 'Active' },
    { id: 'U-1003', name: 'Mia Chen', email: 'mia@example.com', role: 'Editor', team: 'Marketing', createdAt: '2025-12-01', status: 'Invited' },
    { id: 'U-1004', name: 'Liam Brown', email: 'liam@example.com', role: 'Viewer', team: 'Support', createdAt: '2025-08-20', status: 'Suspended' },
    { id: 'U-1005', name: 'Sophia Davis', email: 'sophia@example.com', role: 'Editor', team: 'Engineering', createdAt: '2025-09-14', status: 'Active' },
  ]
  const dataRows: Row[] = [
    ...simpleRows,
    { id: 'U-1006', name: 'Ethan Wilson', email: 'ethan@example.com', team: 'Engineering', createdAt: '2025-11-26', status: 'Active' },
    { id: 'U-1007', name: 'Isabella Martinez', email: 'isabella@example.com', team: 'Marketing', createdAt: '2025-07-18', status: 'Invited' },
    { id: 'U-1008', name: 'James Taylor', email: 'james@example.com', team: 'Operations', createdAt: '2025-06-02', status: 'Active' },
    { id: 'U-1009', name: 'Olivia Anderson', email: 'olivia@example.com', team: 'Support', createdAt: '2025-05-09', status: 'Suspended' },
    { id: 'U-1010', name: 'Benjamin Thomas', email: 'benjamin@example.com', team: 'Sales', createdAt: '2025-04-22', status: 'Active' },
    { id: 'U-1011', name: 'Charlotte Moore', email: 'charlotte@example.com', team: 'Operations', createdAt: '2025-03-15', status: 'Active' },
    { id: 'U-1012', name: 'Daniel Jackson', email: 'daniel@example.com', team: 'Engineering', createdAt: '2025-02-08', status: 'Invited' },
  ]
  let rows: Row[] = [
    { id: 'U-2001', name: 'Ava Johnson', email: 'ava@example.com', team: 'Operations', createdAt: '2025-11-12', status: 'Active' },
    { id: 'U-2002', name: 'Noah Smith', email: 'noah@example.com', team: 'Sales', createdAt: '2025-10-03', status: 'Active' },
    { id: 'U-2003', name: 'Mia Chen', email: 'mia@example.com', team: 'Marketing', createdAt: '2025-12-01', status: 'Invited' },
    { id: 'U-2004', name: 'Liam Brown', email: 'liam@example.com', team: 'Support', createdAt: '2025-08-20', status: 'Suspended' },
  ]
  let query = ''
  let status: 'All' | Status = 'All'
  let sort: { key: SortKey; direction: 'asc' | 'desc' } = { key: 'name', direction: 'asc' }
  let page = 1
  const pageSize = 6
  let modalOpen = false
  let deleteOpen = false
  let editMode = false
  let editingId: string | null = null
  let deleteId: string | null = null
  let form: FormValues = { name: '', email: '', team: '', status: 'Active' }
  let formErrors: Partial<Record<keyof FormValues, string>> = {}

  $: filtered = dataRows.filter((row) => { const needle = query.trim().toLowerCase(); return (!needle || `${row.id} ${row.name} ${row.email} ${row.team}`.toLowerCase().includes(needle)) && (status === 'All' || row.status === status) })
  $: sorted = [...filtered].sort((a, b) => { const direction = sort.direction === 'asc' ? 1 : -1; return direction * String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, { sensitivity: 'base' }) })
  $: totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  $: page = Math.min(page, totalPages)
  $: pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)
  $: rowToDelete = deleteId ? rows.find((row) => row.id === deleteId) : null

  function statusPill(value: Status): string {
    if (value === 'Active') return 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-200 dark:border-success-800'
    if (value === 'Invited') return 'bg-surface-50 text-secondary-700 border-surface-200 dark:bg-surface-900/30 dark:text-secondary-200 dark:border-surface-700'
    return 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-200 dark:border-danger-800'
  }
  function toggleSort(key: SortKey): void { page = 1; sort = sort.key === key ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' } }
  function today(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
  function openCreate(): void { editMode = false; editingId = null; form = { name: '', email: '', team: '', status: 'Active' }; formErrors = {}; modalOpen = true }
  function openEdit(row: Row): void { editMode = true; editingId = row.id; form = { name: row.name, email: row.email, team: row.team, status: row.status }; formErrors = {}; modalOpen = true }
  function closeModal(): void { modalOpen = false; editingId = null; formErrors = {} }
  function submitForm(): void {
    const nextErrors: typeof formErrors = {}
    if (!form.name.trim()) nextErrors.name = t('tables.validation.name_required')
    if (!form.email.trim()) nextErrors.email = t('tables.validation.email_required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = t('tables.validation.email_invalid')
    if (!form.team.trim()) nextErrors.team = t('tables.validation.team_required')
    formErrors = nextErrors
    if (Object.keys(nextErrors).length) return
    if (editMode && editingId) rows = rows.map((row) => row.id === editingId ? { ...row, ...form } : row)
    else rows = [{ id: `U-${Date.now().toString().slice(-4)}`, ...form, createdAt: today() }, ...rows]
    closeModal()
  }
  function requestDelete(id: string): void { deleteId = id; deleteOpen = true }
  function confirmDelete(): void { if (!deleteId) return; rows = rows.filter((row) => row.id !== deleteId); deleteId = null; deleteOpen = false }
</script>

<svelte:head><title>{pageTitle} Â· Adminex</title></svelte:head>

{#if path === '/tables/simple'}
  <div class="space-y-6 animate-fade-in"><div><h1 class="heading-2 text-secondary-900 dark:text-white">Simple table</h1><p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">A compact table for clearly presenting a small set of records.</p></div><div class="card rounded-xl p-0 overflow-hidden"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-surface-50 dark:bg-surface-900/30"><tr><th class={`${headClass} py-3 px-4`}>ID</th><th class={`${headClass} py-3 px-4`}>Name</th><th class={`${headClass} py-3 px-4`}>Email</th><th class={`${headClass} py-3 px-4`}>Role</th><th class={`${headClass} py-3 px-4`}>Status</th></tr></thead><tbody class="divide-y divide-surface-200 dark:divide-surface-700">{#each simpleRows as row}<tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors"><td class={cellClass}>{row.id}</td><td class={cellClass}><div class="font-medium text-secondary-900 dark:text-white">{row.name}</div></td><td class={cellClass}>{row.email}</td><td class={cellClass}>{row.role}</td><td class={cellClass}><span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusPill(row.status)}`}>{row.status}</span></td></tr>{/each}</tbody></table></div></div></div>
{:else if path === '/tables/data'}
  <div class="space-y-6 animate-fade-in"><div><h1 class="heading-2 text-secondary-900 dark:text-white">Data table</h1><p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">Search, filter, sort, and paginate a larger dataset.</p></div><div class="card rounded-xl p-6"><div class="grid grid-cols-1 lg:grid-cols-3 gap-4"><div class="lg:col-span-2 relative"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /><input bind:value={query} on:input={() => (page = 1)} class={`${inputClass} pl-10`} placeholder="Search by name, email, team, or ID" aria-label="Search table" /></div><div><label class="sr-only" for="data-status">Status</label><select id="data-status" bind:value={status} on:change={() => (page = 1)} class={inputClass}><option value="All">All statuses</option><option value="Active">Active</option><option value="Invited">Invited</option><option value="Suspended">Suspended</option></select></div></div><div class="mt-5 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-surface-50 dark:bg-surface-900/30"><tr><th class={`${headClass} py-3 px-4`}>ID</th>{#each [['name','Name'],['email','Email'],['team','Team'],['createdAt','Created']] as item}<th class={`${headClass} py-3 px-4`}><button type="button" class="inline-flex items-center gap-1 hover:text-secondary-700 dark:hover:text-secondary-200" on:click={() => toggleSort(item[0] as SortKey)}>{item[1]}<Icon icon={Icons.chevronDown} className={`w-4 h-4 transition-transform ${sort.key === item[0] && sort.direction === 'desc' ? 'rotate-180' : ''}`} /></button></th>{/each}<th class={`${headClass} py-3 px-4`}>Status</th></tr></thead><tbody class="divide-y divide-surface-200 dark:divide-surface-700">{#each pageRows as row}<tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors"><td class={cellClass}>{row.id}</td><td class={cellClass}><div class="font-medium text-secondary-900 dark:text-white">{row.name}</div></td><td class={cellClass}>{row.email}</td><td class={cellClass}>{row.team}</td><td class={cellClass}>{row.createdAt}</td><td class={cellClass}><span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusPill(row.status)}`}>{row.status}</span></td></tr>{/each}{#if !pageRows.length}<tr><td colspan="6" class="py-10 px-4 text-center text-sm text-secondary-500">No results found.</td></tr>{/if}</tbody></table></div></div><div class="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><p class="text-sm text-secondary-500">Showing {pageRows.length} of {sorted.length} results</p><div class="flex items-center gap-2"><button type="button" on:click={() => (page = Math.max(1, page - 1))} disabled={page <= 1} class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm disabled:opacity-50">Previous</button><span class="px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300">Page {page} of {totalPages}</span><button type="button" on:click={() => (page = Math.min(totalPages, page + 1))} disabled={page >= totalPages} class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm disabled:opacity-50">Next</button></div></div></div></div>
{:else}
  <div class="space-y-6"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><h1 class="heading-2 text-secondary-900 dark:text-white">{t('tables.crud_table')}</h1><p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">{t('tables.crud_table_desc')}</p></div><button type="button" on:click={openCreate} class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors"><Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />{t('tables.add_row')}</button></div><div class="card rounded-xl p-6"><div class="relative max-w-xl"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /><input bind:value={query} class={'pl-10 ' + inputClass} placeholder={t('tables.search_by_fields')} aria-label="Search rows" /></div><div class="mt-5 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700"><div class="overflow-x-auto"><table class="w-full"><thead class="bg-surface-50 dark:bg-surface-900/30"><tr><th class={`${headClass} py-3 px-4`}>{t('tables.column.id')}</th><th class={`${headClass} py-3 px-4`}>{t('tables.column.name')}</th><th class={`${headClass} py-3 px-4`}>{t('tables.column.email')}</th><th class={`${headClass} py-3 px-4`}>{t('tables.column.team')}</th><th class={`${headClass} py-3 px-4`}>{t('tables.column.created')}</th><th class={`${headClass} py-3 px-4`}>{t('tables.column.status')}</th><th class={`${headClass} py-3 px-4 text-right`}>{t('tables.column.actions')}</th></tr></thead><tbody class="divide-y divide-surface-200 dark:divide-surface-700">{#each rows.filter((row) => !query || `${row.id} ${row.name} ${row.email} ${row.team}`.toLowerCase().includes(query.toLowerCase())) as row}<tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors"><td class={cellClass}>{row.id}</td><td class={cellClass}><div class="font-medium text-secondary-900 dark:text-white">{row.name}</div></td><td class={cellClass}>{row.email}</td><td class={cellClass}>{row.team}</td><td class={cellClass}>{row.createdAt}</td><td class={cellClass}><span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusPill(row.status)}`}>{row.status}</span></td><td class={`${cellClass} text-right`}><div class="inline-flex items-center gap-1"><button type="button" on:click={() => openEdit(row)} class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label={`Edit ${row.name}`}><Icon icon={Icons.edit} width={18} height={18} className="text-secondary-600 dark:text-secondary-300" /></button><button type="button" on:click={() => requestDelete(row.id)} class="p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors" aria-label={`Delete ${row.name}`}><Icon icon={Icons.trash} width={18} height={18} className="text-danger-600" /></button></div></td></tr>{/each}{#if !rows.filter((row) => !query || `${row.id} ${row.name} ${row.email} ${row.team}`.toLowerCase().includes(query.toLowerCase())).length}<tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500 dark:text-secondary-400">{t('tables.no_results')}</td></tr>{/if}</tbody></table></div></div></div></div>
{/if}

{#if modalOpen}
  <div class="fixed inset-0 z-[1200] flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label={t('common.close')} on:click={closeModal}></button>
    <div class="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="row-dialog-title">
      <div class="sticky top-0 bg-white dark:bg-surface-900 px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between z-10">
        <h2 id="row-dialog-title" class="heading-5 text-secondary-900 dark:text-white">{editMode ? t('tables.edit_row') : t('tables.add_new_row')}</h2>
        <button type="button" on:click={closeModal} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-500 transition-colors" aria-label={t('common.close')}>
          <Icon icon={Icons.x} width={20} height={20} />
        </button>
      </div>
      <form class="p-6" on:submit|preventDefault={submitForm}>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class={labelClass} for="crud_name">{t('tables.field.name')} <span class="text-danger-500">*</span></label>
              <input id="crud_name" bind:value={form.name} class={inputClass + (formErrors.name ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder={t('tables.placeholder.name')} />
              {#if formErrors.name}<p class="mt-1 text-xs text-danger-500">{formErrors.name}</p>{/if}
            </div>
            <div>
              <label class={labelClass} for="crud_email">{t('tables.field.email')} <span class="text-danger-500">*</span></label>
              <input id="crud_email" type="email" bind:value={form.email} class={inputClass + (formErrors.email ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder={t('tables.placeholder.email')} />
              {#if formErrors.email}<p class="mt-1 text-xs text-danger-500">{formErrors.email}</p>{/if}
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class={labelClass} for="crud_team">{t('tables.field.team')} <span class="text-danger-500">*</span></label>
              <input id="crud_team" bind:value={form.team} class={inputClass + (formErrors.team ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder={t('tables.placeholder.team')} />
              {#if formErrors.team}<p class="mt-1 text-xs text-danger-500">{formErrors.team}</p>{/if}
            </div>
            <div>
              <label class={labelClass} for="crud_status">{t('tables.field.status')}</label>
              <select id="crud_status" bind:value={form.status} class={inputClass}>
                <option value="Active">{t('tables.status.active')}</option>
                <option value="Invited">{t('tables.status.invited')}</option>
                <option value="Suspended">{t('tables.status.suspended')}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="flex gap-3 mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
          <button type="button" on:click={closeModal} class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">{t('common.cancel')}</button>
          <button type="submit" class="flex-1 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">{editMode ? t('common.save') : t('create')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if deleteOpen && rowToDelete}
  <div class="fixed inset-0 z-[1200] flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label={t('common.close')} on:click={() => (deleteOpen = false)}></button>
    <div class="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-fade-in p-6" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
        <Icon icon={Icons.alertTriangle} className="w-7 h-7 text-danger-600 dark:text-danger-400" />
      </div>
      <h3 id="delete-dialog-title" class="heading-5 text-secondary-900 dark:text-white text-center mb-2">{t('tables.delete_row')}</h3>
      <p class="text-sm text-secondary-500 dark:text-secondary-400 text-center mb-6">{t('tables.delete_confirm_name', { name: rowToDelete.name })}</p>
      <div class="flex gap-3">
        <button type="button" on:click={() => (deleteOpen = false)} class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">{t('common.cancel')}</button>
        <button type="button" on:click={confirmDelete} class="flex-1 px-4 py-2.5 bg-danger-600 text-white rounded-xl text-sm font-medium hover:bg-danger-700 transition-colors">{t('common.delete')}</button>
      </div>
    </div>
  </div>
{/if}


