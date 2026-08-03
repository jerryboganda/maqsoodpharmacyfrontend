<script lang="ts">
  import { goto } from '$app/navigation'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { categories, products } from '../../../data/ecommerce'
  import { locale, translate } from '../../stores/locale'

  export let mode: 'create' | 'detail' | 'edit' | 'checkout' = 'detail'
  export let productId = '1'

  type Specification = { label: string; value: string }
  let localeVersion = $locale
  let saved = false
  let selectedImage = 0
  let selectedColor = ''
  let selectedSize = ''
  let quantity = 1
  let cartCount = 0
  let formKey = ''
  let deleteDialogOpen = false
  let images: string[] = []
  let specifications: Specification[] = [{ label: '', value: '' }]
  let errors: Record<string, string> = {}
  let formData = {
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    category: categories[0],
    brand: '',
    stock: 0,
    sku: '',
    tags: '',
    colors: '',
    sizes: '',
    isFeatured: false,
    isNew: false
  }

  $: localeVersion = $locale
  $: t = (key: string, vars?: Record<string, string | number>) => translate(key, vars)
  $: product = products.find((item) => item.id === productId)
  $: isEditMode = mode === 'edit'
  $: formModeKey = mode + ':' + productId

  $: if ((mode === 'create' || mode === 'edit') && formKey !== formModeKey) {
    formKey = formModeKey
    const source = mode === 'edit' ? product : undefined
    formData = {
      name: source?.name ?? '',
      description: source?.description ?? '',
      price: source?.price ?? 0,
      originalPrice: source?.originalPrice ?? 0,
      category: source?.category ?? categories[0],
      brand: source?.brand ?? '',
      stock: source?.stock ?? 0,
      sku: source?.sku ?? '',
      tags: source?.tags.join(', ') ?? '',
      colors: source?.colors?.join(', ') ?? '',
      sizes: source?.sizes?.join(', ') ?? '',
      isFeatured: source?.isFeatured ?? false,
      isNew: source?.isNew ?? false
    }
    images = source?.images ? [...source.images] : []
    specifications = source?.specifications ? source.specifications.map((item) => ({ ...item })) : [{ label: '', value: '' }]
    errors = {}
  }

  $: if (mode === 'detail' && product && formKey !== 'detail:' + product.id) {
    formKey = 'detail:' + product.id
    selectedImage = 0
    selectedColor = product.colors?.[0] ?? ''
    selectedSize = product.sizes?.[0] ?? ''
    quantity = 1
  }

  function addToCart(): void { cartCount += 1 }
  function save(): void { saved = true }
  function decreaseQuantity(): void { if (quantity > 1) quantity -= 1 }
  function increaseQuantity(): void { if (product && quantity < product.stock) quantity += 1 }
  function addSpecification(): void { specifications = [...specifications, { label: '', value: '' }] }
  function removeSpecification(index: number): void { specifications = specifications.filter((_, itemIndex) => itemIndex !== index) }
  function updateSpecification(index: number, field: 'label' | 'value', value: string): void {
    specifications = specifications.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
  }
  function addImage(): void {
    const value = window.prompt(t('ecommerce.enter_image_url_prompt'))
    if (value) images = [...images, value]
  }
  function removeImage(index: number): void { images = images.filter((_, itemIndex) => itemIndex !== index) }
  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!formData.name.trim()) nextErrors.name = t('ecommerce.validation.name_required')
    if (!formData.description.trim()) nextErrors.description = t('ecommerce.validation.description_required')
    if (formData.price <= 0) nextErrors.price = t('ecommerce.validation.price_positive')
    if (formData.stock < 0) nextErrors.stock = t('ecommerce.validation.stock_non_negative')
    if (!formData.brand.trim()) nextErrors.brand = t('ecommerce.validation.brand_required')
    if (!formData.sku.trim()) nextErrors.sku = t('ecommerce.validation.sku_required')
    if (!images.length) nextErrors.images = t('ecommerce.validation.images_required')
    errors = nextErrors
    return Object.keys(nextErrors).length === 0
  }
  function submitForm(): void {
    if (!validate()) return
    window.alert(t(isEditMode ? 'ecommerce.alert_product_updated' : 'ecommerce.alert_product_created'))
    void goto('/app/ecommerce/products')
  }
