<script lang="ts">
  import { translate } from '../../stores/locale'
</script>

<div class="space-y-6">
  <div>
    <h1 class="heading-2 text-secondary-900 dark:text-white">{translate('typography.title')}</h1>
    <p class="text-body-sm text-secondary-600 dark:text-secondary-400 mt-2">
      {translate('typography.subtitle')}
    </p>
    <p class="text-caption text-secondary-500 dark:text-secondary-400 mt-1">
      {translate('brand.name')} - {translate('typography.route_info')} <code>/pages/typography</code>
    </p>
  </div>

  <div class="card rounded-xl p-6 space-y-5">
    <h2 class="heading-4 text-secondary-900 dark:text-white">{translate('typography.marketing_display')}</h2>
    <div class="space-y-6">
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-display-hero</div>
        <div class="text-display-hero text-secondary-900 dark:text-white">{translate('typography.display_hero')}</div>
      </div>

      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-display-section</div>
        <div class="text-display-section text-secondary-900 dark:text-white">{translate('typography.display_section')}</div>
      </div>

      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-display-price</div>
        <div class="text-display-price text-secondary-900 dark:text-white">{translate('typography.display_price')}</div>
      </div>

      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-lead</div>
        <p class="text-lead text-secondary-600 dark:text-secondary-400 max-w-3xl">
          {translate('typography.lead_text')}
        </p>
      </div>
    </div>
  </div>

  <div class="card rounded-xl p-6 space-y-5">
    <h2 class="heading-4 text-secondary-900 dark:text-white">{translate('typography.headings')}</h2>

    <div class="space-y-4">
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.heading-1</div>
        <div class="heading-1 text-secondary-900 dark:text-white">{translate('typography.heading_1')}</div>
      </div>
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.heading-2</div>
        <div class="heading-2 text-secondary-900 dark:text-white">{translate('typography.heading_2')}</div>
      </div>
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.heading-3</div>
        <div class="heading-3 text-secondary-900 dark:text-white">{translate('typography.heading_3')}</div>
      </div>
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.heading-4</div>
        <div class="heading-4 text-secondary-900 dark:text-white">{translate('typography.heading_4')}</div>
      </div>
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.heading-5</div>
        <div class="heading-5 text-secondary-900 dark:text-white">{translate('typography.heading_5')}</div>
      </div>
    </div>
  </div>

  <div class="card rounded-xl p-6 space-y-5">
    <h2 class="heading-4 text-secondary-900 dark:text-white">{translate('typography.body_ui_text')}</h2>

    <div class="space-y-3">
      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-body</div>
        <p class="text-body text-secondary-600 dark:text-secondary-400">
          {translate('typography.body_text')}
        </p>
      </div>

      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-body-sm</div>
        <p class="text-body-sm text-secondary-600 dark:text-secondary-400">
          {translate('typography.body_sm_text')}
        </p>
      </div>

      <div>
        <div class="text-caption text-secondary-500 dark:text-secondary-400">.text-caption</div>
        <p class="text-caption text-secondary-500 dark:text-secondary-400">
          {translate('typography.caption_text')}
        </p>
      </div>

      <div class="pt-2">
        <div class="text-caption text-secondary-500 dark:text-secondary-400 mb-2">{translate('typography.ui_micro_sizes')}</div>
        <div class="flex flex-wrap gap-3">
          <span class="text-ui px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200">.text-ui</span>
          <span class="text-ui-sm px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200">.text-ui-sm</span>
          <span class="text-ui-xs px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200">.text-ui-xs</span>
          <span class="text-ui-2xs px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-200">.text-ui-2xs</span>
        </div>
      </div>
    </div>
  </div>

  <div class="card rounded-xl p-6 space-y-5">
    <h2 class="heading-4 text-secondary-900 dark:text-white">{translate('typography.emphasis')}</h2>

    <p class="text-body text-secondary-600 dark:text-secondary-400">
      {translate('typography.emphasis_sentence')} <strong>{translate('typography.strong')}</strong>, <b>{translate('typography.bold')}</b>, and{' '}
      <span class="text-strong text-secondary-900 dark:text-white">{translate('typography.span_with_strong')}</span>.
    </p>

    <p class="text-body-sm text-secondary-600 dark:text-secondary-400">
      {translate('typography.emphasis_note')}
    </p>
  </div>
</div>
