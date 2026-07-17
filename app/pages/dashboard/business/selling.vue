<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  Settings2,
  ShoppingBag,
} from "lucide-vue-next";
import BusinessProductManager from "~~/app/components/business/BusinessProductManager.vue";

interface BusinessAssistant {
  id: string;
  name: string | null;
  enabled_tools?: string[] | null;
  tools_config?: Record<string, any> | null;
}

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Business setup | ReplySuite" });

const route = useRoute();
const supabase = useSupabaseClient();
const notify = useNotify();
const { userId } = useAuth();

const assistants = ref<BusinessAssistant[]>([]);
const selectedAssistantId = ref("");
const productCount = ref(0);
const isLoading = ref(true);
const isSaving = ref(false);
const paymentToolEnabled = ref(false);
const productDeliveryEnabled = ref(false);
const businessName = ref("");
const businessDescription = ref("");

const selectedAssistant = computed(
  () =>
    assistants.value.find(
      (assistant) => assistant.id === selectedAssistantId.value,
    ) || null,
);

const setupReady = computed(
  () => paymentToolEnabled.value && productDeliveryEnabled.value,
);

const normalizeTools = (value: unknown) =>
  Array.isArray(value) ? value.filter(Boolean).map((item) => String(item)) : [];

const syncSelectedAssistantState = async () => {
  const assistant = selectedAssistant.value;
  if (!assistant) return;
  const tools = normalizeTools(assistant.enabled_tools);
  const config = assistant.tools_config || {};
  businessName.value = config.business_flow?.name || assistant.name || "";
  businessDescription.value = config.business_flow?.description || "";
  paymentToolEnabled.value = Boolean(
    tools.includes("payments") ||
    config.website_payment?.enabled ||
    config.business_flow?.payment_required,
  );
  productDeliveryEnabled.value = Boolean(
    config.business_flow?.product_delivery_enabled ||
    config.orders?.enabled ||
    config.orders?.delivery_enabled ||
    config.products?.enabled ||
    config.product_delivery?.enabled,
  );
  await fetchProductCount();
  if (productCount.value > 0) productDeliveryEnabled.value = true;
};

const fetchProductCount = async () => {
  if (!selectedAssistantId.value) {
    productCount.value = 0;
    return;
  }
  const { count, error } = await supabase
    .from("business_products")
    .select("id", { count: "exact", head: true })
    .eq("chatbot_id", selectedAssistantId.value)
    .eq("is_active", true);
  if (error) {
    console.warn("Could not count business products:", error);
    productCount.value = 0;
    return;
  }
  productCount.value = count || 0;
};

const fetchAssistants = async () => {
  if (!userId.value) return;
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select("id, name, enabled_tools, tools_config, created_at")
      .eq("user_id", userId.value)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    assistants.value = data || [];

    const requestedAssistant =
      typeof route.query.assistant === "string" ? route.query.assistant : "";
    selectedAssistantId.value = assistants.value.some(
      (assistant) => assistant.id === requestedAssistant,
    )
      ? requestedAssistant
      : assistants.value[0]?.id || "";

    await syncSelectedAssistantState();
  } catch (err: any) {
    console.error("Failed to load business setup:", err);
    notify.error(err?.message || "Unable to load business setup.");
  } finally {
    isLoading.value = false;
  }
};

const saveBusinessSetup = async () => {
  const assistant = selectedAssistant.value;
  if (!assistant || isSaving.value) return;
  isSaving.value = true;
  try {
    const tools = new Set(normalizeTools(assistant.enabled_tools));
    if (paymentToolEnabled.value) tools.add("payments");
    else tools.delete("payments");
    if (productDeliveryEnabled.value) {
      tools.add("products");
      tools.add("product_delivery");
    } else {
      tools.delete("products");
      tools.delete("product_delivery");
    }

    const previousConfig = assistant.tools_config || {};
    const nextConfig = {
      ...previousConfig,
      business_flow: {
        ...(previousConfig.business_flow || {}),
        name: businessName.value.trim() || assistant.name || "Business",
        description: businessDescription.value.trim(),
        product_delivery_enabled: productDeliveryEnabled.value,
        payment_required: paymentToolEnabled.value,
        payment_tool: "replysuite_mobile_payment_worker",
        updated_at: new Date().toISOString(),
      },
      website_payment: {
        ...(previousConfig.website_payment || {}),
        enabled: paymentToolEnabled.value,
        provider: "replysuite_mobile_payment_worker",
        shared_with: ["business", "school", "website_builder"],
        updated_at: new Date().toISOString(),
      },
      orders: {
        ...(previousConfig.orders || {}),
        enabled: productDeliveryEnabled.value,
        order_type: "digital",
        payment_required: paymentToolEnabled.value,
      },
      products: {
        ...(previousConfig.products || {}),
        enabled: productDeliveryEnabled.value,
        delivery_enabled: productDeliveryEnabled.value,
      },
      product_delivery: {
        ...(previousConfig.product_delivery || {}),
        enabled: productDeliveryEnabled.value,
      },
    };

    const nextTools = Array.from(tools);
    const { error } = await supabase
      .from("chatbots")
      .update({ enabled_tools: nextTools, tools_config: nextConfig })
      .eq("id", assistant.id)
      .eq("user_id", userId.value);
    if (error) throw error;

    assistants.value = assistants.value.map((item) =>
      item.id === assistant.id
        ? { ...item, enabled_tools: nextTools, tools_config: nextConfig }
        : item,
    );
    notify.success("Business flow setup saved.");
  } catch (err: any) {
    console.error("Failed to save business setup:", err);
    notify.error(err?.message || "Unable to save business setup.");
  } finally {
    isSaving.value = false;
  }
};

