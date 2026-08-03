<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import type { Query, QueryFilter, QueryExportFormat } from '../../../features/query-builder/types'
  import { queryFields, queryPresets, getFieldByName, getFieldsByCategory, getOperatorsForType } from '../../../features/query-builder/config'
  import { createEmptyFilter, createEmptyQuery, executeQuery, exportQuery, isFilterGroup } from '../../../features/query-builder/engine'

  type QueryResult = ReturnType<typeof executeQuery<Record<string, unknown>>>
  type InputEventWithTarget = Event & { currentTarget: HTMLInputElement | HTMLSelectElement }

  const sampleData: Record<string, unknown>[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', age: 28, role: 'admin', createdAt: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', age: 34, role: 'user', createdAt: '2024-02-20' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', status: 'inactive', age: 45, role: 'user', createdAt: '2024-01-10' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', age: 29, role: 'moderator', createdAt: '2024-03-05' },
    { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', status: 'pending', age: 52, role: 'user', createdAt: '2024-02-28' },
    { id: 6, name: 'Diana Evans', email: 'diana@example.com', status: 'active', age: 31, role: 'admin', createdAt: '2024-01-22' },
    { id: 7, name: 'Edward Foster', email: 'edward@example.com', status: 'inactive', age: 38, role: 'user', createdAt: '2024-03-10' },
    { id: 8, name: 'Fiona Green', email: 'fiona@example.com', status: 'active', age: 26, role: 'user', createdAt: '2024-02-14' },
  ]

  let query: Query = createEmptyQuery()
  let result: QueryResult | null = null
  let lastExecutedAt = ''
  let isExecuting = false
  let showPresets = false
  let showExport = false
  let openFieldId: string | null = null
  let exportFormat: QueryExportFormat = 'sql'
  const fieldsByCategory = getFieldsByCategory()

  $: totalFilters = countFilters(query.filterGroup)
  $: fieldCategories = new Set(queryFields.map((field) => field.category)).size
  $: filters = query.filterGroup.filters.filter((item): item is QueryFilter => !isFilterGroup(item))
  $: exportedQuery = exportQuery(query, exportFormat)

  function countFilters(group: Query['filterGroup']): number {
    return group.filters.reduce((count, item) => count + (isFilterGroup(item) ? countFilters(item) : 1), 0)
  }

  function eventValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLSelectElement).value
  }

  function updateQuery(patch: Partial<Query>): void {
    query = { ...query, ...patch, updatedAt: new Date().toISOString() }
  }

  function updateFilter(id: string, patch: Partial<QueryFilter>): void {
    query = {
      ...query,
      updatedAt: new Date().toISOString(),
      filterGroup: {
        ...query.filterGroup,
        filters: query.filterGroup.filters.map((item) => !isFilterGroup(item) && item.id === id ? { ...item, ...patch } : item),
      },
    }
  }

  function changeFilterField(id: string, fieldName: string): void {
    const field = queryFields.find((item) => item.name === fieldName)
    updateFilter(id, {
      field: fieldName,
      fieldType: field?.type ?? 'string',
      operator: getOperatorsForType(field?.type ?? 'string')[0]?.value ?? 'eq',
      value: field?.type === 'number' ? 0 : '',
    })
    openFieldId = null
  }

  function addFilter(): void {
    query = { ...query, filterGroup: { ...query.filterGroup, filters: [...query.filterGroup.filters, createEmptyFilter()] } }
  }

  function removeFilter(id: string): void {
    const next = query.filterGroup.filters.filter((item) => item.id !== id)
    query = { ...query, filterGroup: { ...query.filterGroup, filters: next.length ? next : [createEmptyFilter()] } }
  }

  function clearQuery(): void {
    query = createEmptyQuery()
    result = null
    lastExecutedAt = ''
  }

  async function execute(): Promise<void> {
    isExecuting = true
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    result = executeQuery(query, sampleData)
    lastExecutedAt = new Date().toISOString()
    isExecuting = false
  }

  function loadPreset(id: string): void {
    const preset = queryPresets.find((item) => item.id === id)
    if (!preset) return
    query = { ...createEmptyQuery(), ...JSON.parse(JSON.stringify(preset.query)), id: query.id }
    showPresets = false
  }

  function toggleLogic(logic: 'AND' | 'OR'): void {
    query = { ...query, filterGroup: { ...query.filterGroup, logic } }
  }
