<script lang="ts">
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { defaultChannels, sampleRules, channelConfig, notificationTypeConfig, priorityConfig } from '../../../features/notification-pipeline/config'

  type Tab = 'overview' | 'notifications' | 'preferences' | 'rules'
  let activeTab: Tab = 'overview'
  let showCreateModal = false
  let notifications: { title: string; message: string; type?: string; priority?: string; category?: string }[] = []
  let notificationType = 'info'
  let priority = 'medium'
  let title = ''
  let message = ''
  let category = 'general'

  function createNotification(): void {
    if (!title.trim() || !message.trim()) return
    notifications = [{ title: title.trim(), message: message.trim() }, ...notifications]
    title = ''; message = ''; showCreateModal = false
  }

  function loadSamples(): void { notifications = [{ title: 'Welcome to AdminEx!', message: 'We are glad to have you on board.', type: 'info', priority: 'medium', category: 'onboarding' }, { title: 'New task assigned: Update Documentation', message: 'John assigned you a new task. Due date: Tomorrow.', type: 'info', priority: 'medium', category: 'tasks' }, { title: 'Approval Required: Budget Request', message: 'Sarah has submitted a budget request for Q2 Marketing. Please review.', type: 'alert', priority: 'high', category: 'approvals' }, { title: 'Deadline approaching: Project Milestone', message: 'The deadline for Phase 1 Completion is in 2 days.', type: 'reminder', priority: 'urgent', category: 'reminders' }, { title: 'Report generated successfully', message: 'Your monthly analytics report is ready for download.', type: 'success', priority: 'low', category: 'general' }, { title: 'Storage limit approaching', message: 'You have used 85% of your storage quota. Consider upgrading.', type: 'warning', priority: 'high', category: 'system' }] }
</script>

