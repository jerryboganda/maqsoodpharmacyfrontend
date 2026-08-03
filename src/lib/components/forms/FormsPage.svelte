<script lang="ts">
  import { onMount } from 'svelte'
  import { Editor } from '@tiptap/core'
  import Placeholder from '@tiptap/extension-placeholder'
  import StarterKit from '@tiptap/starter-kit'
  import { translate } from '../../stores/locale'

  export let path = '/forms/layout'

  const t = translate
  const inputClassName = 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all'
  const labelClassName = 'block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1'
  const buttonBase = 'px-3 py-1.5 text-sm rounded-lg border border-surface-200 dark:border-surface-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors'
  const buttonActive = 'bg-theme-primary text-white border-theme-primary hover:bg-theme-primary/90'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  let lastSubmit = ''
  type Values = {
    fullName: string
    email: string
    password: string
    confirmPassword: string
    acceptTerms: boolean
  }
  type ValidationField = keyof Values
  type ValidationErrors = Partial<Record<ValidationField, string>>

  let values: Values = { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false }
  let touched: Partial<Record<ValidationField, boolean>> = {}
  let submitted = false
  let success = false
  $: errors = validate(values)

  let editorElement: HTMLDivElement
  let editor: Editor | null = null
  let editorHtml = ''
  const emptyEditorHtml = String.fromCodePoint(0x2014)
  const editorContent = '<h2>Rich Text Editor</h2><p>This is a free WYSIWYG editor powered by <strong>Tiptap</strong>.</p><ul><li>Bold / italic / headings</li><li>Lists &amp; quotes</li><li>Undo / redo</li></ul>'

  $: pageTitle = path === '/forms/editor' ? t('nav.editor') : path === '/forms/validation' ? t('nav.form_validation') : t('nav.form_layout')

  function validate(current: Values): ValidationErrors {
    const next: ValidationErrors = {}
    if (!current.fullName.trim()) next.fullName = t('forms.validation.errors.full_name_required')
    if (!current.email.trim()) next.email = t('forms.validation.errors.email_required')
    else if (!emailRegex.test(current.email)) next.email = t('forms.validation.errors.email_invalid')
    if (!current.password) next.password = t('forms.validation.errors.password_required')
    else if (current.password.length < 8) next.password = t('forms.validation.errors.password_min8')
    if (!current.confirmPassword) next.confirmPassword = t('forms.validation.errors.confirm_password_required')
    else if (current.confirmPassword !== current.password) next.confirmPassword = t('forms.validation.errors.passwords_no_match')
    if (!current.acceptTerms) next.acceptTerms = t('forms.validation.errors.accept_terms_required')
    return next
  }

  function showError(field: ValidationField, visible: boolean): boolean {
    return Boolean(errors[field] && visible)
  }

  function markTouched(field: ValidationField): void {
    touched = { ...touched, [field]: true }
  }

  function resetValidation(): void {
    values = { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false }
    touched = {}
    submitted = false
    success = false
  }

  function submitValidation(): void {
    submitted = true
    if (Object.keys(errors).length > 0) {
      success = false
      return
    }
    success = true
    submitted = false
    touched = {}
    values = { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false }
  }

  function submitLayout(): void {
    lastSubmit = t('forms.submitted')
    window.setTimeout(() => (lastSubmit = ''), 2500)
  }

  function runEditor(command: 'bold' | 'italic' | 'strike' | 'bulletList' | 'orderedList' | 'blockquote' | 'undo' | 'redo'): void {
    if (!editor) return
    const chain = editor.chain().focus()
    if (command === 'bold') chain.toggleBold().run()
    if (command === 'italic') chain.toggleItalic().run()
    if (command === 'strike') chain.toggleStrike().run()
    if (command === 'bulletList') chain.toggleBulletList().run()
    if (command === 'orderedList') chain.toggleOrderedList().run()
    if (command === 'blockquote') chain.toggleBlockquote().run()
    if (command === 'undo') chain.undo().run()
    if (command === 'redo') chain.redo().run()
  }

  function toggleHeading(level: 2 | 3): void {
    editor?.chain().focus().toggleHeading({ level }).run()
  }

  onMount(() => {
    if (path !== '/forms/editor' || !editorElement) return
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: t('forms.editor.placeholder') }),
      ],
      content: editorContent,
      editorProps: {
        attributes: {
          class: 'min-h-[260px] px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-secondary-900 dark:text-white focus:outline-none',
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        editorHtml = currentEditor.getHTML()
      },
    })
    return () => editor?.destroy()
  })
