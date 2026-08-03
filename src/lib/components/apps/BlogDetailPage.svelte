<script lang="ts">
  import { goto } from '$app/navigation'
  import { locale, translate } from '../../stores/locale'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { blogPosts, categoryColors, type BlogPost } from '../../../data/blog'

  export let slug = 'post-1'

  let isLiked = false
  let isBookmarked = false
  let isShareOpen = false
  let likeCount = 0
  let comment = ''
  let localeVersion = $locale

  $: localeVersion = $locale
  $: t = (key: string) => translate(key)
  $: post = blogPosts.find((item) => item.slug === slug)
  $: likeCount = post?.likes ?? 0
  $: relatedPosts = post ? blogPosts.filter((item) => item.category === post.category && item.id !== post.id).slice(0, 3) : []
  $: currentIndex = post ? blogPosts.findIndex((item) => item.id === post.id) : -1
  $: prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null
  $: nextPost = currentIndex >= 0 && currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null
  $: categoryColor = post ? (categoryColors[post.category] ?? categoryColors.Technology) : categoryColors.Technology
  $: popularTags = Array.from(new Set(blogPosts.flatMap((item) => item.tags))).slice(0, 12)

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString($locale === 'en' ? 'en-US' : $locale, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  function toggleLike(): void {
    if (!post) return
    isLiked = !isLiked
    likeCount = isLiked ? post.likes + 1 : post.likes
  }

  function submitComment(event: SubmitEvent): void {
    event.preventDefault()
    if (!comment.trim()) return
    comment = ''
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(window.location.href)
    } catch {
      // Clipboard can be unavailable in local or automated browsers.
    }
    isShareOpen = false
  }
</script>