</script>
<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-info-100 dark:bg-info-900/40 flex items-center justify-center">
          <Icon icon={Icons.queryBuilder} className="w-5 h-5 text-info-600 dark:text-info-400" />
        </div>
        <div>
          <h1 class="heading-2 text-secondary-900 dark:text-white">Query Builder</h1>
          <p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-0.5">Build complex queries with nested filters and export to SQL/JSON</p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <div class="relative">
        <button type="button" on:click={() => (showPresets = !showPresets)} class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
          <Icon icon={Icons.bookmark} className="w-4 h-4" />Presets
        </button>
        {#if showPresets}
          <div class="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 z-50 overflow-hidden">
            <div class="p-3 border-b border-surface-200 dark:border-surface-700"><h4 class="font-semibold text-secondary-900 dark:text-white mb-2">Query Presets</h4><p class="text-xs text-secondary-500 dark:text-secondary-400">Pre-built query templates</p></div>
            <div class="max-h-80 overflow-y-auto p-2">
              {#each queryPresets as preset}
                <button type="button" on:click={() => loadPreset(preset.id)} class="w-full p-3 rounded-lg text-left hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"><div class="font-medium text-secondary-900 dark:text-white text-sm">{preset.name}</div><div class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{preset.description}</div></button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <button type="button" on:click={() => { exportFormat = 'json'; showExport = !showExport }} class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"><Icon icon={Icons.code} className="w-4 h-4" />JSON</button>
      <button type="button" on:click={() => { exportFormat = 'sql'; showExport = !showExport }} class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"><Icon icon={Icons.database} className="w-4 h-4" />SQL</button>
      <button type="button" aria-label="Reset query" on:click={clearQuery} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors text-secondary-500"><Icon icon={Icons.trash} className="w-5 h-5" /></button>
      <button type="button" on:click={execute} disabled={isExecuting} class="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"><Icon icon={isExecuting ? Icons.refresh : Icons.bolt} className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />Execute</button>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow"><div class="flex items-center justify-between mb-4"><div class="w-11 h-11 rounded-xl bg-info-100 dark:bg-info-900/40 flex items-center justify-center"><Icon icon={Icons.filter} className="w-5 h-5 text-info-600 dark:text-info-400" /></div></div><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Filters</p><p class="heading-3 text-secondary-900 dark:text-white mt-1">{totalFilters}</p></div>
    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow"><div class="flex items-center justify-between mb-4"><div class="w-11 h-11 rounded-xl bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center"><Icon icon={Icons.layoutGrid} className="w-5 h-5 text-accent-600 dark:text-accent-400" /></div></div><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Categories</p><p class="heading-3 text-secondary-900 dark:text-white mt-1">{fieldCategories}</p></div>
    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow"><div class="flex items-center justify-between mb-4"><div class="w-11 h-11 rounded-xl bg-success-100 dark:bg-success-900/40 flex items-center justify-center"><Icon icon={Icons.circleCheck} className="w-5 h-5 text-success-600 dark:text-success-400" /></div></div><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Results</p><p class="heading-3 text-secondary-900 dark:text-white mt-1">{result?.filtered ?? 0}</p></div>
    <div class="card rounded-xl p-5 hover:shadow-md transition-shadow"><div class="flex items-center justify-between mb-4"><div class="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center"><Icon icon={Icons.clock} className="w-5 h-5 text-primary-600 dark:text-primary-400" /></div></div><p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">Last Run</p><p class="text-lg font-semibold text-secondary-900 dark:text-white mt-1">{lastExecutedAt ? new Date(lastExecutedAt).toLocaleTimeString() : 'Never'}</p></div>
  </div>

  <div class="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
    <div class="px-6 py-5 bg-gradient-to-r from-accent-500 to-primary-500">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3"><div class="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl"><Icon icon={Icons.filter} className="w-6 h-6 text-white" /></div><div><h2 class="text-xl font-bold text-white">Query Builder</h2><p class="text-sm text-white/80">Build complex filters with nested conditions</p></div></div>
        <div class="flex items-center gap-2"><button type="button" on:click={() => (showPresets = !showPresets)} class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Icon icon={Icons.bookmark} className="w-4 h-4" />Presets</button><button type="button" on:click={() => (showExport = !showExport)} class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Icon icon={Icons.code} className="w-4 h-4" />Export</button><button type="button" on:click={execute} class="flex items-center gap-2 px-5 py-2.5 bg-white text-accent-600 text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"><Icon icon={Icons.arrowRight} className="w-4 h-4" />Run Query</button></div>
      </div>
    </div>
    {#if showPresets}
      <div class="px-6 py-4 bg-gradient-to-r from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/20 border-b border-surface-200 dark:border-surface-700"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Query Presets</h3><button type="button" on:click={() => (showPresets = false)} class="p-1 text-secondary-400"><Icon icon={Icons.close} className="w-4 h-4" /></button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{#each queryPresets as preset}<button type="button" on:click={() => loadPreset(preset.id)} class="flex items-start gap-3 p-3 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-accent-300 hover:shadow-md transition-all text-left"><div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-lg"><Icon icon={preset.icon} className="w-5 h-5 text-secondary-500" /></div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-secondary-900 dark:text-white truncate">{preset.name}</p><p class="text-xs text-secondary-500 line-clamp-2">{preset.description}</p></div></button>{/each}</div></div>
    {/if}
    <div class="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50"><div class="flex flex-col sm:flex-row gap-4"><div class="flex-1"><label for="query-name" class="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5 uppercase tracking-wide">Query Name</label><input id="query-name" value={query.name} on:input={(event) => updateQuery({ name: eventValue(event) })} placeholder="Enter a name for this query..." class="w-full px-4 py-2.5 text-sm font-medium bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all" /></div><div class="flex-1"><label for="query-description" class="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5 uppercase tracking-wide">Description</label><input id="query-description" value={query.description} on:input={(event) => updateQuery({ description: eventValue(event) })} placeholder="What does this query do?" class="w-full px-4 py-2.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all" /></div></div></div>
    <div class="p-6"><div class="flex items-center justify-between mb-4"><div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Filters</h3><p class="text-sm text-secondary-500 dark:text-secondary-400">Define conditions to filter your data</p></div><button type="button" on:click={clearQuery} class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-600 dark:text-secondary-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"><Icon icon={Icons.refresh} className="w-3.5 h-3.5" />Clear All</button></div>
      <div class="relative rounded-xl border-2 border-dashed p-4 transition-all border-accent-500/50 bg-accent-50/30 dark:bg-accent-900/10"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="flex items-center bg-surface-100 dark:bg-surface-800 rounded-lg p-1"><button type="button" on:click={() => toggleLogic('AND')} class={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${query.filterGroup.logic === 'AND' ? 'bg-accent-500 text-white shadow-sm' : 'text-secondary-600 dark:text-secondary-400'}`}>AND</button><button type="button" on:click={() => toggleLogic('OR')} class={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${query.filterGroup.logic === 'OR' ? 'bg-primary-500 text-white shadow-sm' : 'text-secondary-600 dark:text-secondary-400'}`}>OR</button></div><span class="text-xs text-secondary-500 dark:text-secondary-400">{query.filterGroup.filters.length} filter{query.filterGroup.filters.length !== 1 ? 's' : ''}</span></div><div class="flex items-center gap-2"><button type="button" on:click={addFilter} class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 dark:bg-accent-900/30 rounded-lg hover:bg-accent-100 transition-colors"><Icon icon={Icons.plus} className="w-3.5 h-3.5" />Filter</button><button type="button" on:click={addFilter} class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 transition-colors"><Icon icon={Icons.plus} className="w-3.5 h-3.5" />Group</button></div></div>
        <div class="space-y-3">
          {#each filters as filter, index}
            {@const selectedField = getFieldByName(filter.field)}
            {@const operators = getOperatorsForType(filter.fieldType || 'string')}
            <div class="relative">
              {#if index > 0}<div class="absolute -top-3 left-6"><span class="px-2 py-0.5 text-[10px] font-bold rounded bg-accent-100 text-accent-700">{query.filterGroup.logic}</span></div>{/if}
              <div class="flex items-start gap-3 p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm group hover:shadow-md transition-shadow">
                <div class="relative flex-1 min-w-[160px]">
                  <button type="button" on:click={() => (openFieldId = openFieldId === filter.id ? null : filter.id)} class="w-full flex items-center justify-between px-3 py-2 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-accent-300 dark:hover:border-accent-600 transition-colors">
                    <span class={selectedField ? 'text-secondary-900 dark:text-white' : 'text-secondary-400'}>{selectedField?.label ?? 'Select field...'}</span>
                    <Icon icon={Icons.chevronDown} className="w-4 h-4 text-secondary-400" />
                  </button>
                  {#if openFieldId === filter.id}
                    <div class="absolute z-50 top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl">
                      {#each Object.entries(fieldsByCategory) as [categoryName, categoryFields]}
                        <div><div class="px-3 py-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400 bg-surface-50 dark:bg-surface-900 sticky top-0">{categoryName}</div>{#each categoryFields as field}<button type="button" on:click={() => changeFilterField(filter.id, field.name)} class={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent-50 dark:hover:bg-accent-900/30 transition-colors ${filter.field === field.name ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300' : 'text-secondary-700 dark:text-secondary-300'}`}><span class="text-xs px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-secondary-500 dark:text-secondary-400">{field.type}</span>{field.label}</button>{/each}</div>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="flex-1 min-w-[140px]"><select aria-label="Operator" value={filter.operator} on:change={(event) => updateFilter(filter.id, { operator: eventValue(event) as QueryFilter['operator'] })} class="w-full px-3 py-2 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all">{#each operators as operator}<option value={operator.value}>{operator.label}</option>{/each}</select></div>
                {#if filter.operator !== 'is_null' && filter.operator !== 'is_not_null'}
                  <div class="flex-1 min-w-[140px]">
                    {#if selectedField?.options}<select aria-label={`${selectedField.label} value`} value={String(filter.value ?? '')} on:change={(event) => updateFilter(filter.id, { value: eventValue(event) })} class="w-full px-3 py-2 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"><option value="">Select...</option>{#each selectedField.options as option}<option value={option.value}>{option.label}</option>{/each}</select>{:else}<input aria-label={`${selectedField?.label ?? 'Filter'} value`} value={String(filter.value ?? '')} type={filter.fieldType === 'number' ? 'number' : filter.fieldType === 'date' ? 'date' : 'text'} on:input={(event) => updateFilter(filter.id, { value: filter.fieldType === 'number' ? Number(eventValue(event)) : eventValue(event) })} placeholder="Value..." class="w-full px-3 py-2 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all" />{/if}
                  </div>
                  {#if filter.operator === 'between'}<span class="self-center text-secondary-400">and</span><div class="flex-1 min-w-[140px]"><input aria-label={`${selectedField?.label ?? 'Filter'} ending value`} value={String(filter.secondValue ?? '')} type={filter.fieldType === 'number' ? 'number' : filter.fieldType === 'date' ? 'date' : 'text'} on:input={(event) => updateFilter(filter.id, { secondValue: filter.fieldType === 'number' ? Number(eventValue(event)) : eventValue(event) })} placeholder="Value..." class="w-full px-3 py-2 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all" /></div>{/if}
                {/if}
                <button type="button" aria-label="Remove filter" on:click={() => removeFilter(filter.id)} class="p-2 text-secondary-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Icon icon={Icons.trash} className="w-4 h-4" /></button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50"><div class="flex flex-wrap items-center gap-4"><div class="flex items-center gap-2"><label for="query-sort" class="text-xs font-medium text-secondary-500 dark:text-secondary-400">Sort By:</label><select id="query-sort" class="px-3 py-1.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"><option>None</option>{#each queryFields as field}<option value={field.name}>{field.label}</option>{/each}</select></div><div class="flex items-center gap-2"><label for="query-limit" class="text-xs font-medium text-secondary-500 dark:text-secondary-400">Limit:</label><input id="query-limit" type="number" placeholder="All" class="w-20 px-3 py-1.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg" /></div><div class="flex items-center gap-2"><label for="query-offset" class="text-xs font-medium text-secondary-500 dark:text-secondary-400">Offset:</label><input id="query-offset" type="number" placeholder="0" class="w-20 px-3 py-1.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg" /></div></div></div>
    {#if showExport}<div class="px-6 py-4 border-t border-surface-200 dark:border-surface-700"><div class="flex items-center justify-between mb-3"><h4 class="text-sm font-semibold text-secondary-900 dark:text-white">Query Export</h4><select aria-label="Export format" bind:value={exportFormat} class="input-theme w-auto"><option value="sql">SQL</option><option value="json">JSON</option><option value="mongodb">MongoDB</option><option value="graphql">GraphQL</option></select></div><pre class="p-4 bg-surface-900 text-sm text-green-400 rounded-xl overflow-x-auto font-mono">{exportedQuery}</pre></div>{/if}
  </div>

  {#if result && result.data.length > 0}<div class="card rounded-xl overflow-hidden"><div class="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between"><div class="flex items-center gap-3"><Icon icon={Icons.list} className="w-5 h-5 text-secondary-500" /><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Query Results</h3><span class="px-2 py-0.5 rounded-full bg-success-100 text-success-700 text-xs font-medium">{result.filtered} of {result.total} matches</span></div></div><div class="overflow-x-auto"><table class="w-full"><tbody>{#each result.data.slice(0, 10) as row}<tr class="border-b border-surface-100"><td class="px-4 py-3 text-sm">{String(row.name ?? '')}</td><td class="px-4 py-3 text-sm">{String(row.status ?? '')}</td></tr>{/each}</tbody></table></div></div>{/if}
</div>
