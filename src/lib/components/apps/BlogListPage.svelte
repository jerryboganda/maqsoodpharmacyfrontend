<script lang="ts">
  import { goto } from '$app/navigation'
  import { SvelteSet } from 'svelte/reactivity'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { locale, translate } from '../../stores/locale'
  import { blogCategories, blogPosts, categoryColors, type BlogPost } from '../../../data/blog'

  type ViewMode = 'grid' | 'list'
  const t = translate
  let searchQuery = ''
  let filterCategory = 'All'
  let viewMode: ViewMode = 'grid'
  let isFilterOpen = false
  let bookmarks = new SvelteSet<number>()

  $: filteredPosts = blogPosts.filter((post) => {
    const needle = searchQuery.toLowerCase()
    const matchesSearch = post.title.toLowerCase().includes(needle)
      || post.excerpt.toLowerCase().includes(needle)
      || post.author.name.toLowerCase().includes(needle)
      || post.tags.some((tag) => tag.toLowerCase().includes(needle))
    const matchesCategory = filterCategory === 'All' || post.category === filterCategory
    return matchesSearch && matchesCategory && post.status === 'published'
  })
  $: activeFilterCount = filterCategory !== 'All' ? 1 : 0

  function handlePostClick(post: BlogPost): void { goto(`/app/blog/${post.slug}`) }
  function clearFilters(): void { filterCategory = 'All' }
  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString($locale, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  function formatNumber(value: number): string { return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value) }
  function toggleBookmark(id: number): void {
    const next = new SvelteSet(bookmarks)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    bookmarks = next
  }
</script>

