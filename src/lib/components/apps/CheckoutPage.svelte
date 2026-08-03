<script lang="ts">
  import { goto } from '$app/navigation'
  import { locale, translate } from '../../stores/locale'
  import Icon from '../common/Icon.svelte'
  import { Icons } from '../../icons'
  import { mockCartItems, shippingMethods, paymentMethods, type CartItem } from '../../../data/ecommerce'

  const t = translate
  $: currentLocale = $locale
  let cartItems: CartItem[] = mockCartItems.map((item) => ({ ...item, product: { ...item.product }, }))
  let selectedShipping = shippingMethods[0].id
  let selectedPayment = paymentMethods[0].id
  let step: 'cart' | 'checkout' | 'success' = 'cart'
  let orderNumber = ''
  let formData: Record<string, string> = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  }

  $: subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  $: tax = subtotal * 0.08
  $: shipping = shippingMethods.find((method) => method.id === selectedShipping)?.price ?? 0
  $: total = subtotal + tax + shipping

  function updateQuantity(id: string, change: number): void {
    cartItems = cartItems.map((item) => {
      if (item.id !== id) return item
      const quantity = item.quantity + change
      return quantity >= 1 && quantity <= item.product.stock ? { ...item, quantity } : item
    })
  }

  function removeItem(id: string): void {
    cartItems = cartItems.filter((item) => item.id !== id)
  }

  function handleInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | HTMLSelectElement
    formData = { ...formData, [input.name]: input.value }
  }

  function handlePlaceOrder(event: SubmitEvent): void {
    event.preventDefault()
    orderNumber = 'ORD-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6)
    step = 'success'
    window.setTimeout(() => void goto('/app/ecommerce/products'), 3000)
  }
</script>

<svelte:head><title>{t('ecommerce.checkout')} · Adminex</title></svelte:head>

