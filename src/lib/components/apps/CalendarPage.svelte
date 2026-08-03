<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { calendarEvents, eventColors, type CalendarEvent } from '../../../data/calendar'
  import { translate } from '../../stores/locale'

  type ViewType = 'month' | 'week' | 'day'
  type EventForm = {
    title: string
    description: string
    location: string
    color: CalendarEvent['color']
    allDay: boolean
    startTime: string
    endTime: string
  }

  const t = translate

  const emptyForm: EventForm = {
    title: '',
    description: '',
    location: '',
    color: 'primary',
    allDay: false,
    startTime: '09:00',
    endTime: '10:00',
  }

  let currentDate = new Date()
  let view: ViewType = 'month'
  let events: CalendarEvent[] = calendarEvents.map((event) => ({ ...event }))
  let selectedEvent: CalendarEvent | null = null
  let formOpen = false
  let deleteOpen = false
  let editMode = false
  let selectedDate: Date | null = null
  let toDelete: CalendarEvent | null = null
  let formData: EventForm = { ...emptyForm }

  $: monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  $: days = getDaysInMonth(currentDate)
  $: weekDays = getWeekDays(currentDate)
  $: dayEvents = events.filter((event) => sameDay(event.start, currentDate))
  $: upcomingEvents = events
    .filter((event) => event.start.getTime() >= Date.now())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5)

  function sameDay(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  }

  function getDaysInMonth(date: Date): { date: Date; current: boolean }[] {
    const year = date.getFullYear()
    const month = date.getMonth()
    const first = new Date(year, month, 1)
    const count = new Date(year, month + 1, 0).getDate()
    const result: { date: Date; current: boolean }[] = []
    for (let i = first.getDay() - 1; i >= 0; i -= 1) {
      result.push({ date: new Date(year, month - 1, new Date(year, month, 0).getDate() - i), current: false })
    }
    for (let day = 1; day <= count; day += 1) result.push({ date: new Date(year, month, day), current: true })
    for (let day = 1; result.length < 42; day += 1) result.push({ date: new Date(year, month + 1, day), current: false })
    return result
  }

  function getWeekDays(date: Date): Date[] {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
    return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  }

  function eventsFor(date: Date): CalendarEvent[] {
    return events.filter((event) => sameDay(event.start, date))
  }

  function isToday(date: Date): boolean {
    return sameDay(date, new Date())
  }

  function navigate(direction: 'prev' | 'next'): void {
    const delta = (view === 'week' ? 7 : 1) * (direction === 'next' ? 1 : -1)
    currentDate = view === 'month'
      ? new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), currentDate.getDate())
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + delta)
  }

  function openNew(date = new Date()): void {
    editMode = false
    selectedEvent = null
    selectedDate = date
    formData = { ...emptyForm }
    formOpen = true
  }

  function openEdit(event: CalendarEvent | null): void {
    if (!event) return
    editMode = true
    selectedEvent = event
    selectedDate = event.start
    formData = {
      title: event.title,
      description: event.description,
      location: event.location ?? '',
      color: event.color,
      allDay: event.allDay ?? false,
      startTime: timeOf(event.start),
      endTime: timeOf(event.end),
    }
    formOpen = true
  }

  function timeOf(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  function withTime(date: Date, hours: number, minutes: number, seconds = 0, milliseconds = 0): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds, milliseconds)
  }

  function submitEvent(): void {
    if (!formData.title.trim() || !selectedDate) return
    let start: Date
    let end: Date
    if (formData.allDay) {
      start = withTime(selectedDate, 0, 0)
      end = withTime(selectedDate, 23, 59, 59, 999)
    } else {
      const [startHour, startMinute] = formData.startTime.split(':').map(Number)
      const [endHour, endMinute] = formData.endTime.split(':').map(Number)
      start = withTime(selectedDate, startHour, startMinute)
      end = withTime(selectedDate, endHour, endMinute)
    }
    const next: CalendarEvent = {
      id: editMode && selectedEvent ? selectedEvent.id : Math.max(...events.map((event) => event.id), 0) + 1,
      title: formData.title.trim(),
      description: formData.description,
      location: formData.location || undefined,
      color: formData.color,
      allDay: formData.allDay,
      start,
      end,
    }
    events = editMode && selectedEvent
      ? events.map((event) => event.id === selectedEvent?.id ? next : event)
      : [...events, next]
    formOpen = false
    selectedEvent = null
    selectedDate = null
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }
</script>

