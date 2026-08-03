import { Icons } from './icons'

export interface NavSubItem { path: string; label: string }
export interface NavItem { path: string; label: string; icon: string; badge?: string | number; children?: NavSubItem[] }
export interface NavGroup { title: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  { title: 'Dashboards', items: [
    { path: '/dashboard', label: 'Overview', icon: Icons.dashboard },
    { path: '/dashboard/analytics', label: 'Analytics', icon: Icons.chartLine, badge: 'New' },
    { path: '/dashboard/ecommerce', label: 'eCommerce', icon: Icons.shopping },
    { path: '/dashboard/crm', label: 'CRM', icon: Icons.briefcase },
  ] },
  { title: 'Apps', items: [
    { path: '/app/email', label: 'Email', icon: Icons.mail, badge: 3 },
    { path: '/app/chat', label: 'Chat', icon: Icons.message, badge: 5 },
    { path: '/app/calendar', label: 'Calendar', icon: Icons.calendar },
    { path: '/app/contacts', label: 'Contacts', icon: Icons.contacts },
    { path: '/app/blog', label: 'Blog', icon: Icons.article, children: [{ path: '/app/blog', label: 'All Posts' }, { path: '/app/blog/create', label: 'Create Post' }] },
    { path: '/app/ecommerce/products', label: 'E-commerce', icon: Icons.shopping, children: [{ path: '/app/ecommerce/products', label: 'Products' }, { path: '/app/ecommerce/products/create', label: 'Add Product' }, { path: '/app/ecommerce/checkout', label: 'Checkout' }] },
    { path: '/app/notes', label: 'Notes', icon: Icons.note },
    { path: '/app/kanban', label: 'Kanban Board', icon: Icons.kanban },
    { path: '/features/rule-engine', label: 'Rule Engine', icon: Icons.ruleEngine, badge: 'New' },
    { path: '/features/query-builder', label: 'Query Builder', icon: Icons.queryBuilder, badge: 'New' },
    { path: '/features/simulation', label: 'Real-Time Simulation', icon: Icons.simulation, badge: 'New' },
    { path: '/features/insights', label: 'Smart Insights', icon: Icons.insights, badge: 'New' },
    { path: '/features/workflow-builder', label: 'Workflow Builder', icon: Icons.workflowBuilder, badge: 'New' },
    { path: '/features/approval-engine', label: 'Approval Engine', icon: Icons.approvalEngine, badge: 'New' },
    { path: '/features/task-scheduler', label: 'Task Scheduler', icon: Icons.taskScheduler, badge: 'New' },
    { path: '/features/notification-pipeline', label: 'Notifications', icon: Icons.notificationPipeline, badge: 'New' },
  ] },
  { title: 'Authentication', items: [
    { path: '/auth/login', label: 'Login', icon: Icons.lock, children: [{ path: '/auth/login', label: 'Side Login' }, { path: '/auth-card/login', label: 'Card Login' }] },
    { path: '/auth/register', label: 'Register', icon: Icons.userPlus, children: [{ path: '/auth/register', label: 'Side Register' }, { path: '/auth-card/register', label: 'Card Register' }] },
    { path: '/auth/forgot-password', label: 'Forgot Password', icon: Icons.key },
  ] },
  { title: 'Pages', items: [
    { path: '/pages/pricing', label: 'Pricing', icon: Icons.creditCard },
    { path: '/pages/account-settings', label: 'Account Settings', icon: Icons.settings },
    { path: '/pages/gallery', label: 'Gallery', icon: Icons.photo },
    { path: '/pages/faq', label: 'FAQ', icon: Icons.help },
    { path: '/pages/typography', label: 'Typography', icon: Icons.heading },
  ] },
  { title: 'Forms', items: [
    { path: '/forms/layout', label: 'Form Layout', icon: Icons.layoutGrid },
    { path: '/forms/validation', label: 'Form Validation', icon: Icons.checklist },
    { path: '/forms/editor', label: 'Editor', icon: Icons.edit },
  ] },
  { title: 'Tables', items: [
    { path: '/tables/simple', label: 'Simple Table', icon: Icons.table },
    { path: '/tables/data', label: 'Data Table', icon: Icons.database },
    { path: '/tables/crud', label: 'CRUD Table', icon: Icons.edit },
  ] },
  { title: 'Charts', items: [
    { path: '/charts/line', label: 'Line', icon: Icons.chartLine },
    { path: '/charts/area', label: 'Area', icon: Icons.chartArea },
    { path: '/charts/columns', label: 'Columns', icon: Icons.chartBar },
    { path: '/charts/pie', label: 'Pie & Doughnut', icon: Icons.chartPie },
    { path: '/charts/radar', label: 'Radar', icon: Icons.chartRadar },
    { path: '/charts/candlestick', label: 'Candlestick', icon: Icons.chartCandle },
  ] },
]

export const labelKeys: Record<string, string> = {
  Overview: 'nav.overview', Analytics: 'nav.analytics', eCommerce: 'nav.ecommerce', CRM: 'nav.crm', Email: 'nav.email', Chat: 'nav.chat', Calendar: 'nav.calendar', Contacts: 'nav.contacts', Blog: 'nav.blog', 'All Posts': 'nav.blog_all_posts', 'Create Post': 'nav.blog_create_post', 'E-commerce': 'nav.ecommerce_title', Products: 'nav.ecommerce_products', 'Add Product': 'nav.ecommerce_add_product', Checkout: 'nav.ecommerce_checkout', Notes: 'nav.notes', 'Kanban Board': 'nav.kanban_board', Login: 'nav.login', Register: 'nav.register', 'Forgot Password': 'nav.forgot_password', Pricing: 'nav.pricing', 'Account Settings': 'nav.account_settings', Gallery: 'nav.gallery', FAQ: 'nav.faq', 'Form Layout': 'nav.form_layout', 'Form Validation': 'nav.form_validation', Editor: 'nav.editor', 'Simple Table': 'nav.simple_table', 'Data Table': 'nav.data_table', 'CRUD Table': 'nav.crud_table', Line: 'nav.chart_line', Area: 'nav.chart_area', Columns: 'nav.chart_columns', 'Pie & Doughnut': 'nav.chart_pie_doughnut', Radar: 'nav.chart_radar', Candlestick: 'nav.chart_candlestick', New: 'common.new',
}
