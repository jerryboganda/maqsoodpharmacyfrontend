<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { navGroups, pharmacyNavGroups, type NavGroup, type NavItem } from '../../navigation'

  let pathname = ''
  let openGroup: string | null = null
  let closeTimer: number | null = null
  let root: HTMLElement | null = null

  $: pathname = String($page.url.pathname)

  // Route-aware, same reasoning as AdminShell.svelte's own sidebarGroups: this component renders
  // on every AdminShell-wrapped route, not just /pharmacy/*.
  $: groups = pathname.startsWith('/pharmacy')
    ? pharmacyNavGroups
    : navGroups.filter((group) => ['Dashboards', 'Apps', 'Pages', 'Forms', 'Tables', 'Charts'].includes(group.title))

  function isActive(path: string): boolean {
    if (path === '/dashboard') return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  function isGroupActive(group: NavGroup): boolean {
    return group.items.some((item) => isActive(item.path))
  }

  function hasChildren(item: NavItem): boolean {
    return Boolean(item.children?.length)
  }

  function displayTitle(title: string): string {
    if (title === 'Dashboards') return 'Dashboard'
    if (title === 'Forms') return 'Forms'
    if (title === 'Tables') return 'Tables'
    return title
  }

  function clearCloseTimer(): void {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  function scheduleClose(): void {
    clearCloseTimer()
    closeTimer = window.setTimeout(() => {
      openGroup = null
      closeTimer = null
    }, 140)
  }

  function open(title: string): void {
    clearCloseTimer()
    openGroup = title
  }

  function toggle(title: string): void {
    clearCloseTimer()
    openGroup = openGroup === title ? null : title
  }

  $: if (pathname) {
    openGroup = null
  }

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openGroup = null
    }
    const onPointerDown = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) openGroup = null
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      clearCloseTimer()
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  })
</script>

<nav bind:this={root} class="fixed top-16 left-0 right-0 h-12 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 z-[1010]">
  <div class="layout-container h-full">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="relative h-full" on:mouseleave={scheduleClose} on:mouseenter={clearCloseTimer}>
      <div class="h-full flex items-center gap-3">
        {#each groups as group}
          {@const active = isGroupActive(group)}
          {@const opened = openGroup === group.title}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="relative h-full flex items-center" on:mouseenter={() => open(group.title)}>
            <button
              type="button"
              class={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' +
                (opened
                  ? 'bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white'
                  : active
                    ? 'bg-theme-primary/10 text-theme-primary'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white')}
              on:click={() => toggle(group.title)}
            >
              {displayTitle(group.title)}
              <Icon icon={Icons.chevronDown} className={'w-3.5 h-3.5 transition-transform duration-200 ' + (opened ? 'rotate-180' : '')} />
            </button>

            {#if opened}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="absolute top-[calc(100%+0.5rem)] left-0 w-56 p-1 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl shadow-surface-200/20 dark:shadow-black/20 animate-in fade-in slide-in-from-top-1 duration-200 z-[1025]"
                on:mouseenter={clearCloseTimer}
                on:mouseleave={scheduleClose}
              >
                <div class="flex flex-col gap-0.5">
                  {#each group.items as item}
                    <div class="relative group/sub after:content-[''] after:absolute after:top-0 after:left-full after:w-3 after:h-full">
                      <a
                        href={item.path}
                        on:click={() => !hasChildren(item) && (openGroup = null)}
                        class={'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ' +
                          (isActive(item.path)
                            ? 'bg-theme-primary/10 text-theme-primary font-medium'
                            : 'text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white')}
                      >
                        <Icon icon={item.icon} className="w-4 h-4 opacity-70" />
                        <span class="flex-1 truncate">{item.label}</span>
                        {#if item.badge}
                          <span class="px-1.5 py-0.5 rounded text-ui-2xs font-bold bg-theme-primary/10 text-theme-primary">{item.badge}</span>
                        {/if}
                        {#if hasChildren(item)}
                          <Icon icon={Icons.chevronRight} className="w-3.5 h-3.5 opacity-50 group-hover/sub:translate-x-0.5 transition-transform" />
                        {/if}
                      </a>

                      {#if hasChildren(item)}
                        <div class="hidden group-hover/sub:block absolute top-0 left-full w-48 p-1 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl animate-in fade-in slide-in-from-left-1 duration-150">
                          <div class="flex flex-col gap-0.5">
                            {#each item.children ?? [] as child}
                              <a
                                href={child.path}
                                on:click={() => (openGroup = null)}
                                class={'block px-3 py-2 rounded-lg text-sm transition-colors ' +
                                  (isActive(child.path)
                                    ? 'bg-theme-primary/10 text-theme-primary font-medium'
                                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white')}
                              >
                                {child.label}
                              </a>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</nav>
