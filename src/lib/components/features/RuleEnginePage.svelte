<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { ruleEngineStore } from '../../stores/features'
  import type { Rule, RuleAction, RuleCondition } from '../../../features/rule-engine/types'
  import { actionConfigs, availableFields, getOperatorsForFieldType, ruleTemplates } from '../../../features/rule-engine/config'
  import { createEmptyAction, createEmptyCondition, createEmptyRule, executeRules, generateId, validateRule } from '../../../features/rule-engine/engine'

  export let path = '/features/rule-engine'

  type Tab = 'list' | 'editor' | 'tester'
  type TestResult = ReturnType<typeof executeRules>[number]

  let activeTab: Tab = 'list'
  let selectedRuleId: string | null = null
  let isNewRule = false
  let editingRule: Rule | null = null
  let searchQuery = ''
  let filterTag: string | null = null
  let showTemplates = false
  let deleteConfirmId: string | null = null
  let editorTab: 'conditions' | 'actions' | 'settings' = 'conditions'
  let editorErrors: string[] = []
  let testerPayload = '{\n  "order": { "total": 2400, "status": "processing" },\n  "user": { "status": "active" }\n}'
  let testerResults: TestResult[] = []

  $: rules = $ruleEngineStore.items
  $: allTags = Array.from(new Set(rules.flatMap((rule) => rule.tags)))
  $: filteredRules = rules.filter((rule) => {
    const query = searchQuery.toLowerCase()
    return (rule.name.toLowerCase().includes(query) || rule.description.toLowerCase().includes(query)) && (!filterTag || rule.tags.includes(filterTag))
  }).sort((a, b) => b.priority - a.priority)
  $: activeRules = rules.filter((rule) => rule.enabled).length
  $: disabledRules = rules.filter((rule) => !rule.enabled).length
  $: totalConditions = rules.reduce((total, rule) => total + countConditions(rule.conditionGroup), 0)
  $: validation = editingRule ? validateRule(editingRule) : { valid: false, errors: [] }

  const tabs = [
    { id: 'list', label: 'Rules', icon: Icons.list },
    { id: 'editor', label: 'Editor', icon: Icons.edit },
    { id: 'tester', label: 'Tester', icon: Icons.bolt },
  ] as const

  function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
  function now(): string { return new Date().toISOString() }
  function countConditions(group: Rule['conditionGroup']): number {
    return group.conditions.reduce((total, item) => total + ('field' in item ? 1 : countConditions(item)), 0)
  }
  function commit(next: Rule[]): void {
    ruleEngineStore.update((state) => ({ ...state, items: next, lastUpdated: now() }))
  }
  function freshRule(): Rule {
    return { ...createEmptyRule(), id: generateId(), createdAt: now(), updatedAt: now() }
  }
  function selectRule(id: string): void {
    const rule = rules.find((item) => item.id === id)
    if (!rule) return
    selectedRuleId = id
    isNewRule = false
    editingRule = clone(rule)
    editorErrors = []
    activeTab = 'editor'
  }
  function newRule(): void {
    selectedRuleId = null
    isNewRule = true
    editingRule = freshRule()
    editorErrors = []
    editorTab = 'conditions'
    activeTab = 'editor'
  }
  function cancelEdit(): void {
    selectedRuleId = null
    isNewRule = false
    editingRule = null
    editorErrors = []
    activeTab = 'list'
  }
  function saveRule(): void {
    if (!editingRule) return
    const result = validateRule(editingRule)
    if (!result.valid) {
      editorErrors = result.errors
      return
    }
    const saved = { ...editingRule, updatedAt: now() }
    commit(rules.some((rule) => rule.id === saved.id) ? rules.map((rule) => rule.id === saved.id ? saved : rule) : [...rules, saved])
    cancelEdit()
  }
  function toggleRule(id: string): void { commit(rules.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)) }
  function duplicateRule(id: string): void {
    const original = rules.find((rule) => rule.id === id)
    if (!original) return
    const copy = { ...clone(original), id: generateId(), name: `${original.name} (Copy)`, createdAt: now(), updatedAt: now(), triggerCount: 0 }
    commit([...rules, copy])
  }
  function deleteRule(id: string): void {
    commit(rules.filter((rule) => rule.id !== id))
    deleteConfirmId = null
    if (selectedRuleId === id) cancelEdit()
  }
  function createFromTemplate(id: string): void {
    const template = ruleTemplates.find((item) => item.id === id)
    if (!template) return
    const rule = { ...clone(template.rule), id: generateId(), createdAt: now(), updatedAt: now(), triggerCount: 0 }
    commit([...rules, rule])
    showTemplates = false
  }
  function setConditionField(id: string, fieldName: string): void {
    if (!editingRule) return
    const field = availableFields.find((item) => item.name === fieldName)
    const operator = getOperatorsForFieldType(field?.type ?? 'string')[0]?.value ?? 'equals'
    const value: RuleCondition['value'] = field?.type === 'number' ? 0 : field?.type === 'boolean' ? false : ''
    updateCondition(id, { field: fieldName, fieldType: field?.type ?? 'string', operator, value })
  }
  function updateCondition(id: string, patch: Partial<RuleCondition>): void {
    if (!editingRule) return
    editingRule = { ...editingRule, conditionGroup: { ...editingRule.conditionGroup, conditions: editingRule.conditionGroup.conditions.map((item) => 'field' in item && item.id === id ? { ...item, ...patch } : item) } }
  }
  function removeCondition(id: string): void {
    if (!editingRule) return
    const next = editingRule.conditionGroup.conditions.filter((item) => !('field' in item && item.id === id))
    editingRule = { ...editingRule, conditionGroup: { ...editingRule.conditionGroup, conditions: next.length ? next : [createEmptyCondition()] } }
  }
  function addCondition(): void {
    if (!editingRule) return
    editingRule = { ...editingRule, conditionGroup: { ...editingRule.conditionGroup, conditions: [...editingRule.conditionGroup.conditions, createEmptyCondition()] } }
  }
  function addAction(): void { if (editingRule) editingRule = { ...editingRule, actions: [...editingRule.actions, createEmptyAction()] } }
  function removeAction(id: string): void { if (editingRule) editingRule = { ...editingRule, actions: editingRule.actions.filter((action) => action.id !== id) } }
  function updateAction(id: string, patch: Partial<RuleAction>): void { if (editingRule) editingRule = { ...editingRule, actions: editingRule.actions.map((action) => action.id === id ? { ...action, ...patch } : action) } }
  function toggleEditingEnabled(): void {
    if (editingRule) editingRule = { ...editingRule, enabled: !editingRule.enabled }
  }
  function runTest(): void {
    try { testerResults = executeRules(rules.filter((rule) => rule.enabled), JSON.parse(testerPayload) as Record<string, unknown>) }
    catch { testerResults = [] }
  }
