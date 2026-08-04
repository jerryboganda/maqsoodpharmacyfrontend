<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import Modal from './shared/Modal.svelte'
  import Badge from './shared/Badge.svelte'
  import DecimalInput from './shared/DecimalInput.svelte'
  import { catalogApi, api, ApiError, ApiNetworkError, formatMoney, formatQty } from '../../api'
  import type { ItemSummary, ItemDetail, PatchItemInput } from '../../api'
  import { toast } from '../../stores/toast'

  const inputClass = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClass = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const headClass = 'text-left text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const cellClass = 'py-3 px-4 text-sm text-secondary-800 dark:text-secondary-200'
  const checkboxClass = 'rounded border-surface-300 dark:border-surface-700 text-theme-primary focus:ring-theme-primary/30'
  const viewLabelClass = 'text-xs font-medium uppercase tracking-wide text-secondary-500 dark:text-secondary-400'
  const viewValueClass = 'text-sm text-secondary-900 dark:text-white mt-0.5'

  // -----------------------------------------------------------------------------------------
  // List state
  // -----------------------------------------------------------------------------------------
  let rows: ItemSummary[] = []
  let loading = true
  let loadError = ''
  let query = ''
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let deactivatingId: number | null = null

  async function load(q?: string): Promise<void> {
    loading = true
    loadError = ''
    try {
      const result = await catalogApi.listItems({ q: q || undefined, limit: 100 })
      rows = result.items
    } catch (err) {
      loadError = err instanceof ApiNetworkError ? err.message : 'Could not load items.'
    } finally {
      loading = false
    }
  }

  function onSearchInput(): void {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(query), 300)
  }

  // -----------------------------------------------------------------------------------------
  // Detail / edit modal
  // -----------------------------------------------------------------------------------------
  type EditFormValues = {
    customCode: string
    name: string
    nameLocal: string
    registrationNo: string
    packUnits: number | undefined
    allowDecimalQty: boolean
    salePrice: string
    purchasePrice: string
    minQty: string
    maxQty: string
    reorderQty: string
    hasExpiry: boolean
    expiryCaptureMode: 'required' | 'prompt' | 'off'
    shelfLifeDays: number | undefined
    storageLocation: string
    isControlledDrug: boolean
    notes: string
  }

  let detailModalOpen = false
  let detailLoading = false
  let detailError = ''
  let detailItem: ItemDetail | null = null

  let editing = false
  let editForm: EditFormValues | null = null
  let customCodeError = ''
  let nameError = ''
  let editFormError = ''
  let submitting = false

  function formToDetail(detail: ItemDetail): EditFormValues {
    return {
      customCode: detail.customCode,
      name: detail.name,
      nameLocal: detail.nameLocal ?? '',
      registrationNo: detail.registrationNo ?? '',
      packUnits: detail.packUnits,
      allowDecimalQty: detail.allowDecimalQty,
      salePrice: detail.salePrice,
      purchasePrice: detail.purchasePrice,
      minQty: detail.minQty ?? '',
      maxQty: detail.maxQty ?? '',
      reorderQty: detail.reorderQty ?? '',
      hasExpiry: detail.hasExpiry,
      expiryCaptureMode: detail.expiryCaptureMode,
      shelfLifeDays: detail.shelfLifeDays ?? undefined,
      storageLocation: detail.storageLocation ?? '',
      isControlledDrug: detail.isControlledDrug,
      notes: detail.notes ?? '',
    }
  }

  /** Only the fields that actually changed, matching item.dto.ts's PatchItemSchema -- the backend
   *  rejects an empty PATCH, and there is no way to null out an already-set field through this
   *  endpoint (every optional field is a plain string/number/boolean, never `.nullable()`), so an
   *  unchanged field is simply omitted rather than resent. */
  function diffPatch(original: ItemDetail, form: EditFormValues): PatchItemInput {
    const patch: PatchItemInput = {}
    if (form.customCode.trim() !== original.customCode) patch.customCode = form.customCode.trim()
    if (form.name.trim() !== original.name) patch.name = form.name.trim()
    if (form.nameLocal.trim() !== (original.nameLocal ?? '')) patch.nameLocal = form.nameLocal.trim()
    if (form.registrationNo.trim() !== (original.registrationNo ?? '')) patch.registrationNo = form.registrationNo.trim()
    if (form.packUnits !== undefined && form.packUnits !== original.packUnits) patch.packUnits = form.packUnits
    if (form.allowDecimalQty !== original.allowDecimalQty) patch.allowDecimalQty = form.allowDecimalQty
    if (form.salePrice.trim() !== original.salePrice) patch.salePrice = form.salePrice.trim()
    if (form.purchasePrice.trim() !== original.purchasePrice) patch.purchasePrice = form.purchasePrice.trim()
    if (form.minQty.trim() !== (original.minQty ?? '')) patch.minQty = form.minQty.trim()
    if (form.maxQty.trim() !== (original.maxQty ?? '')) patch.maxQty = form.maxQty.trim()
    if (form.reorderQty.trim() !== (original.reorderQty ?? '')) patch.reorderQty = form.reorderQty.trim()
    if (form.hasExpiry !== original.hasExpiry) patch.hasExpiry = form.hasExpiry
    if (form.expiryCaptureMode !== original.expiryCaptureMode) patch.expiryCaptureMode = form.expiryCaptureMode
    if (form.shelfLifeDays !== undefined && form.shelfLifeDays !== (original.shelfLifeDays ?? undefined)) patch.shelfLifeDays = form.shelfLifeDays
    if (form.storageLocation.trim() !== (original.storageLocation ?? '')) patch.storageLocation = form.storageLocation.trim()
    if (form.isControlledDrug !== original.isControlledDrug) patch.isControlledDrug = form.isControlledDrug
    if (form.notes.trim() !== (original.notes ?? '')) patch.notes = form.notes.trim()
    return patch
  }

  $: hasChanges = detailItem !== null && editForm !== null ? Object.keys(diffPatch(detailItem, editForm)).length > 0 : false

  async function openDetail(row: ItemSummary): Promise<void> {
    detailModalOpen = true
    detailLoading = true
    detailError = ''
    detailItem = null
    editing = false
    editForm = null
    try {
      detailItem = await catalogApi.getItem(row.itemId)
    } catch (err) {
      detailError = err instanceof ApiNetworkError ? err.message : err instanceof ApiError ? err.detail : 'Could not load this item.'
    } finally {
      detailLoading = false
    }
  }

  function closeDetailModal(): void {
    if (submitting) return
    detailModalOpen = false
    detailItem = null
    editing = false
    editForm = null
  }

  function startEdit(): void {
    if (!detailItem) return
    editForm = formToDetail(detailItem)
    customCodeError = ''
    nameError = ''
    editFormError = ''
    editing = true
  }

  function cancelEdit(): void {
    editing = false
    editForm = null
    customCodeError = ''
    nameError = ''
    editFormError = ''
  }

  async function submitEdit(): Promise<void> {
    if (!detailItem || !editForm) return
    customCodeError = ''
    nameError = ''
    editFormError = ''

    if (!editForm.customCode.trim()) {
      customCodeError = 'Item code is required.'
      return
    }
    if (!editForm.name.trim()) {
      nameError = 'Name is required.'
      return
    }

    const patch = diffPatch(detailItem, editForm)
    if (Object.keys(patch).length === 0) {
      editFormError = 'No changes to save.'
      return
    }

    submitting = true
    try {
      const updated = await catalogApi.updateItem(detailItem.itemId, patch, api.newIdempotencyKey())
      toast.success('Item updated.')
      detailItem = updated
      editing = false
      editForm = null
      await load(query)
    } catch (err) {
      if (err instanceof ApiError) editFormError = err.detail || err.message
      else if (err instanceof ApiNetworkError) editFormError = err.message
      else editFormError = 'Could not update the item.'
    } finally {
      submitting = false
    }
  }

  // -----------------------------------------------------------------------------------------
  // Deactivate -- R1/00b D7: never a hard delete. There is no reactivate endpoint yet
  // (items.service.ts's `deactivate` doc comment: "out of scope for this task"), so an already-
  // inactive row simply has no action here -- add a reactivate button the same shape as
  // UsersRolesPage's `toggleActive` once the backend grows one.
  // -----------------------------------------------------------------------------------------
  async function deactivate(row: ItemSummary): Promise<void> {
    deactivatingId = row.itemId
    try {
      await catalogApi.deactivateItem(row.itemId, api.newIdempotencyKey())
      toast.success('Item deactivated.')
      if (detailItem && detailItem.itemId === row.itemId) {
        detailItem = { ...detailItem, isActive: false }
      }
      await load(query)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail)
      else if (err instanceof ApiNetworkError) toast.error(err.message)
      else toast.error('Could not deactivate the item.')
    } finally {
      deactivatingId = null
    }
  }

  onMount(() => load())
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="heading-2">Items</h1>
      <p class="text-body-sm mt-1 text-secondary-500">View, edit and deactivate items in the catalog.</p>
    </div>
  </div>

  {#if loadError}
    <div class="card border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 p-4 text-sm">
      {loadError}
    </div>
  {/if}

  <div class="card">
    <div class="relative max-w-md">
      <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
      <input
        bind:value={query}
        on:input={onSearchInput}
        class={`${inputClass} pl-10`}
        placeholder="Search items by name or code…"
        aria-label="Search items"
      />
    </div>

    <div class="mt-5 rounded-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Items table">
        <table class="w-full">
          <thead class="bg-surface-50 dark:bg-surface-900/30">
            <tr>
              <th class={`${headClass} py-3 px-4`}>Code</th>
              <th class={`${headClass} py-3 px-4`}>Name</th>
              <th class={`${headClass} py-3 px-4`}>Pack units</th>
              <th class={`${headClass} py-3 px-4`}>Sale price</th>
              <th class={`${headClass} py-3 px-4`}>Purchase price</th>
              <th class={`${headClass} py-3 px-4`}>Status</th>
              <th class={`${headClass} py-3 px-4 text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
            {#if loading}
              <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">Loading items…</td></tr>
            {:else if rows.length === 0}
              <tr><td colspan="7" class="py-10 px-4 text-center text-sm text-secondary-500">No items found.</td></tr>
            {:else}
              {#each rows as row (row.itemId)}
                <tr
                  class="hover:bg-surface-50 dark:hover:bg-surface-900/20 transition-colors cursor-pointer"
                  on:click={() => openDetail(row)}
                >
                  <td class={cellClass}>{row.customCode}</td>
                  <td class={cellClass}>
                    <div class="font-medium text-secondary-900 dark:text-white">{row.name}</div>
                    {#if row.nameLocal}
                      <div class="text-xs text-secondary-500 dark:text-secondary-400">{row.nameLocal}</div>
                    {/if}
                  </td>
                  <td class={cellClass}>{row.packUnits}</td>
                  <td class={cellClass}>{formatMoney(row.salePrice)}</td>
                  <td class={cellClass}>{formatMoney(row.purchasePrice)}</td>
                  <td class={cellClass}>
                    {#if row.isActive}
                      <Badge tone="success">Active</Badge>
                    {:else}
                      <Badge tone="neutral">Inactive</Badge>
                    {/if}
                  </td>
                  <td class={`${cellClass} text-right`}>
                    <div class="inline-flex items-center gap-2" on:click|stopPropagation role="presentation">
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        on:click={() => openDetail(row)}
                      >
                        <Icon icon={Icons.eye} className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                        View
                      </button>
                      {#if row.isActive}
                        <button
                          type="button"
                          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 dark:bg-danger-950 text-danger-700 dark:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900 disabled:opacity-50"
                          disabled={deactivatingId === row.itemId}
                          on:click={() => deactivate(row)}
                        >
                          {deactivatingId === row.itemId ? 'Deactivating…' : 'Deactivate'}
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
  </div>
</div>

<!-- Item detail / edit -->
<Modal
  open={detailModalOpen}
  title={detailItem ? detailItem.name : 'Item'}
  widthClass="max-w-3xl"
  onClose={closeDetailModal}
>
  {#if detailLoading}
    <p class="text-sm text-secondary-500">Loading item…</p>
  {:else if detailError}
    <p class="text-sm text-danger-500">{detailError}</p>
  {:else if detailItem}
    {#if !editing}
      <div class="space-y-5">
        <div class="flex items-center gap-2">
          {#if detailItem.isActive}
            <Badge tone="success">Active</Badge>
          {:else}
            <Badge tone="neutral">Inactive</Badge>
          {/if}
          {#if detailItem.isControlledDrug}
            <Badge tone="warning">Controlled drug</Badge>
          {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><span class={viewLabelClass}>Code</span><p class={viewValueClass}>{detailItem.customCode}</p></div>
          <div><span class={viewLabelClass}>Name</span><p class={viewValueClass}>{detailItem.name}</p></div>
          <div><span class={viewLabelClass}>Name (local)</span><p class={viewValueClass}>{detailItem.nameLocal || '—'}</p></div>
          <div><span class={viewLabelClass}>Registration no.</span><p class={viewValueClass}>{detailItem.registrationNo || '—'}</p></div>
          <div><span class={viewLabelClass}>Pack units</span><p class={viewValueClass}>{detailItem.packUnits}</p></div>
          <div><span class={viewLabelClass}>Allow decimal qty</span><p class={viewValueClass}>{detailItem.allowDecimalQty ? 'Yes' : 'No'}</p></div>
          <div><span class={viewLabelClass}>Sale price</span><p class={viewValueClass}>{formatMoney(detailItem.salePrice)}</p></div>
          <div><span class={viewLabelClass}>Purchase price</span><p class={viewValueClass}>{formatMoney(detailItem.purchasePrice)}</p></div>
          <div><span class={viewLabelClass}>Avg. unit cost</span><p class={viewValueClass}>{formatMoney(detailItem.avgUnitCost)}</p></div>
          <div><span class={viewLabelClass}>Min qty</span><p class={viewValueClass}>{formatQty(detailItem.minQty)}</p></div>
          <div><span class={viewLabelClass}>Max qty</span><p class={viewValueClass}>{formatQty(detailItem.maxQty)}</p></div>
          <div><span class={viewLabelClass}>Reorder qty</span><p class={viewValueClass}>{formatQty(detailItem.reorderQty)}</p></div>
          <div><span class={viewLabelClass}>Has expiry</span><p class={viewValueClass}>{detailItem.hasExpiry ? 'Yes' : 'No'}</p></div>
          <div><span class={viewLabelClass}>Expiry capture</span><p class={viewValueClass}>{detailItem.expiryCaptureMode}</p></div>
          <div><span class={viewLabelClass}>Shelf life (days)</span><p class={viewValueClass}>{detailItem.shelfLifeDays ?? '—'}</p></div>
          <div><span class={viewLabelClass}>Storage location</span><p class={viewValueClass}>{detailItem.storageLocation || '—'}</p></div>
          <div class="sm:col-span-2"><span class={viewLabelClass}>Notes</span><p class={viewValueClass}>{detailItem.notes || '—'}</p></div>
        </div>
      </div>
    {:else if editForm}
      <form id="edit-item-form" on:submit|preventDefault={submitEdit}>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class={labelClass} for="item-code">Item code <span class="text-danger-500">*</span></label>
            <input
              id="item-code"
              bind:value={editForm.customCode}
              class={inputClass + (customCodeError ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
            />
            {#if customCodeError}<p class="mt-1 text-xs text-danger-500">{customCodeError}</p>{/if}
          </div>

          <div>
            <label class={labelClass} for="item-name">Name <span class="text-danger-500">*</span></label>
            <input
              id="item-name"
              bind:value={editForm.name}
              class={inputClass + (nameError ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')}
            />
            {#if nameError}<p class="mt-1 text-xs text-danger-500">{nameError}</p>{/if}
          </div>

          <div>
            <label class={labelClass} for="item-name-local">Name (local)</label>
            <input id="item-name-local" bind:value={editForm.nameLocal} class={inputClass} dir="rtl" />
          </div>

          <div>
            <label class={labelClass} for="item-registration-no">Registration no.</label>
            <input id="item-registration-no" bind:value={editForm.registrationNo} class={inputClass} />
          </div>

          <div>
            <label class={labelClass} for="item-pack-units">Pack units</label>
            <input id="item-pack-units" type="number" min="1" step="1" bind:value={editForm.packUnits} class={inputClass} />
          </div>

          <div class="flex items-center pt-6">
            <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
              <input type="checkbox" bind:checked={editForm.allowDecimalQty} class={checkboxClass} />
              Allow decimal quantity
            </label>
          </div>

          <DecimalInput label="Sale price" id="item-sale-price" bind:value={editForm.salePrice} scale={4} prefix="Rs" />
          <DecimalInput label="Purchase price" id="item-purchase-price" bind:value={editForm.purchasePrice} scale={4} prefix="Rs" />
          <DecimalInput label="Min qty" id="item-min-qty" bind:value={editForm.minQty} scale={4} placeholder="0.0000" />
          <DecimalInput label="Max qty" id="item-max-qty" bind:value={editForm.maxQty} scale={4} placeholder="0.0000" />
          <DecimalInput label="Reorder qty" id="item-reorder-qty" bind:value={editForm.reorderQty} scale={4} placeholder="0.0000" />

          <div>
            <label class={labelClass} for="item-expiry-mode">Expiry capture</label>
            <select id="item-expiry-mode" bind:value={editForm.expiryCaptureMode} class={inputClass}>
              <option value="required">Required</option>
              <option value="prompt">Prompt</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div class="flex items-center pt-6">
            <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
              <input type="checkbox" bind:checked={editForm.hasExpiry} class={checkboxClass} />
              Has expiry
            </label>
          </div>

          <div>
            <label class={labelClass} for="item-shelf-life">Shelf life (days)</label>
            <input id="item-shelf-life" type="number" min="0" step="1" bind:value={editForm.shelfLifeDays} class={inputClass} />
          </div>

          <div>
            <label class={labelClass} for="item-storage-location">Storage location</label>
            <input id="item-storage-location" bind:value={editForm.storageLocation} class={inputClass} />
          </div>

          <div class="flex items-center pt-6">
            <label class="inline-flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
              <input type="checkbox" bind:checked={editForm.isControlledDrug} class={checkboxClass} />
              Controlled drug
            </label>
          </div>

          <div class="sm:col-span-2">
            <label class={labelClass} for="item-notes">Notes</label>
            <textarea id="item-notes" rows="3" bind:value={editForm.notes} class={inputClass}></textarea>
          </div>
        </div>

        {#if editFormError}<p class="mt-3 text-xs text-danger-500">{editFormError}</p>{/if}
      </form>
    {/if}
  {/if}

  <svelte:fragment slot="footer">
    {#if detailItem && !detailLoading && !detailError}
      {#if !editing}
        <button
          type="button"
          on:click={closeDetailModal}
          class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          on:click={startEdit}
          class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Icon icon={Icons.edit} className="w-4 h-4 inline -mt-0.5 mr-1.5" />
          Edit
        </button>
      {:else}
        <button
          type="button"
          on:click={cancelEdit}
          class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="edit-item-form"
          class="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={submitting || !hasChanges}
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      {/if}
    {:else}
      <button
        type="button"
        on:click={closeDetailModal}
        class="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      >
        Close
      </button>
    {/if}
  </svelte:fragment>
</Modal>
