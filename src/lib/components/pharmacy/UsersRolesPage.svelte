<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { identityApi, api, ApiError, ApiNetworkError } from '../../api'
  import type { AdminUserRow, CreateUserInput, CreateUserResult, RoleLimitList, RoleRow, RoleScopeList, RoleScopeType } from '../../api'
  import { ROLE_LIMIT_KEYS } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const checkboxClass = 'rounded border-surface-300 dark:border-surface-700 text-theme-primary focus:ring-theme-primary/30'

  // -----------------------------------------------------------------------------------------
  // List state
  // -----------------------------------------------------------------------------------------
  let rows: AdminUserRow[] = []
  let loading = true
  let loadError = ''

  let roleCatalog: RoleRow[] = []
  let roleCatalogLoading = true

  let activeActionUserId: string | null = null

  function roleLabel(roleKey: string): string {
    return roleCatalog.find((r) => r.roleKey === roleKey)?.displayName ?? roleKey
  }

  async function load(): Promise<void> {
    loading = true
    loadError = ''
    try {
      rows = await identityApi.listUsers()
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load users.'
    } finally {
      loading = false
    }
  }

  async function loadRoleCatalog(): Promise<void> {
    roleCatalogLoading = true
    try {
      roleCatalog = await identityApi.listRoles()
    } catch {
      roleCatalog = []
    } finally {
      roleCatalogLoading = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Create-user form
  // -----------------------------------------------------------------------------------------
  type CreateFormState = { username: string; displayName: string; roles: string[] }

  function emptyCreateForm(): CreateFormState {
    return { username: '', displayName: '', roles: [] }
  }

  let createModalOpen = false
  let creating = false
  let createForm: CreateFormState = emptyCreateForm()
  let usernameError = ''
  let displayNameError = ''
  let rolesError = ''
  let createFormError = ''

  function openCreate(): void {
    createForm = emptyCreateForm()
    usernameError = ''
    displayNameError = ''
    rolesError = ''
    createFormError = ''
    createModalOpen = true
  }

  function closeCreateModal(): void {
    if (creating) return
    createModalOpen = false
  }

  async function submitCreate(): Promise<void> {
    usernameError = ''
    displayNameError = ''
    rolesError = ''
    createFormError = ''

    const username = createForm.username.trim()
    const displayName = createForm.displayName.trim()

    let hasError = false
    if (username.length < 3 || !/^[a-z0-9._-]+$/i.test(username)) {
      usernameError = 'Username must be at least 3 characters (letters, numbers, dot, underscore, hyphen only).'
      hasError = true
    }
    if (!displayName) {
      displayNameError = 'Display name is required.'
      hasError = true
    }
    if (createForm.roles.length === 0) {
      rolesError = 'Select at least one role.'
      hasError = true
    }
    if (hasError) return

    const input: CreateUserInput = { username, displayName, roles: createForm.roles }

    creating = true
    try {
      const result = await identityApi.createUser(input, api.newIdempotencyKey())
      toast.success('User created.')
      createModalOpen = false
      openPasswordReveal(result)
      await load()
    } catch (err) {
      if (err instanceof ApiError) createFormError = err.detail || err.message
      else if (err instanceof ApiNetworkError) createFormError = err.message
      else createFormError = 'Could not create the user.'
    } finally {
      creating = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // One-time temporary password reveal
  // -----------------------------------------------------------------------------------------
  let passwordModalOpen = false
  let createdUser: CreateUserResult | null = null
  let passwordCopied = false

  function openPasswordReveal(result: CreateUserResult): void {
    createdUser = result
    passwordCopied = false
    passwordModalOpen = true
  }

  function closePasswordModal(): void {
    passwordModalOpen = false
    createdUser = null
  }

  async function copyPassword(): Promise<void> {
    if (!createdUser) return
    try {
      await navigator.clipboard.writeText(createdUser.temporaryPassword)
      passwordCopied = true
      setTimeout(() => (passwordCopied = false), 2500)
    } catch {
      toast.error('Could not copy to clipboard -- select and copy the password manually.')
    }
  }

  // -----------------------------------------------------------------------------------------
  // Deactivate / reactivate
  // -----------------------------------------------------------------------------------------
  async function toggleActive(row: AdminUserRow): Promise<void> {
    const nextActive = !row.isActive
    activeActionUserId = row.userId
    try {
      await identityApi.setUserActive(row.userId, nextActive, api.newIdempotencyKey())
      toast.success(nextActive ? 'User reactivated.' : 'User deactivated.')
      await load()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not update the user.')
    } finally {
      activeActionUserId = null
    }
  }

  // -----------------------------------------------------------------------------------------
  // Role assignment
  // -----------------------------------------------------------------------------------------
  let rolesModalOpen = false
  let rolesSubmitting = false
  let rolesFormError = ''
  let rolesTarget: AdminUserRow | null = null
  let selectedRoles: string[] = []

  function openRoles(row: AdminUserRow): void {
    rolesTarget = row
    selectedRoles = [...row.roles]
    rolesFormError = ''
    rolesModalOpen = true
  }

  function closeRolesModal(): void {
    if (rolesSubmitting) return
    rolesModalOpen = false
    rolesTarget = null
  }

  async function submitRoles(): Promise<void> {
    if (!rolesTarget) return
    rolesFormError = ''
    if (selectedRoles.length === 0) {
      rolesFormError = 'Select at least one role.'
      return
    }

    rolesSubmitting = true
    try {
      await identityApi.replaceUserRoles(rolesTarget.userId, selectedRoles, api.newIdempotencyKey())
      toast.success('Roles updated.')
      rolesModalOpen = false
      rolesTarget = null
      await load()
    } catch (err) {
      if (err instanceof ApiError) rolesFormError = err.detail || err.message
      else if (err instanceof ApiNetworkError) rolesFormError = err.message
      else rolesFormError = 'Could not update roles.'
    } finally {
      rolesSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Wave 10b: create/clone/edit/enable-disable a custom role
  // -----------------------------------------------------------------------------------------
  type RoleFormState = { key: string; name: string; nameUr: string; description: string; clonedFromRoleKey: string }
  function emptyRoleForm(): RoleFormState {
    return { key: '', name: '', nameUr: '', description: '', clonedFromRoleKey: '' }
  }

  let roleModalOpen = false
  let roleModalMode: 'create' | 'edit' = 'create'
  let roleSubmitting = false
  let roleForm: RoleFormState = emptyRoleForm()
  let roleFormError = ''
  let editingRole: RoleRow | null = null
  let editIsEnabled = true

  function openCreateRole(): void {
    roleModalMode = 'create'
    roleForm = emptyRoleForm()
    roleFormError = ''
    editingRole = null
    roleModalOpen = true
  }
  function openCloneRole(source: RoleRow): void {
    roleModalMode = 'create'
    roleForm = { key: '', name: `${source.displayName} (copy)`, nameUr: '', description: `Cloned from ${source.displayName}.`, clonedFromRoleKey: source.roleKey }
    roleFormError = ''
    editingRole = null
    roleModalOpen = true
  }
  function openEditRole(role: RoleRow): void {
    roleModalMode = 'edit'
    editingRole = role
    roleForm = { key: role.roleKey, name: role.displayName, nameUr: role.displayNameUr ?? '', description: role.description ?? '', clonedFromRoleKey: '' }
    editIsEnabled = role.isEnabled
    roleFormError = ''
    roleModalOpen = true
  }
  function closeRoleModal(): void {
    if (roleSubmitting) return
    roleModalOpen = false
    editingRole = null
  }

  async function submitRole(): Promise<void> {
    roleFormError = ''
    if (roleModalMode === 'create') {
      const key = roleForm.key.trim().toLowerCase()
      if (!/^[a-z_]{3,32}$/.test(key)) {
        roleFormError = 'Role key must be 3-32 lowercase letters/underscores only.'
        return
      }
      if (!roleForm.name.trim()) {
        roleFormError = 'Name is required.'
        return
      }
      if (roleForm.description.trim().length < 1) {
        roleFormError = 'Description is required.'
        return
      }
      roleSubmitting = true
      try {
        await identityApi.createRole(
          { key, name: roleForm.name.trim(), nameUr: roleForm.nameUr.trim() || undefined, description: roleForm.description.trim(), clonedFromRoleKey: roleForm.clonedFromRoleKey || undefined },
          api.newIdempotencyKey(),
        )
        toast.success('Role created.')
        roleModalOpen = false
        await loadRoleCatalog()
      } catch (err) {
        if (err instanceof ApiError) roleFormError = err.detail || err.message
        else if (err instanceof ApiNetworkError) roleFormError = err.message
        else roleFormError = 'Could not create the role.'
      } finally {
        roleSubmitting = false
      }
    } else {
      if (!editingRole) return
      roleSubmitting = true
      try {
        await identityApi.updateRole(
          editingRole.roleKey,
          { name: roleForm.name.trim() || undefined, nameUr: roleForm.nameUr.trim() || null, description: roleForm.description.trim() || undefined, isEnabled: editIsEnabled },
          api.newIdempotencyKey(),
        )
        toast.success('Role updated.')
        roleModalOpen = false
        editingRole = null
        await loadRoleCatalog()
      } catch (err) {
        if (err instanceof ApiError) roleFormError = err.detail || err.message
        else if (err instanceof ApiNetworkError) roleFormError = err.message
        else roleFormError = 'Could not update the role.'
      } finally {
        roleSubmitting = false
      }
    }
  }

  // -----------------------------------------------------------------------------------------
  // Wave 10e/10f: role_scope -- per-scopeType allowed-id lists (comma-separated numeric ids).
  // Unrestricted (no row at all) until an admin explicitly configures a scopeType here.
  // -----------------------------------------------------------------------------------------
  const SCOPE_TYPES: RoleScopeType[] = ['warehouse', 'cash_bank_account', 'price_type', 'supplier_category', 'voucher_category']
  const SCOPE_TYPE_LABEL: Record<RoleScopeType, string> = {
    warehouse: 'Warehouse',
    cash_bank_account: 'Cash/bank account',
    price_type: 'Price type',
    supplier_category: 'Supplier category',
    voucher_category: 'Voucher category',
  }

  let scopesModalOpen = false
  let scopesLoading = false
  let scopesSubmitting = false
  let scopesError = ''
  let scopesTarget: RoleRow | null = null
  let scopesForm: Record<RoleScopeType, string> = Object.fromEntries(SCOPE_TYPES.map((t) => [t, ''])) as Record<RoleScopeType, string>

  function parseIdList(raw: string): number[] {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
  }

  async function openScopes(role: RoleRow): Promise<void> {
    scopesTarget = role
    scopesError = ''
    scopesForm = Object.fromEntries(SCOPE_TYPES.map((t) => [t, ''])) as Record<RoleScopeType, string>
    scopesModalOpen = true
    scopesLoading = true
    try {
      const current: RoleScopeList = await identityApi.getRoleScopes(role.roleKey)
      for (const entry of current) scopesForm[entry.scopeType] = entry.scopeValues.join(', ')
    } catch {
      scopesError = 'Could not load current scopes -- showing an empty (unrestricted) form.'
    } finally {
      scopesLoading = false
    }
  }
  function closeScopesModal(): void {
    if (scopesSubmitting) return
    scopesModalOpen = false
    scopesTarget = null
  }
  async function submitScopes(): Promise<void> {
    if (!scopesTarget) return
    scopesError = ''
    scopesSubmitting = true
    try {
      const scopes = SCOPE_TYPES.map((scopeType) => ({ scopeType, scopeValues: parseIdList(scopesForm[scopeType]) }))
      await identityApi.putRoleScopes(scopesTarget.roleKey, scopes, api.newIdempotencyKey())
      toast.success('Scopes updated.')
      scopesModalOpen = false
      scopesTarget = null
    } catch (err) {
      if (err instanceof ApiError) scopesError = err.detail || err.message
      else if (err instanceof ApiNetworkError) scopesError = err.message
      else scopesError = 'Could not update scopes.'
    } finally {
      scopesSubmitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Wave 10e: role_limit -- per-limitKey numeric ceiling. Effective limit across an actor's
  // roles is the MINIMUM of every role that has a configured row for that key.
  // -----------------------------------------------------------------------------------------
  const LIMIT_LABEL: Record<(typeof ROLE_LIMIT_KEYS)[number], string> = {
    max_txn_value: 'Max transaction value',
    max_qty: 'Max quantity per line',
    max_line_disc_pct: 'Max line discount %',
    max_inv_flat_disc: 'Max flat invoice discount',
    max_price_delta_pct: 'Max price override %',
  }

  let limitsModalOpen = false
  let limitsLoading = false
  let limitsSubmitting = false
  let limitsError = ''
  let limitsTarget: RoleRow | null = null
  let limitsForm: Record<string, string> = Object.fromEntries(ROLE_LIMIT_KEYS.map((k) => [k, ''])) as Record<string, string>

  async function openLimits(role: RoleRow): Promise<void> {
    limitsTarget = role
    limitsError = ''
    limitsForm = Object.fromEntries(ROLE_LIMIT_KEYS.map((k) => [k, ''])) as Record<string, string>
    limitsModalOpen = true
    limitsLoading = true
    try {
      const current: RoleLimitList = await identityApi.getRoleLimits(role.roleKey)
      for (const entry of current) limitsForm[entry.limitKey] = entry.limitValue
    } catch {
      limitsError = 'Could not load current limits -- showing an empty (unrestricted) form.'
    } finally {
      limitsLoading = false
    }
  }
  function closeLimitsModal(): void {
    if (limitsSubmitting) return
    limitsModalOpen = false
    limitsTarget = null
  }
  async function submitLimits(): Promise<void> {
    if (!limitsTarget) return
    limitsError = ''
    limitsSubmitting = true
    try {
      const limits = ROLE_LIMIT_KEYS.filter((k) => limitsForm[k]?.trim()).map((k) => ({ limitKey: k, limitValue: (limitsForm[k] ?? '').trim() }))
      await identityApi.putRoleLimits(limitsTarget.roleKey, limits, api.newIdempotencyKey())
      toast.success('Limits updated.')
      limitsModalOpen = false
      limitsTarget = null
    } catch (err) {
      if (err instanceof ApiError) limitsError = err.detail || err.message
      else if (err instanceof ApiNetworkError) limitsError = err.message
      else limitsError = 'Could not update limits.'
    } finally {
      limitsSubmitting = false
    }
  }

  onMount(() => {
    void load()
    void loadRoleCatalog()
  })
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Users &amp; roles</h1>
      <p class="text-body-sm mt-1 text-secondary-500">Manage staff accounts, access, and role assignments.</p>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn-theme-outline px-4 py-2 rounded-xl text-sm font-medium" on:click={load} disabled={loading}>
        <Icon icon={Icons.refresh} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        Refresh
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
        on:click={openCreate}
      >
        <Icon icon={Icons.userPlus} className="w-[18px] h-[18px]" width={18} height={18} />
        New user
      </button>
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Users table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Username</th>
            <th class={`${headClass} py-3 px-4`}>Display name</th>
            <th class={`${headClass} py-3 px-4`}>Roles</th>
            <th class={`${headClass} py-3 px-4`}>Status</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if loading}
            <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">Loading users…</td></tr>
          {:else if rows.length === 0}
            <tr><td colspan="5" class="py-10 px-4 text-center text-sm text-secondary-500">No users found.</td></tr>
          {:else}
            {#each rows as row (row.userId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>{row.username}</td>
                <td class={cellClass}>{row.displayName}</td>
                <td class={cellClass}>
                  <div class="flex flex-wrap gap-1">
                    {#each row.roles as roleKey (roleKey)}
                      <Badge tone="info">{roleLabel(roleKey)}</Badge>
                    {/each}
                  </div>
                </td>
                <td class={cellClass}>
                  <div class="flex flex-wrap items-center gap-1.5">
                    {#if row.isActive}
                      <Badge tone="success">Active</Badge>
                    {:else}
                      <Badge tone="danger">Locked</Badge>
                    {/if}
                    {#if row.mustChangePassword}
                      <Badge tone="warning">Temp password</Badge>
                    {/if}
                  </div>
                </td>
                <td class={`${cellClass} text-right`}>
                  <div class="inline-flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                      on:click={() => openRoles(row)}
                    >
                      <Icon icon={Icons.shield} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                      Manage roles
                    </button>
                    {#if row.isActive}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900 disabled:opacity-50"
                        disabled={activeActionUserId === row.userId}
                        on:click={() => toggleActive(row)}
                      >
                        {activeActionUserId === row.userId ? 'Deactivating…' : 'Deactivate'}
                      </button>
                    {:else}
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900 disabled:opacity-50"
                        disabled={activeActionUserId === row.userId}
                        on:click={() => toggleActive(row)}
                      >
                        {activeActionUserId === row.userId ? 'Reactivating…' : 'Reactivate'}
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <div class="flex items-center justify-between pt-2">
    <div>
      <h2 class="heading-4">Roles</h2>
      <p class="text-body-sm mt-1 text-secondary-500">Custom roles, per-role row-level scope, and per-role numeric limits (R-007).</p>
    </div>
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl text-sm font-medium transition-colors"
      on:click={openCreateRole}
    >
      <Icon icon={Icons.plus} className="w-[18px] h-[18px]" width={18} height={18} />
      New role
    </button>
  </div>

  <div class="card rounded-xl p-0 overflow-hidden">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Roles table">
      <table class="w-full">
        <thead class="bg-surface-50 dark:bg-surface-900/30">
          <tr>
            <th class={`${headClass} py-3 px-4`}>Role</th>
            <th class={`${headClass} py-3 px-4`}>Description</th>
            <th class={`${headClass} py-3 px-4`}>Status</th>
            <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
          {#if roleCatalogLoading}
            <tr><td colspan="4" class="py-10 px-4 text-center text-sm text-secondary-500">Loading roles…</td></tr>
          {:else if roleCatalog.length === 0}
            <tr><td colspan="4" class="py-10 px-4 text-center text-sm text-secondary-500">No roles found.</td></tr>
          {:else}
            {#each roleCatalog as role (role.roleId)}
              <tr class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors">
                <td class={`${cellClass} font-medium text-secondary-900 dark:text-white`}>
                  {role.displayName}
                  <span class="block text-xs text-secondary-400 font-normal">{role.roleKey}</span>
                </td>
                <td class={`${cellClass} max-w-sm`}>{role.description ?? '—'}</td>
                <td class={cellClass}>
                  <div class="flex flex-wrap items-center gap-1.5">
                    {#if role.isSystem}<Badge tone="info">System</Badge>{/if}
                    {#if role.isEnabled}<Badge tone="success">Enabled</Badge>{:else}<Badge tone="danger">Disabled</Badge>{/if}
                  </div>
                </td>
                <td class={`${cellClass} text-right`}>
                  <div class="inline-flex items-center gap-2 flex-wrap justify-end">
                    <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700" on:click={() => openEditRole(role)}>Edit</button>
                    <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700" on:click={() => openCloneRole(role)}>Clone</button>
                    <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700" on:click={() => openScopes(role)}>Scopes</button>
                    <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700" on:click={() => openLimits(role)}>Limits</button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Create user -->
<Modal open={createModalOpen} title="New user" widthClass="max-w-xl" onClose={closeCreateModal}>
  <form id="new-user-form" on:submit|preventDefault={submitCreate} class="space-y-4">
    <div>
      <label class={labelClass} for="user-username">Username <span class="text-danger-500">*</span></label>
      <input
        id="user-username"
        bind:value={createForm.username}
        class={inputClass + (usernameError ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
        placeholder="e.g. jdoe"
        autocomplete="off"
      />
      {#if usernameError}
        <p class="mt-1 text-xs text-danger-500">{usernameError}</p>
      {:else}
        <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">Letters, numbers, dot, underscore and hyphen only.</p>
      {/if}
    </div>

    <div>
      <label class={labelClass} for="user-display-name">Display name <span class="text-danger-500">*</span></label>
      <input
        id="user-display-name"
        bind:value={createForm.displayName}
        class={inputClass + (displayNameError ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
        placeholder="e.g. Jane Doe"
      />
      {#if displayNameError}<p class="mt-1 text-xs text-danger-500">{displayNameError}</p>{/if}
    </div>

    <div>
      <span class={labelClass}>Roles <span class="text-danger-500">*</span></span>
      {#if roleCatalogLoading}
        <p class="text-sm text-secondary-500">Loading roles…</p>
      {:else if roleCatalog.length === 0}
        <p class="text-sm text-secondary-500">No roles available.</p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-3">
          {#each roleCatalog as role (role.roleId)}
            <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
              <input type="checkbox" bind:group={createForm.roles} value={role.roleKey} class={checkboxClass} />
              {role.displayName}
            </label>
          {/each}
        </div>
      {/if}
      {#if rolesError}<p class="mt-1 text-xs text-danger-500">{rolesError}</p>{/if}
    </div>

    {#if createFormError}<p class="text-xs text-danger-500">{createFormError}</p>{/if}
  </form>

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeCreateModal}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={creating}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="new-user-form"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={creating}
    >
      {creating ? 'Creating…' : 'Create user'}
    </button>
  </svelte:fragment>
</Modal>

<!-- One-time temporary password reveal -->
<Modal open={passwordModalOpen} title="User created" widthClass="max-w-lg" onClose={closePasswordModal}>
  {#if createdUser}
    <div class="space-y-4">
      <div class="rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 p-4 text-sm flex items-start gap-2">
        <Icon icon={Icons.alertTriangle} className="w-5 h-5 shrink-0 mt-0.5" />
        <span>This temporary password is shown once and cannot be retrieved again. Share it with <strong>{createdUser.displayName}</strong> securely, then have them change it on first sign-in.</span>
      </div>

      <div>
        <span class={labelClass}>Username</span>
        <p class="text-sm font-medium text-secondary-900 dark:text-white">{createdUser.username}</p>
      </div>

      <div>
        <span class={labelClass} id="temp-password-label">Temporary password</span>
        <div class="flex items-center gap-2">
          <input
            readonly
            value={createdUser.temporaryPassword}
            aria-labelledby="temp-password-label"
            class={`${inputClass} font-mono tracking-wide`}
            on:click={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <button
            type="button"
            class="btn-theme-outline px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap"
            on:click={copyPassword}
          >
            {passwordCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closePasswordModal}
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
    >
      Done
    </button>
  </svelte:fragment>
</Modal>

<!-- Role assignment -->
<Modal open={rolesModalOpen} title={rolesTarget ? `Roles for ${rolesTarget.displayName}` : 'Manage roles'} widthClass="max-w-lg" onClose={closeRolesModal}>
  {#if rolesTarget}
    <form id="user-roles-form" on:submit|preventDefault={submitRoles}>
      {#if roleCatalogLoading}
        <p class="text-sm text-secondary-500">Loading roles…</p>
      {:else if roleCatalog.length === 0}
        <p class="text-sm text-secondary-500">No roles available.</p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-3">
          {#each roleCatalog as role (role.roleId)}
            <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
              <input type="checkbox" bind:group={selectedRoles} value={role.roleKey} class={checkboxClass} />
              {role.displayName}
            </label>
          {/each}
        </div>
      {/if}
      <p class="mt-2 text-xs text-secondary-500 dark:text-secondary-400">This replaces the user's entire role assignment -- at least one role must remain selected.</p>
      {#if rolesFormError}<p class="mt-2 text-xs text-danger-500">{rolesFormError}</p>{/if}
    </form>
  {/if}

  <svelte:fragment slot="footer">
    <button
      type="button"
      on:click={closeRolesModal}
      class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      disabled={rolesSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      form="user-roles-form"
      class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      disabled={rolesSubmitting}
    >
      {rolesSubmitting ? 'Saving…' : 'Save roles'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Create/clone/edit role -->
<Modal open={roleModalOpen} title={roleModalMode === 'create' ? 'New role' : `Edit ${editingRole?.displayName ?? 'role'}`} widthClass="max-w-lg" onClose={closeRoleModal}>
  <form id="role-form" on:submit|preventDefault={submitRole} class="space-y-4">
    {#if roleModalMode === 'create'}
      <div>
        <label class={labelClass} for="role-key">Role key <span class="text-danger-500">*</span></label>
        <input id="role-key" bind:value={roleForm.key} class={inputClass} placeholder="e.g. senior_cashier" autocomplete="off" />
        <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">3-32 lowercase letters/underscores only.</p>
      </div>
      {#if roleForm.clonedFromRoleKey}
        <p class="text-xs text-secondary-500">Cloning permission grants from <strong>{roleForm.clonedFromRoleKey}</strong> as a one-time starting point.</p>
      {/if}
    {/if}
    <div>
      <label class={labelClass} for="role-name">Name <span class="text-danger-500">*</span></label>
      <input id="role-name" bind:value={roleForm.name} class={inputClass} placeholder="e.g. Senior Cashier" />
    </div>
    <div>
      <label class={labelClass} for="role-name-ur">Name (Urdu, optional)</label>
      <input id="role-name-ur" bind:value={roleForm.nameUr} class={inputClass} dir="rtl" />
    </div>
    <div>
      <label class={labelClass} for="role-description">Description <span class="text-danger-500">*</span></label>
      <textarea id="role-description" bind:value={roleForm.description} rows="2" class={inputClass} placeholder="Plain-language description of what this role is for"></textarea>
    </div>
    {#if roleModalMode === 'edit' && editingRole}
      <div>
        <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
          <input type="checkbox" bind:checked={editIsEnabled} disabled={editingRole.isSystem} class={checkboxClass} />
          Enabled
        </label>
        {#if editingRole.isSystem}
          <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">A seeded system role can never be disabled.</p>
        {:else}
          <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">Disabling is the real "remove" action for a custom role -- it revokes access immediately for anyone still assigned it, and never hard-deletes the row.</p>
        {/if}
      </div>
    {/if}
    {#if roleFormError}<p class="text-xs text-danger-500">{roleFormError}</p>{/if}
  </form>
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeRoleModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={roleSubmitting}>Cancel</button>
    <button type="submit" form="role-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={roleSubmitting}>
      {roleSubmitting ? 'Saving…' : roleModalMode === 'create' ? 'Create role' : 'Save changes'}
    </button>
  </svelte:fragment>
</Modal>

<!-- Wave 10e/10f: role_scope editor -->
<Modal open={scopesModalOpen} title={scopesTarget ? `Scopes -- ${scopesTarget.displayName}` : 'Scopes'} widthClass="max-w-lg" onClose={closeScopesModal}>
  {#if scopesTarget}
    <form id="scopes-form" on:submit|preventDefault={submitScopes} class="space-y-4">
      <p class="text-xs text-secondary-500">A blank field means this role is UNRESTRICTED for that scope type. Enter a comma-separated list of ids to restrict it (e.g. "1, 4, 7").</p>
      {#if scopesLoading}
        <p class="text-sm text-secondary-500">Loading current scopes…</p>
      {:else}
        {#each SCOPE_TYPES as scopeType (scopeType)}
          <div>
            <label class={labelClass} for={`scope-${scopeType}`}>{SCOPE_TYPE_LABEL[scopeType]}</label>
            <input id={`scope-${scopeType}`} bind:value={scopesForm[scopeType]} class={inputClass} placeholder="Unrestricted" />
          </div>
        {/each}
      {/if}
      {#if scopesError}<p class="text-xs text-danger-500">{scopesError}</p>{/if}
    </form>
  {/if}
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeScopesModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={scopesSubmitting}>Cancel</button>
    <button type="submit" form="scopes-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={scopesSubmitting || scopesLoading}>{scopesSubmitting ? 'Saving…' : 'Save scopes'}</button>
  </svelte:fragment>
</Modal>

<!-- Wave 10e: role_limit editor -->
<Modal open={limitsModalOpen} title={limitsTarget ? `Limits -- ${limitsTarget.displayName}` : 'Limits'} widthClass="max-w-lg" onClose={closeLimitsModal}>
  {#if limitsTarget}
    <form id="limits-form" on:submit|preventDefault={submitLimits} class="space-y-4">
      <p class="text-xs text-secondary-500">A blank field means no ceiling for that key. If an actor holds multiple roles, the EFFECTIVE limit is the minimum across every role that has a configured value.</p>
      {#if limitsLoading}
        <p class="text-sm text-secondary-500">Loading current limits…</p>
      {:else}
        {#each ROLE_LIMIT_KEYS as limitKey (limitKey)}
          <DecimalInput bind:value={limitsForm[limitKey]} label={LIMIT_LABEL[limitKey]} id={`limit-${limitKey}`} scale={4} placeholder="No limit" />
        {/each}
      {/if}
      {#if limitsError}<p class="text-xs text-danger-500">{limitsError}</p>{/if}
    </form>
  {/if}
  <svelte:fragment slot="footer">
    <button type="button" on:click={closeLimitsModal} class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors" disabled={limitsSubmitting}>Cancel</button>
    <button type="submit" form="limits-form" class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" disabled={limitsSubmitting || limitsLoading}>{limitsSubmitting ? 'Saving…' : 'Save limits'}</button>
  </svelte:fragment>
</Modal>
