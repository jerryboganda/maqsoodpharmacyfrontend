<script lang="ts">
  // Wave 9: split out of RouteView.svelte (that file's own comment: "its >1MB chunk of every page
  // in the app"). RouteView.svelte dynamically imports THIS file only once `path` actually enters
  // `/pharmacy/*` (mirroring the exact `onMount` + `import()` pattern RoutePage.svelte already
  // uses one level up to lazy-load RouteView.svelte itself) -- so a session that never leaves the
  // pharmacy admin never downloads the ~35 unrelated Adminex demo/template pages (dashboard
  // variants, blog, kanban, email, chat, ecommerce, forms/tables/charts showcases, etc.), and a
  // session that only ever uses the demo pages never downloads the pharmacy module.
  //
  // Every branch here is a literal `path === '/pharmacy/...'` string match -- none of them need
  // RouteView.svelte's own `exactRoutes` Set (that machinery exists only for the generic,
  // prefix-matched demo routes -- /forms/*, /tables/*, /charts/*, /auth/* -- which stay in
  // RouteView.svelte, not moved here) or its `dashboardVariant`/`authKind`/`authCard` locals
  // (pharmacy-irrelevant). `{#key $locale}` also stays in the parent -- this component is always
  // rendered fresh underneath it, so re-keying twice would be redundant.
  import AdminShell from './layout/AdminShell.svelte'
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
  import PlatformAdminPage from './pharmacy/PlatformAdminPage.svelte'
  import ChartOfAccountsPage from './pharmacy/ChartOfAccountsPage.svelte'
  import JournalEntriesPage from './pharmacy/JournalEntriesPage.svelte'
  import CashBankAccountsPage from './pharmacy/CashBankAccountsPage.svelte'
  import CashBankReconciliationPage from './pharmacy/CashBankReconciliationPage.svelte'
  import PaymentsPage from './pharmacy/PaymentsPage.svelte'
  import PaymentMethodsPage from './pharmacy/PaymentMethodsPage.svelte'
  import CashierShiftsPage from './pharmacy/CashierShiftsPage.svelte'
  import ExpensesPage from './pharmacy/ExpensesPage.svelte'
  import ExpenseCategoriesPage from './pharmacy/ExpenseCategoriesPage.svelte'
  import ReportsPage from './pharmacy/ReportsPage.svelte'
  import AuditLogPage from './pharmacy/AuditLogPage.svelte'
  import NotificationsPage from './pharmacy/NotificationsPage.svelte'
  import VisibilityWorkbenchPage from './pharmacy/VisibilityWorkbenchPage.svelte'
  import NotFoundPage from './pages/NotFoundPage.svelte'

  export let path = '/pharmacy'
</script>

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
{:else if path === '/pharmacy/inventory/visibility'}
  <AdminShell showCustomizer={false}><VisibilityWorkbenchPage /></AdminShell>
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
{:else if path === '/pharmacy/sales/cashier-shifts'}
  <AdminShell showCustomizer={false}><CashierShiftsPage /></AdminShell>
{:else if path === '/pharmacy/settings/options'}
  <AdminShell showCustomizer={false}><SettingsOptionsPage /></AdminShell>
{:else if path === '/pharmacy/settings/users'}
  <AdminShell showCustomizer={false}><UsersRolesPage /></AdminShell>
{:else if path === '/pharmacy/settings/platform'}
  <AdminShell showCustomizer={false}><PlatformAdminPage /></AdminShell>
{:else if path === '/pharmacy/accounting/chart-of-accounts'}
  <AdminShell showCustomizer={false}><ChartOfAccountsPage /></AdminShell>
{:else if path === '/pharmacy/accounting/vouchers'}
  <AdminShell showCustomizer={false}><JournalEntriesPage /></AdminShell>
{:else if path === '/pharmacy/accounting/cash-bank'}
  <AdminShell showCustomizer={false}><CashBankAccountsPage /></AdminShell>
{:else if path === '/pharmacy/accounting/reconciliations'}
  <AdminShell showCustomizer={false}><CashBankReconciliationPage /></AdminShell>
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
{:else}
  <NotFoundPage />
{/if}
