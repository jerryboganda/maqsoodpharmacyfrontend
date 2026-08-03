import { browser } from '$app/environment'
import { writable, type Writable } from 'svelte/store'
import type { Rule } from '../../features/rule-engine/types'
import type { Query } from '../../features/query-builder/types'
import type { StreamConfig } from '../../features/real-time-simulation/types'
import type { Insight } from '../../features/smart-insights/types'
import type { Workflow } from '../../features/workflow-builder/types'
import type { StateMachine } from '../../features/approval-engine/types'
import type { Task } from '../../features/task-scheduler/types'
import type { Notification } from '../../features/notification-pipeline/types'

export interface FeatureStoreState<T> {
  items: T[]
  selectedId: string | null
  isLoading: boolean
  lastUpdated: string | null
}

function persistentFeatureStore<T>(key: string): Writable<FeatureStoreState<T>> {
  const initial: FeatureStoreState<T> = { items: [], selectedId: null, isLoading: false, lastUpdated: null }
  if (browser) {
    try {
      const saved = localStorage.getItem(key)
      if (saved) initial.items = JSON.parse(saved) as T[]
    } catch {
      localStorage.removeItem(key)
    }
  }
  const store = writable(initial)
  if (browser) {
    store.subscribe((value) => {
      if (!value.isLoading) localStorage.setItem(key, JSON.stringify(value.items))
    })
  }
  return store
}

/** Svelte equivalents of the former feature hooks, retaining their storage contracts. */
export const ruleEngineStore = persistentFeatureStore<Rule>('adminex_rules')
export const queryBuilderStore = persistentFeatureStore<Query>('adminex_saved_queries')
export const simulationStore = persistentFeatureStore<StreamConfig>('adminex_simulation_streams')
export const insightsStore = persistentFeatureStore<Insight>('adminex_dismissed_insights')
export const workflowBuilderStore = persistentFeatureStore<Workflow>('adminex_workflows')
export const approvalEngineStore = persistentFeatureStore<StateMachine>('adminex_state_machines')
export const taskSchedulerStore = persistentFeatureStore<Task>('adminex_tasks')
export const notificationPipelineStore = persistentFeatureStore<Notification>('adminex_notifications')

export function replaceFeatureItems<T>(store: Writable<FeatureStoreState<T>>, items: T[]): void {
  store.set({ items, selectedId: null, isLoading: false, lastUpdated: new Date().toISOString() })
}
