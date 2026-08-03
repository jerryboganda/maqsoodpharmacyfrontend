<script lang="ts">
  import { goto } from '$app/navigation'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { blogCategories } from '../../../data/blog'
  import { translate } from '../../stores/locale'

  const t = translate
  const selectableCategories = blogCategories.filter((category) => category !== 'All')
  let title = ''
  let excerpt = ''
  let contentValue = ''
  let category = ''
  let tags: string[] = []
  let tagInput = ''
  let coverImage: string | null = null
  let status: 'draft' | 'published' = 'draft'
  let publishDate = ''
  let readTime = 5
  let isSaving = false
  let isPreview = false

  function addTag(): void {
    const value = tagInput.trim()
    if (value && !tags.includes(value)) {
      tags = [...tags, value]
      tagInput = ''
    }
  }

  function removeTag(tag: string): void {
    tags = tags.filter((item) => item !== tag)
  }

  function handleTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  function handleImageUpload(event: Event): void {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => (coverImage = String(reader.result))
    reader.readAsDataURL(file)
  }

  async function saveDraft(): Promise<void> {
    isSaving = true
    await new Promise((resolve) => window.setTimeout(resolve, 1000))
    status = 'draft'
    isSaving = false
    window.alert(t('blog.alert_draft_saved'))
  }

  async function publish(): Promise<void> {
    if (!title.trim()) {
      window.alert(t('blog.validation.title_required'))
      return
    }
    if (!category) {
      window.alert(t('blog.validation.category_required'))
      return
    }
    if (!contentValue.trim()) {
      window.alert(t('blog.validation.content_required'))
      return
    }
    isSaving = true
    await new Promise((resolve) => window.setTimeout(resolve, 1000))
    status = 'published'
    isSaving = false
    void goto('/app/blog')
  }
</script>

