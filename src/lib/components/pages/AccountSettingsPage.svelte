<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'

  type Tab = 'account' | 'notifications' | 'billing' | 'security' | 'devices'

  const t = translate
  let activeTab: Tab = 'account'
  $: currentLocale = $locale
  $: tabs = [
    { id: 'account' as Tab, label: t('account.tab.account'), icon: Icons.user },
    { id: 'notifications' as Tab, label: t('account.tab.notifications'), icon: Icons.bell },
    { id: 'billing' as Tab, label: t('account.tab.billing'), icon: Icons.creditCard },
    { id: 'security' as Tab, label: t('account.tab.security'), icon: Icons.shield },
    { id: 'devices' as Tab, label: t('account.tab.devices'), icon: Icons.devices },
  ]
  $: notificationSettings = [
    { id: 'email', label: t('account.email_notifications'), description: t('account.email_notifications_desc') },
    { id: 'push', label: t('account.push_notifications'), description: t('account.push_notifications_desc') },
    { id: 'sms', label: t('account.sms_notifications'), description: t('account.sms_notifications_desc') },
    { id: 'marketing', label: t('account.marketing_emails'), description: t('account.marketing_emails_desc') },
    { id: 'mentions', label: t('account.mentions_comments'), description: t('account.mentions_comments_desc') },
    { id: 'updates', label: t('account.product_updates'), description: t('account.product_updates_desc') },
  ]
  $: devices = [
    { name: 'MacBook Pro', type: 'Desktop', location: 'New York, USA', lastActive: '2 min ago', current: true },
    { name: 'iPhone 14', type: 'Mobile', location: 'New York, USA', lastActive: '1 hour ago', current: false },
    { name: 'iPad Air', type: 'Tablet', location: 'Los Angeles, USA', lastActive: '2 days ago', current: false },
  ]
</script>

<svelte:head><title>{t('account.title')} · Adminex</title></svelte:head>