<svelte:head><title>Calendar - Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white flex items-center gap-2"><Icon icon={Icons.calendar} width={28} height={28} />{t('apps.calendar.calendar')}</h1>
      <p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('apps.calendar.manage_schedule')}</p>
    </div>
    <button type="button" class="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium" on:click={() => openNew()}><Icon icon={Icons.plus} width={16} height={16} />{t('apps.calendar.new_event')}</button>
  </div>

  <div class="card rounded-xl overflow-hidden">
    <div class="p-4 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <button type="button" aria-label="Previous" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors text-secondary-600 dark:text-secondary-400" on:click={() => navigate('prev')}><Icon icon={Icons.chevronLeft} width={20} height={20} /></button>
        <button type="button" aria-label="Next" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg" on:click={() => navigate('next')}><Icon icon={Icons.chevronRight} width={20} height={20} /></button>
        <button type="button" class="px-4 py-2 ms-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 transition-colors" on:click={() => (currentDate = new Date())}>{t('apps.calendar.today')}</button>
        <h2 class="text-lg font-semibold text-secondary-900 dark:text-white ms-4">{monthYear}</h2>
      </div>
      <div class="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
        {#each ['month', 'week', 'day'] as option}
          <button type="button" class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === option ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'}`} on:click={() => (view = option as ViewType)}>{t('apps.calendar.' + option)}</button>
        {/each}
      </div>
    </div>

    {#if view === 'month'}
      <div class="p-4">
        <div class="grid grid-cols-7 mb-2">{#each weekDayNames as name}<div class="text-center text-sm font-semibold text-secondary-500 dark:text-secondary-400 py-3">{name}</div>{/each}</div>
        <div class="grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 rounded-xl overflow-hidden">
          {#each days as day}
            <div role="button" tabindex="0" aria-label={`Add event on ${day.date.toLocaleDateString()}`} class={`min-h-28 p-2 bg-white dark:bg-surface-900 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 ${day.current ? '' : 'bg-surface-50 dark:bg-surface-800/50'}`} on:click={() => openNew(day.date)} on:keydown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), openNew(day.date))}>
              <div class={`text-sm font-medium mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${isToday(day.date) ? 'bg-theme-primary text-white' : day.current ? 'text-secondary-900 dark:text-white' : 'text-secondary-400'}`}>{day.date.getDate()}</div>
              <div class="space-y-1">
                {#each eventsFor(day.date).slice(0, 3) as event}
                  <button type="button" class={`block w-full text-left text-xs px-2 py-1 rounded-md truncate cursor-pointer font-medium ${eventColors[event.color].bg} ${eventColors[event.color].text} border-s-2 ${eventColors[event.color].border}`} on:click|stopPropagation={() => (selectedEvent = event)}>{event.title}</button>
                {/each}
                {#if eventsFor(day.date).length > 3}<p class="text-xs text-secondary-400">+{eventsFor(day.date).length - 3} more</p>{/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if view === 'week'}
      <div class="p-4 overflow-x-auto">
        <div class="min-w-[760px] grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 rounded-xl overflow-hidden">
          {#each weekDays as day}
            <div class="bg-white dark:bg-surface-900 min-h-[480px]">
              <button type="button" class={`w-full p-3 text-left border-b border-surface-200 dark:border-surface-700 ${isToday(day) ? 'text-theme-primary' : 'text-secondary-700 dark:text-secondary-300'}`} on:click={() => { currentDate = day; view = 'day' }}><span class="block text-xs uppercase text-secondary-400">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span><span class={`inline-flex mt-1 w-8 h-8 items-center justify-center rounded-full font-semibold ${isToday(day) ? 'bg-theme-primary text-white' : ''}`}>{day.getDate()}</span></button>
              <div class="p-2 space-y-2">{#each eventsFor(day) as event}<button type="button" class={`w-full text-left rounded-lg p-2 text-xs ${eventColors[event.color].bg} ${eventColors[event.color].text}`} on:click={() => (selectedEvent = event)}><span class="font-semibold block">{event.title}</span><span>{event.allDay ? 'All day' : `${timeOf(event.start)}-${timeOf(event.end)}`}</span></button>{/each}</div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="p-6"><div class="max-w-3xl mx-auto"><h2 class="heading-4 text-secondary-900 dark:text-white">{formatDate(currentDate)}</h2><div class="mt-6 space-y-3">{#each dayEvents as event}<button type="button" class={`w-full flex items-center gap-4 p-4 rounded-xl text-left ${eventColors[event.color].bg} ${eventColors[event.color].text}`} on:click={() => (selectedEvent = event)}><span class="w-20 text-sm font-semibold">{event.allDay ? 'All day' : timeOf(event.start)}</span><span class="flex-1"><span class="block font-bold">{event.title}</span><span class="block text-xs mt-1 opacity-80">{event.description}</span></span><Icon icon={Icons.chevronRight} /></button>{/each}{#if dayEvents.length === 0}<div class="py-16 text-center"><Icon icon={Icons.calendar} width={56} height={56} className="mx-auto text-secondary-300" /><p class="text-secondary-500 mt-4">No events scheduled</p><button type="button" class="mt-4 text-sm text-theme-primary" on:click={() => openNew(currentDate)}>Create an event</button></div>{/if}</div></div></div>
    {/if}

    {#if selectedEvent}
      <div class="border-t border-surface-200 dark:border-surface-700 p-4 flex items-center justify-between"><div><p class="font-semibold text-secondary-900 dark:text-white">{selectedEvent.title}</p><p class="text-sm text-secondary-500">{selectedEvent.description}</p></div><div class="flex gap-2"><button type="button" class="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm" on:click={() => openEdit(selectedEvent)}>Edit</button><button type="button" class="px-3 py-2 rounded-lg bg-danger-600 text-white text-sm" on:click={() => { toDelete = selectedEvent; deleteOpen = true; selectedEvent = null }}>Delete</button></div></div>
    {/if}
  </div>

  <div class="card rounded-xl p-5">
    <h3 class="text-lg font-bold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
      <Icon icon={Icons.calendarEvent} width={20} height={20} />
      Upcoming Events
    </h3>
    <div class="space-y-3">
      {#each upcomingEvents as event}
        <button type="button" class={'w-full text-start p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ' + eventColors[event.color].bg + ' border-s-4 ' + eventColors[event.color].border} on:click={() => (selectedEvent = event)}>
          <div class={'font-semibold ' + eventColors[event.color].text}>{event.title}</div>
          <div class="text-sm text-secondary-600 dark:text-secondary-400 mt-1.5">
            {event.allDay ? formatDate(event.start) : `${formatShortDate(event.start)} at ${formatTime(event.start)}`}
          </div>
          {#if event.location}
            <div class="text-sm text-secondary-500 dark:text-secondary-500 flex items-center gap-1.5 mt-1.5">
              <Icon icon={Icons.mapPin} width={16} height={16} />
              {event.location}
            </div>
          {/if}
        </button>
      {/each}
      {#if upcomingEvents.length === 0}
        <div class="text-center py-8">
          <Icon icon={Icons.calendarEvent} width={48} height={48} className="mx-auto text-secondary-300 dark:text-secondary-600 mb-3" />
          <p class="text-secondary-500 dark:text-secondary-400">No upcoming events</p>
          <button type="button" class="mt-3 text-sm text-theme-primary hover:underline font-medium" on:click={() => openNew()}>
            Create an event
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if formOpen}
  <div class="fixed inset-0 z-[1050] flex items-center justify-center p-4"><button type="button" class="absolute inset-0 bg-black/50" aria-label="Close event form" on:click={() => (formOpen = false)}></button><form class="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6" on:submit|preventDefault={submitEvent}><div class="flex items-center justify-between"><h2 class="heading-5 text-secondary-900 dark:text-white">{editMode ? 'Edit event' : 'New event'}</h2><button type="button" aria-label="Close" on:click={() => (formOpen = false)}><Icon icon={Icons.x} /></button></div><div class="space-y-4 mt-6"><label class="block text-sm text-secondary-700 dark:text-secondary-300">Title<input bind:value={formData.title} required class="input-theme mt-1" placeholder="Event title" /></label><label class="block text-sm text-secondary-700 dark:text-secondary-300">Description<textarea bind:value={formData.description} rows="3" class="input-theme mt-1" placeholder="Details"></textarea></label><label class="block text-sm text-secondary-700 dark:text-secondary-300">Location<input bind:value={formData.location} class="input-theme mt-1" placeholder="Location" /></label><div class="grid grid-cols-2 gap-4"><label class="block text-sm text-secondary-700 dark:text-secondary-300">Start<input bind:value={formData.startTime} type="time" class="input-theme mt-1" /></label><label class="block text-sm text-secondary-700 dark:text-secondary-300">End<input bind:value={formData.endTime} type="time" class="input-theme mt-1" /></label></div><label class="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300"><input bind:checked={formData.allDay} type="checkbox" class="checkbox-theme" />All day</label><label class="block text-sm text-secondary-700 dark:text-secondary-300">Color<select bind:value={formData.color} class="input-theme mt-1">{#each ['primary', 'success', 'warning', 'danger', 'info', 'purple'] as color}<option value={color}>{color}</option>{/each}</select></label></div><div class="flex gap-3 mt-6"><button type="button" class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl" on:click={() => (formOpen = false)}>Cancel</button><button type="submit" class="flex-1 px-4 py-2.5 bg-theme-primary text-white rounded-xl">Save event</button></div></form></div>
{/if}

{#if deleteOpen && toDelete}
  <div class="fixed inset-0 z-[1060] flex items-center justify-center p-4"><button type="button" class="absolute inset-0 bg-black/50" aria-label="Close delete dialog" on:click={() => (deleteOpen = false)}></button><div class="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl p-6 text-center"><h2 class="heading-5 text-secondary-900 dark:text-white">Delete event?</h2><p class="text-sm text-secondary-500 mt-2">{toDelete.title} will be removed.</p><div class="flex gap-3 mt-6"><button type="button" class="flex-1 px-4 py-2.5 bg-surface-100 rounded-xl" on:click={() => (deleteOpen = false)}>Cancel</button><button type="button" class="flex-1 px-4 py-2.5 bg-danger-600 text-white rounded-xl" on:click={() => { events = events.filter((event) => event.id !== toDelete?.id); deleteOpen = false; toDelete = null }}>Delete</button></div></div></div>
{/if}