<svelte:head><title>Blog - Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="heading-2 text-secondary-900 dark:text-white">{t('blog.title')}</h1>
      <p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">{t('blog.description')}</p>
    </div>
    <button type="button" on:click={() => goto('/app/blog/create')} class="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
      <Icon icon={Icons.plus} className="w-4 h-4" width={16} height={16} />
      {t('blog.new_post')}
    </button>
  </div>

  <div class="card rounded-xl p-4">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" width={20} height={20} />
        <input bind:value={searchQuery} type="text" placeholder={t('blog.search_placeholder')} aria-label="Search posts" class="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
      </div>

      <div class="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
        <button type="button" aria-label="Grid view" on:click={() => (viewMode = 'grid')} class={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'}`}>
          <Icon icon={Icons.layoutGrid} className="w-5 h-5" width={20} height={20} />
        </button>
        <button type="button" aria-label="List view" on:click={() => (viewMode = 'list')} class={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'}`}>
          <Icon icon={Icons.list} className="w-5 h-5" width={20} height={20} />
        </button>
      </div>

      <div class="relative">
        <button type="button" on:click={() => (isFilterOpen = !isFilterOpen)} class={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${activeFilterCount > 0 ? 'bg-theme-primary-light border-theme-primary/30 text-theme-primary' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-700'}`}>
          <Icon icon={Icons.filter} className="w-4 h-4" width={16} height={16} />
          {t('blog.filter')}
          {#if activeFilterCount > 0}<span class="w-5 h-5 flex items-center justify-center bg-theme-primary text-white text-xs rounded-full">{activeFilterCount}</span>{/if}
          <Icon icon={Icons.chevronDown} className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} width={16} height={16} />
        </button>

        {#if isFilterOpen}
          <div class="fixed inset-0 z-[1040]" role="presentation" on:click={() => (isFilterOpen = false)}></div>
          <div class="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-surface-900 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 z-[1050] animate-fade-in">
            <div class="p-4 border-b border-surface-200 dark:border-surface-700">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-secondary-900 dark:text-white">{t('blog.filters')}</h3>
                {#if activeFilterCount > 0}<button type="button" on:click={clearFilters} class="text-xs text-theme-primary hover:underline">{t('blog.clear_all')}</button>{/if}
              </div>
            </div>
            <div class="p-4 space-y-4">
              <div>
                <label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-2" for="blog-category">{t('blog.category')}</label>
                <select id="blog-category" bind:value={filterCategory} class="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary">
                  {#each blogCategories as item}<option value={item}>{item}</option>{/each}
                </select>
              </div>
            </div>
            <div class="p-4 border-t border-surface-200 dark:border-surface-700">
              <button type="button" on:click={() => (isFilterOpen = false)} class="w-full px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">{t('blog.apply_filters')}</button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
      {#each blogCategories as item}
        <button type="button" on:click={() => (filterCategory = item)} class={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterCategory === item ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>{item}</button>
      {/each}
    </div>
  </div>

  <div class="flex items-center justify-between">
    <p class="text-sm text-secondary-500 dark:text-secondary-400">{t('blog.title')}: {filteredPosts.length} {filteredPosts.length === 1 ? t('blog.post_singular') : t('blog.post_plural')}</p>
  </div>

  {#if viewMode === 'grid'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredPosts as post}
        {@const categoryColor = categoryColors[post.category] || categoryColors.Technology}
        <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
        <article class="card rounded-xl overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300" role="link" tabindex="0" on:click={() => handlePostClick(post)} on:keydown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), handlePostClick(post))}>
          <div class="relative h-70 overflow-hidden">
            <img src={post.coverImage} alt={post.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute top-3 left-3"><span class={`px-3 py-1 rounded-full text-xs font-medium ${categoryColor.bg} ${categoryColor.text}`}>{post.category}</span></div>
            <button type="button" aria-label={`Bookmark ${post.title}`} on:click|stopPropagation={() => toggleBookmark(post.id)} class="absolute top-3 right-3 p-2 bg-white/90 dark:bg-surface-800/90 rounded-lg text-secondary-500 hover:text-theme-primary transition-colors">
              <Icon icon={bookmarks.has(post.id) ? Icons.bookmarkFilled : Icons.bookmark} className="w-4 h-4" width={16} height={16} />
            </button>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400 mb-3">
              <span class="flex items-center gap-1"><Icon icon={Icons.calendar} className="w-3.5 h-3.5" width={14} height={14} />{formatDate(post.publishedAt)}</span>
              <span class="flex items-center gap-1"><Icon icon={Icons.clock} className="w-3.5 h-3.5" width={14} height={14} />{post.readTime} {t('blog.min_read_label')}</span>
            </div>
            <h2 class="text-lg font-bold text-secondary-900 dark:text-white mb-2 line-clamp-2 group-hover:text-theme-primary transition-colors">{post.title}</h2>
            <p class="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2 mb-4">{post.excerpt}</p>
            <div class="flex items-center justify-between pt-4 border-t border-surface-200 dark:border-surface-700">
              <div class="flex items-center gap-2"><img src={post.author.avatar} alt={post.author.name} class="w-8 h-8 rounded-full object-cover ring-2 ring-surface-100 dark:ring-surface-700" /><span class="text-sm font-medium text-secondary-900 dark:text-white">{post.author.name}</span></div>
              <div class="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400"><span class="flex items-center gap-1"><Icon icon={Icons.eye} className="w-4 h-4" width={16} height={16} />{formatNumber(post.views)}</span><span class="flex items-center gap-1"><Icon icon={Icons.heart} className="w-4 h-4" width={16} height={16} />{formatNumber(post.likes)}</span></div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}

  {#if viewMode === 'list'}
    <div class="space-y-4">
      {#each filteredPosts as post}
        {@const categoryColor = categoryColors[post.category] || categoryColors.Technology}
        <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
        <article class="card rounded-xl overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300" role="link" tabindex="0" on:click={() => handlePostClick(post)} on:keydown={(event) => (event.key === 'Enter' || event.key === ' ') && (event.preventDefault(), handlePostClick(post))}>
          <div class="flex flex-col sm:flex-row">
            <div class="relative w-full sm:w-64 h-48 sm:h-auto flex-shrink-0 overflow-hidden"><img src={post.coverImage} alt={post.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
            <div class="flex-1 p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-3 mb-3"><span class={`px-3 py-1 rounded-full text-xs font-medium ${categoryColor.bg} ${categoryColor.text}`}>{post.category}</span><span class="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400"><Icon icon={Icons.calendar} className="w-3.5 h-3.5" width={14} height={14} />{formatDate(post.publishedAt)}</span><span class="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400"><Icon icon={Icons.clock} className="w-3.5 h-3.5" width={14} height={14} />{post.readTime} {t('blog.min_read_label')}</span></div>
                  <h2 class="text-xl font-bold text-secondary-900 dark:text-white mb-2 group-hover:text-theme-primary transition-colors">{post.title}</h2>
                  <p class="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2 mb-4">{post.excerpt}</p>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2"><img src={post.author.avatar} alt={post.author.name} class="w-8 h-8 rounded-full object-cover ring-2 ring-surface-100 dark:ring-surface-700" /><div><p class="text-sm font-medium text-secondary-900 dark:text-white">{post.author.name}</p><p class="text-xs text-secondary-500 dark:text-secondary-400">{post.author.role}</p></div></div>
                    <div class="flex items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400"><span class="flex items-center gap-1"><Icon icon={Icons.eye} className="w-4 h-4" width={16} height={16} />{formatNumber(post.views)}</span><span class="flex items-center gap-1"><Icon icon={Icons.heart} className="w-4 h-4" width={16} height={16} />{formatNumber(post.likes)}</span><span class="flex items-center gap-1"><Icon icon={Icons.message} className="w-4 h-4" width={16} height={16} />{post.comments}</span></div>
                  </div>
                </div>
                <button type="button" aria-label={`Bookmark ${post.title}`} on:click|stopPropagation={() => toggleBookmark(post.id)} class="hidden sm:flex p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-secondary-500 hover:text-theme-primary transition-colors"><Icon icon={bookmarks.has(post.id) ? Icons.bookmarkFilled : Icons.bookmark} className="w-5 h-5" width={20} height={20} /></button>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}

  {#if filteredPosts.length === 0}
    <div class="card rounded-xl py-16 text-center">
      <Icon icon={Icons.search} className="w-12 h-12 mx-auto text-secondary-300 dark:text-secondary-600 mb-3" width={48} height={48} />
      <p class="text-secondary-500 dark:text-secondary-400">{t('blog.no_posts')}</p>
      <p class="text-sm text-secondary-400 dark:text-secondary-500 mt-1">{t('blog.no_posts_desc')}</p>
      {#if activeFilterCount > 0}<button type="button" on:click={clearFilters} class="mt-4 text-sm text-theme-primary hover:underline font-medium">{t('blog.clear_filters')}</button>{/if}
    </div>
  {/if}
</div>
