<script setup lang="ts">
import { Loader2, PackageCheck, Plus, Trash2, X } from "lucide-vue-next";

const props = defineProps<{
  chatbotId: string;
}>();

const emit = defineEmits<{
  productsChanged: [count: number];
}>();

const supabase = useSupabaseClient();
const notify = useNotify();

const products = ref<any[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const isModalOpen = ref(false);

const form = reactive({
  name: "",
  description: "",
  category: "Digital PDF",
  price: 0,
  currency: "RWF",
  file_key: "",
  is_paid: true,
  sales_notes: "",
});

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.category = "Digital PDF";
  form.price = 0;
  form.currency = "RWF";
  form.file_key = "";
  form.is_paid = true;
  form.sales_notes = "";
};

const closeModal = () => {
  if (isSaving.value) return;
  isModalOpen.value = false;
  resetForm();
};

const fetchProducts = async () => {
  if (!props.chatbotId) return;
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("business_products")
      .select(
        "id, name, description, category, price, currency, file_key, is_paid, is_active, sales_notes, created_at",
      )
      .eq("chatbot_id", props.chatbotId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    products.value = data || [];
    emit(
      "productsChanged",
      products.value.filter((product) => product.is_active !== false).length,
    );
  } catch (err: any) {
    console.error("Failed to load business products:", err);
    notify.error(err?.message || "Unable to load business products.");
    products.value = [];
    emit("productsChanged", 0);
  } finally {
    isLoading.value = false;
  }
};

const saveProduct = async () => {
  if (!form.name.trim()) return notify.error("Product name is required.");
  if (!form.file_key.trim())
    return notify.error("Private file key is required for protected delivery.");
  if (form.is_paid && Number(form.price || 0) <= 0)
    return notify.error("Set a price for paid products.");

  isSaving.value = true;
  try {
    const { data, error } = await supabase
      .from("business_products")
      .insert({
        chatbot_id: props.chatbotId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || "Digital product",
        price: form.is_paid ? Number(form.price || 0) : 0,
        currency: form.currency || "RWF",
        product_type: "digital",
        file_key: form.file_key.trim().replace(/^\/+/, ""),
        is_paid: Boolean(form.is_paid),
        is_active: true,
        sales_notes: form.sales_notes.trim() || null,
      })
      .select(
        "id, name, description, category, price, currency, file_key, is_paid, is_active, sales_notes, created_at",
      )
      .single();
    if (error) throw error;
    products.value.unshift(data);
    emit(
      "productsChanged",
      products.value.filter((product) => product.is_active !== false).length,
    );
    notify.success("Business product saved.");
    closeModal();
  } catch (err: any) {
    notify.error(err?.message || "Unable to save product.");
  } finally {
    isSaving.value = false;
  }
};

const toggleProduct = async (product: any) => {
  const nextActive = product.is_active === false;
  try {
    const { error } = await supabase
      .from("business_products")
      .update({ is_active: nextActive })
      .eq("id", product.id)
      .eq("chatbot_id", props.chatbotId);
    if (error) throw error;
    product.is_active = nextActive;
    emit(
      "productsChanged",
      products.value.filter((item) => item.is_active !== false).length,
    );
  } catch (err: any) {
    notify.error(err?.message || "Unable to update product.");
  }
};

