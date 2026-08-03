<script lang="ts">
  import { page } from '$app/stores'
  import { SvelteSet } from 'svelte/reactivity'
  import Icon from '../common/Icon.svelte'
  import Logo from '../common/Logo.svelte'
  import { Icons } from '../../icons'
  import { labelKeys, type NavGroup, type NavItem, type NavSubItem } from '../../navigation'
  import { theme } from '../../stores/theme'
  import { translate } from '../../stores/locale'

  export let groups: NavGroup[] = []
  export let collapsed = false
  export let mobileOpen = false
  export let onClose: () => void = () => undefined

  let expanded = new SvelteSet<string>()
  let pathname = ''
  $: pathname = String($page.url.pathname)
  $: isRtl = $theme.direction === 'rtl'

  function active(path: string): boolean {
    if (path === '/dashboard') return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  function parentActive(item: NavItem): boolean {
    return item.children ? item.children.some((child) => active(child.path)) : active(item.path)
  }

  function toggle(path: string): void {
    const next = new SvelteSet(expanded)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    expanded = next
  }

  function text(value: string): string {
    return labelKeys[value] ? translate(labelKeys[value]) : value
  }

  function childText(item: NavSubItem): string {
    return text(item.label)
  }

  function itemClass(item: NavItem): string {
    return 'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ' +
      (collapsed ? 'justify-center p-3' : 'px-4 py-2.5') + ' ' +
      (active(item.path) ? 'bg-theme-primary text-white' : 'text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800')
  }

  function parentClass(item: NavItem): string {
    return 'w-full group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ' +
      (collapsed ? 'justify-center p-3' : 'px-4 py-2.5') + ' ' +
      (parentActive(item) ? 'bg-theme-primary text-white' : 'text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800')
  }

  function badgeClass(item: NavItem): string {
    if (active(item.path)) return 'bg-white/20 text-white'
    if (typeof item.badge === 'number') return 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
    return 'bg-theme-primary-light text-theme-primary'
  }

  function childClass(child: NavSubItem): string {
    return 'block px-4 py-2 rounded-lg text-sm transition-colors ' +
      (active(child.path) ? 'bg-theme-primary-light text-theme-primary font-medium' : 'text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800')
  }
</script>

{#if mobileOpen}
  <button type="button" class="fixed inset-0 bg-black/50 z-[1025] lg:hidden" aria-label="Close navigation" on:click={onClose}></button>
{/if}

<aside class={'fixed top-0 bottom-0 ' + (isRtl ? 'right-0' : 'left-0') + ' bg-white dark:bg-surface-900 border-e border-surface-200 dark:border-surface-800 flex flex-col z-[1030] transition-all duration-300 ' + (mobileOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'))} style={'width:' + (collapsed ? 80 : 260) + 'px'}>
  <div class="h-16 flex items-center justify-center border-b border-surface-200 dark:border-surface-800 px-4">
    <a href="/" class="flex items-center gap-2" aria-label="Adminex home">
      {#if collapsed}<Logo showText={false} height={32} />{:else}<Logo width={120} height={24} />{/if}
    </a>
  </div>

  <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin">
    {#each groups as group}
      <div class="mb-4">
        {#if !collapsed}<p class="px-4 mb-2 text-xs font-semibold text-secondary-400 dark:text-secondary-500 uppercase tracking-wider">{translate('nav.' + group.title.toLowerCase()) === 'nav.' + group.title.toLowerCase() ? group.title : translate('nav.' + group.title.toLowerCase())}</p>{/if}
        <div class={collapsed ? 'px-2 space-y-1' : 'px-3 space-y-1'}>
          {#each group.items as item}
            {#if item.children}
              <div>
                <button type="button" class={parentClass(item)} title={collapsed ? text(item.label) : undefined} on:click={() => toggle(item.path)}>
                  <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                  {#if !collapsed}
                    <span class="flex-1 text-start">{text(item.label)}</span>
                    <Icon icon={Icons.chevronDown} className={'w-4 h-4 transition-transform duration-200 ' + (expanded.has(item.path) ? 'rotate-180' : '')} />
                  {/if}
                  {#if collapsed}<span class="absolute left-full ml-2 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">{text(item.label)}</span>{/if}
                </button>
                {#if !collapsed && expanded.has(item.path)}
                  <div class="mt-1 ms-4 ps-4 border-s border-surface-200 dark:border-surface-700 space-y-1">
                    {#each item.children as child}
                      <a href={child.path} on:click={onClose} class={childClass(child)}>{childText(child)}</a>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else}
              <a href={item.path} on:click={onClose} class={itemClass(item)} title={collapsed ? text(item.label) : undefined}>
                <Icon icon={item.icon} className="w-5 h-5 flex-shrink-0" />
                {#if !collapsed}
                  <span class="flex-1">{text(item.label)}</span>
                  {#if item.badge}<span class={'px-2 py-0.5 text-xs font-medium rounded-full ' + badgeClass(item)}>{typeof item.badge === 'string' ? text(item.badge) : item.badge}</span>{/if}
                {/if}
                {#if collapsed}
                  <span class="absolute left-full ml-2 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">{text(item.label)}{#if item.badge}<span class="ms-1 px-1.5 py-0.5 bg-white/20 rounded text-ui-2xs">{typeof item.badge === 'string' ? text(item.badge) : item.badge}</span>{/if}</span>
                {/if}
              </a>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </nav>

  <div class="p-3 border-t border-surface-200 dark:border-surface-800">
    <a href="/auth/login" on:click={onClose} class={'flex items-center gap-3 rounded-xl text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ' + (collapsed ? 'justify-center p-3' : 'px-4 py-2.5')} title={collapsed ? translate('common.logout') : undefined}>
      <Icon icon={Icons.logout} className="w-5 h-5 flex-shrink-0" />
      {#if !collapsed}<span>{translate('common.logout')}</span>{/if}
    </a>
  </div>
</aside>