<svelte:head><title>{post ? post.title : 'Blog post'} · Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  {#if !post}
    <div class="card rounded-xl py-16 text-center">
      <h2 class="heading-4 text-secondary-900 dark:text-white mb-2">{t('blog.post_not_found')}</h2>
      <p class="text-secondary-500 dark:text-secondary-400 mb-4">{t('blog.post_not_found_desc')}</p>
      <button type="button" class="text-theme-primary hover:underline font-medium" on:click={() => goto('/app/blog')}>← {t('blog.back_to_blog')}</button>
    </div>
  {:else}
    <button type="button" class="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 hover:text-theme-primary transition-colors" on:click={() => goto('/app/blog')}>
      <Icon icon={Icons.arrowLeft} className="w-5 h-5" width={20} height={20} />
      <span class="font-medium">{t('blog.back_to_blog')}</span>
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <article class="card rounded-xl overflow-hidden">
          <div class="relative h-64 sm:h-80 lg:h-96">
            <img src={post.coverImage} alt={post.title} class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div class="absolute bottom-6 left-6 right-6">
              <span class={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryColor.bg} ${categoryColor.text} mb-3`}>{post.category}</span>
              <h1 class="heading-1 text-white">{post.title}</h1>
            </div>
          </div>

          <div class="p-6 border-b border-surface-200 dark:border-surface-700">
            <div class="flex flex-wrap items-center gap-6">
              <div class="flex items-center gap-3">
                <img src={post.author.avatar} alt={post.author.name} class="w-12 h-12 rounded-full object-cover ring-2 ring-surface-200 dark:ring-surface-700" />
                <div>
                  <p class="font-semibold text-secondary-900 dark:text-white">{post.author.name}</p>
                  <p class="text-sm text-secondary-500 dark:text-secondary-400">{post.author.role}</p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400">
                <span class="flex items-center gap-1.5"><Icon icon={Icons.calendar} className="w-4 h-4" width={16} height={16} />{formatDate(post.publishedAt)}</span>
                <span class="flex items-center gap-1.5"><Icon icon={Icons.clock} className="w-4 h-4" width={16} height={16} />{post.readTime} min read</span>
                <span class="flex items-center gap-1.5"><Icon icon={Icons.eye} className="w-4 h-4" width={16} height={16} />{post.views.toLocaleString()} views</span>
              </div>
            </div>
          </div>

          <div class="p-6 lg:p-8">
            <div class="prose prose-lg dark:prose-invert max-w-none prose-headings:text-secondary-900 dark:prose-headings:text-white prose-p:text-secondary-600 dark:prose-p:text-secondary-400 prose-a:text-theme-primary hover:prose-a:underline prose-strong:text-secondary-900 dark:prose-strong:text-white prose-ul:text-secondary-600 dark:prose-ul:text-secondary-400 prose-li:marker:text-theme-primary">
              {@html post.content}
            </div>

            <div class="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
              <div class="flex flex-wrap gap-2">
                {#each post.tags as tag}
                  <button type="button" class="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 rounded-lg text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 cursor-pointer transition-colors">#{tag}</button>
                {/each}
              </div>
            </div>

            <div class="mt-6 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button type="button" on:click={toggleLike} class={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isLiked ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`}>
                  <Icon icon={isLiked ? Icons.heartFilled : Icons.heart} className="w-5 h-5" width={20} height={20} />{likeCount}
                </button>
                <button type="button" on:click={() => (isBookmarked = !isBookmarked)} class={`p-2 rounded-xl transition-all ${isBookmarked ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 hover:bg-surface-200 dark:hover:bg-surface-700'}`} aria-label="Bookmark post">
                  <Icon icon={isBookmarked ? Icons.bookmarkFilled : Icons.bookmark} className="w-5 h-5" width={20} height={20} />
                </button>
              </div>

              <div class="relative">
                <button type="button" on:click={() => (isShareOpen = !isShareOpen)} class="flex items-center gap-2 px-4 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 rounded-xl text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                  <Icon icon={Icons.share} className="w-5 h-5" width={20} height={20} />{t('blog.share')}
                </button>
                {#if isShareOpen}
                  <button type="button" class="fixed inset-0 z-[1040] cursor-default" aria-label="Close share menu" on:click={() => (isShareOpen = false)}></button>
                  <div class="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-surface-900 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 z-[1050] animate-fade-in p-2">
                    <button type="button" on:click={copyLink} class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><Icon icon={Icons.link} className="w-4 h-4" width={16} height={16} />{t('blog.copy_link')}</button>
                    <button type="button" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><Icon icon={Icons.brandTwitter} className="w-4 h-4" width={16} height={16} />{t('blog.share_twitter')}</button>
                    <button type="button" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><Icon icon={Icons.brandFacebook} className="w-4 h-4" width={16} height={16} />{t('blog.share_facebook')}</button>
                    <button type="button" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary-700 dark:text-secondary-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><Icon icon={Icons.brandLinkedin} className="w-4 h-4" width={16} height={16} />{t('blog.share_linkedin')}</button>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </article>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {#if prevPost}
            <button type="button" on:click={() => goto(`/app/blog/${prevPost.slug}`)} class="card rounded-xl p-4 text-left group hover:shadow-lg transition-all">
              <div class="flex items-center gap-2 text-sm text-secondary-500 dark:text-secondary-400 mb-2"><Icon icon={Icons.chevronLeft} className="w-4 h-4" width={16} height={16} />{t('blog.previous_post')}</div>
              <p class="font-semibold text-secondary-900 dark:text-white line-clamp-2 group-hover:text-theme-primary transition-colors">{prevPost.title}</p>
            </button>
          {/if}
          {#if nextPost}
            <button type="button" on:click={() => goto(`/app/blog/${nextPost.slug}`)} class="card rounded-xl p-4 text-right group hover:shadow-lg transition-all sm:col-start-2">
              <div class="flex items-center justify-end gap-2 text-sm text-secondary-500 dark:text-secondary-400 mb-2">{t('blog.next_post')}<Icon icon={Icons.chevronRight} className="w-4 h-4" width={16} height={16} /></div>
              <p class="font-semibold text-secondary-900 dark:text-white line-clamp-2 group-hover:text-theme-primary transition-colors">{nextPost.title}</p>
            </button>
          {/if}
        </div>

        <div class="card rounded-xl p-6">
          <h3 class="heading-5 text-secondary-900 dark:text-white mb-6 flex items-center gap-2"><Icon icon={Icons.message} className="w-5 h-5" width={20} height={20} />{t('blog.comments')} ({post.comments})</h3>
          <form on:submit={submitComment} class="mb-6">
            <textarea bind:value={comment} placeholder={t('blog.write_comment')} rows="3" class="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all resize-none"></textarea>
            <div class="flex justify-end mt-3"><button type="submit" class="px-5 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">{t('blog.post_comment')}</button></div>
          </form>
          <div class="space-y-4">
            {#each [1, 2, 3] as item}
              <div class="flex gap-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                <img src={`https://i.pravatar.cc/150?img=${10 + item}`} alt="Commenter" class="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1"><span class="font-semibold text-secondary-900 dark:text-white text-sm">User {item}</span><span class="text-xs text-secondary-500 dark:text-secondary-400">{item} {item > 1 ? t('blog.days_ago_plural') : t('blog.days_ago_singular')}</span></div>
                  <p class="text-sm text-secondary-600 dark:text-secondary-400">Great article! This really helped me understand the concepts better. Looking forward to more content like this.</p>
                  <div class="flex items-center gap-4 mt-2"><button type="button" class="text-xs text-secondary-500 hover:text-theme-primary transition-colors">Reply</button><button type="button" class="flex items-center gap-1 text-xs text-secondary-500 hover:text-danger-500 transition-colors"><Icon icon={Icons.heart} className="w-3.5 h-3.5" width={14} height={14} />{5 - item}</button></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="card rounded-xl p-6">
          <div class="text-center">
            <img src={post.author.avatar} alt={post.author.name} class="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-surface-100 dark:ring-surface-700" />
            <h3 class="heading-5 text-secondary-900 dark:text-white">{post.author.name}</h3>
            <p class="text-sm text-secondary-500 dark:text-secondary-400 mb-4">{post.author.role}</p>
            <p class="text-sm text-secondary-600 dark:text-secondary-400 mb-4">Passionate writer and developer sharing insights about technology and design.</p>
            <button type="button" class="w-full px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">{t('blog.follow_author')}</button>
          </div>
        </div>

        {#if relatedPosts.length > 0}
          <div class="card rounded-xl p-6">
            <h3 class="heading-5 text-secondary-900 dark:text-white mb-4">{t('blog.related_posts')}</h3>
            <div class="space-y-4">
              {#each relatedPosts as relatedPost}
                <button type="button" on:click={() => goto(`/app/blog/${relatedPost.slug}`)} class="w-full flex gap-3 p-2 -m-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-left group">
                  <img src={relatedPost.coverImage} alt={relatedPost.title} class="w-20 h-16 rounded-lg object-cover flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-secondary-900 dark:text-white text-sm line-clamp-2 group-hover:text-theme-primary transition-colors">{relatedPost.title}</p>
                    <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{formatDate(relatedPost.publishedAt)}</p>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="card rounded-xl p-6">
          <h3 class="heading-5 text-secondary-900 dark:text-white mb-4">{t('blog.popular_tags')}</h3>
          <div class="flex flex-wrap gap-2">
            {#each popularTags as tag}
              <button type="button" class="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 rounded-lg text-sm hover:bg-surface-200 dark:hover:bg-surface-700 cursor-pointer transition-colors">#{tag}</button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