onMounted(fetchProducts);
watch(
  () => props.chatbotId,
  () => fetchProducts(),
);
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p
          class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
        >
          Business products
        </p>
        <p class="mt-1 text-xs leading-5 text-foreground/45">
          Protected digital products delivered through
          <span class="font-bold text-foreground/70">/d/:code</span> after
          payment.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-[0.39rem] bg-primary px-3 text-[11px] font-bold text-black transition hover:bg-primary-accent"
        @click="isModalOpen = true"
      >
        <Plus class="h-3.5 w-3.5" />
        Add product
      </button>
    </div>

    <div v-if="isLoading" class="space-y-2">
      <div
        v-for="item in 3"
        :key="item"
        class="h-16 animate-pulse rounded-[0.39rem] border border-foreground/10 bg-background/45"
      />
    </div>

    <div
      v-else-if="!products.length"
      class="rounded-[0.39rem] border border-dashed border-foreground/15 bg-background/35 p-5 text-center"
    >
      <PackageCheck class="mx-auto h-6 w-6 text-foreground/25" />
      <p class="mt-2 text-xs font-bold text-foreground">
        No Business products yet
      </p>
      <p class="mt-1 text-[11px] leading-5 text-foreground/45">
        Add a private file key such as
        <span class="font-mono text-foreground/60">products/file.pdf</span>.
        Customers receive only protected short links.
      </p>
    </div>

    <div v-else class="space-y-2">
      <article
        v-for="product in products"
        :key="product.id"
        class="rounded-[0.39rem] border border-foreground/10 bg-background/40 p-3 shadow-sm shadow-black/5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-xs font-bold text-foreground">
                {{ product.name }}
              </p>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  product.is_active !== false
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-foreground/5 text-foreground/45',
                ]"
              >
                {{ product.is_active !== false ? "Active" : "Inactive" }}
              </span>
            </div>
            <p class="mt-1 text-[11px] text-foreground/55">
              {{ Number(product.price || 0).toLocaleString("en-US") }}
              {{ product.currency || "RWF" }} ·
              {{ product.is_paid === false ? "Free" : "Paid" }}
            </p>
            <p class="mt-1 truncate font-mono text-[10px] text-foreground/40">
              {{ product.file_key }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-[10px] font-bold text-foreground/60 transition hover:text-primary"
            @click="toggleProduct(product)"
          >
            <Trash2 class="h-3.5 w-3.5" />
            {{ product.is_active !== false ? "Disable" : "Enable" }}
          </button>
        </div>
      </article>
    </div>

    <Teleport to="body">
      <div
        v-if="isModalOpen"
        class="fixed inset-0 z-[280] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
        @click.self="closeModal"
      >
        <section
          class="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-xl shadow-black/20"
        >
          <div
            class="flex items-center justify-between gap-3 border-b border-foreground/10 p-4"
          >
            <div>
              <p
                class="text-[10px] font-black uppercase tracking-[0.18em] text-primary"
              >
                Protected product
              </p>
              <h3 class="mt-1 text-sm font-bold text-foreground">
                Add Business product
              </h3>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/60 text-foreground/55"
              @click="closeModal"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="grid gap-4 p-4 sm:grid-cols-4">
            <label class="space-y-2 sm:col-span-2">
              <span
                class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
                >Name</span
              >
              <input
                v-model="form.name"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold outline-none focus:border-primary/40"
                placeholder="The Art of Prompting PDF"
              />
            </label>
            <label class="space-y-2">
              <span
                class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
                >Price</span
              >
              <input
                v-model.number="form.price"
                type="number"
                min="0"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold outline-none focus:border-primary/40"
                placeholder="1000"
              />
            </label>
            <label class="space-y-2">
              <span
                class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
                >Currency</span
              >
              <input
                v-model="form.currency"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold outline-none focus:border-primary/40"
                placeholder="RWF"
              />
            </label>
            <label class="space-y-2 sm:col-span-4">
              <span
                class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
                >Private file key</span
              >
              <input
                v-model="form.file_key"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 font-mono text-xs outline-none focus:border-primary/40"
                placeholder="products/art-of-prompting-english-kinyarwanda.pdf"
              />
            </label>
            <label class="space-y-2 sm:col-span-4">
              <span
                class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
                >Description</span
              >
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2 text-xs leading-5 outline-none focus:border-primary/40"
              />
            </label>
            <label class="space-y-2 sm:col-span-4">
              <span
                class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
                >Sales notes</span
              >
              <textarea
                v-model="form.sales_notes"
                rows="3"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2 text-xs leading-5 outline-none focus:border-primary/40"
              />
            </label>
          </div>

          <div class="flex justify-end gap-2 border-t border-foreground/10 p-4">
            <button
              type="button"
              class="h-9 rounded-[0.39rem] border border-foreground/10 px-3 text-xs font-bold text-foreground/60"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black disabled:opacity-60"
              :disabled="isSaving"
              @click="saveProduct"
            >
              <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
              Save product
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>
