<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { categories, products, type Product } from '../../../data/ecommerce'

  type ViewMode = 'grid' | 'list'
  type SortMode = 'newest' | 'popular' | 'rating' | 'price-low' | 'price-high'
  let search = ''
  let category = 'All'
  let view: ViewMode = 'grid'
  let sort: SortMode = 'newest'
  let filterOpen = false
  let cartCount = 0
  let wishlist = new SvelteSet<string>()

  $: filtered = products.filter((product) => (!search || `${product.name} ${product.brand} ${product.category} ${product.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())) && (category === 'All' || product.category === category))
  $: sorted = [...filtered].sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'rating' ? b.rating - a.rating : sort === 'popular' ? (b.sold ?? 0) - (a.sold ?? 0) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  function toggleWishlist(id: string): void { const next = new SvelteSet(wishlist); if (next.has(id)) next.delete(id); else next.add(id); wishlist = next }
  function addToCart(): void { cartCount += 1 }
  function stockClass(product: Product): string { return product.stock === 0 ? 'text-danger-500' : product.stock < 20 ? 'text-warning-500' : 'text-success-500' }
</script>

<svelte:head><title>Products - Adminex</title></svelte:head>

<div class="space-y-6 animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 class="heading-2 text-secondary-900 dark:text-white">Products</h1><p class="text-body-sm text-secondary-500 dark:text-secondary-400 mt-1">Manage your product catalogue and inventory</p></div><div class="flex items-center gap-3"><a href="/app/ecommerce/products/create" class="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium"><Icon icon={Icons.plus} width={16} />Add product</a></div></div>
  <div class="card rounded-xl p-4"><div class="flex flex-col sm:flex-row gap-4"><div class="flex-1 relative"><Icon icon={Icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /><input bind:value={search} class="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" placeholder="Search products" aria-label="Search products" /></div><div class="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1"><button type="button" aria-label="Grid view" class={`p-2 rounded-md leading-none transition-all ${view === 'grid' ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-500'}`} on:click={() => (view = 'grid')}><Icon icon={Icons.layoutGrid} className="w-5 h-5 block" width={20} height={20} /></button><button type="button" aria-label="List view" class={`p-2 rounded-md leading-none transition-all ${view === 'list' ? 'bg-white dark:bg-surface-900 text-theme-primary shadow-sm' : 'text-secondary-500'}`} on:click={() => (view = 'list')}><Icon icon={Icons.list} className="w-5 h-5 block" width={20} height={20} /></button></div><div class="relative"><button type="button" class="flex items-center gap-2 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg text-sm" on:click={() => (filterOpen = !filterOpen)}><Icon icon={Icons.filter} width={16} />Filter<Icon icon={Icons.chevronDown} width={16} /></button>{#if filterOpen}<div class="absolute right-0 top-full mt-2 z-20 w-64 card rounded-xl p-4 shadow-xl"><label class="text-xs font-medium text-secondary-600 dark:text-secondary-300">Sort by<select bind:value={sort} class="input-theme mt-2"><option value="newest">Newest first</option><option value="popular">Most popular</option><option value="rating">Highest rated</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option></select></label></div>{/if}</div></div><div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700"><button type="button" class={`px-4 py-1.5 rounded-full text-sm font-medium ${category === 'All' ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400'}`} on:click={() => (category = 'All')}>All</button>{#each categories as item}<button type="button" class={`px-4 py-1.5 rounded-full text-sm font-medium ${category === item ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400'}`} on:click={() => (category = item)}>{item}</button>{/each}</div></div>

  {#if view === 'grid'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each sorted as product}
        <article class="card rounded-xl overflow-hidden group hover:shadow-lg transition-shadow">
          <div class="relative overflow-hidden bg-surface-100 dark:bg-surface-800">
            <a href={'/app/ecommerce/products/' + product.id}>
              <img src={product.thumbnail} alt={product.name} class="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
            </a>
            <div class="absolute top-3 left-3 flex flex-col gap-2">
              {#if product.isNew}<span class="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">New</span>{/if}
              {#if product.discount}<span class="px-2 py-1 bg-danger-500 text-white text-xs font-medium rounded">-{product.discount}%</span>{/if}
            </div>
            <div class="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" aria-label={'Add ' + product.name + ' to wishlist'} class="p-2 bg-white dark:bg-surface-800 rounded-lg shadow-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors" on:click={() => toggleWishlist(product.id)}>
                <Icon icon={wishlist.has(product.id) ? Icons.heartFilled : Icons.heart} width={18} height={18} className="text-secondary-600 dark:text-secondary-400" />
              </button>
              <a href={'/app/ecommerce/products/' + product.id} aria-label={'View ' + product.name} class="p-2 bg-white dark:bg-surface-800 rounded-lg shadow-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                <Icon icon={Icons.eye} width={18} height={18} className="text-secondary-600 dark:text-secondary-400" />
              </a>
            </div>
            {#if product.stock === 0}<div class="absolute inset-0 bg-black/60 flex items-center justify-center"><span class="text-white font-semibold text-lg">Out of stock</span></div>{/if}
          </div>
          <div class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-secondary-500 dark:text-secondary-400">{product.category}</span>
              <span class="text-xs text-secondary-500 dark:text-secondary-400">{product.brand}</span>
            </div>
            <a href={'/app/ecommerce/products/' + product.id}>
              <h2 class="text-ui font-semibold text-secondary-900 dark:text-white mb-2 line-clamp-2 hover:text-theme-primary transition-colors">{product.name}</h2>
            </a>
            <div class="flex items-center gap-2 mb-3">
              <div class="flex items-center gap-1">
                <Icon icon={Icons.star} width={14} height={14} className="text-yellow-500 fill-yellow-500" />
                <span class="text-sm font-medium text-secondary-900 dark:text-white">{product.rating}</span>
              </div>
              <span class="text-xs text-secondary-400">({product.reviews} reviews)</span>
            </div>
            <div class="flex items-center gap-2 mb-4">
              <span class="text-lg font-semibold text-secondary-900 dark:text-white">{'$' + product.price.toFixed(2)}</span>
              {#if product.originalPrice}<span class="text-sm text-secondary-400 line-through">{'$' + product.originalPrice.toFixed(2)}</span>{/if}
            </div>
            <div class="flex gap-2">
              <button type="button" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!product.stock} on:click={addToCart}>
                <Icon icon={Icons.shopping} width={18} height={18} />
                Add to Cart
              </button>
              <a href={'/app/ecommerce/products/' + product.id + '/edit'} class="px-4 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">Edit</a>
            </div>
            <div class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
              <div class="flex items-center justify-between text-xs">
                <span class="text-secondary-500 dark:text-secondary-400">Stock:</span>
                <span class={'font-medium ' + stockClass(product)}>{product.stock} units</span>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="space-y-4">{#each sorted as product}<article class="card rounded-xl p-5 flex flex-col sm:flex-row gap-5"><a href={`/app/ecommerce/products/${product.id}`} class="flex-shrink-0"><img src={product.thumbnail} alt={product.name} class="w-full sm:w-32 h-32 object-cover rounded-lg" /></a><div class="flex-1"><div class="flex items-start justify-between gap-3"><div><a href={`/app/ecommerce/products/${product.id}`}><h2 class="text-lg font-semibold text-secondary-900 dark:text-white hover:text-theme-primary">{product.name}</h2></a><p class="text-sm text-secondary-500 mt-1">{product.brand} Â· {product.category} Â· SKU: {product.sku}</p></div><a href={`/app/ecommerce/products/${product.id}/edit`} class="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm">Edit</a></div><p class="text-sm text-secondary-600 dark:text-secondary-400 mt-3 line-clamp-2">{product.description}</p><div class="flex flex-wrap items-center justify-between gap-3 mt-4"><span class="text-sm text-secondary-500">â˜… {product.rating} ({product.reviews}) Â· <span class={stockClass(product)}>{product.stock} in stock</span></span><div class="flex items-center gap-3"><span class="text-xl font-semibold text-secondary-900 dark:text-white">${product.price.toFixed(2)}</span><button type="button" class="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm disabled:opacity-50" disabled={!product.stock} on:click={addToCart}>Add to cart</button></div></div></div></article>{/each}</div>
  {/if}
  {#if !sorted.length}<div class="card rounded-xl p-12 text-center text-secondary-500">No products found.</div>{/if}
</div>