<div class="space-y-6" data-locale={currentLocale}>
  <div>
    <h1 class="heading-2 text-secondary-900 dark:text-white">{t('account.title')}</h1>
    <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">{t('account.description')}</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <div class="lg:col-span-1">
      <div class="card rounded-xl p-2 space-y-1">
        {#each tabs as tab}
          <button type="button" aria-pressed={activeTab === tab.id} on:click={() => (activeTab = tab.id)} class={'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ' + (activeTab === tab.id ? 'bg-theme-primary text-white' : 'text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800')}>
            <Icon icon={tab.icon} width={20} height={20} />
            <span class="font-medium">{tab.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="lg:col-span-3">
      <div class="card rounded-xl p-6">
        {#if activeTab === 'account'}
          <div class="space-y-6">
            <div>
              <h2 class="heading-4 text-secondary-900 dark:text-white mb-1">{t('account.personal_info')}</h2>
              <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.personal_info_desc')}</p>
            </div>

            <div>
              <p class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('account.profile_photo')}</p>
              <div class="flex items-center gap-4">
                <img src="https://i.pravatar.cc/150?img=1" alt="Profile" class="w-20 h-20 rounded-full" />
                <button type="button" class="px-4 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Icon icon={Icons.upload} width={16} height={16} />
                  {t('account.upload_new_photo')}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="account-first-name" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.first_name')}</label>
                <input id="account-first-name" type="text" value="John" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
              </div>
              <div>
                <label for="account-last-name" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.last_name')}</label>
                <input id="account-last-name" type="text" value="Doe" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
              </div>
              <div class="md:col-span-2">
                <label for="account-email-address" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.email_address')}</label>
                <input id="account-email-address" type="email" value="john.doe@example.com" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
              </div>
              <div class="md:col-span-2">
                <label for="account-bio" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.bio')}</label>
                <textarea id="account-bio" rows="3" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all resize-none">Software developer and tech enthusiast</textarea>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
              <button type="button" class="px-4 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-secondary-700 dark:text-secondary-300 rounded-lg font-medium transition-colors">{t('account.cancel')}</button>
              <button type="button" class="px-4 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg font-medium transition-colors">{t('account.save_changes')}</button>
            </div>
          </div>
        {:else if activeTab === 'notifications'}
          <div class="space-y-6">
            <div>
              <h2 class="heading-4 text-secondary-900 dark:text-white mb-1">{t('account.notification_preferences')}</h2>
              <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.notification_desc')}</p>
            </div>
            <div class="space-y-4">
              {#each notificationSettings as setting}
                <div class="flex items-start justify-between py-3 border-b border-surface-200 dark:border-surface-700 last:border-0">
                  <div class="flex-1">
                    <h5 class="font-medium text-secondary-900 dark:text-white mb-0.5">{setting.label}</h5>
                    <p class="text-sm text-secondary-600 dark:text-secondary-400">{setting.description}</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer ml-4" aria-label={setting.label}>
                    <input type="checkbox" checked class="sr-only peer" />
                    <div class="w-11 h-6 bg-surface-200 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              {/each}
            </div>
          </div>
        {:else if activeTab === 'billing'}
          <div class="space-y-6">
            <div>
              <h2 class="heading-4 text-secondary-900 dark:text-white mb-1">{t('account.billing_subscription')}</h2>
              <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.billing_desc')}</p>
            </div>
            <div class="p-6 bg-gradient-to-r from-theme-primary/10 to-theme-primary/5 dark:from-theme-primary/20 dark:to-theme-primary/10 border border-theme-primary/20 rounded-xl">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="heading-4 text-secondary-900 dark:text-white mb-1">{t('account.professional_plan')}</h3>
                  <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.next_billing_date')}</p>
                </div>
                <div class="text-right">
                  <div class="heading-3 text-secondary-900 dark:text-white">$29</div>
                  <div class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.per_month')}</div>
                </div>
              </div>
              <button type="button" class="mt-4 px-4 py-2 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-theme-primary rounded-lg font-medium transition-colors">{t('account.upgrade_plan')}</button>
            </div>
            <div>
              <h3 class="font-semibold text-secondary-900 dark:text-white mb-3">{t('account.payment_method')}</h3>
              <div class="p-4 border border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Icon icon={Icons.creditCard} width={24} height={24} className="text-secondary-600 dark:text-secondary-400" />
                  <div>
                    <div class="font-medium text-secondary-900 dark:text-white">•••• •••• •••• 4242</div>
                    <div class="text-sm text-secondary-600 dark:text-secondary-400">{t('account.expires')}</div>
                  </div>
                </div>
                <button type="button" class="text-sm text-theme-primary hover:text-theme-primary-dark font-medium">{t('account.edit')}</button>
              </div>
            </div>
            <div>
              <h3 class="font-semibold text-secondary-900 dark:text-white mb-3">{t('account.billing_history')}</h3>
              <div class="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                <table class="w-full">
                  <thead class="bg-surface-50 dark:bg-surface-800">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">{t('account.date')}</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">{t('account.description_col')}</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400">{t('account.amount')}</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400">{t('account.status_col')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                    <tr>
                      <td class="px-4 py-3 text-sm text-secondary-900 dark:text-white">Dec 14, 2025</td>
                      <td class="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">Professional Plan</td>
                      <td class="px-4 py-3 text-sm text-secondary-900 dark:text-white text-right">$29.00</td>
                      <td class="px-4 py-3 text-right"><span class="px-2 py-1 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 text-xs rounded-full">{t('account.paid')}</span></td>
                    </tr>
                    <tr>
                      <td class="px-4 py-3 text-sm text-secondary-900 dark:text-white">Nov 14, 2025</td>
                      <td class="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">Professional Plan</td>
                      <td class="px-4 py-3 text-sm text-secondary-900 dark:text-white text-right">$29.00</td>
                      <td class="px-4 py-3 text-right"><span class="px-2 py-1 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 text-xs rounded-full">{t('account.paid')}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {:else if activeTab === 'security'}
          <div class="space-y-6">
            <div>
              <h2 class="heading-4 text-secondary-900 dark:text-white mb-1">{t('account.security_settings')}</h2>
              <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.security_desc')}</p>
            </div>
            <div>
              <h3 class="font-semibold text-secondary-900 dark:text-white mb-3 flex items-center gap-2"><Icon icon={Icons.key} width={20} height={20} />{t('account.change_password')}</h3>
              <div class="space-y-4">
                <div><label for="current-password" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.current_password')}</label><input id="current-password" type="password" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" /></div>
                <div><label for="new-password" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.new_password')}</label><input id="new-password" type="password" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" /></div>
                <div><label for="confirm-password" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">{t('account.confirm_new_password')}</label><input id="confirm-password" type="password" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" /></div>
                <button type="button" class="px-4 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg font-medium transition-colors">{t('account.update_password')}</button>
              </div>
            </div>
            <div class="pt-6 border-t border-surface-200 dark:border-surface-700">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-secondary-900 dark:text-white mb-1 flex items-center gap-2"><Icon icon={Icons.shield} width={20} height={20} />{t('account.two_factor_auth')}</h3>
                  <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.two_factor_desc')}</p>
                </div>
                <button type="button" class="px-4 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-secondary-700 dark:text-secondary-300 rounded-lg font-medium transition-colors">{t('account.enable')}</button>
              </div>
            </div>
            <div class="pt-6 border-t border-surface-200 dark:border-surface-700">
              <h3 class="font-semibold text-secondary-900 dark:text-white mb-3">{t('account.active_sessions')}</h3>
              <div class="space-y-3">
                <div class="p-4 border border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-between">
                  <div>
                    <div class="font-medium text-secondary-900 dark:text-white flex items-center gap-2"><Icon icon={Icons.check} width={16} height={16} className="text-success-600" />{t('account.current_session')}</div>
                    <div class="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Chrome on MacOS • {t('account.last_active_now')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div class="space-y-6">
            <div>
              <h2 class="heading-4 text-secondary-900 dark:text-white mb-1">{t('account.connected_devices')}</h2>
              <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('account.devices_desc')}</p>
            </div>
            <div class="space-y-3">
              {#each devices as device}
                <div class="p-4 border border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-between">
                  <div class="flex items-start gap-3">
                    <div class="p-2 bg-surface-100 dark:bg-surface-800 rounded-lg"><Icon icon={Icons.devices} width={20} height={20} className="text-secondary-600 dark:text-secondary-400" /></div>
                    <div>
                      <div class="font-medium text-secondary-900 dark:text-white flex items-center gap-2">{device.name}{#if device.current}<span class="px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 text-xs rounded-full">{t('account.current')}</span>{/if}</div>
                      <div class="text-sm text-secondary-600 dark:text-secondary-400 mt-1">{device.type} • {device.location}</div>
                      <div class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{t('account.last_active', { time: device.lastActive })}</div>
                    </div>
                  </div>
                  {#if !device.current}<button type="button" class="text-sm text-danger-600 hover:text-danger-700 font-medium">{t('account.remove')}</button>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

