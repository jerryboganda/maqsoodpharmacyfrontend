<script lang="ts">
  import { locale, translate } from '../../stores/locale'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { kanbanColumns, priorityColors, type KanbanColumn, type KanbanTask } from '../../../data/kanban'

  const t = translate
  let currentLocale = $locale
  $: currentLocale = $locale
  let columns: KanbanColumn[] = kanbanColumns.map((column) => ({ ...column, tasks: column.tasks.map((task) => ({ ...task, tags: [...task.tags], assignees: [...task.assignees] })) }))
  let activeTask: KanbanTask | null = null
  let isAddingColumn = false
  let newColumnTitle = ''
  let isFormModalOpen = false
  let isEditMode = false
  let selectedTask: KanbanTask | null = null
  let selectedColumnId = ''
  let isDetailModalOpen = false
  let detailTask: KanbanTask | null = null
  let taskTitle = ''
  let taskDescription = ''
  let taskPriority: KanbanTask['priority'] = 'medium'
  let taskDueDate = ''
  let taskTags = ''

  function findTask(taskId: string): KanbanTask | null {
    for (const column of columns) {
      const task = column.tasks.find((item) => item.id === taskId)
      if (task) return task
    }
    return null
  }

  function findColumnByTaskId(taskId: string): KanbanColumn | null {
    return columns.find((column) => column.tasks.some((task) => task.id === taskId)) ?? null
  }

  function handleDragStart(taskId: string): void {
    activeTask = findTask(taskId)
  }

  function handleDragEnd(columnId: string): void {
    if (!activeTask) return
    const moved = activeTask
    columns = columns.map((column) => ({ ...column, tasks: column.tasks.filter((task) => task.id !== moved.id) }))
    columns = columns.map((column) => column.id === columnId ? { ...column, tasks: [...column.tasks, moved] } : column)
    activeTask = null
  }

  function openTask(columnId: string, task: KanbanTask | null = null): void {
    isEditMode = Boolean(task)
    selectedTask = task
    selectedColumnId = columnId
    taskTitle = task?.title ?? ''
    taskDescription = task?.description ?? ''
    taskPriority = task?.priority ?? 'medium'
    taskDueDate = task?.dueDate ?? ''
    taskTags = task?.tags.join(', ') ?? ''
    isFormModalOpen = true
  }

  function handleTaskSubmit(): void {
    if (!taskTitle.trim()) return
    const task: KanbanTask = {
      id: selectedTask?.id ?? 'task-' + Date.now(),
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      priority: taskPriority,
      assignees: selectedTask?.assignees ?? [],
      tags: taskTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      dueDate: taskDueDate || undefined,
      attachments: selectedTask?.attachments,
      comments: selectedTask?.comments ?? 0,
      checklist: selectedTask?.checklist,
    }
    if (isEditMode && selectedTask) {
      columns = columns.map((column) => ({ ...column, tasks: column.tasks.map((item) => item.id === selectedTask?.id ? task : item) }))
    } else {
      columns = columns.map((column) => column.id === selectedColumnId ? { ...column, tasks: [...column.tasks, task] } : column)
    }
    isFormModalOpen = false
  }

  function handleAddColumn(): void {
    if (!newColumnTitle.trim()) return
    columns = [...columns, { id: 'column-' + Date.now(), title: newColumnTitle.trim(), color: 'bg-secondary-500', tasks: [] }]
    newColumnTitle = ''
    isAddingColumn = false
  }

  function dueDateLabel(dateString?: string): { text: string; className: string } | null {
    if (!dateString) return null
    const date = new Date(dateString)
    const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { text: t('kanban.overdue_days', { days: Math.abs(diffDays) }), className: 'text-danger-600' }
    if (diffDays === 0) return { text: t('kanban.today'), className: 'text-warning-600' }
    if (diffDays === 1) return { text: t('kanban.tomorrow'), className: 'text-info-600' }
    if (diffDays <= 7) return { text: t('kanban.days_left', { days: diffDays }), className: 'text-secondary-600 dark:text-secondary-400' }
    return { text: new Intl.DateTimeFormat(currentLocale, { month: 'short', day: 'numeric' }).format(date), className: 'text-secondary-600 dark:text-secondary-400' }
  }

  function openTaskDetail(task: KanbanTask): void {
    detailTask = task
    isDetailModalOpen = true
  }
</script>

<svelte:head><title>{t('kanban.title')} Ã‚Â· Adminex</title></svelte:head>

