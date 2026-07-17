<script setup lang="ts">
import { ShoppingBag, Plus, Loader2, Trash2, X } from "lucide-vue-next";

const props = defineProps<{
  chatbotId: string;
}>();

const emit = defineEmits<{
  catalogChanged: [count: number];
}>();

const supabase = useSupabaseClient();
const notify = useNotify();

const catalog = ref<any[]>([]);
const isCatalogLoading = ref(true);
const isAddingProduct = ref(false);
const isProductModalOpen = ref(false);

const newProduct = ref({
  name: "",
  price: 0,
  currency: "RWF",
  category: "Digital product",
  description: "",
  delivery_url: "",
  is_paid: true,
  sales_notes: "",
});

const productMeta = (product: any) => {
  try {
    return product?.sku ? JSON.parse(product.sku) : {};
  } catch {
    return {};
  }
};
const productDeliveryUrl = (product: any) =>
  String(product?.delivery_url || productMeta(product).delivery_url || "");
const productIsPaid = (product: any) =>
  product?.is_paid !== undefined
    ? product.is_paid !== false
    : productMeta(product).is_paid !== false && Number(product?.price || 0) > 0;

const fetchCatalog = async () => {
  if (!props.chatbotId) return;
  isCatalogLoading.value = true;
  try {
    const { data } = await supabase
      .from("chatbot_catalog")
      .select("*")
      .eq("chatbot_id", props.chatbotId)
      .order("created_at", { ascending: false });

    catalog.value = data || [];
    emit("catalogChanged", catalog.value.length);
  } catch (err) {
    console.error("Failed to fetch catalog:", err);
  } finally {
    isCatalogLoading.value = false;
  }
};