{#if step === 'success'}
  <div data-locale={currentLocale}>
    <div class="max-w-2xl mx-auto">
      <div class="card rounded-xl p-12 text-center">
        <div class="w-20 h-20 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon icon={Icons.check} width={40} height={40} className="text-success-500" />
        </div>
        <h1 class="heading-2 text-secondary-900 dark:text-white mb-3">{t('ecommerce.order_success_title')}</h1>
        <p class="text-secondary-500 dark:text-secondary-400 mb-2">{t('ecommerce.order_success_message')}</p>
        <p class="text-sm text-secondary-400 mb-8">{t('ecommerce.order_number', { orderNumber })}</p>
        <div class="space-y-3">
          <a href="/app/ecommerce/products" class="block w-full px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-dark transition-colors font-medium">{t('ecommerce.continue_shopping')}</a>
          <button type="button" on:click={() => void goto('/dashboard')} class="block w-full px-6 py-3 bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors font-medium">{t('ecommerce.go_dashboard')}</button>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div data-locale={currentLocale}>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <a href="/app/ecommerce/products" class="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors">
          <Icon icon={Icons.arrowLeft} width={20} height={20} />
          <span class="text-sm font-medium">{t('ecommerce.continue_shopping')}</span>
        </a>
      </div>
      <div class="flex items-center gap-2">
        <div class={'flex items-center gap-2 px-4 py-2 rounded-lg ' + (step === 'cart' ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400')}>
          <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium">1</span>
          <span class="text-sm font-medium">{t('ecommerce.step_cart')}</span>
        </div>
        <div class="w-8 h-0.5 bg-surface-200 dark:bg-surface-700"></div>
        <div class={'flex items-center gap-2 px-4 py-2 rounded-lg ' + (step === 'checkout' ? 'bg-theme-primary text-white' : 'bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-secondary-400')}>
          <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium">2</span>
          <span class="text-sm font-medium">{t('ecommerce.step_checkout')}</span>
        </div>
      </div>
    </div>

    {#if cartItems.length === 0}
      <div class="card rounded-xl p-12 text-center">
        <h2 class="heading-4 text-secondary-900 dark:text-white mb-2">{t('ecommerce.cart_empty')}</h2>
        <p class="text-secondary-500 dark:text-secondary-400 mb-6">{t('ecommerce.cart_empty_desc')}</p>
        <a href="/app/ecommerce/products" class="inline-flex px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-dark transition-colors font-medium">{t('ecommerce.browse_products')}</a>
      </div>
    {:else if step === 'cart'}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-4">
          <div class="card rounded-xl p-6">
            <h2 class="heading-4 text-secondary-900 dark:text-white mb-6">{t('ecommerce.shopping_cart')} ({t('ecommerce.items_count', { count: cartItems.length })})</h2>
            <div class="space-y-4">
              {#each cartItems as item}
                <div class="flex gap-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                  <a href={'/app/ecommerce/products/' + item.product.id} class="flex-shrink-0">
                    <img src={item.product.thumbnail} alt={item.product.name} class="w-24 h-24 object-cover rounded-lg" />
                  </a>
                  <div class="flex-1 min-w-0">
                    <a href={'/app/ecommerce/products/' + item.product.id}>
                      <h3 class="text-ui font-semibold text-secondary-900 dark:text-white hover:text-theme-primary transition-colors mb-1">{item.product.name}</h3>
                    </a>
                    <p class="text-sm text-secondary-500 dark:text-secondary-400 mb-2">{item.product.brand}</p>
                    {#if item.selectedColor}<p class="text-sm text-secondary-600 dark:text-secondary-400">{t('ecommerce.color')}: {item.selectedColor}</p>{/if}
                    {#if item.selectedSize}<p class="text-sm text-secondary-600 dark:text-secondary-400">{t('ecommerce.size')}: {item.selectedSize}</p>{/if}
                  </div>
                  <div class="flex flex-col items-end justify-between">
                    <button type="button" aria-label={t('common.delete')} on:click={() => removeItem(item.id)} class="p-1 text-secondary-400 hover:text-danger-500 transition-colors"><Icon icon={Icons.trash} width={18} height={18} /></button>
                    <div class="flex items-center gap-2">
                      <button type="button" aria-label="Decrease quantity" disabled={item.quantity <= 1} on:click={() => updateQuantity(item.id, -1)} class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Icon icon={Icons.minus} width={16} height={16} /></button>
                      <span class="w-8 text-center text-sm font-medium text-secondary-900 dark:text-white">{item.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={item.quantity >= item.product.stock} on:click={() => updateQuantity(item.id, 1)} class="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Icon icon={Icons.plus} width={16} height={16} /></button>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-semibold text-secondary-900 dark:text-white">{'$' + (item.product.price * item.quantity).toFixed(2)}</p>
                      <p class="text-xs text-secondary-400">{'$' + item.product.price.toFixed(2)} {t('ecommerce.each')}</p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="card rounded-xl p-6 sticky top-6">
            <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-6">{t('ecommerce.order_summary')}</h2>
            <div class="space-y-4 mb-6">
              <div class="flex justify-between text-sm"><span class="text-secondary-600 dark:text-secondary-400">{t('ecommerce.subtotal')} ({t('ecommerce.items_count', { count: cartItems.length })})</span><span class="font-medium text-secondary-900 dark:text-white">{'$' + subtotal.toFixed(2)}</span></div>
              <div class="flex justify-between text-sm"><span class="text-secondary-600 dark:text-secondary-400">{t('ecommerce.shipping')}</span><span class="font-medium text-secondary-900 dark:text-white">{'$' + shipping.toFixed(2)}</span></div>
              <div class="flex justify-between text-sm"><span class="text-secondary-600 dark:text-secondary-400">{t('ecommerce.tax_with_rate', { rate: 8 })}</span><span class="font-medium text-secondary-900 dark:text-white">{'$' + tax.toFixed(2)}</span></div>
              <div class="pt-4 border-t border-surface-200 dark:border-surface-700"><div class="flex justify-between"><span class="text-lg font-semibold text-secondary-900 dark:text-white">{t('ecommerce.total')}</span><span class="heading-3 text-theme-primary">{'$' + total.toFixed(2)}</span></div></div>
            </div>
            <button type="button" on:click={() => (step = 'checkout')} class="w-full px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-dark transition-colors font-medium">{t('ecommerce.proceed_checkout')}</button>
            <a href="/app/ecommerce/products" class="block w-full px-6 py-3 text-center bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors font-medium mt-3">{t('ecommerce.continue_shopping')}</a>
          </div>
        </div>
      </div>
    {:else}
      <form on:submit={handlePlaceOrder}>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="card rounded-xl p-6">
              <div class="flex items-center gap-3 mb-6"><div class="p-2 bg-theme-primary/10 rounded-lg"><Icon icon={Icons.truck} width={20} height={20} className="text-theme-primary" /></div><h2 class="text-xl font-semibold text-secondary-900 dark:text-white">{t('ecommerce.shipping_information')}</h2></div>
              <div class="grid grid-cols-2 gap-4">
                {#each [['firstName', 'ecommerce.first_name'], ['lastName', 'ecommerce.last_name'], ['email', 'ecommerce.email'], ['phone', 'ecommerce.phone'], ['address', 'ecommerce.address'], ['city', 'ecommerce.city'], ['state', 'ecommerce.state'], ['zipCode', 'ecommerce.zip_code']] as field, index}
                  <div class={index === 4 ? 'col-span-2' : ''}>
                    <label for={'checkout-' + field[0]} class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t(field[1])}</label>
                    <input id={'checkout-' + field[0]} type={field[0] === 'email' ? 'email' : field[0] === 'phone' ? 'tel' : 'text'} name={field[0]} required value={formData[field[0]]} on:input={handleInputChange} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all" />
                  </div>
                {/each}
                <div>
                  <label for="checkout-country" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{t('ecommerce.country')}</label>
                  <select id="checkout-country" name="country" required value={formData.country} on:change={handleInputChange} class="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all"><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Australia</option></select>
                </div>
              </div>
            </div>

            <div class="card rounded-xl p-6">
              <h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">{t('ecommerce.shipping_method')}</h3>
              <div class="space-y-3">
                {#each shippingMethods as method}
                  <label class={'flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ' + (selectedShipping === method.id ? 'border-theme-primary bg-theme-primary/5' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')}>
                    <div class="flex items-center gap-3"><input type="radio" name="shipping" value={method.id} checked={selectedShipping === method.id} on:change={() => (selectedShipping = method.id)} class="w-4 h-4 text-theme-primary" /><div><p class="text-sm font-medium text-secondary-900 dark:text-white">{method.name}</p><p class="text-xs text-secondary-500 dark:text-secondary-400">{method.description}</p></div></div>
                    <span class="text-sm font-semibold text-secondary-900 dark:text-white">{'$' + method.price.toFixed(2)}</span>
                  </label>
                {/each}
              </div>
            </div>

            <div class="card rounded-xl p-6">
              <div class="flex items-center gap-3 mb-4"><div class="p-2 bg-theme-primary/10 rounded-lg"><Icon icon={Icons.creditCard} width={20} height={20} className="text-theme-primary" /></div><h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{t('ecommerce.payment_method')}</h3></div>
              <div class="grid grid-cols-3 gap-3 mb-4">
                {#each paymentMethods as method}
                  <button type="button" on:click={() => (selectedPayment = method.id)} class={'p-4 border-2 rounded-lg transition-colors ' + (selectedPayment === method.id ? 'border-theme-primary bg-theme-primary/5' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600')}>
                    <Icon icon={Icons.creditCard} width={24} height={24} className="mx-auto mb-2 text-secondary-600 dark:text-secondary-400" />
                    <p class="text-xs font-medium text-secondary-900 dark:text-white">{method.name}</p>
                  </button>
                {/each}
              </div>
              <div class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Icon icon={Icons.lock} width={16} height={16} className="text-blue-600 dark:text-blue-400" /><p class="text-xs text-blue-600 dark:text-blue-400">{t('ecommerce.secure_payment_message')}</p></div>
            </div>
          </div>

          <div class="lg:col-span-1">
            <div class="card rounded-xl p-6 sticky top-6">
              <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-6">{t('ecommerce.order_summary')}</h2>
              <div class="space-y-4 mb-6">
                <div class="flex justify-between text-sm"><span class="text-secondary-600 dark:text-secondary-400">{t('ecommerce.subtotal')} ({t('ecommerce.items_count', { count: cartItems.length })})</span><span class="font-medium text-secondary-900 dark:text-white">{'$' + subtotal.toFixed(2)}</span></div>
                <div class="flex justify-between text-sm"><span class="text-secondary-600 dark:text-secondary-400">{t('ecommerce.shipping')}</span><span class="font-medium text-secondary-900 dark:text-white">{'$' + shipping.toFixed(2)}</span></div>
                <div class="flex justify-between text-sm"><span class="text-secondary-600 dark:text-secondary-400">{t('ecommerce.tax_with_rate', { rate: 8 })}</span><span class="font-medium text-secondary-900 dark:text-white">{'$' + tax.toFixed(2)}</span></div>
                <div class="pt-4 border-t border-surface-200 dark:border-surface-700"><div class="flex justify-between"><span class="text-lg font-semibold text-secondary-900 dark:text-white">{t('ecommerce.total')}</span><span class="heading-3 text-theme-primary">{'$' + total.toFixed(2)}</span></div></div>
              </div>
              <button type="submit" class="w-full px-6 py-3 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-dark transition-colors font-medium">{t('ecommerce.place_order')}</button>
              <button type="button" on:click={() => (step = 'cart')} class="w-full px-6 py-3 text-center bg-surface-100 dark:bg-surface-800 text-secondary-900 dark:text-white rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors font-medium mt-3">{t('ecommerce.back_to_cart')}</button>
            </div>
          </div>
        </div>
      </form>
    {/if}
  </div>
{/if}