</script>

<div data-route={path} class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center"><Icon icon={Icons.ruleEngine} className="w-5 h-5 text-primary-600 dark:text-primary-400" /></div>
      <div><h1 class="heading-2 text-secondary-900 dark:text-white">Rule Engine</h1><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-0.5">Visual IF/AND/OR/THEN rule builder with real-time evaluation</p></div>
    </div>
    <button type="button" on:click={newRule} class="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"><Icon icon={Icons.plus} className="w-4 h-4" />New Rule</button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each [
      { label: 'Total Rules', value: rules.length, icon: Icons.list, tone: 'primary' },
      { label: 'Active Rules', value: activeRules, icon: Icons.circleCheck, tone: 'success' },
      { label: 'Disabled Rules', value: disabledRules, icon: Icons.clock, tone: 'warning' },
      { label: 'Total Conditions', value: totalConditions, icon: Icons.layoutGrid, tone: 'info' },
    ] as stat}
      <div class="card rounded-xl p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-4"><div class={`w-11 h-11 rounded-xl bg-${stat.tone}-100 dark:bg-${stat.tone}-900/40 flex items-center justify-center`}><Icon icon={stat.icon} className={`w-5 h-5 text-${stat.tone}-600 dark:text-${stat.tone}-400`} /></div></div>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 font-medium">{stat.label}</p><p class="heading-3 text-secondary-900 dark:text-white mt-1">{stat.value}</p>
      </div>
    {/each}
  </div>

  <div class="card rounded-xl p-1.5"><div class="flex gap-1">
    {#each tabs as tab}<button type="button" on:click={() => (activeTab = tab.id)} class={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-theme-primary text-white' : 'text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800'}`}><Icon icon={tab.icon} className="w-4 h-4" />{tab.label}</button>{/each}
  </div></div>

  {#if activeTab === 'list'}
    <section class="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
      <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700">
        <div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="p-2.5 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl"><Icon icon="solar:code-linear" className="w-6 h-6 text-white" /></div><div><h2 class="text-xl font-bold text-secondary-900 dark:text-white">Rule Engine</h2><p class="text-sm text-secondary-500 dark:text-secondary-400">{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</p></div></div><div class="flex items-center gap-2"><button type="button" on:click={() => (showTemplates = !showTemplates)} class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors"><Icon icon="solar:document-linear" className="w-4 h-4" />Templates</button><button type="button" on:click={newRule} class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-primary-500/25"><Icon icon="solar:add-circle-linear" className="w-4 h-4" />Create Rule</button></div></div>
        <div class="flex flex-col sm:flex-row gap-3"><div class="relative flex-1"><Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" /><input type="text" bind:value={searchQuery} placeholder="Search rules..." class="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all" /></div>{#if allTags.length > 0}<div class="flex items-center gap-2 overflow-x-auto pb-1"><button type="button" on:click={() => (filterTag = null)} class={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${!filterTag ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>All</button>{#each allTags as tag}<button type="button" on:click={() => (filterTag = tag)} class={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filterTag === tag ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>{tag}</button>{/each}</div>{/if}</div>
      </div>

      {#if showTemplates}<div class="px-6 py-4 bg-gradient-to-r from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/20 border-b border-surface-200 dark:border-surface-700"><div class="flex items-center justify-between mb-3"><h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Quick Start Templates</h3><button type="button" on:click={() => (showTemplates = false)} class="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"><Icon icon="solar:close-circle-linear" className="w-4 h-4" /></button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{#each ruleTemplates as template}<button type="button" on:click={() => createFromTemplate(template.id)} class="flex items-start gap-3 p-3 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all text-left group"><div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors"><Icon icon={template.icon} className="w-5 h-5 text-secondary-500 dark:text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" /></div><div class="flex-1 min-w-0"><p class="text-sm font-medium text-secondary-900 dark:text-white truncate">{template.name}</p><p class="text-xs text-secondary-500 dark:text-secondary-400 line-clamp-2">{template.description}</p></div></button>{/each}</div></div>{/if}

      <div class="divide-y divide-surface-100 dark:divide-surface-800 max-h-[600px] overflow-y-auto">
        {#each filteredRules as rule}
          <div role="button" tabindex="0" on:click={() => selectRule(rule.id)} on:keydown={(event) => event.key === 'Enter' && selectRule(rule.id)} class={`px-6 py-4 cursor-pointer transition-all hover:bg-surface-50 dark:hover:bg-surface-800/50 ${selectedRuleId === rule.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500' : ''}`}>
            <div class="flex items-start justify-between gap-4"><div class="flex items-start gap-4 flex-1 min-w-0"><button type="button" on:click|stopPropagation={() => toggleRule(rule.id)} class={`mt-1 p-1.5 rounded-lg transition-colors ${rule.enabled ? 'bg-success-100 dark:bg-success-900/30' : 'bg-surface-100 dark:bg-surface-800'}`} title={rule.enabled ? 'Disable rule' : 'Enable rule'}><Icon icon={rule.enabled ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} className={`w-4 h-4 ${rule.enabled ? 'text-success-600 dark:text-success-400' : 'text-secondary-400 dark:text-secondary-500'}`} /></button><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><h4 class="text-sm font-semibold text-secondary-900 dark:text-white truncate">{rule.name || 'Untitled Rule'}</h4><span class={`px-2 py-0.5 text-[10px] font-bold rounded ${rule.priority >= 8 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300' : rule.priority >= 5 ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300' : 'bg-surface-100 text-secondary-600 dark:bg-surface-700 dark:text-secondary-400'}`}>P{rule.priority}</span></div><p class="text-xs text-secondary-500 dark:text-secondary-400 truncate mb-2">{rule.description || 'No description'}</p><div class="flex items-center gap-3 text-xs text-secondary-400 dark:text-secondary-500"><span class="flex items-center gap-1"><Icon icon="solar:filter-linear" className="w-3.5 h-3.5" />{rule.conditionGroup.conditions.length} conditions</span><span class="flex items-center gap-1"><Icon icon="solar:bolt-linear" className="w-3.5 h-3.5" />{rule.actions.length} actions</span><span class="flex items-center gap-1"><Icon icon="solar:graph-up-linear" className="w-3.5 h-3.5" />{rule.triggerCount} triggers</span></div>{#if rule.tags.length > 0}<div class="flex items-center gap-1.5 mt-2">{#each rule.tags.slice(0, 3) as tag}<span class="px-2 py-0.5 text-[10px] font-medium bg-surface-100 dark:bg-surface-700 text-secondary-600 dark:text-secondary-400 rounded-full">{tag}</span>{/each}{#if rule.tags.length > 3}<span class="text-[10px] text-secondary-400">+{rule.tags.length - 3} more</span>{/if}</div>{/if}</div></div><div class="flex items-center gap-1"><button type="button" on:click|stopPropagation={() => duplicateRule(rule.id)} class="p-2 text-secondary-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-all" title="Duplicate rule"><Icon icon="solar:copy-linear" className="w-4 h-4" /></button>{#if deleteConfirmId === rule.id}<div class="flex items-center gap-1 px-2 py-1 bg-danger-50 dark:bg-danger-900/30 rounded-lg"><button type="button" on:click|stopPropagation={() => deleteRule(rule.id)} class="text-xs font-medium text-danger-600 dark:text-danger-400 hover:underline">Confirm</button><button type="button" on:click|stopPropagation={() => (deleteConfirmId = null)} class="text-xs text-secondary-500 hover:underline">Cancel</button></div>{:else}<button type="button" on:click|stopPropagation={() => (deleteConfirmId = rule.id)} class="p-2 text-secondary-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-lg transition-all" title="Delete rule"><Icon icon="solar:trash-bin-2-linear" className="w-4 h-4" /></button>{/if}</div></div>
          </div>
        {/each}
        {#if filteredRules.length === 0}<div class="flex flex-col items-center justify-center py-16 px-6"><div class="p-4 bg-surface-100 dark:bg-surface-800 rounded-full mb-4"><Icon icon="solar:code-linear" className="w-10 h-10 text-secondary-300 dark:text-secondary-600" /></div><h3 class="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">{searchQuery || filterTag ? 'No rules found' : 'No rules yet'}</h3><p class="text-sm text-secondary-500 dark:text-secondary-400 text-center max-w-sm">{searchQuery || filterTag ? 'Try adjusting your search or filter criteria' : 'Create your first rule to start automating your workflow'}</p>{#if !searchQuery && !filterTag}<button type="button" on:click={newRule} class="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Icon icon="solar:add-circle-linear" className="w-4 h-4" />Create First Rule</button>{/if}</div>{/if}
      </div>
    </section>

    {#if rules.length === 0}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card rounded-xl p-6"><div class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4"><Icon icon={Icons.ruleEngine} className="w-6 h-6 text-primary-600 dark:text-primary-400" /></div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-2">Visual Builder</h3><p class="text-sm text-secondary-500 dark:text-secondary-400">Create complex rules with an intuitive interface. Support for nested AND/OR conditions.</p></div>
        <div class="card rounded-xl p-6"><div class="w-12 h-12 rounded-xl bg-success-100 dark:bg-success-900/40 flex items-center justify-center mb-4"><Icon icon={Icons.bolt} className="w-6 h-6 text-success-600 dark:text-success-400" /></div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-2">Real-time Testing</h3><p class="text-sm text-secondary-500 dark:text-secondary-400">Test your rules instantly with sample data. See which conditions match and why.</p></div>
        <div class="card rounded-xl p-6"><div class="w-12 h-12 rounded-xl bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center mb-4"><Icon icon={Icons.bookmark} className="w-6 h-6 text-warning-600 dark:text-warning-400" /></div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-2">Templates</h3><p class="text-sm text-secondary-500 dark:text-secondary-400">Start quickly with pre-built templates for common business rules and workflows.</p></div>
      </div>
      <div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Available Templates</h3><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{#each ruleTemplates.slice(0, 6) as template}<button type="button" on:click={() => createFromTemplate(template.id)} class="p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all text-left"><div class="font-medium text-secondary-900 dark:text-white text-sm">{template.name}</div><div class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{template.description}</div></button>{/each}</div></div>
    {/if}
  {:else if activeTab === 'editor'}
    {#if editingRule}
      <section class="bg-white dark:bg-surface-900 rounded-2xl shadow-xl overflow-visible border border-surface-200 dark:border-surface-700">
        <div class="px-6 py-5 bg-gradient-to-r from-primary-500 to-accent-500"><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="p-3 bg-white/20 backdrop-blur-sm rounded-xl"><Icon icon="solar:code-linear" className="w-6 h-6 text-white" /></div><div><h2 class="text-xl font-bold text-white">{isNewRule ? 'Create New Rule' : 'Edit Rule'}</h2><p class="text-sm text-white/80">{isNewRule ? 'Define conditions and actions for your rule' : `Editing: ${editingRule.name || 'Untitled Rule'}`}</p></div></div><div class="flex items-center gap-3"><button type="button" on:click={cancelEdit} class="px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors">Cancel</button><button type="button" on:click={saveRule} class="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"><Icon icon="solar:diskette-linear" className="w-4 h-4" />Save Rule</button></div></div></div>
        {#if editorErrors.length}<div class="px-6 py-3 bg-danger-50 dark:bg-danger-900/20 border-b border-danger-200 dark:border-danger-800"><div class="flex items-start gap-3"><Icon icon="solar:danger-circle-linear" className="w-5 h-5 text-danger-500 mt-0.5" /><div><p class="text-sm font-medium text-danger-700 dark:text-danger-300">Please fix the following errors:</p><ul class="mt-1 text-sm text-danger-600 dark:text-danger-400 list-disc list-inside">{#each editorErrors as error}<li>{error}</li>{/each}</ul></div></div></div>{/if}
        <div class="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50"><div class="flex flex-col md:flex-row md:items-center gap-4"><label class="flex-1 block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5 uppercase tracking-wide">Rule Name<input type="text" bind:value={editingRule.name} placeholder="Enter a descriptive name..." class="mt-1 w-full px-4 py-2.5 text-base font-medium bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all" /></label><label class="flex-1 block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5 uppercase tracking-wide">Description<input type="text" bind:value={editingRule.description} placeholder="What does this rule do?" class="mt-1 w-full px-4 py-2.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all" /></label></div></div>
        <div class="px-6 border-b border-surface-200 dark:border-surface-700"><nav class="flex gap-1" aria-label="Rule Editor Tabs">{#each [{ id: 'conditions', label: 'Conditions', icon: 'solar:filter-linear', count: editingRule.conditionGroup.conditions.length }, { id: 'actions', label: 'Actions', icon: 'solar:bolt-linear', count: editingRule.actions.length }, { id: 'settings', label: 'Settings', icon: 'solar:settings-linear' }] as tab}<button type="button" on:click={() => (editorTab = tab.id as typeof editorTab)} class={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${editorTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200'}`}><Icon icon={tab.icon} className="w-4 h-4" />{tab.label}{#if tab.count !== undefined}<span class={`px-2 py-0.5 text-xs rounded-full ${editorTab === tab.id ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'bg-surface-100 text-secondary-500 dark:bg-surface-700 dark:text-secondary-400'}`}>{tab.count}</span>{/if}</button>{/each}</nav></div>
        <div class="p-6 min-h-[400px]">
          {#if editorTab === 'conditions'}<div class="space-y-4"><div class="flex items-center justify-between mb-4"><div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Rule Conditions</h3><p class="text-sm text-secondary-500 dark:text-secondary-400">Define when this rule should trigger</p></div><button type="button" on:click={addCondition} class="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm">Add condition</button></div><div class="space-y-3">{#each editingRule.conditionGroup.conditions as item}{#if 'field' in item}<div class="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700"><div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"><label class="text-xs font-medium text-secondary-500">Field<select class="input-theme mt-1" value={item.field} on:change={(event) => setConditionField(item.id, (event.currentTarget as HTMLSelectElement).value)}>{#each availableFields as field}<option value={field.name}>{field.label}</option>{/each}</select></label><label class="text-xs font-medium text-secondary-500">Operator<select class="input-theme mt-1" value={item.operator} on:change={(event) => updateCondition(item.id, { operator: (event.currentTarget as HTMLSelectElement).value as RuleCondition['operator'] })}>{#each getOperatorsForFieldType(item.fieldType) as operator}<option value={operator.value}>{operator.label}</option>{/each}</select></label><label class="text-xs font-medium text-secondary-500">Value<input class="input-theme mt-1" value={String(item.value)} on:input={(event) => updateCondition(item.id, { value: (event.currentTarget as HTMLInputElement).value })} /></label><button type="button" aria-label="Remove condition" on:click={() => removeCondition(item.id)} class="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"><Icon icon="solar:trash-bin-2-linear" className="w-4 h-4" /></button></div></div>{/if}{/each}</div></div>{:else if editorTab === 'actions'}<div class="space-y-4"><div class="flex items-center justify-between"><div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Rule Actions</h3><p class="text-sm text-secondary-500 dark:text-secondary-400">Define what happens when the rule matches</p></div><button type="button" on:click={addAction} class="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm">Add action</button></div><div class="space-y-3">{#each editingRule.actions as action}<div class="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center gap-3"><select class="input-theme flex-1" value={action.type} on:change={(event) => updateAction(action.id, { type: (event.currentTarget as HTMLSelectElement).value as RuleAction['type'] })}>{#each actionConfigs as config}<option value={config.type}>{config.label}</option>{/each}</select><button type="button" aria-label="Remove action" on:click={() => removeAction(action.id)} class="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"><Icon icon="solar:trash-bin-2-linear" className="w-4 h-4" /></button></div>{/each}</div></div>{:else}<div class="space-y-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Rule Settings</h3><div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl"><div><p class="text-sm font-medium text-secondary-900 dark:text-white">Rule Status</p><p class="text-xs text-secondary-500 dark:text-secondary-400">Enable or disable this rule</p></div><button type="button" aria-label="Toggle rule status" on:click={toggleEditingEnabled} class={`relative w-12 h-6 rounded-full transition-colors ${editingRule.enabled ? 'bg-success-500' : 'bg-surface-300 dark:bg-surface-600'}`}><span class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${editingRule.enabled ? 'left-7' : 'left-1'}`}></span></button></div><label class="block p-4 bg-surface-50 dark:bg-surface-800 rounded-xl text-sm font-medium text-secondary-900 dark:text-white">Priority level<input type="range" min="1" max="10" bind:value={editingRule.priority} class="mt-4 w-full accent-primary-500" /><span class="block mt-2 text-sm text-secondary-500">{editingRule.priority}</span></label><div class="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl"><p class="text-sm font-medium text-secondary-900 dark:text-white mb-3">Tags</p><div class="flex flex-wrap gap-2">{#each editingRule.tags as tag}<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-full text-sm text-secondary-700 dark:text-secondary-300">{tag}</span>{/each}<span class="text-sm text-secondary-500">Use the feature store to preserve tags.</span></div></div></div>{/if}
        </div>
      </section>
    {/if}
  {:else}
    <section class="bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden"><div class="px-6 py-5 bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-between"><div><h2 class="text-xl font-bold text-white">Rule Tester</h2><p class="text-sm text-white/80">Evaluate enabled rules against sample data</p></div><button type="button" on:click={runTest} class="px-4 py-2 bg-white text-primary-600 text-sm font-semibold rounded-lg shadow-lg">Run Test</button></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6"><label class="text-sm font-medium text-secondary-700 dark:text-secondary-300">Test payload<textarea bind:value={testerPayload} class="mt-2 w-full min-h-64 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-4 font-mono text-xs text-secondary-900 dark:text-white"></textarea></label><div><h3 class="text-sm font-semibold text-secondary-900 dark:text-white">Results</h3>{#if testerResults.length === 0}<div class="mt-2 p-8 rounded-xl bg-surface-50 dark:bg-surface-800 text-sm text-secondary-500 text-center">Run the tester to see condition results.</div>{:else}<div class="mt-2 space-y-3">{#each testerResults as result}<div class={`p-4 rounded-xl ${result.matched ? 'bg-success-50 dark:bg-success-900/20' : 'bg-danger-50 dark:bg-danger-900/20'}`}><p class="font-semibold text-secondary-900 dark:text-white">{result.ruleName}</p><p class="text-sm mt-1 {result.matched ? 'text-success-700' : 'text-danger-700'}">{result.matched ? 'Rule matched' : 'Rule did not match'}</p></div>{/each}</div>{/if}</div></div></section>
  {/if}
</div>




