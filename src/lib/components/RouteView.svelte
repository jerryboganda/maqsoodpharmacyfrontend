<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { locale } from '../stores/locale'
  import AdminShell from './layout/AdminShell.svelte'
  import DashboardPage from './dashboard/DashboardPage.svelte'
  import AnalyticsDashboardPage from './dashboard/AnalyticsDashboardPage.svelte'
  import EcommerceDashboardPage from './dashboard/EcommerceDashboardPage.svelte'
  import CRMDashboardPage from './dashboard/CRMDashboardPage.svelte'
  import AuthPage from './auth/AuthPage.svelte'
  import CallPage from './apps/CallPage.svelte'
  import BlogEditorPage from './apps/BlogEditorPage.svelte'
  import BlogDetailPage from './apps/BlogDetailPage.svelte'
  import ProductPage from './apps/ProductPage.svelte'
  import CheckoutPage from './apps/CheckoutPage.svelte'
  import EmailPage from './apps/EmailPage.svelte'
  import ContactsPage from './apps/ContactsPage.svelte'
  import CalendarPage from './apps/CalendarPage.svelte'
  import ChatPage from './apps/ChatPage.svelte'
  import NotesPage from './apps/NotesPage.svelte'
  import KanbanPage from './apps/KanbanPage.svelte'
  import BlogListPage from './apps/BlogListPage.svelte'
  import ProductsPage from './apps/ProductsPage.svelte'
  import RuleEnginePage from './features/RuleEnginePage.svelte'
  import ParityQueryPage from './features/ParityQueryPage.svelte'
  import ParitySimulationPage from './features/ParitySimulationPage.svelte'
  import ParityInsightsPage from './features/ParityInsightsPage.svelte'
  import ParityWorkflowPage from './features/ParityWorkflowPage.svelte'
  import ParityApprovalPage from './features/ParityApprovalPage.svelte'
  import ParityTaskPage from './features/ParityTaskPage.svelte'
  import ParityNotificationPage from './features/ParityNotificationPage.svelte'
  import FormsPage from './forms/FormsPage.svelte'
  import TablesPage from './tables/TablesPage.svelte'
  import ChartsPage from './charts/ChartsPage.svelte'
  import InfoPage from './pages/InfoPage.svelte'
  import AccountSettingsPage from './pages/AccountSettingsPage.svelte'
  import FaqPage from './pages/FaqPage.svelte'
  import NotFoundPage from './pages/NotFoundPage.svelte'

  export let path = '/dashboard'
  let redirected = false
  let dashboardVariant: 'overview' | 'analytics' | 'ecommerce' | 'crm' = 'overview'
  let authKind: 'login' | 'register' | 'forgot' = 'login'
  let authCard = false
  const exactRoutes = new Set([
    '/dashboard', '/dashboard/analytics', '/dashboard/ecommerce', '/dashboard/crm', '/app/email', '/app/calendar', '/app/blog', '/app/blog/create', '/app/contacts', '/app/chat', '/app/chat/voice-call', '/app/chat/video-call', '/app/ecommerce/products', '/app/ecommerce/products/create', '/app/ecommerce/checkout', '/app/notes', '/app/kanban', '/forms/layout', '/forms/validation', '/forms/editor', '/tables/simple', '/tables/data', '/tables/crud', '/charts/line', '/charts/area', '/charts/columns', '/charts/pie', '/charts/radar', '/charts/candlestick', '/pages/pricing', '/pages/account-settings', '/pages/gallery', '/pages/faq', '/pages/typography', '/features/rule-engine', '/features/query-builder', '/features/simulation', '/features/insights', '/features/workflow-builder', '/features/approval-engine', '/features/task-scheduler', '/features/notification-pipeline', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth-card/login', '/auth-card/register', '/auth-card/forgot-password',
  ])
  $: dashboardVariant = path === '/dashboard/analytics' ? 'analytics' : path === '/dashboard/ecommerce' ? 'ecommerce' : path === '/dashboard/crm' ? 'crm' : 'overview'
  $: authKind = path.endsWith('register') ? 'register' : path.endsWith('forgot-password') ? 'forgot' : 'login'
  $: authCard = path.startsWith('/auth-card/')

  onMount(() => {
    if (path === '/charts' && !redirected) {
      redirected = true
      goto('/charts/line', { replaceState: true })
    }
  })
</script>