<svelte:head><title>{t('blog.create_title')} - Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <a href="/app/blog" aria-label="Back to blog" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
        <Icon icon={Icons.arrowLeft} className="w-5 h-5 text-secondary-600 dark:text-secondary-400" width={20} height={20} />
      </a>
      <div><h1 class="heading-2 text-secondary-900 dark:text-white">{t('blog.create_title')}</h1><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('blog.create_description')}</p></div>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" on:click={() => (isPreview = !isPreview)} class="flex items-center gap-2 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
        <Icon icon={Icons.eye} className="w-4 h-4" width={16} height={16} />{isPreview ? t('blog.edit') : t('blog.preview')}
      </button>
      <button type="button" on:click={saveDraft} disabled={isSaving} class="flex items-center gap-2 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-50">
        <Icon icon={Icons.deviceFloppy} className="w-4 h-4" width={16} height={16} />{t('blog.save_draft')}
      </button>
      <button type="button" on:click={publish} disabled={isSaving} class="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
        <Icon icon={Icons.send} className="w-4 h-4" width={16} height={16} />{t('blog.publish')}
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      <div class="card rounded-xl p-6">
        <label for="blog-post-title" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('blog.post_title')} *</label>
        <input id="blog-post-title" bind:value={title} type="text" placeholder={t('blog.post_title_placeholder')} class="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-lg text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
      </div>

      <div class="card rounded-xl p-6">
        <label for="blog-excerpt" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('blog.excerpt')}</label>
        <textarea id="blog-excerpt" bind:value={excerpt} placeholder={t('blog.excerpt_placeholder')} rows="3" class="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all resize-none"></textarea>
        <p class="mt-2 text-xs text-secondary-500 dark:text-secondary-400">{t('blog.excerpt_help')}</p>
      </div>

      <div class="card rounded-xl overflow-hidden">
        <div class="p-4 border-b border-surface-200 dark:border-surface-700">
          <p class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">{t('blog.content')} *</p>
          <div class="flex flex-wrap items-center gap-1 p-2 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <div class="flex items-center gap-0.5 pe-2 border-e border-surface-200 dark:border-surface-700">
              <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t('blog.toolbar.heading_1')}><Icon icon={Icons.heading} className="w-4 h-4" width={16} height={16} /></button>
              <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t('blog.toolbar.heading_2')}><Icon icon={Icons.heading} className="w-4 h-4" width={16} height={16} /></button>
            </div>
            <div class="flex items-center gap-0.5 px-2 border-e border-surface-200 dark:border-surface-700">
              {#each [[Icons.textBold, 'blog.toolbar.bold'], [Icons.textItalic, 'blog.toolbar.italic'], [Icons.textUnderline, 'blog.toolbar.underline']] as item}
                <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t(item[1])}><Icon icon={item[0]} className="w-4 h-4" width={16} height={16} /></button>
              {/each}
            </div>
            <div class="flex items-center gap-0.5 px-2 border-e border-surface-200 dark:border-surface-700">
              {#each [[Icons.textAlignLeft, 'blog.toolbar.align_left'], [Icons.textAlignCenter, 'blog.toolbar.align_center'], [Icons.textAlignRight, 'blog.toolbar.align_right']] as item}
                <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t(item[1])}><Icon icon={item[0]} className="w-4 h-4" width={16} height={16} /></button>
              {/each}
            </div>
            <div class="flex items-center gap-0.5 px-2 border-e border-surface-200 dark:border-surface-700">
              <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t('blog.toolbar.bullet_list')}><Icon icon={Icons.list} className="w-4 h-4" width={16} height={16} /></button>
              <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t('blog.toolbar.numbered_list')}><Icon icon={Icons.listNumbers} className="w-4 h-4" width={16} height={16} /></button>
            </div>
            <div class="flex items-center gap-0.5 px-2">
              {#each [[Icons.link, 'blog.toolbar.insert_link'], [Icons.image, 'blog.toolbar.insert_image'], [Icons.code, 'blog.toolbar.code_block'], [Icons.quote, 'blog.toolbar.quote']] as item}
                <button type="button" class="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors" title={t(item[1])}><Icon icon={item[0]} className="w-4 h-4" width={16} height={16} /></button>
              {/each}
            </div>
          </div>
        </div>
        <div class="p-4">
          {#if isPreview}
            <div class="min-h-[400px] prose dark:prose-invert max-w-none">{@html contentValue || '<p class="text-secondary-400">' + t('blog.nothing_to_preview') + '</p>'}</div>
          {:else}
            <textarea bind:value={contentValue} placeholder={t('blog.content_placeholder')} class="w-full min-h-[400px] px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all resize-y"></textarea>
          {/if}
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <div class="card rounded-xl p-6">
        <label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3"><Icon icon={Icons.photo} className="w-4 h-4 inline-block me-2" width={16} height={16} />{t('blog.cover_image')}</label>
        {#if coverImage}
          <div class="relative rounded-xl overflow-hidden"><img src={coverImage} alt={t('blog.cover_preview_alt')} class="w-full h-48 object-cover" /><button type="button" aria-label="Remove cover image" on:click={() => (coverImage = null)} class="absolute top-2 right-2 p-1.5 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors"><Icon icon={Icons.x} className="w-4 h-4" width={16} height={16} /></button></div>
        {:else}
          <label class="flex flex-col items-center justify-center h-48 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl cursor-pointer hover:border-theme-primary hover:bg-theme-primary/5 transition-all">
            <Icon icon={Icons.upload} className="w-10 h-10 text-secondary-400 mb-2" width={40} height={40} />
            <p class="text-sm text-secondary-600 dark:text-secondary-400">{t('blog.click_upload')}</p>
            <p class="text-xs text-secondary-400 dark:text-secondary-500 mt-1">{t('blog.image_format')}</p>
            <input type="file" accept="image/*" on:change={handleImageUpload} class="hidden" />
          </label>
        {/if}
      </div>

      <div class="card rounded-xl p-6">
        <label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3"><Icon icon={Icons.category} className="w-4 h-4 inline-block me-2" width={16} height={16} />{t('blog.category')} *</label>
        <select bind:value={category} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all">
          <option value="">{t('blog.select_category')}</option>
          {#each selectableCategories as item}<option value={item}>{item}</option>{/each}
        </select>
      </div>

      <div class="card rounded-xl p-6">
        <label class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3"><Icon icon={Icons.tag} className="w-4 h-4 inline-block me-2" width={16} height={16} />{t('blog.tags')}</label>
        {#if tags.length}
          <div class="flex flex-wrap gap-2 mb-3">{#each tags as tag}<span class="inline-flex items-center gap-1 px-3 py-1 bg-theme-primary-light text-theme-primary rounded-full text-sm">{tag}<button type="button" aria-label={'Remove ' + tag} on:click={() => removeTag(tag)} class="hover:text-danger-500 transition-colors"><Icon icon={Icons.x} className="w-3.5 h-3.5" width={14} height={14} /></button></span>{/each}</div>
        {/if}
        <div class="flex gap-2">
          <input bind:value={tagInput} on:keydown={handleTagKeydown} placeholder={t('blog.add_tag_placeholder')} class="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
          <button type="button" on:click={addTag} disabled={!tagInput.trim()} class="px-4 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-secondary-300 rounded-lg text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors disabled:opacity-50">{t('common.add')}</button>
        </div>
        <p class="mt-2 text-xs text-secondary-500 dark:text-secondary-400">{t('blog.press_enter_to_add_tag')}</p>
      </div>

      <div class="card rounded-xl p-6">
        <h3 class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-4">{t('blog.publish_settings')}</h3>
        <div class="mb-4"><p class="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2">{t('common.status')}</p><div class="flex items-center gap-3"><label class="flex items-center gap-2 cursor-pointer"><input bind:group={status} type="radio" name="status" value="draft" class="w-4 h-4 text-theme-primary focus:ring-theme-primary/20" /><span class="text-sm text-secondary-700 dark:text-secondary-300">{t('blog.draft')}</span></label><label class="flex items-center gap-2 cursor-pointer"><input bind:group={status} type="radio" name="status" value="published" class="w-4 h-4 text-theme-primary focus:ring-theme-primary/20" /><span class="text-sm text-secondary-700 dark:text-secondary-300">{t('blog.published')}</span></label></div></div>
        <div class="mb-4"><label for="blog-publish-date" class="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2"><Icon icon={Icons.calendar} className="w-3.5 h-3.5 inline-block me-1" width={14} height={14} />{t('blog.publish_date')}</label><input id="blog-publish-date" bind:value={publishDate} type="date" class="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" /></div>
        <div><label for="blog-read-time" class="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2"><Icon icon={Icons.clock} className="w-3.5 h-3.5 inline-block me-1" width={14} height={14} />{t('blog.read_time')} ({t('blog.minutes')})</label><input id="blog-read-time" bind:value={readTime} type="number" min="1" max="60" class="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" /></div>
      </div>

      <div class="card rounded-xl p-6">
        <h3 class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-4">{t('blog.seo_preview')}</h3>
        <div class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
          <p class="text-sm text-theme-primary font-medium truncate">{title || t('blog.post_title')}</p>
          <p class="text-xs text-success-600 dark:text-success-400 mt-1">example.com/blog/{title ? title.toLowerCase().replace(/\\s+/g, '-').slice(0, 30) : 'post-slug'}</p>
          <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-2 line-clamp-2">{excerpt || t('blog.seo_excerpt_placeholder')}</p>
        </div>
      </div>
    </div>
  </div>
</div>



