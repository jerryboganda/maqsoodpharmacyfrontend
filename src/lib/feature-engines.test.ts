import { describe, expect, it } from 'vitest'
import { createEmptyRule, validateRule } from '../features/rule-engine/engine'
import { createEmptyQuery, validateQuery, executeQuery } from '../features/query-builder/engine'
import { createEmptyWorkflow, validateWorkflow } from '../features/workflow-builder/engine'
import { calculateTrend, calculateMovingAverage } from '../features/real-time-simulation/engine'
import { processTemplate } from '../features/notification-pipeline/engine'
import { analyzeTrend } from '../features/smart-insights/engine'
import { createEmptyStateMachine, validateStateMachine } from '../features/approval-engine/engine'
import { createDependency, createTask, topologicalSort, validateSchedule } from '../features/task-scheduler/engine'

describe('preserved Adminex feature engines', () => {
  it('creates and validates a rule without React', () => {
    const rule = { ...createEmptyRule(), name: 'Active customer' }
    expect(rule.id).toBeTruthy()
    expect(validateRule(rule).valid).toBe(true)
  })

  it('executes a query against typed mock data', () => {
    const query = createEmptyQuery()
    const filter = query.filterGroup.filters[0] as any
    filter.field = 'active'
    filter.operator = 'eq'
    filter.value = true
    const result = executeQuery(query, [{ name: 'Adminex', active: true }, { name: 'Other', active: false }])
    expect(result).toBeTruthy()
    expect(result.data).toHaveLength(1)
    expect(validateQuery(query).valid).toBe(true)
  })

  it('reports an empty workflow validation result', () => {
    const result = validateWorkflow(createEmptyWorkflow())
    expect(result).toHaveProperty('isValid')
    expect(result).toHaveProperty('errors')
  })

  it('keeps simulation math deterministic for trend and moving averages', () => {
    expect(calculateTrend([1, 2, 3, 4]).trend).toBe('up')
    expect(calculateMovingAverage([{ value: 1 }, { value: 2 }, { value: 3 }] as any, 2)).toEqual([1, 1.5, 2.5])
  })

  it('preserves notification template substitution', () => {
    const template = { titleTemplate: 'Hello {{name}}', messageTemplate: 'Welcome {{name}}', variables: [] } as any
    expect(processTemplate(template, { name: 'Faisal' })).toEqual({ title: 'Hello Faisal', message: 'Welcome Faisal' })
  })

  it('keeps smart-insight trend analysis deterministic', () => {
    const trend = analyzeTrend([
      { timestamp: 1, value: 10 },
      { timestamp: 2, value: 20 },
      { timestamp: 3, value: 30 },
      { timestamp: 4, value: 40 },
    ])
    expect(trend).toMatchObject({ direction: 'up', slope: 10, rSquared: 1, changePercent: 300 })
  })

  it('creates a valid approval state machine with its preserved warning contract', () => {
    const machine = createEmptyStateMachine('Order approval')
    const validation = validateStateMachine(machine)
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toEqual([])
    expect(validation.warnings.map((warning) => warning.code)).toEqual(['NO_FINAL_STATE', 'DEAD_END_STATE'])
  })

  it('orders and validates scheduled tasks by dependency', () => {
    const prerequisite = createTask('Prepare inventory')
    const dependent = createTask('Publish inventory', {
      dependencies: [createDependency('publish', prerequisite.id)],
    })
    dependent.id = 'publish'
    expect(topologicalSort([dependent, prerequisite])).toEqual([prerequisite.id, dependent.id])
    expect(validateSchedule([prerequisite, dependent])).toMatchObject({ isValid: true, errors: [], conflicts: [] })
  })
})