</script>

<svelte:head><title>{mode === 'detail' ? (product?.name ?? 'Product') : mode === 'checkout' ? 'Checkout' : isEditMode ? t('ecommerce.edit_product_title') : t('ecommerce.create_product_title')} · Adminex</title></svelte:head>

{#if mode === 'checkout'}
  <div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-5">
    <div class="card rounded-2xl p-6 lg:col-span-3">
      <h1 class="heading-3 text-secondary-900 dark:text-white">Checkout</h1>
      <p class="mt-1 text-sm text-secondary-500">Complete your order with the mock checkout flow.</p>
      <div class="mt-6 space-y-4">
        <label for="checkout-email" class="block text-sm font-semibold">Email address<input id="checkout-email" class="input-theme mt-2" type="email" value="admin@example.com" /></label>
        <label for="checkout-card" class="block text-sm font-semibold">Card number<input id="checkout-card" class="input-theme mt-2" placeholder="4242 4242 4242 4242" /></label>
        <div class="grid grid-cols-2 gap-4"><label for="checkout-expiry" class="block text-sm font-semibold">Expiry<input id="checkout-expiry" class="input-theme mt-2" placeholder="12/28" /></label><label for="checkout-cvc" class="block text-sm font-semibold">CVC<input id="checkout-cvc" class="input-theme mt-2" placeholder="123" /></label></div>
      </div>
      <button type="button" class="btn-theme-primary mt-7 w-full rounded-xl py-3 font-semibold" on:click={save}>Place order</button>
      {#if saved}<p class="mt-4 text-sm text-success-600">Order placed successfully in mock mode.</p>{/if}
    </div>
    <div class="card rounded-2xl p-6 lg:col-span-2"><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">Order summary</h2><div class="mt-6 flex items-center gap-3"><div class="flex h-14 w-14 items-center justify-center rounded-xl bg-theme-primary/10 text-theme-primary"><Icon icon={Icons.package} className="h-7 w-7" /></div><div><p class="font-semibold text-secondary-900 dark:text-white">{product?.name ?? 'Product'}</p><p class="text-sm text-secondary-500">Qty 1</p></div><span class="ms-auto font-semibold">{product ? '$' + product.price.toFixed(2) : '$0.00'}</span></div><div class="mt-6 space-y-3 border-t border-surface-200 pt-5 text-sm dark:border-surface-800"><div class="flex justify-between"><span class="text-secondary-500">Subtotal</span><span>{product ? '$' + product.price.toFixed(2) : '$0.00'}</span></div><div class="flex justify-between"><span class="text-secondary-500">Tax</span><span>$9.90</span></div><div class="flex justify-between border-t border-surface-200 pt-3 font-bold dark:border-surface-800"><span>Total</span><span>$108.90</span></div></div></div>
  </div>
{:else if mode === 'create' || mode === 'edit'}
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <button type="button" on:click={() => goto('/app/ecommerce/products')} class="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors"><Icon icon={Icons.arrowLeft} width={20} height={20} /><span class="text-sm font-medium">{t('common.back')}</span></button>
        <div><h1 class="heading-3 text-secondary-900 dark:text-white">{isEditMode ? t('ecommerce.edit_product_title') : t('ecommerce.create_product_title')}</h1><p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{isEditMode ? t('ecommerce.edit_description') : t('ecommerce.create_description')}</p></div>
      </div>
    </div>
    <form on:submit|preventDefault={submitForm}>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="card rounded-xl p-6">
            <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-6">{t('ecommerce.basic_information')}</h2>
            <div class="space-y-4">
              <div><label for="product-name" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.product_name')} *</label><input id="product-name" bind:value={formData.name} class={errors.name ? 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-danger-500 rounded-xl text-sm text-secondary-900 dark:text-white' : 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white'} placeholder={t('ecommerce.product_name_placeholder')} />{#if errors.name}<p class="mt-1 text-xs text-danger-500">{errors.name}</p>{/if}</div>
              <div><label for="product-description" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.description')} *</label><textarea id="product-description" bind:value={formData.description} rows="4" class={errors.description ? 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-danger-500 rounded-xl text-sm text-secondary-900 dark:text-white resize-none' : 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white resize-none'} placeholder={t('ecommerce.description_placeholder')}></textarea>{#if errors.description}<p class="mt-1 text-xs text-danger-500">{errors.description}</p>{/if}</div>
              <div class="grid grid-cols-2 gap-4">
                <div><label for="product-brand" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.brand')} *</label><input id="product-brand" bind:value={formData.brand} class={errors.brand ? 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-danger-500 rounded-xl text-sm text-secondary-900 dark:text-white' : 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white'} placeholder={t('ecommerce.brand_placeholder')} />{#if errors.brand}<p class="mt-1 text-xs text-danger-500">{errors.brand}</p>{/if}</div>
                <div><label for="product-sku" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.sku')} *</label><input id="product-sku" bind:value={formData.sku} class={errors.sku ? 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-danger-500 rounded-xl text-sm text-secondary-900 dark:text-white' : 'w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white'} placeholder={t('ecommerce.sku_example_placeholder')} />{#if errors.sku}<p class="mt-1 text-xs text-danger-500">{errors.sku}</p>{/if}</div>
              </div>
            </div>
          </div>
          <div class="card rounded-xl p-6">
            <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-6">{t('ecommerce.pricing_inventory')}</h2>
            <div class="grid grid-cols-3 gap-4">
              <div><label for="product-price" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.price')} *</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">$</span><input id="product-price" type="number" bind:value={formData.price} step="0.01" min="0" class="w-full pl-7 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white" /></div>{#if errors.price}<p class="mt-1 text-xs text-danger-500">{errors.price}</p>{/if}</div>
              <div><label for="product-original-price" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.original_price')}</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">$</span><input id="product-original-price" type="number" bind:value={formData.originalPrice} step="0.01" min="0" class="w-full pl-7 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white" /></div></div>
              <div><label for="product-stock" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.stock')} *</label><input id="product-stock" type="number" bind:value={formData.stock} min="0" class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white" />{#if errors.stock}<p class="mt-1 text-xs text-danger-500">{errors.stock}</p>{/if}</div>
            </div>
          </div>
          <div class="card rounded-xl p-6">
            <div class="flex items-center justify-between mb-6"><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('ecommerce.product_images')} *</h2><button type="button" on:click={addImage} class="flex items-center gap-2 px-3 py-2 bg-theme-primary text-white rounded-lg text-sm"><Icon icon={Icons.plus} width={16} height={16} />{t('ecommerce.add_image')}</button></div>
            {#if errors.images}<p class="mb-4 text-sm text-danger-500">{errors.images}</p>{/if}
            {#if images.length === 0}<div class="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl p-12 text-center"><Icon icon={Icons.upload} width={48} height={48} className="mx-auto text-secondary-400 mb-3" /><p class="text-sm text-secondary-500 dark:text-secondary-400 mb-2">{t('ecommerce.no_images_added')}</p><p class="text-xs text-secondary-400 mb-4">{t('ecommerce.no_images_added_hint')}</p></div>{:else}<div class="grid grid-cols-4 gap-4">{#each images as image, index}<div class="relative group"><img src={image} alt={t('ecommerce.product_image_alt', { index: index + 1 })} class="w-full h-32 object-cover rounded-lg" /><button type="button" aria-label="Remove image" on:click={() => removeImage(index)} class="absolute top-2 right-2 p-1 bg-danger-500 text-white rounded-full opacity-0 group-hover:opacity-100"><Icon icon={Icons.x} width={16} height={16} /></button>{#if index === 0}<span class="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">{t('ecommerce.thumbnail')}</span>{/if}</div>{/each}</div>{/if}
          </div>
          <div class="card rounded-xl p-6">
            <div class="flex items-center justify-between mb-6"><h2 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('ecommerce.tab.specifications')}</h2><button type="button" on:click={addSpecification} class="flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg text-sm"><Icon icon={Icons.plus} width={16} height={16} />{t('ecommerce.add_spec')}</button></div>
            <div class="space-y-3">{#each specifications as spec, index}<div class="flex gap-3"><input aria-label={t('ecommerce.spec_label_placeholder')} bind:value={spec.label} placeholder={t('ecommerce.spec_label_placeholder')} class="flex-1 px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" /><input aria-label={t('ecommerce.spec_value_placeholder')} bind:value={spec.value} placeholder={t('ecommerce.spec_value_placeholder')} class="flex-1 px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" /><button type="button" aria-label="Remove specification" on:click={() => removeSpecification(index)} class="p-2.5 text-danger-500 rounded-lg"><Icon icon={Icons.trash} width={18} height={18} /></button></div>{/each}</div>
          </div>
        </div>
        <div class="lg:col-span-1 space-y-6">
          <div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">{t('ecommerce.category')}</h3><label for="product-category" class="sr-only">{t('ecommerce.category')}</label><select id="product-category" bind:value={formData.category} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm">{#each categories as item}<option value={item}>{item}</option>{/each}</select></div>
          <div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">{t('ecommerce.product_variants')}</h3><div class="space-y-4"><div><label for="product-colors" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.colors')}</label><input id="product-colors" bind:value={formData.colors} placeholder={t('ecommerce.colors_placeholder')} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" /><p class="mt-1 text-xs text-secondary-400">{t('common.separate_with_commas')}</p></div><div><label for="product-sizes" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.sizes')}</label><input id="product-sizes" bind:value={formData.sizes} placeholder={t('ecommerce.sizes_placeholder')} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" /><p class="mt-1 text-xs text-secondary-400">{t('common.separate_with_commas')}</p></div></div></div>
          <div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">{t('ecommerce.tags')}</h3><label for="product-tags" class="sr-only">{t('ecommerce.tags')}</label><input id="product-tags" bind:value={formData.tags} placeholder={t('ecommerce.tags_placeholder')} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" /><p class="mt-2 text-xs text-secondary-400">{t('common.separate_with_commas')}</p></div>
          <div class="card rounded-xl p-6"><h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">{t('ecommerce.product_status')}</h3><div class="space-y-3"><label for="product-featured" class="flex items-center gap-3 cursor-pointer"><input id="product-featured" type="checkbox" bind:checked={formData.isFeatured} class="w-4 h-4 text-theme-primary rounded" /><span class="text-sm text-secondary-900 dark:text-white">{t('ecommerce.featured_product')}</span></label><label for="product-new" class="flex items-center gap-3 cursor-pointer"><input id="product-new" type="checkbox" bind:checked={formData.isNew} class="w-4 h-4 text-theme-primary rounded" /><span class="text-sm text-secondary-900 dark:text-white">{t('ecommerce.new_arrival')}</span></label></div></div>
          <div class="space-y-3"><button type="submit" class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-theme-primary text-white rounded-lg font-medium"><Icon icon={Icons.deviceFloppy} width={20} height={20} />{isEditMode ? t('ecommerce.update_product') : t('ecommerce.create_product')}</button><a href="/app/ecommerce/products" class="block w-full text-center px-6 py-3 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg font-medium">{t('common.cancel')}</a>{#if isEditMode}<button type="button" on:click={() => (deleteDialogOpen = true)} class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-danger-500 text-white rounded-lg font-medium"><Icon icon={Icons.trash} width={20} height={20} />{t('ecommerce.delete_product')}</button>{/if}</div>
        </div>
      </div>
    </form>
  </div>
  {#if deleteDialogOpen && product}
    <div class="fixed inset-0 z-[1050] flex items-center justify-center p-4" role="presentation" on:click={() => (deleteDialogOpen = false)} on:keydown={() => {}}>
      <div class="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-fade-in p-6" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation={() => {}}>
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center"><Icon icon={Icons.alertTriangle} width={28} height={28} className="text-danger-600 dark:text-danger-400" /></div>
        <h3 class="text-lg font-bold text-secondary-900 dark:text-white text-center mb-2">{t('ecommerce.delete_product')}</h3>
        <p class="text-sm text-secondary-500 dark:text-secondary-400 text-center mb-6">{t('ecommerce.delete_product_confirm_message', { name: product.name })}</p>
        <div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl mb-6"><img src={product.thumbnail} alt={product.name} class="w-12 h-12 rounded-lg object-cover" /><div><p class="text-sm font-medium text-secondary-900 dark:text-white">{product.name}</p><p class="text-xs text-secondary-500 dark:text-secondary-400">{t('ecommerce.sku')}: {product.sku}</p></div></div>
        <div class="flex gap-3"><button type="button" on:click={() => (deleteDialogOpen = false)} class="flex-1 px-4 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl text-sm font-medium">{t('common.cancel')}</button><button type="button" on:click={() => goto('/app/ecommerce/products')} class="flex-1 px-4 py-2.5 bg-danger-600 text-white rounded-xl text-sm font-medium">{t('ecommerce.delete_product')}</button></div>
      </div>
    </div>
  {/if}
{:else}
  {#if !product}
    <div class="p-6"><div class="card rounded-xl p-12 text-center"><h2 class="heading-4 text-secondary-900 dark:text-white mb-2">{t('ecommerce.product_not_found_title')}</h2><p class="text-secondary-500 dark:text-secondary-400 mb-6">{t('ecommerce.product_not_found_message')}</p><a href="/app/ecommerce/products" class="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg"><Icon icon={Icons.arrowLeft} width={18} height={18} />{t('ecommerce.back_to_products')}</a></div></div>
  {:else}
    <div>
      <div class="flex items-center justify-between mb-6"><button type="button" on:click={() => goto('/app/ecommerce/products')} class="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors"><Icon icon={Icons.arrowLeft} width={20} height={20} /><span class="text-sm font-medium">{t('common.back')}</span></button><a href={'/app/ecommerce/products/' + product.id + '/edit'} class="flex items-center gap-2 px-4 py-2 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg"><Icon icon={Icons.edit} width={18} height={18} />{t('ecommerce.edit_product')}</a></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="space-y-4">
          <div class="card rounded-xl overflow-hidden relative"><img src={product.images[selectedImage]} alt={product.name} class="w-full h-[500px] object-cover" /><div class="absolute top-5 left-5 flex flex-col gap-2">{#if product.isNew}<span class="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded">{t('common.new')}</span>{/if}{#if product.discount}<span class="px-3 py-1 bg-danger-500 text-white text-sm font-medium rounded">-{product.discount}%</span>{/if}</div></div>
          <div class="grid grid-cols-4 gap-3">{#each product.images as image, index}<button type="button" aria-label={'Select image ' + (index + 1)} on:click={() => (selectedImage = index)} class={selectedImage === index ? 'rounded-xl overflow-hidden border-2 border-theme-primary' : 'rounded-xl overflow-hidden border-2 border-transparent'}><img src={image} alt={product.name + ' ' + (index + 1)} class="w-full h-30 object-cover" /></button>{/each}</div>
        </div>
        <div class="space-y-6">
          <div>
            <div class="flex items-center gap-3 mb-3"><span class="text-sm text-theme-primary font-medium">{product.category}</span><span class="text-sm text-secondary-400">·</span><span class="text-sm text-secondary-500 dark:text-secondary-400">{product.brand}</span></div>
            <h1 class="heading-2 text-secondary-900 dark:text-white mb-3">{product.name}</h1>
            <div class="flex items-center gap-4 mb-4"><div class="flex items-center gap-2">{#each [0, 1, 2, 3, 4] as starIndex}<Icon icon={Icons.star} width={18} height={18} className={starIndex < Math.floor(product.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-secondary-300 dark:text-secondary-600'} />{/each}<span class="text-sm font-medium text-secondary-900 dark:text-white">{product.rating}</span></div><span class="text-sm text-secondary-500 dark:text-secondary-400">({t('ecommerce.reviews_count', { count: product.reviews })})</span>{#if product.sold}<span class="text-secondary-400">·</span><span class="text-sm text-secondary-500 dark:text-secondary-400">{t('ecommerce.sold_count', { count: product.sold })}</span>{/if}</div>
            <div class="flex items-center gap-3 mb-4"><span class="heading-1 text-secondary-900 dark:text-white">{product.price.toFixed(2)}</span>{#if product.originalPrice && product.discount}<span class="text-xl text-secondary-400 line-through">{product.originalPrice.toFixed(2)}</span><span class="px-2 py-1 bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 text-sm font-medium rounded">{t('ecommerce.save_percent', { discount: product.discount })}</span>{/if}</div>
            <div class="mb-6">{#if product.stock > 0}<div class="flex items-center gap-2"><div class="w-2 h-2 bg-success-500 rounded-full"></div><span class="text-sm text-success-500 font-medium">{t('ecommerce.in_stock')}</span><span class="text-sm text-secondary-400">({t('ecommerce.units_available', { count: product.stock })})</span></div>{:else}<div class="flex items-center gap-2"><div class="w-2 h-2 bg-danger-500 rounded-full"></div><span class="text-sm text-danger-500 font-medium">{t('ecommerce.out_of_stock')}</span></div>{/if}</div>
            <p class="text-sm text-secondary-600 dark:text-secondary-400 mb-6 leading-relaxed">{product.description}</p>
          </div>
          {#if product.colors?.length}<div><h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">{t('ecommerce.color')}: <span class="font-normal text-secondary-600 dark:text-secondary-400">{selectedColor}</span></h3><div class="flex gap-2">{#each product.colors as color}<button type="button" on:click={() => (selectedColor = color)} class={selectedColor === color ? 'px-4 py-2 rounded-lg text-sm font-medium bg-theme-primary text-white' : 'px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white'}>{color}</button>{/each}</div></div>{/if}
          {#if product.sizes?.length}<div><h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">{t('ecommerce.size')}: <span class="font-normal text-secondary-600 dark:text-secondary-400">{selectedSize}</span></h3><div class="flex gap-2">{#each product.sizes as size}<button type="button" on:click={() => (selectedSize = size)} class={selectedSize === size ? 'w-12 h-12 rounded-lg text-sm font-medium bg-theme-primary text-white' : 'w-12 h-12 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white'}>{size}</button>{/each}</div></div>{/if}
          <div><h3 class="text-sm font-semibold text-secondary-900 dark:text-white mb-3">{t('ecommerce.quantity')}</h3><div class="flex items-center gap-3"><div class="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg"><button type="button" disabled={quantity <= 1} on:click={decreaseQuantity} class="p-3 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-50"><Icon icon={Icons.minus} width={18} height={18} /></button><span class="px-6 py-3 text-sm font-medium">{quantity}</span><button type="button" disabled={quantity >= product.stock} on:click={increaseQuantity} class="p-3 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-50"><Icon icon={Icons.plus} width={18} height={18} /></button></div><span class="text-sm text-secondary-500 dark:text-secondary-400">{t('ecommerce.available_count', { count: product.stock })}</span></div></div>
          <div class="flex gap-3"><button type="button" disabled={!product.stock} on:click={addToCart} class="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-theme-primary text-white rounded-lg font-medium disabled:opacity-50"><Icon icon={Icons.shopping} width={20} height={20} />{t('ecommerce.add_to_cart')}</button><button type="button" aria-label="Add to wishlist" class="p-3.5 border border-surface-200 dark:border-surface-700 rounded-lg"><Icon icon={Icons.heart} width={20} height={20} /></button><button type="button" aria-label="Share product" class="p-3.5 border border-surface-200 dark:border-surface-700 rounded-lg"><Icon icon={Icons.share} width={20} height={20} /></button></div>
          <div class="grid grid-cols-3 gap-4 pt-6 border-t border-surface-200 dark:border-surface-700"><div class="flex items-center gap-3"><div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Icon icon={Icons.truck} width={20} height={20} className="text-blue-600 dark:text-blue-400" /></div><div><p class="text-xs text-secondary-500 dark:text-secondary-400">{t('ecommerce.feature.free_shipping_title')}</p><p class="text-sm font-medium text-secondary-900 dark:text-white">{t('ecommerce.feature.free_shipping_subtitle')}</p></div></div><div class="flex items-center gap-3"><div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Icon icon={Icons.refresh} width={20} height={20} className="text-green-600 dark:text-green-400" /></div><div><p class="text-xs text-secondary-500 dark:text-secondary-400">{t('ecommerce.feature.easy_returns_title')}</p><p class="text-sm font-medium text-secondary-900 dark:text-white">{t('ecommerce.feature.easy_returns_subtitle')}</p></div></div><div class="flex items-center gap-3"><div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Icon icon={Icons.shield} width={20} height={20} className="text-purple-600 dark:text-purple-400" /></div><div><p class="text-xs text-secondary-500 dark:text-secondary-400">{t('ecommerce.feature.secure_payment_title')}</p><p class="text-sm font-medium text-secondary-900 dark:text-white">{t('ecommerce.feature.secure_payment_subtitle')}</p></div></div></div>
        </div>
      </div>
      <div class="card rounded-xl p-6"><div class="border-b border-surface-200 dark:border-surface-700 mb-6"><div class="flex gap-6"><button type="button" class="pb-3 border-b-2 border-theme-primary text-theme-primary font-medium text-sm">{t('ecommerce.tab.specifications')}</button><button type="button" class="pb-3 border-b-2 border-transparent text-secondary-500 font-medium text-sm">{t('ecommerce.tab.reviews')} ({product.reviews})</button><button type="button" class="pb-3 border-b-2 border-transparent text-secondary-500 font-medium text-sm">{t('ecommerce.tab.shipping_info')}</button></div></div>{#if product.specifications?.length}<div class="space-y-4"><h3 class="heading-5 text-secondary-900 dark:text-white mb-4">{t('ecommerce.product_specifications')}</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4">{#each product.specifications as spec}<div class="flex items-start gap-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg"><div class="flex-1"><p class="text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-1">{spec.label}</p><p class="text-sm text-secondary-900 dark:text-white font-medium">{spec.value}</p></div></div>{/each}</div></div>{/if}<div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700"><div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p class="text-secondary-500 mb-1">SKU</p><p class="font-medium">{product.sku}</p></div><div><p class="text-secondary-500 mb-1">{t('ecommerce.category')}</p><p class="font-medium">{product.category}</p></div><div><p class="text-secondary-500 mb-1">{t('ecommerce.brand')}</p><p class="font-medium">{product.brand}</p></div><div><p class="text-secondary-500 mb-1">{t('ecommerce.tags')}</p><div class="flex flex-wrap gap-1">{#each product.tags.slice(0, 3) as tag}<span class="px-2 py-0.5 bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400 text-xs rounded">{tag}</span>{/each}</div></div></div></div></div>
    </div>
  {/if}
{/if}