{#key $locale}
{#if path === '/charts'}
  <div class="min-h-[50vh] flex items-center justify-center text-secondary-500">Redirecting to line charts...</div>
{:else if exactRoutes.has(path) && (path.startsWith('/auth/') || path.startsWith('/auth-card/'))}
  <AuthPage kind={authKind} card={authCard} />
{:else if path === '/app/chat/voice-call' || path === '/app/chat/video-call'}
  <AdminShell showCustomizer={false}><CallPage mode={path.endsWith('video-call') ? 'video' : 'voice'} /></AdminShell>
{:else if path === '/app/blog/create'}
  <AdminShell showCustomizer={false}><BlogEditorPage /></AdminShell>
{:else if path === '/app/blog'}
  <AdminShell showCustomizer={false}><BlogListPage /></AdminShell>
{:else if /^\/app\/blog\/[^/]+$/.test(path)}
  <AdminShell showCustomizer={false}><BlogDetailPage slug={path.split('/').pop() ?? 'post-1'} /></AdminShell>
{:else if path === '/app/ecommerce/products/create'}
  <AdminShell showCustomizer={false}><ProductPage mode="create" /></AdminShell>
{:else if path === '/app/ecommerce/checkout'}
  <AdminShell showCustomizer={false}><CheckoutPage /></AdminShell>
{:else if path === '/app/ecommerce/products'}
  <AdminShell showCustomizer={false}><ProductsPage /></AdminShell>
{:else if path === '/app/email'}
  <AdminShell showCustomizer={false}><EmailPage /></AdminShell>
{:else if path === '/app/contacts'}
  <AdminShell showCustomizer={false}><ContactsPage /></AdminShell>
{:else if path === '/app/calendar'}
  <AdminShell showCustomizer={false}><CalendarPage /></AdminShell>
{:else if path === '/app/chat'}
  <AdminShell showCustomizer={false}><ChatPage /></AdminShell>
{:else if path === '/app/notes'}
  <AdminShell showCustomizer={false}><NotesPage /></AdminShell>
{:else if path === '/app/kanban'}
  <AdminShell showCustomizer={false}><KanbanPage /></AdminShell>
{:else if path === '/features/rule-engine'}
  <AdminShell showCustomizer={false}><RuleEnginePage {path} /></AdminShell>
{:else if path === '/features/query-builder'}
  <AdminShell showCustomizer={false}><ParityQueryPage /></AdminShell>
{:else if path === '/features/simulation'}
  <AdminShell showCustomizer={false}><ParitySimulationPage /></AdminShell>
{:else if path === '/features/insights'}
  <AdminShell showCustomizer={false}><ParityInsightsPage /></AdminShell>
{:else if path === '/features/workflow-builder'}
  <AdminShell showCustomizer={false}><ParityWorkflowPage /></AdminShell>
{:else if path === '/features/approval-engine'}
  <AdminShell showCustomizer={false}><ParityApprovalPage /></AdminShell>
{:else if path === '/features/task-scheduler'}
  <AdminShell showCustomizer={false}><ParityTaskPage /></AdminShell>
{:else if path === '/features/notification-pipeline'}
  <AdminShell showCustomizer={false}><ParityNotificationPage /></AdminShell>
{:else if exactRoutes.has(path) && path.startsWith('/forms/')}
  <AdminShell showCustomizer={false}><FormsPage {path} /></AdminShell>
{:else if exactRoutes.has(path) && path.startsWith('/tables/')}
  <AdminShell showCustomizer={false}><TablesPage {path} /></AdminShell>
{:else if exactRoutes.has(path) && path.startsWith('/charts/')}
  <AdminShell showCustomizer={false}><ChartsPage {path} /></AdminShell>
{:else if path === '/pages/account-settings'}
  <AdminShell showCustomizer={false}><AccountSettingsPage /></AdminShell>
{:else if path === '/pages/faq'}
  <AdminShell showCustomizer={false}><FaqPage /></AdminShell>
{:else if path === '/pages/pricing' || path === '/pages/gallery' || path === '/pages/typography'}
  <AdminShell showCustomizer={false}><InfoPage {path} /></AdminShell>
{:else if /^\/app\/ecommerce\/products\/[^/]+(\/edit)?$/.test(path)}
  <AdminShell showCustomizer={false}><ProductPage mode={path.endsWith('/edit') ? 'edit' : 'detail'} productId={path.split('/')[4] ?? '1'} /></AdminShell>
{:else if path === '/dashboard' || path === '/dashboard/analytics' || path === '/dashboard/ecommerce' || path === '/dashboard/crm'}
  <AdminShell showCustomizer={false}>
    {#if path === '/dashboard/analytics'}<AnalyticsDashboardPage />{:else if path === '/dashboard/ecommerce'}<EcommerceDashboardPage />{:else if path === '/dashboard/crm'}<CRMDashboardPage />{:else}<DashboardPage variant="overview" />{/if}
  </AdminShell>
{:else}
  <NotFoundPage />
{/if}
{/key}


