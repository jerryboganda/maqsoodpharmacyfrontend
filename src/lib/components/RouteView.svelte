<script lang="ts">
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
  import PharmacyLoginPage from './pharmacy/PharmacyLoginPage.svelte'
  import PharmacyDashboardPage from './pharmacy/PharmacyDashboardPage.svelte'
  import InventoryOverviewPage from './pharmacy/InventoryOverviewPage.svelte'
  import ExpiryDashboardPage from './pharmacy/ExpiryDashboardPage.svelte'
  import StockAdjustmentsPage from './pharmacy/StockAdjustmentsPage.svelte'
  import StockTakesPage from './pharmacy/StockTakesPage.svelte'
  import ItemsPage from './pharmacy/ItemsPage.svelte'
  import SuppliersPage from './pharmacy/SuppliersPage.svelte'
  import PurchaseInvoicesPage from './pharmacy/PurchaseInvoicesPage.svelte'
  import PurchaseOrdersPage from './pharmacy/PurchaseOrdersPage.svelte'
  import PurchaseReturnsPage from './pharmacy/PurchaseReturnsPage.svelte'
  import CustomersPage from './pharmacy/CustomersPage.svelte'
  import SaleInvoicesPage from './pharmacy/SaleInvoicesPage.svelte'
  import SaleReturnsPage from './pharmacy/SaleReturnsPage.svelte'
  import POSCheckoutPage from './pharmacy/POSCheckoutPage.svelte'
  import SettingsOptionsPage from './pharmacy/SettingsOptionsPage.svelte'
  import UsersRolesPage from './pharmacy/UsersRolesPage.svelte'
  import ChartOfAccountsPage from './pharmacy/ChartOfAccountsPage.svelte'
  import JournalEntriesPage from './pharmacy/JournalEntriesPage.svelte'
  import CashBankAccountsPage from './pharmacy/CashBankAccountsPage.svelte'
  import PaymentsPage from './pharmacy/PaymentsPage.svelte'
  import PaymentMethodsPage from './pharmacy/PaymentMethodsPage.svelte'
  import ExpensesPage from './pharmacy/ExpensesPage.svelte'
  import ExpenseCategoriesPage from './pharmacy/ExpenseCategoriesPage.svelte'
  import ReportsPage from './pharmacy/ReportsPage.svelte'
  import AuditLogPage from './pharmacy/AuditLogPage.svelte'
  import NotificationsPage from './pharmacy/NotificationsPage.svelte'

  export let path = '/dashboard'
  let dashboardVariant: 'overview' | 'analytics' | 'ecommerce' | 'crm' = 'overview'
  let authKind: 'login' | 'register' | 'forgot' = 'login'
  let authCard = false
  const exactRoutes = new Set([
    '/dashboard', '/dashboard/analytics', '/dashboard/ecommerce', '/dashboard/crm', '/app/email', '/app/calendar', '/app/blog', '/app/blog/create', '/app/contacts', '/app/chat', '/app/chat/voice-call', '/app/chat/video-call', '/app/ecommerce/products', '/app/ecommerce/products/create', '/app/ecommerce/checkout', '/app/notes', '/app/kanban', '/forms/layout', '/forms/validation', '/forms/editor', '/tables/simple', '/tables/data', '/tables/crud', '/charts/line', '/charts/area', '/charts/columns', '/charts/pie', '/charts/radar', '/charts/candlestick', '/pages/pricing', '/pages/account-settings', '/pages/gallery', '/pages/faq', '/pages/typography', '/features/rule-engine', '/features/query-builder', '/features/simulation', '/features/insights', '/features/workflow-builder', '/features/approval-engine', '/features/task-scheduler', '/features/notification-pipeline', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth-card/login', '/auth-card/register', '/auth-card/forgot-password',
    '/pharmacy', '/pharmacy/login', '/pharmacy/inventory', '/pharmacy/inventory/adjustments', '/pharmacy/inventory/stock-takes', '/pharmacy/inventory/items', '/pharmacy/inventory/expiry', '/pharmacy/purchasing/suppliers', '/pharmacy/purchasing/invoices', '/pharmacy/purchasing/orders', '/pharmacy/purchasing/returns', '/pharmacy/sales/customers', '/pharmacy/sales/invoices', '/pharmacy/sales/returns', '/pharmacy/sales/pos', '/pharmacy/settings/options', '/pharmacy/settings/users',
    '/pharmacy/accounting/chart-of-accounts', '/pharmacy/accounting/vouchers', '/pharmacy/accounting/cash-bank', '/pharmacy/payments/transactions', '/pharmacy/payments/methods', '/pharmacy/expenses/transactions', '/pharmacy/expenses/categories',
    '/pharmacy/reports', '/pharmacy/audit', '/pharmacy/notifications',
  ])
  $: dashboardVariant = path === '/dashboard/analytics' ? 'analytics' : path === '/dashboard/ecommerce' ? 'ecommerce' : path === '/dashboard/crm' ? 'crm' : 'overview'
  $: authKind = path.endsWith('register') ? 'register' : path.endsWith('forgot-password') ? 'forgot' : 'login'
  $: authCard = path.startsWith('/auth-card/')
  // /charts -> /charts/line is now handled by src/routes/charts/+page.ts's load() redirect,
  // which resolves before this component (and its >1MB chunk of every page in the app) needs
  // to load at all -- see that file's comment for why the previous onMount-based redirect here
  // stopped reliably beating a 5s test assertion once Wave 5 grew this chunk further.
