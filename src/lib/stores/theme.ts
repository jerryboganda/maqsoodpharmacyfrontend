import { browser } from '$app/environment'
import { writable, get } from 'svelte/store'
import {
  defaultThemeConfig,
  themeColorPresets,
  type CardStyle,
  type ContainerType,
  type SidebarLayout,
  type ThemeColor,
  type ThemeConfig,
  type ThemeDirection,
  type ThemeMode,
} from '../../types/theme'

export const THEME_STORAGE_KEY = 'adminex-theme'

function readStoredTheme(): ThemeConfig {
  if (!browser) return defaultThemeConfig
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (!saved) return defaultThemeConfig
    return { ...defaultThemeConfig, ...JSON.parse(saved) } as ThemeConfig
  } catch {
    localStorage.removeItem(THEME_STORAGE_KEY)
    return defaultThemeConfig
  }
}

export const theme = writable<ThemeConfig>(readStoredTheme())

let initialized = false

export function applyTheme(config: ThemeConfig): void {
  if (!browser) return
  const root = document.documentElement
  root.classList.toggle('dark', config.mode === 'dark')
  root.dir = config.direction
  const preset = themeColorPresets[config.color]
  root.style.setProperty('--theme-primary', preset.primary)
  root.style.setProperty('--theme-accent', preset.accent)
  root.dataset.sidebarLayout = config.sidebarLayout
  root.dataset.container = config.container
  root.dataset.cardStyle = config.cardStyle
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config))
}

export function initializeTheme(): () => void {
  if (!browser || initialized) return () => undefined
  initialized = true
  const unsubscribe = theme.subscribe(applyTheme)
  applyTheme(get(theme))
  return unsubscribe
}

function update(patch: Partial<ThemeConfig>): void {
  theme.update((current) => ({ ...current, ...patch }))
}

export const setMode = (mode: ThemeMode): void => update({ mode })
export const setDirection = (direction: ThemeDirection): void => update({ direction })
export const setColor = (color: ThemeColor): void => update({ color })
export const setSidebarLayout = (sidebarLayout: SidebarLayout): void => update({ sidebarLayout })
export const setContainer = (container: ContainerType): void => update({ container })
export const setCardStyle = (cardStyle: CardStyle): void => update({ cardStyle })
export const setSidebarCollapsed = (sidebarCollapsed: boolean): void => update({ sidebarCollapsed })
export const toggleSidebar = (): void => theme.update((current) => ({ ...current, sidebarCollapsed: !current.sidebarCollapsed }))
export const resetTheme = (): void => theme.set({ ...defaultThemeConfig })