</script>

<svelte:head><title>{pageTitle} &middot; Adminex</title></svelte:head>

{#if path === '/forms/editor'}
  <div class="space-y-6">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">{t('nav.editor')}</h1>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">{t('forms.editor.subtitle')}</p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 card rounded-xl p-6">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <button type="button" class={buttonBase + (editor?.isActive('bold') ? ' ' + buttonActive : '')} on:click={() => runEditor('bold')} disabled={!editor}>{t('forms.editor.bold')}</button>
          <button type="button" class={buttonBase + (editor?.isActive('italic') ? ' ' + buttonActive : '')} on:click={() => runEditor('italic')} disabled={!editor}>{t('forms.editor.italic')}</button>
          <button type="button" class={buttonBase + (editor?.isActive('strike') ? ' ' + buttonActive : '')} on:click={() => runEditor('strike')} disabled={!editor}>{t('forms.editor.strike')}</button>
          <div class="w-px h-7 bg-surface-200 dark:bg-surface-700 mx-1"></div>
          <button type="button" class={buttonBase + (editor?.isActive('heading', { level: 2 }) ? ' ' + buttonActive : '')} on:click={() => toggleHeading(2)} disabled={!editor}>H2</button>
          <button type="button" class={buttonBase + (editor?.isActive('heading', { level: 3 }) ? ' ' + buttonActive : '')} on:click={() => toggleHeading(3)} disabled={!editor}>H3</button>
          <div class="w-px h-7 bg-surface-200 dark:bg-surface-700 mx-1"></div>
          <button type="button" class={buttonBase + (editor?.isActive('bulletList') ? ' ' + buttonActive : '')} on:click={() => runEditor('bulletList')} disabled={!editor}>{t('forms.editor.bullet_list')}</button>
          <button type="button" class={buttonBase + (editor?.isActive('orderedList') ? ' ' + buttonActive : '')} on:click={() => runEditor('orderedList')} disabled={!editor}>{t('forms.editor.numbered_list')}</button>
          <button type="button" class={buttonBase + (editor?.isActive('blockquote') ? ' ' + buttonActive : '')} on:click={() => runEditor('blockquote')} disabled={!editor}>{t('forms.editor.quote')}</button>
          <div class="w-px h-7 bg-surface-200 dark:bg-surface-700 mx-1"></div>
          <button type="button" class={buttonBase} on:click={() => runEditor('undo')} disabled={!editor}>{t('forms.editor.undo')}</button>
          <button type="button" class={buttonBase} on:click={() => runEditor('redo')} disabled={!editor}>{t('forms.editor.redo')}</button>
        </div>
        <div bind:this={editorElement}></div>
      </div>

      <div class="xl:col-span-1 card rounded-xl p-6">
        <h2 class="heading-5 text-secondary-900 dark:text-white">{t('forms.editor.output_html')}</h2>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('forms.editor.output_desc')}</p>
        <div class="mt-4">
          <pre class="text-xs leading-relaxed p-4 rounded-xl bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 overflow-auto max-h-[420px] text-secondary-800 dark:text-secondary-200">{editorHtml || emptyEditorHtml}</pre>
        </div>
      </div>
    </div>
  </div>
{:else if path === '/forms/validation'}
  <div class="space-y-6">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">{t('nav.form_validation')}</h1>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">{t('forms.validation.subtitle')}</p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6">
        <h2 class="heading-5 text-secondary-900 dark:text-white">{t('forms.validation.registration_title')}</h2>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('forms.validation.registration_desc')}</p>
        {#if success}
          <div class="mt-4 rounded-xl border border-success-200 bg-success-50/60 dark:bg-success-900/20 dark:border-success-800 p-4">
            <p class="text-sm text-success-800 dark:text-success-200">{t('forms.validation.success')}</p>
          </div>
        {/if}

        <form class="mt-5 space-y-4" on:submit|preventDefault={submitValidation}>
          <div>
            <label class={labelClassName} for="val_fullName">{t('common.full_name')}</label>
            <input id="val_fullName" bind:value={values.fullName} on:blur={() => markTouched('fullName')} class={inputClassName + (showError('fullName', submitted || !!touched.fullName) ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder="John Doe" />
            {#if showError('fullName', submitted || !!touched.fullName)}<p class="mt-1 text-xs text-danger-600">{errors.fullName}</p>{/if}
          </div>
          <div>
            <label class={labelClassName} for="val_email">{t('common.email')}</label>
            <input id="val_email" type="email" bind:value={values.email} on:blur={() => markTouched('email')} class={inputClassName + (showError('email', submitted || !!touched.email) ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder="john@example.com" />
            {#if showError('email', submitted || !!touched.email)}<p class="mt-1 text-xs text-danger-600">{errors.email}</p>{/if}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class={labelClassName} for="val_password">{t('common.password')}</label>
              <input id="val_password" type="password" bind:value={values.password} on:blur={() => markTouched('password')} class={inputClassName + (showError('password', submitted || !!touched.password) ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder={t('forms.validation.password_placeholder_min8')} />
              {#if showError('password', submitted || !!touched.password)}<p class="mt-1 text-xs text-danger-600">{errors.password}</p>{/if}
            </div>
            <div>
              <label class={labelClassName} for="val_confirmPassword">{t('forms.validation.confirm_password')}</label>
              <input id="val_confirmPassword" type="password" bind:value={values.confirmPassword} on:blur={() => markTouched('confirmPassword')} class={inputClassName + (showError('confirmPassword', submitted || !!touched.confirmPassword) ? ' border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : '')} placeholder={t('forms.validation.confirm_password_placeholder')} />
              {#if showError('confirmPassword', submitted || !!touched.confirmPassword)}<p class="mt-1 text-xs text-danger-600">{errors.confirmPassword}</p>{/if}
            </div>
          </div>
          <div>
            <label class="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" bind:checked={values.acceptTerms} on:blur={() => markTouched('acceptTerms')} class="mt-1 h-4 w-4 rounded border-surface-300 text-theme-primary focus:ring-theme-primary/20" />
              <span class="text-sm text-secondary-700 dark:text-secondary-300">{t('forms.validation.accept_terms_label')}</span>
            </label>
            {#if showError('acceptTerms', submitted || !!touched.acceptTerms)}<p class="mt-1 text-xs text-danger-600">{errors.acceptTerms}</p>{/if}
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button type="button" on:click={resetValidation} class="px-4 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-secondary-700 dark:text-secondary-300 rounded-lg font-medium transition-colors">{t('common.clear')}</button>
            <button type="submit" class="px-4 py-2 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg font-medium transition-colors">{t('common.submit')}</button>
          </div>
        </form>
      </div>

      <div class="card rounded-xl p-6">
        <h2 class="heading-5 text-secondary-900 dark:text-white">{t('forms.validation.notes_title')}</h2>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('forms.validation.notes_subtitle')}</p>
        <div class="mt-5 space-y-4">
          <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
            <p class="text-sm text-secondary-700 dark:text-secondary-300">
              - {t('forms.validation.notes_item_1')}<br />
              - {t('forms.validation.notes_item_2')}<br />
              - {t('forms.validation.notes_item_3')}
            </p>
          </div>
          <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
            <p class="text-sm text-secondary-700 dark:text-secondary-300">{t('forms.validation.notes_library')}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="space-y-6">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">{t('nav.form_layout')}</h1>
      <p class="text-body-sm mt-1 text-secondary-500 dark:text-secondary-400">{t('forms.layout.subtitle')}</p>
    </div>
    {#if lastSubmit}
      <div class="card rounded-xl p-4 border border-success-200 bg-success-50/60 dark:bg-success-900/20 dark:border-success-800">
        <p class="text-sm text-success-800 dark:text-success-200">{lastSubmit}</p>
      </div>
    {/if}

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="card rounded-xl p-6">
        <div class="mb-5">
          <h2 class="heading-5 text-secondary-900 dark:text-white">{t('forms.layout.stacked_title')}</h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('forms.layout.stacked_desc')}</p>
        </div>
        <form class="space-y-4" on:submit|preventDefault={submitLayout}>
          <div><label class={labelClassName} for="stacked_fullName">{t('common.full_name')}</label><input id="stacked_fullName" class={inputClassName} placeholder="John Doe" /></div>
          <div><label class={labelClassName} for="stacked_email">{t('common.email')}</label><input id="stacked_email" type="email" class={inputClassName} placeholder="john@example.com" /></div>
          <div><label class={labelClassName} for="stacked_company">{t('common.company')}</label><input id="stacked_company" class={inputClassName} placeholder="Adminex Inc." /></div>
          <div><label class={labelClassName} for="stacked_message">{t('common.message')}</label><textarea id="stacked_message" rows="4" class={inputClassName + ' resize-none'} placeholder={t('forms.layout.message_placeholder')}></textarea></div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button type="button" class="px-4 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-secondary-700 dark:text-secondary-300 rounded-lg font-medium transition-colors">{t('common.cancel')}</button>
            <button type="submit" class="px-4 py-2 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg font-medium transition-colors">{t('common.submit')}</button>
          </div>
        </form>
      </div>

      <div class="card rounded-xl p-6">
        <div class="mb-5">
          <h2 class="heading-5 text-secondary-900 dark:text-white">{t('forms.layout.two_column_title')}</h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('forms.layout.two_column_desc')}</p>
        </div>
        <form class="space-y-4" on:submit|preventDefault={submitLayout}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class={labelClassName} for="two_firstName">{t('common.first_name')}</label><input id="two_firstName" class={inputClassName} placeholder="John" /></div>
            <div><label class={labelClassName} for="two_lastName">{t('common.last_name')}</label><input id="two_lastName" class={inputClassName} placeholder="Doe" /></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class={labelClassName} for="two_email">{t('common.email')}</label><input id="two_email" type="email" class={inputClassName} placeholder="john@example.com" /></div>
            <div><label class={labelClassName} for="two_phone">{t('common.phone')}</label><input id="two_phone" class={inputClassName} placeholder="+1 (555) 123-4567" /></div>
          </div>
          <div><label class={labelClassName} for="two_address">{t('common.address')}</label><input id="two_address" class={inputClassName} placeholder="123 Main St" /></div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label class={labelClassName} for="two_city">{t('common.city')}</label><input id="two_city" class={inputClassName} placeholder="San Francisco" /></div>
            <div><label class={labelClassName} for="two_state">{t('common.state')}</label><input id="two_state" class={inputClassName} placeholder="CA" /></div>
            <div><label class={labelClassName} for="two_zip">{t('common.zip')}</label><input id="two_zip" class={inputClassName} placeholder="94105" /></div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button type="button" class="px-4 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-secondary-700 dark:text-secondary-300 rounded-lg font-medium transition-colors">{t('common.reset')}</button>
            <button type="submit" class="px-4 py-2 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg font-medium transition-colors">{t('common.save_changes')}</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card rounded-xl p-6">
      <div class="mb-5">
        <h2 class="heading-5 text-secondary-900 dark:text-white">{t('forms.layout.inline_title')}</h2>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('forms.layout.inline_desc')}</p>
      </div>
      <form on:submit|preventDefault={submitLayout} class="flex flex-col lg:flex-row lg:items-end gap-4">
        <div class="flex-1"><label class={labelClassName} for="inline_search">{t('common.search')}</label><input id="inline_search" class={inputClassName} placeholder={t('forms.layout.inline_search_placeholder')} /></div>
        <div class="w-full lg:w-56"><label class={labelClassName} for="inline_status">{t('common.status')}</label><select id="inline_status" class={inputClassName}><option value="all">{t('common.all')}</option><option value="active">{t('common.active')}</option><option value="paused">{t('common.paused')}</option><option value="archived">{t('common.archived')}</option></select></div>
        <div class="w-full lg:w-56"><label class={labelClassName} for="inline_sort">{t('common.sort')}</label><select id="inline_sort" class={inputClassName}><option value="newest">{t('common.sort_newest')}</option><option value="oldest">{t('common.sort_oldest')}</option><option value="az">{t('common.sort_az')}</option><option value="za">{t('common.sort_za')}</option></select></div>
        <button type="submit" class="px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-medium transition-colors">{t('common.apply')}</button>
      </form>
    </div>
  </div>
{/if}