<svelte:head><title>Notification Pipeline - Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Icon icon="solar:bell-bold" className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div><div><h1 class="text-2xl font-bold text-gray-900 dark:text-white">Notification Pipeline</h1><p class="text-sm text-gray-500 dark:text-gray-400">Multi-channel notification delivery system</p></div></div></div></div>
  <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800"><h3 class="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">Advanced Complex Logic</h3><p class="text-sm text-amber-700 dark:text-amber-300 mb-4">Comprehensive notification system supporting multiple channels (in-app, email, SMS, push, Slack), with templates, automated rules, quiet hours, and delivery analytics.</p><div class="grid grid-cols-2 md:grid-cols-4 gap-4"><div class="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200"><Icon icon="solar:widget-bold" className="w-4 h-4" />Multi-Channel</div><div class="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200"><Icon icon="solar:document-text-bold" className="w-4 h-4" />Templates</div><div class="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200"><Icon icon="solar:settings-bold" className="w-4 h-4" />Preferences</div><div class="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200"><Icon icon="solar:chart-2-bold" className="w-4 h-4" />Analytics</div></div></div>

  <div class="notification-dashboard"><div class="dashboard-header"><div class="header-left"><h2>Notification Pipeline</h2><p>Manage notifications, channels, and delivery rules</p></div><div class="header-right">{#if notifications.length > 0}<div class="unread-indicator"><Icon icon="solar:bell-bold" width={20} /><span class="unread-count">{notifications.length}</span></div>{/if}</div></div><div class="dashboard-tabs"><button type="button" class:active={activeTab === 'overview'} class="tab" on:click={() => (activeTab = 'overview')}><Icon icon="solar:chart-2-bold" width={18} />Overview</button><button type="button" class:active={activeTab === 'notifications'} class="tab" on:click={() => (activeTab = 'notifications')}><Icon icon="solar:bell-bold" width={18} />Notifications{#if notifications.length}<span class="tab-badge">{notifications.length}</span>{/if}</button><button type="button" class:active={activeTab === 'preferences'} class="tab" on:click={() => (activeTab = 'preferences')}><Icon icon="solar:settings-bold" width={18} />Preferences</button><button type="button" class:active={activeTab === 'rules'} class="tab" on:click={() => (activeTab = 'rules')}><Icon icon="solar:document-medicine-bold" width={18} />Rules<span class="tab-badge secondary">{sampleRules.length}</span></button></div>
    <div class="dashboard-content">
      {#if activeTab === 'overview'}<div class="dashboard-overview"><div class="stats-grid"><div class="stat-card"><div class="stat-icon" style="background-color:#dbeafe;color:#3b82f6"><Icon icon="solar:bell-bold" width={24} /></div><div class="stat-content"><span class="stat-value">{notifications.length}</span><span class="stat-label">Total Sent</span></div></div><div class="stat-card"><div class="stat-icon" style="background-color:#d1fae5;color:#10b981"><Icon icon="solar:check-read-bold" width={24} /></div><div class="stat-content"><span class="stat-value">0</span><span class="stat-label">Delivered</span></div></div><div class="stat-card"><div class="stat-icon" style="background-color:#fef3c7;color:#f59e0b"><Icon icon="solar:eye-bold" width={24} /></div><div class="stat-content"><span class="stat-value">0</span><span class="stat-label">Read</span></div></div><div class="stat-card"><div class="stat-icon" style="background-color:#fee2e2;color:#ef4444"><Icon icon="solar:close-circle-bold" width={24} /></div><div class="stat-content"><span class="stat-value">0</span><span class="stat-label">Failed</span></div></div></div><div class="quick-actions"><h4>Quick Actions</h4><div class="action-buttons"><button type="button" on:click={() => (showCreateModal = true)} class="action-btn primary"><Icon icon="solar:add-circle-bold" width={20} />Create Notification</button><button type="button" on:click={loadSamples} class="action-btn"><Icon icon="solar:database-bold" width={20} />Load Samples</button><button type="button" class="action-btn"><Icon icon="solar:check-read-bold" width={20} />Mark All Read</button><button type="button" on:click={() => (notifications = [])} class="action-btn danger"><Icon icon="solar:trash-bin-2-bold" width={20} />Clear All</button></div></div><div class="channels-status"><h4>Channel Status</h4><div class="channels-grid">{#each defaultChannels as channel}<div class:disabled={!channel.enabled} class="channel-status-card"><div class="channel-header"><div class="channel-icon" style={`background-color:${channelConfig[channel.type].color}15;color:${channelConfig[channel.type].color}`}><Icon icon={channelConfig[channel.type].icon} width={20} /></div><div class="channel-info"><span class="channel-name">{channelConfig[channel.type].label}</span><span class:active={channel.enabled} class:inactive={!channel.enabled} class="channel-badge">{channel.enabled ? 'Active' : 'Inactive'}</span></div></div><div class="channel-stats"><div class="mini-stat"><span>0</span><span class="mini-label">Sent</span></div><div class="mini-stat"><span>0</span><span class="mini-label">Delivered</span></div><div class="mini-stat"><span>0%</span><span class="mini-label">Rate</span></div></div></div>{/each}</div></div><div class="recent-notifications"><div class="section-header"><h4>Recent Notifications</h4><button type="button" on:click={() => (activeTab = 'notifications')} class="view-all-btn">View All <Icon icon="solar:arrow-right-linear" width={16} /></button></div><div class="notifications-preview">{#each notifications.slice(0, 5) as item}<div class="notification-preview-item"><div class="preview-icon" style="background:#dbeafe;color:#3b82f6"><Icon icon="solar:bell-bold" width={16} /></div><div class="preview-content"><span class="preview-title">{item.title}</span><span class="preview-time">Just now</span></div>{#if item.priority}<span class="preview-priority">{item.priority}</span>{/if}</div>{/each}{#if notifications.length === 0}<div class="empty-preview"><Icon icon="solar:bell-off-linear" width={32} /><p>No notifications yet</p></div>{/if}</div></div><div class="rules-overview"><div class="section-header"><h4>Active Rules</h4><button type="button" on:click={() => (activeTab = 'rules')} class="view-all-btn">Manage Rules <Icon icon="solar:arrow-right-linear" width={16} /></button></div><div class="rules-preview">{#each sampleRules.filter((rule) => rule.enabled).slice(0, 3) as rule}<div class="rule-preview-item"><Icon icon="solar:document-medicine-bold" width={16} /><span class="rule-name">{rule.name}</span><span class="rule-category">{rule.category}</span></div>{/each}{#if sampleRules.filter((rule) => rule.enabled).length === 0}<div class="empty-preview small"><Icon icon="solar:document-medicine-bold" width={24} /><p>No active rules</p></div>{/if}</div></div></div>
      {:else if activeTab === 'notifications'}<div class="empty-panel"><Icon icon={Icons.bell} width={40} /><h3>Notifications</h3><p>No notifications yet.</p></div>
      {:else if activeTab === 'preferences'}<div class="empty-panel"><Icon icon={Icons.settings} width={40} /><h3>Preferences</h3><p>Configure delivery preferences and quiet hours.</p></div>
      {:else}<div class="empty-panel"><Icon icon={Icons.list} width={40} /><h3>Notification Rules</h3><p>Manage automated notification rules.</p></div>{/if}
    </div></div>

  {#if showCreateModal}<div class="modal-overlay" role="presentation" on:click={() => (showCreateModal = false)} on:keydown={() => {}}><div class="modal" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation={() => {}}><div class="modal-header"><h3>Create Notification</h3><button type="button" on:click={() => (showCreateModal = false)} class="close-btn"><Icon icon="solar:close-circle-bold" width={24} /></button></div><div class="modal-body"><div class="form-group"><label for="notification-type">Type</label><select id="notification-type" bind:value={notificationType}>{#each Object.entries(notificationTypeConfig) as [key, config]}<option value={key}>{config.label}</option>{/each}</select></div><div class="form-group"><label for="notification-priority">Priority</label><select id="notification-priority" bind:value={priority}>{#each Object.entries(priorityConfig) as [key, config]}<option value={key}>{config.label}</option>{/each}</select></div><div class="form-group"><label for="notification-title">Title *</label><input id="notification-title" type="text" bind:value={title} placeholder="Notification title" /></div><div class="form-group"><label for="notification-message">Message *</label><textarea id="notification-message" bind:value={message} placeholder="Notification message" rows="3"></textarea></div><div class="form-group"><label for="notification-category">Category</label><input id="notification-category" type="text" bind:value={category} placeholder="general" /></div></div><div class="modal-footer"><button type="button" on:click={() => (showCreateModal = false)} class="cancel-btn">Cancel</button><button type="button" on:click={createNotification} class="create-btn" disabled={!title.trim() || !message.trim()}>Create</button></div></div></div>{/if}
</div>

<style>
        .notification-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-left h2 {
          margin: 0 0 4px;
          font-size: 24px;
          font-weight: 700;
        }

        .header-left p {
          margin: 0;
          color: var(--text-secondary, #6b7280);
          font-size: 14px;
        }

        .unread-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--primary-bg, #eff6ff);
          color: var(--primary-color, #3b82f6);
          border-radius: 20px;
        }

        .unread-count {
          font-weight: 600;
        }

        .dashboard-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          padding-bottom: 12px;
        }

        .dashboard-tabs .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .dashboard-tabs .tab:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .dashboard-tabs .tab.active {
          background: var(--primary-color, #3b82f6);
          color: white;
        }

        .tab-badge {
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 11px;
        }

        .tab-badge.secondary {
          background: var(--bg-secondary, #f3f4f6);
          color: var(--text-secondary, #6b7280);
        }

        .tab.active .tab-badge.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .dashboard-content {
          min-height: 500px;
        }

        /* Overview Styles */
        .dashboard-overview {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .stats-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: var(--card-bg, #fff);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
        }

        .stat-label {
          font-size: 13px;
          color: var(--text-secondary, #6b7280);
        }

        .quick-actions {
          grid-column: 1 / -1;
          background: var(--card-bg, #fff);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          padding: 20px;
        }

        .quick-actions h4 {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 600;
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid var(--border-color, #e5e7eb);
          background: white;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          border-color: var(--primary-color, #3b82f6);
          color: var(--primary-color, #3b82f6);
        }

        .action-btn.primary {
          background: var(--primary-color, #3b82f6);
          color: white;
          border-color: var(--primary-color, #3b82f6);
        }

        .action-btn.primary:hover {
          background: var(--primary-hover, #2563eb);
        }

        .action-btn.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .channels-status {
          background: var(--card-bg, #fff);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          padding: 20px;
        }

        .channels-status h4 {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 600;
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .channel-status-card {
          padding: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 10px;
        }

        .channel-status-card.disabled {
          opacity: 0.6;
        }

        .channel-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .channel-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .channel-info {
          display: flex;
          flex-direction: column;
        }

        .channel-name {
          font-weight: 600;
          font-size: 13px;
        }

        .channel-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
        }

        .channel-badge.active {
          background: #d1fae5;
          color: #059669;
        }

        .channel-badge.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .channel-stats {
          display: flex;
          gap: 12px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .mini-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mini-stat span {
          font-weight: 600;
          font-size: 14px;
        }

        .mini-stat .mini-label {
          font-size: 10px;
          color: var(--text-secondary, #6b7280);
        }

        .recent-notifications,
        .rules-overview {
          background: var(--card-bg, #fff);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          padding: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .view-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: var(--primary-color, #3b82f6);
          cursor: pointer;
          font-size: 13px;
        }

        .notifications-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .notification-preview-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .notification-preview-item:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .preview-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .preview-title {
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview-time {
          font-size: 11px;
          color: var(--text-secondary, #6b7280);
        }

        .preview-priority {
          display: flex;
          align-items: center;
        }

        .empty-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          color: var(--text-secondary, #6b7280);
        }

        .empty-preview p {
          margin: 8px 0 0;
          font-size: 13px;
        }

        .empty-preview.small {
          padding: 16px;
        }

        .rules-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rule-preview-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 8px;
          font-size: 13px;
        }

        .rule-preview-item:hover {
          background: var(--hover-bg, #f3f4f6);
        }

        .rule-name {
          flex: 1;
          font-weight: 500;
        }

        .rule-category {
          padding: 2px 8px;
          background: var(--bg-secondary, #f3f4f6);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary, #6b7280);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
        }

        .modal {
          background: var(--card-bg, #fff);
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow: hidden;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: fadeIn 0.2s ease-out;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-secondary, #6b7280);
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary, #6b7280);
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .cancel-btn {
          padding: 10px 20px;
          border: 1px solid var(--border-color, #e5e7eb);
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .create-btn {
          padding: 10px 20px;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .create-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 1024px) {
          .dashboard-overview {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .channels-grid {
            grid-template-columns: 1fr;
          }
        }
</style>