</script>

{#key $locale}
{#if path === '/pharmacy/login'}
  <PharmacyLoginPage />
{:else if path === '/pharmacy'}
  <AdminShell showCustomizer={false}><PharmacyDashboardPage /></AdminShell>
{:else if path === '/pharmacy/inventory'}
  <AdminShell showCustomizer={false}><InventoryOverviewPage /></AdminShell>
{:else if path === '/pharmacy/inventory/adjustments'}
  <AdminShell showCustomizer={false}><StockAdjustmentsPage /></AdminShell>
{:else if path === '/pharmacy/inventory/stock-takes'}
  <AdminShell showCustomizer={false}><StockTakesPage /></AdminShell>
{:else if path === '/pharmacy/inventory/items'}
  <AdminShell showCustomizer={false}><ItemsPage /></AdminShell>
{:else if path === '/pharmacy/inventory/expiry'}
  <AdminShell showCustomizer={false}><ExpiryDashboardPage /></AdminShell>
{:else if path === '/pharmacy/purchasing/suppliers'}
  <AdminShell showCustomizer={false}><SuppliersPage /></AdminShell>
{:else if path === '/pharmacy/purchasing/invoices'}
  <AdminShell showCustomizer={false}><PurchaseInvoicesPage /></AdminShell>
{:else if path === '/pharmacy/purchasing/orders'}
  <AdminShell showCustomizer={false}><PurchaseOrdersPage /></AdminShell>
{:else if path === '/pharmacy/purchasing/returns'}
  <AdminShell showCustomizer={false}><PurchaseReturnsPage /></AdminShell>
{:else if path === '/pharmacy/sales/customers'}
  <AdminShell showCustomizer={false}><CustomersPage /></AdminShell>
{:else if path === '/pharmacy/sales/invoices'}
  <AdminShell showCustomizer={false}><SaleInvoicesPage /></AdminShell>
{:else if path === '/pharmacy/sales/returns'}
  <AdminShell showCustomizer={false}><SaleReturnsPage /></AdminShell>
{:else if path === '/pharmacy/sales/pos'}
  <AdminShell showCustomizer={false}><POSCheckoutPage /></AdminShell>
{:else if path === '/pharmacy/settings/options'}
  <AdminShell showCustomizer={false}><SettingsOptionsPage /></AdminShell>
{:else if path === '/pharmacy/settings/users'}
  <AdminShell showCustomizer={false}><UsersRolesPage /></AdminShell>
{:else if path === '/pharmacy/accounting/chart-of-accounts'}
  <AdminShell showCustomizer={false}><ChartOfAccountsPage /></AdminShell>
{:else if path === '/pharmacy/accounting/vouchers'}
  <AdminShell showCustomizer={false}><JournalEntriesPage /></AdminShell>
{:else if path === '/pharmacy/accounting/cash-bank'}
  <AdminShell showCustomizer={false}><CashBankAccountsPage /></AdminShell>
{:else if path === '/pharmacy/payments/transactions'}
  <AdminShell showCustomizer={false}><PaymentsPage /></AdminShell>
{:else if path === '/pharmacy/payments/methods'}
  <AdminShell showCustomizer={false}><PaymentMethodsPage /></AdminShell>
{:else if path === '/pharmacy/expenses/transactions'}
  <AdminShell showCustomizer={false}><ExpensesPage /></AdminShell>
{:else if path === '/pharmacy/expenses/categories'}
  <AdminShell showCustomizer={false}><ExpenseCategoriesPage /></AdminShell>
{:else if path === '/pharmacy/reports'}
  <AdminShell showCustomizer={false}><ReportsPage /></AdminShell>
{:else if path === '/pharmacy/audit'}
  <AdminShell showCustomizer={false}><AuditLogPage /></AdminShell>
{:else if path === '/pharmacy/notifications'}
  <AdminShell showCustomizer={false}><NotificationsPage /></AdminShell>
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


