<script setup lang="ts">
import { ShoppingBag, Plus, Loader2, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  chatbotId: string
}>()

const supabase = useSupabaseClient()
const notify = useNotify()

const catalog = ref<any[]>([])
const isCatalogLoading = ref(true)
const isAddingProduct = ref(false)

const newProduct = ref({
  name: '',
  price: 0,
  category: '',
  description: ''
})

const fetchCatalog = async () => {
  if (!props.chatbotId) return
  isCatalogLoading.value = true
  try {
    const { data } = await supabase
      .from('chatbot_catalog')
      .select('*')
      .eq('chatbot_id', props.chatbotId)
      .order('created_at', { ascending: false })
    
    catalog.value = data || []
  } catch (err) {
    console.error('Failed to fetch catalog:', err)
  } finally {
    isCatalogLoading.value = false
  }
}

const handleAddProduct = async () => {
  if (!newProduct.value.name || newProduct.value.price <= 0) {
    notify.error('Product name and price are required')
    return
  }

  isAddingProduct.value = true
  try {
    const { data, error } = await supabase
      .from('chatbot_catalog')
      .insert([{
        chatbot_id: props.chatbotId,
        ...newProduct.value
      }])
      .select()
      .single()

    if (error) throw error

    notify.success('Product deployed to agent catalog')
    catalog.value.unshift(data)
    newProduct.value = { name: '', price: 0, category: '', description: '' }
  } catch (err: any) {
    notify.error(err.message)
  } finally {
    isAddingProduct.value = false
  }
}

const removeProduct = async (productId: string) => {
  if (!(await notify.confirm('Remove this product?'))) return
  try {
    const { error } = await supabase
      .from('chatbot_catalog')
      .delete()
      .eq('id', productId)

    if (error) throw error
    notify.success('Product removed')
    catalog.value = catalog.value.filter(p => p.id !== productId)
  } catch (err: any) {
    notify.error(err.message)
  }
}

onMounted(() => fetchCatalog())
watch(() => props.chatbotId, () => fetchCatalog())

// Expose catalog length for the parent if needed
defineExpose({
  catalogCount: computed(() => catalog.value.length)
})
</script>

<template>
  <section class="glass-card p-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h3 class="text-[10px] font-bold text-foreground/50 tracking-widest uppercase mb-1">Product Catalog</h3>
        <p class="text-[9px] text-foreground/50 uppercase tracking-wider">Inventory managed by this agent</p>
      </div>
      <button 
        @click="handleAddProduct"
        :disabled="isAddingProduct"
        class="px-5 py-2 bg-primary text-black font-bold rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
      >
        <Plus v-if="!isAddingProduct" class="w-3.5 h-3.5" />
        <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
        Deploy Product
      </button>
    </div>

    <!-- Add Product Form -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10 p-6 rounded-2xl bg-foreground/[0.01] border border-foreground/5">
      <div class="sm:col-span-2">
          <label class="block text-[8px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Product Name</label>
          <input v-model="newProduct.name" class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/50" placeholder="e.g. Classic Burger" />
      </div>
      <div>
          <label class="block text-[8px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Price (RWF)</label>
          <input v-model.number="newProduct.price" type="number" class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/50" placeholder="5000" />
      </div>
      <div>
          <label class="block text-[8px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Category</label>
          <input v-model="newProduct.category" class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/50" placeholder="Food" />
      </div>
      <div class="sm:col-span-4">
          <label class="block text-[8px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Brief Description</label>
          <input v-model="newProduct.description" class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/50" placeholder="A juicy beef burger with cheese..." />
      </div>
    </div>

    <!-- Catalog List -->
    <div v-if="isCatalogLoading" class="flex justify-center py-10">
      <Loader2 class="w-6 h-6 text-primary animate-spin" />
    </div>
    <div v-else-if="catalog.length === 0" class="text-center py-20 border-2 border-dashed border-foreground/5 rounded-[2rem]">
      <ShoppingBag class="w-12 h-12 text-foreground/10 mx-auto mb-4" />
      <p class="text-[10px] text-foreground/50 uppercase tracking-[0.2em]">Empty Inventory</p>
    </div>
    <div v-else class="space-y-3">
      <div v-for="product in catalog" :key="product.id" class="flex items-center justify-between p-5 rounded-2xl bg-foreground/[0.01] border border-foreground/5 hover:border-foreground/10 transition-all group">
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/50 font-black text-[10px]">
                  {{ product.category?.substring(0, 3).toUpperCase() || 'ITM' }}
              </div>
              <div>
                  <p class="text-sm font-bold text-foreground">{{ product.name }}</p>
                  <p class="text-[9px] text-foreground/50 uppercase tracking-widest mt-0.5">{{ product.description || 'No description' }}</p>
              </div>
          </div>
          <div class="flex items-center gap-6">
              <div class="text-right">
                  <p class="text-xs font-bold text-foreground">{{ product.price.toLocaleString() }} RWF</p>
                  <p class="text-[8px] text-primary uppercase font-bold tracking-tighter mt-0.5">Verified</p>
              </div>
              <button @click="removeProduct(product.id)" class="p-2 text-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 class="w-4 h-4" />
              </button>
          </div>
      </div>
    </div>
  </section>
</template>