<div class="space-y-6" data-locale={currentLocale}>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">{t('kanban.title')}</h1>
      <p class="text-body-sm text-secondary-600 dark:text-secondary-400 mt-1">{t('kanban.description')}</p>
    </div>
  </div>

  <div class="flex gap-4 overflow-x-auto pb-4 mb-6">
    {#each columns as column}
      <div role="list" class="flex flex-col w-80 flex-shrink-0 bg-surface-100 dark:bg-surface-800 rounded-xl p-3" on:dragover|preventDefault on:drop={() => handleDragEnd(column.id)}>
        <div class="mb-2 flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{column.title}</h2>
            <span class="text-xs text-secondary-500 dark:text-secondary-400 font-medium">{column.tasks.length}</span>
          </div>
          <button type="button" aria-label={t('kanban.add_task')} title={t('kanban.add_task')} on:click={() => openTask(column.id)} class="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded text-secondary-500 hover:text-secondary-900 dark:hover:text-white transition-colors"><Icon icon={Icons.plus} width="16px" /></button>
        </div>

        <div class="flex-1 rounded-lg p-1 min-h-[200px] space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] transition-colors">
          {#each column.tasks as task}
            {@const priorityColor = priorityColors[task.priority]}
            {@const dueDate = dueDateLabel(task.dueDate)}
            <div draggable="true" role="listitem" aria-label={task.title} class="relative group bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-3 hover:shadow-lg transition-all hover:border-surface-300 dark:hover:border-surface-600" on:dragstart={() => handleDragStart(task.id)} on:dragend={() => (activeTask = null)}>
              <div class="flex items-start justify-end mb-2">
                <div class={'px-2 py-0.5 rounded-full text-ui-xs font-medium ' + priorityColor.bg + ' ' + priorityColor.text + ' flex items-center gap-1'}>
                  <span class={'w-1.5 h-1.5 rounded-full ' + priorityColor.dot}></span>
                  {t('kanban.' + task.priority)}
                </div>
              </div>

              <button type="button" class="block w-full border-0 bg-transparent p-0 text-left" on:click={() => openTaskDetail(task)}>
                <h3 class="text-sm font-medium text-secondary-900 dark:text-white mb-1 line-clamp-2">{task.title}</h3>
                <p class="text-xs text-secondary-600 dark:text-secondary-400 mb-2 line-clamp-2">{task.description}</p>

                {#if task.tags.length > 0}
                  <div class="flex flex-wrap gap-1 mb-2">
                    {#each task.tags as tag}
                      <span class="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-secondary-600 dark:text-secondary-400 text-xs rounded">{tag}</span>
                    {/each}
                  </div>
                {/if}

                {#if task.checklist}
                  <div class="mb-2">
                    <div class="flex items-center gap-1 text-xs text-secondary-600 dark:text-secondary-400 mb-1"><Icon icon={Icons.checklist} width="12px" /><span>{task.checklist.completed}/{task.checklist.total}</span></div>
                    <div class="w-full bg-surface-100 dark:bg-surface-700 rounded-full h-1"><div class="bg-theme-primary rounded-full h-1 transition-all" style={'width: ' + ((task.checklist.completed / task.checklist.total) * 100) + '%'}></div></div>
                  </div>
                {/if}

                <div class="pt-2">
                  <div class="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400 flex-wrap">
                    {#if dueDate}<div class={'flex items-center gap-1 ' + dueDate.className}><Icon icon={Icons.calendar} width="13px" /><span class="text-ui-xs">{dueDate.text}</span></div>{/if}
                    {#if task.attachments}<div class="flex items-center gap-1"><Icon icon={Icons.paperclip} width="13px" /><span class="text-ui-xs">{task.attachments}</span></div>{/if}
                    {#if task.comments}<div class="flex items-center gap-1"><Icon icon={Icons.message} width="13px" /><span class="text-ui-xs">{task.comments}</span></div>{/if}
                  </div>
                </div>
              </button>

              {#if task.assignees.length > 0}
                <div class="flex items-center -space-x-1 mt-2">
                  {#each task.assignees.slice(0, 3) as assignee}
                    <img src={assignee.avatar} alt={assignee.name} title={assignee.name} class="w-6 h-6 rounded-full border-2 border-white dark:border-surface-800" />
                  {/each}
                  {#if task.assignees.length > 3}<div class="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 border-2 border-white dark:border-surface-800 flex items-center justify-center text-ui-2xs font-medium text-secondary-600 dark:text-secondary-400">+{task.assignees.length - 3}</div>{/if}
                </div>
              {/if}
            </div>
          {/each}

          {#if column.tasks.length === 0 && !activeTask}
            <div class="flex items-center justify-center h-32 text-secondary-400 text-xs">{t('kanban.drop_tasks_here')}</div>
          {/if}
        </div>
      </div>
    {/each}

    {#if isAddingColumn}
      <div class="flex flex-col w-80 flex-shrink-0">
        <div class="bg-surface-100 dark:bg-surface-800 rounded-xl p-3">
          <input bind:value={newColumnTitle} placeholder={t('kanban.column_title_placeholder')} class="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary mb-2" on:keydown={(event) => { if (event.key === 'Enter') handleAddColumn(); if (event.key === 'Escape') { isAddingColumn = false; newColumnTitle = '' } }} />
          <div class="flex items-center gap-2">
            <button type="button" on:click={handleAddColumn} class="px-3 py-1.5 bg-theme-primary hover:bg-theme-primary-dark text-white text-sm rounded-lg font-medium transition-colors">{t('kanban.add_column')}</button>
            <button type="button" aria-label="Cancel" on:click={() => { isAddingColumn = false; newColumnTitle = '' }} class="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded text-secondary-500 transition-colors"><Icon icon={Icons.x} width="18px" /></button>
          </div>
        </div>
      </div>
    {:else}
      <div class="flex flex-col w-80 flex-shrink-0">
        <button type="button" on:click={() => (isAddingColumn = true)} class="bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl p-3 text-left transition-colors group">
          <div class="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 group-hover:text-secondary-900 dark:group-hover:text-white"><Icon icon={Icons.plus} width="18px" /><span class="text-sm font-medium">{t('kanban.add_another_list')}</span></div>
        </button>
      </div>
    {/if}
  </div>
</div>

{#if isFormModalOpen}
  <div class="fixed inset-0 z-[1050] flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/50" aria-label="Close task form" on:click={() => (isFormModalOpen = false)}></button>
    <form class="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6" on:submit|preventDefault={handleTaskSubmit}>
      <div class="flex items-center justify-between"><h2 class="heading-5 text-secondary-900 dark:text-white">{isEditMode ? t('kanban.edit_task') : t('kanban.new_task')}</h2><button type="button" aria-label="Close" on:click={() => (isFormModalOpen = false)}><Icon icon={Icons.x} /></button></div>
      <div class="space-y-4 mt-6">
        <div><label for="kanban-task-title" class="block text-sm text-secondary-700 dark:text-secondary-300">{t('kanban.task_title')}<input id="kanban-task-title" bind:value={taskTitle} placeholder={t('kanban.task_title_placeholder')} class="input-theme mt-1" required /></label></div>
        <div><label for="kanban-task-description" class="block text-sm text-secondary-700 dark:text-secondary-300">{t('kanban.task_description')}<textarea id="kanban-task-description" bind:value={taskDescription} rows="4" placeholder={t('kanban.description_placeholder')} class="input-theme mt-1"></textarea></label></div>
        <div class="grid grid-cols-2 gap-4"><label for="kanban-task-priority" class="block text-sm text-secondary-700 dark:text-secondary-300">{t('kanban.priority')}<select id="kanban-task-priority" bind:value={taskPriority} class="input-theme mt-1"><option value="low">{t('kanban.low')}</option><option value="medium">{t('kanban.medium')}</option><option value="high">{t('kanban.high')}</option></select></label><label for="kanban-task-date" class="block text-sm text-secondary-700 dark:text-secondary-300">{t('kanban.due_date')}<input id="kanban-task-date" bind:value={taskDueDate} type="date" class="input-theme mt-1" /></label></div>
        <div><label for="kanban-task-tags" class="block text-sm text-secondary-700 dark:text-secondary-300">{t('kanban.tags')}<input id="kanban-task-tags" bind:value={taskTags} placeholder={t('kanban.tags_placeholder')} class="input-theme mt-1" /></label></div>
      </div>
      <div class="flex gap-3 mt-6"><button type="button" on:click={() => (isFormModalOpen = false)} class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-xl">{t('common.cancel')}</button><button type="submit" class="flex-1 px-4 py-2.5 bg-theme-primary text-white rounded-xl">{isEditMode ? t('kanban.update_task') : t('kanban.save_task')}</button></div>
    </form>
  </div>
{/if}

{#if isDetailModalOpen && detailTask}
  <div class="fixed inset-0 z-[1040] flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/50" aria-label="Close task detail" on:click={() => (isDetailModalOpen = false)}></button>
    <div class="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6">
      <button type="button" aria-label="Close" class="absolute top-4 right-4 p-2" on:click={() => (isDetailModalOpen = false)}><Icon icon={Icons.x} /></button>
      <span class={'px-2 py-1 rounded-full text-ui-xs font-medium ' + priorityColors[detailTask.priority].bg + ' ' + priorityColors[detailTask.priority].text}>{t('kanban.' + detailTask.priority)}</span>
      <h2 class="heading-4 text-secondary-900 dark:text-white mt-4">{detailTask.title}</h2>
      <p class="text-body-sm text-secondary-600 dark:text-secondary-300 mt-3">{detailTask.description}</p>
      <button type="button" class="btn-theme-primary w-full mt-6 py-2.5 rounded-xl" on:click={() => { const column = findColumnByTaskId(detailTask?.id ?? ''); isDetailModalOpen = false; if (column) openTask(column.id, detailTask) }}>{t('kanban.edit_task')}</button>
    </div>
  </div>
{/if}