watch(selectedAssistantId, () => {
  void syncSelectedAssistantState();
});
watch(userId, () => {
  void fetchAssistants();
});
onMounted(fetchAssistants);
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-5 pb-20 pt-3">
    <NuxtLink
      to="/dashboard/business"
      class="dashboard-action-label inline-flex items-center gap-1.5 text-foreground/45 transition hover:text-primary"
    >
      <ArrowLeft class="h-3.5 w-3.5" />
      Back to business
    </NuxtLink>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p class="dashboard-eyebrow text-primary/80">Business setup</p>
          <h1 class="dashboard-section-title mt-2">
            Selling flow configuration
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/65">
            Configure the dashboard-level business flow for one assistant. It
            appears in Business only when product delivery and MTN/Airtel mobile
            payment are both active.
          </p>
        </div>
        <span
          :class="[
            'inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-bold',
            setupReady
              ? 'bg-emerald-400/10 text-emerald-400'
              : 'bg-amber-400/10 text-amber-400',
          ]"
        >
          <CheckCircle2 v-if="setupReady" class="h-3.5 w-3.5" />
          <Settings2 v-else class="h-3.5 w-3.5" />
          {{ setupReady ? "Ready for Business" : "Setup incomplete" }}
        </span>
      </div>
    </section>

    <div v-if="isLoading" class="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <div
        class="h-64 animate-pulse rounded-[0.39rem] border border-foreground/10 bg-background-card/45"
      />
      <div
        class="h-64 animate-pulse rounded-[0.39rem] border border-foreground/10 bg-background-card/45"
      />
    </div>

    <div
      v-else-if="!assistants.length"
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-8 text-center shadow-sm shadow-black/5"
    >
      <ShoppingBag class="mx-auto h-8 w-8 text-foreground/25" />
      <p class="mt-3 text-sm font-bold text-foreground">No assistants found</p>
      <p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">
        Create an assistant first, then return here to configure product
        delivery and MTN/Airtel mobile payment for the Business flow.
      </p>
      <NuxtLink
        to="/dashboard/agents"
        class="mt-4 inline-flex h-9 items-center justify-center rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
      >
        Open assistants
      </NuxtLink>
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <aside class="space-y-4">
        <section
          class="space-y-4 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <label class="block space-y-2">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
            >
              Assistant
            </span>
            <select
              v-model="selectedAssistantId"
              class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground outline-none transition focus:border-primary/40"
            >
              <option
                v-for="assistant in assistants"
                :key="assistant.id"
                :value="assistant.id"
              >
                {{ assistant.name || "Untitled assistant" }}
              </option>
            </select>
          </label>

          <label class="block space-y-2">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
            >
              Business name
            </span>
            <input
              v-model="businessName"
              class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground outline-none transition placeholder:text-foreground/30 focus:border-primary/40"
              placeholder="e.g. BOYG Digital Products"
            />
          </label>

          <label class="block space-y-2">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45"
            >
              Business description
            </span>
            <textarea
              v-model="businessDescription"
              rows="4"
              class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2 text-xs font-semibold leading-5 text-foreground outline-none transition placeholder:text-foreground/30 focus:border-primary/40"
              placeholder="What this business sells, who it helps, and the tone the assistant should use."
            />
          </label>
        </section>

        <section
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <div class="mb-4">
            <p class="text-sm font-bold text-foreground">
              Activation checklist
            </p>
            <p class="mt-1 text-xs leading-5 text-foreground/45">
              Business only lists flows after both switches are active.
            </p>
          </div>

          <div class="space-y-3">
            <button
              type="button"
              class="flex w-full items-start justify-between gap-3 rounded-[0.39rem] border p-3 text-left transition"
              :class="
                productDeliveryEnabled
                  ? 'border-emerald-400/20 bg-emerald-400/5'
                  : 'border-foreground/10 bg-background/40 hover:border-primary/25'
              "
              @click="productDeliveryEnabled = !productDeliveryEnabled"
            >
              <span class="flex gap-3">
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.35rem] bg-sky-400/10 text-sky-400 ring-1 ring-sky-400/15"
                >
                  <PackageCheck class="h-4 w-4" />
                </span>
                <span>
                  <span class="block text-xs font-bold text-foreground"
                    >Product delivery</span
                  >
                  <span
                    class="mt-0.5 block text-[11px] leading-4 text-foreground/45"
                  >
                    {{ productCount }} protected Business product{{
                      productCount === 1 ? "" : "s"
                    }}
                  </span>
                </span>
              </span>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  productDeliveryEnabled
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-foreground/5 text-foreground/45',
                ]"
              >
                {{ productDeliveryEnabled ? "Active" : "Off" }}
              </span>
            </button>

            <button
              type="button"
              class="flex w-full items-start justify-between gap-3 rounded-[0.39rem] border p-3 text-left transition"
              :class="
                paymentToolEnabled
                  ? 'border-emerald-400/20 bg-emerald-400/5'
                  : 'border-foreground/10 bg-background/40 hover:border-primary/25'
              "
              @click="paymentToolEnabled = !paymentToolEnabled"
            >
              <span class="flex gap-3">
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                >
                  <CreditCard class="h-4 w-4" />
                </span>
                <span>
                  <span class="block text-xs font-bold text-foreground"
                    >MTN/Airtel mobile payment</span
                  >
                  <span
                    class="mt-0.5 block text-[11px] leading-4 text-foreground/45"
                  >
                    Uses the same ReplySuite mobile payment worker as the Rask
                    website builder, shared with Business and School flows.
                  </span>
                </span>
              </span>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  paymentToolEnabled
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-foreground/5 text-foreground/45',
                ]"
              >
                {{ paymentToolEnabled ? "Active" : "Off" }}
              </span>
            </button>
          </div>

          <button
            type="button"
            class="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSaving"
            @click="saveBusinessSetup"
          >
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            Save business setup
          </button>
        </section>

        <section
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <p class="text-sm font-bold text-foreground">Where this appears</p>
          <p class="mt-1 text-xs leading-5 text-foreground/45">
            After saving both active states, this assistant appears on
            <NuxtLink to="/dashboard/business" class="font-bold text-primary">
              Business
            </NuxtLink>
            and in the dashboard Flow canvas. The same MTN/Airtel mobile payment
            tool is shared by the platform, but Business setup does not write
            School tutor settings.
          </p>
        </section>
      </aside>

      <main class="space-y-5">
        <section
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <div
            class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p class="text-sm font-bold text-foreground">
                Protected Business products
              </p>
              <p class="mt-1 text-xs leading-5 text-foreground/45">
                Add private digital products that generate short /d delivery
                links after payment is confirmed.
              </p>
            </div>
            <span
              class="inline-flex rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400"
            >
              {{ productCount }} item{{ productCount === 1 ? "" : "s" }}
            </span>
          </div>
          <BusinessProductManager
            v-if="selectedAssistantId"
            :key="selectedAssistantId"
            :chatbot-id="selectedAssistantId"
            @products-changed="
              (count) => {
                productCount = count;
                if (count > 0) productDeliveryEnabled = true;
              }
            "
          />
        </section>

        <section
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p
                class="text-[10px] font-black uppercase tracking-[0.18em] text-primary"
              >
                Shared payment tool
              </p>
              <h3 class="mt-1 text-sm font-bold text-foreground">
                ReplySuite MTN/Airtel mobile payment worker
              </h3>
              <p class="mt-1 text-xs leading-5 text-foreground/45">
                This is the same payment tool used by the Rask website builder.
                It is server-configured, so operators do not enter payment
                provider secrets here.
              </p>
            </div>
            <CreditCard class="h-5 w-5 shrink-0 text-primary/70" />
          </div>

          <div
            class="mt-4 rounded-[0.39rem] border border-emerald-400/15 bg-emerald-400/5 p-3"
          >
            <p class="text-xs font-bold text-emerald-400">
              {{
                paymentToolEnabled
                  ? "Enabled for this assistant"
                  : "Ready to enable"
              }}
            </p>
            <p class="mt-1 text-[11px] leading-5 text-foreground/45">
              When enabled, assistant tools use the shared worker for Business
              product/order payments. Payment prompts still require a verified
              amount and customer phone before the server sends a request.
            </p>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