const handleAddProduct = async () => {
  if (!newProduct.value.name.trim()) {
    notify.error("Product name is required");
    return;
  }
  if (!newProduct.value.delivery_url.trim()) {
    notify.error("Product delivery link is required");
    return;
  }
  if (newProduct.value.is_paid && newProduct.value.price <= 0) {
    notify.error("Set a price for paid products");
    return;
  }

  isAddingProduct.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbot_catalog")
      .insert([
        {
          chatbot_id: props.chatbotId,
          name: newProduct.value.name,
          price: newProduct.value.is_paid ? newProduct.value.price : 0,
          currency: newProduct.value.currency,
          category: newProduct.value.category,
          description: newProduct.value.description,
          sku: JSON.stringify({
            type: "digital_product",
            delivery_url: newProduct.value.delivery_url,
            is_paid: newProduct.value.is_paid,
            sales_notes: newProduct.value.sales_notes,
          }),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    notify.success("Product deployed to agent catalog");
    catalog.value.unshift(data);
    emit("catalogChanged", catalog.value.length);
    resetProductForm();
    isProductModalOpen.value = false;
  } catch (err: any) {
    notify.error(err.message);
  } finally {
    isAddingProduct.value = false;
  }
};

const resetProductForm = () => {
  newProduct.value = {
    name: "",
    price: 0,
    currency: "RWF",
    category: "Digital product",
    description: "",
    delivery_url: "",
    is_paid: true,
    sales_notes: "",
  };
};

const closeProductModal = () => {
  if (isAddingProduct.value) return;
  isProductModalOpen.value = false;
  resetProductForm();
};

const removeProduct = async (productId: string) => {
  if (!(await notify.confirm("Remove this product?"))) return;
  try {
    const { error } = await supabase
      .from("chatbot_catalog")
      .delete()
      .eq("id", productId);

    if (error) throw error;
    notify.success("Product removed");
    catalog.value = catalog.value.filter((p) => p.id !== productId);
    emit("catalogChanged", catalog.value.length);
  } catch (err: any) {
    notify.error(err.message);
  }
};

onMounted(() => fetchCatalog());
watch(
  () => props.chatbotId,
  () => fetchCatalog(),
);

// Expose catalog length for the parent if needed
defineExpose({
  catalogCount: computed(() => catalog.value.length),
});
</script>

<template>
  <section class="space-y-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3
          class="text-[10px] font-bold text-foreground/50 tracking-widest uppercase mb-1"
        >
          Product Catalog
        </h3>
        <p class="text-[9px] text-foreground/50 uppercase tracking-wider">
          Digital products the assistant can sell and deliver
        </p>
      </div>
      <button
        @click="isProductModalOpen = true"
        class="flex items-center gap-2 rounded-[0.39rem] bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black shadow-sm shadow-black/5 transition hover:opacity-90"
      >
        <Plus class="w-3.5 h-3.5" />
        Add Product
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="isProductModalOpen"
        class="fixed inset-0 z-[280] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
        @click.self="closeProductModal"
      >
        <section
          class="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-xl shadow-black/20"
        >
          <div
            class="flex items-center justify-between gap-3 border-b border-foreground/10 p-4"
          >
            <div>
              <p
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/45"
              >
                Business product
              </p>
              <h3 class="mt-1 text-sm font-bold text-foreground">
                Add digital product
              </h3>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/60 text-foreground/55 transition hover:text-primary"
              @click="closeProductModal"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
            <div class="sm:col-span-2">
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Product Name</label
              >
              <input
                v-model="newProduct.name"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/50"
                placeholder="e.g. The Art of Prompting PDF"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Price type</label
              >
              <select
                v-model="newProduct.is_paid"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary/50"
              >
                <option :value="true">Paid</option>
                <option :value="false">Free</option>
              </select>
            </div>
            <div>
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Price (RWF)</label
              >
              <input
                v-model.number="newProduct.price"
                type="number"
                min="0"
                :disabled="!newProduct.is_paid"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/50 disabled:opacity-45"
                placeholder="1000"
              />
            </div>
            <div>
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Category</label
              >
              <input
                v-model="newProduct.category"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/50"
                placeholder="PDF, Course, Template"
              />
            </div>
            <div class="sm:col-span-4">
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Brief Description</label
              >
              <input
                v-model="newProduct.description"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/50"
                placeholder="What the customer receives and why it is useful"
              />
            </div>
            <div class="sm:col-span-4">
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Product delivery link</label
              >
              <input
                v-model="newProduct.delivery_url"
                type="url"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/50"
                placeholder="https://... PDF, Notion, Drive, course, or download link"
              />
            </div>
            <div class="sm:col-span-4">
              <label
                class="mb-2 block text-[8px] font-bold uppercase tracking-widest text-foreground/50"
                >Sales notes for the assistant</label
              >
              <textarea
                v-model="newProduct.sales_notes"
                rows="4"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/50"
                placeholder="Benefits, audience, objections, guarantee, bonuses, and how to pitch naturally."
              />
            </div>
          </div>

          <div
            class="flex flex-col-reverse gap-2 border-t border-foreground/10 p-4 sm:flex-row sm:justify-end"
          >
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/60 px-4 text-[10px] font-bold uppercase tracking-widest text-foreground/60 transition hover:text-foreground"
              @click="closeProductModal"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isAddingProduct"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-[10px] font-bold uppercase tracking-widest text-black shadow-sm shadow-black/5 transition hover:opacity-90 disabled:opacity-60"
              @click="handleAddProduct"
            >
              <Loader2
                v-if="isAddingProduct"
                class="h-3.5 w-3.5 animate-spin"
              />
              <Plus v-else class="h-3.5 w-3.5" />
              Deploy product
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <!-- Catalog List -->
    <div v-if="isCatalogLoading" class="flex justify-center py-10">
      <Loader2 class="w-6 h-6 text-primary animate-spin" />
    </div>
    <div
      v-else-if="catalog.length === 0"
      class="rounded-[0.39rem] border-2 border-dashed border-foreground/10 py-16 text-center"
    >
      <ShoppingBag class="w-12 h-12 text-foreground/10 mx-auto mb-4" />
      <p class="text-[10px] text-foreground/50 uppercase tracking-[0.2em]">
        Empty Inventory
      </p>
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="product in catalog"
        :key="product.id"
        class="group flex items-center justify-between rounded-[0.39rem] border border-foreground/10 bg-background/35 p-4 transition-all hover:border-foreground/15"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/50 font-black text-[10px]"
          >
            {{ product.category?.substring(0, 3).toUpperCase() || "ITM" }}
          </div>
          <div>
            <p class="text-sm font-bold text-foreground">{{ product.name }}</p>
            <p
              class="text-[9px] text-foreground/50 uppercase tracking-widest mt-0.5"
            >
              {{ product.description || "No description" }}
              <span v-if="productDeliveryUrl(product)" class="text-primary/70">
                · delivery link ready
              </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <p class="text-xs font-bold text-foreground">
              {{
                !productIsPaid(product)
                  ? "Free"
                  : `${Number(product.price || 0).toLocaleString()} ${product.currency || "RWF"}`
              }}
            </p>
            <p
              class="text-[8px] text-primary uppercase font-bold tracking-tighter mt-0.5"
            >
              Verified
            </p>
          </div>
          <button
            @click="removeProduct(product.id)"
            class="p-2 text-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
