<script setup lang="ts">
import {
  ArrowRight,
  FileText,
  GitBranch,
  Instagram,
  MessageSquare,
  Settings2,
  Smartphone,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Business | ReplySuite" });

const hasMounted = ref(false);
onMounted(() => {
  hasMounted.value = true;
});

const { businessFlows, isLoading } = useWorkspaceFlows();

const channelIcon = (channel: string) =>
  channel === "Instagram" ? Instagram : Smartphone;
const channelName = (channel: string) =>
  channel === "instagram" ? "Instagram" : "WhatsApp";
const availableChannelTypes = (flow: any) =>
  Array.isArray(flow.channelTypes) && flow.channelTypes.length
    ? flow.channelTypes
    : ["whatsapp"];

const flowRoute = (flow: any, channel?: string) => {
  const selectedChannel = channel || availableChannelTypes(flow)[0];
  const routeId = flow.routeIdsByChannel?.[selectedChannel] || flow.routeId;
  const flowId = flow.flowIdsByChannel?.[selectedChannel];
  return {
    path: `/dashboard/flows/${routeId}`,
    query: {
      channel: selectedChannel,
      ...(selectedChannel === "instagram" && flowId ? { flow: flowId } : {}),
    },
  };
};

const manageRoute = (flow: any) =>
  `/dashboard/business/selling?assistant=${flow.id}`;
</script>

<template>
  <div v-if="hasMounted" class="mx-auto max-w-7xl space-y-5 pb-20 pt-3">
    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p class="dashboard-eyebrow text-primary/80">
            Business command center
          </p>
          <h1 class="dashboard-section-title mt-2">Selling flows</h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/65">
            Business shows assistants connected to selling paths across
            Instagram, WhatsApp, MTN/Airtel mobile payment, and product
            delivery.
          </p>
        </div>
        <NuxtLink
          to="/dashboard/business/selling"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
        >
          <GitBranch class="h-3.5 w-3.5" />
          Manage selling setup
        </NuxtLink>
      </div>
    </section>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div
        class="flex flex-col gap-2 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-sm font-bold text-foreground">
            Active business flows
          </h2>
          <p class="mt-1 text-xs text-foreground/45">
            Flows appear here only when product delivery and the MTN/Airtel
            mobile payment tool are both active.
          </p>
        </div>
        <span class="text-xs font-bold text-foreground/45">
          {{ businessFlows.length }} flow{{
            businessFlows.length === 1 ? "" : "s"
          }}
        </span>
      </div>

      <div v-if="isLoading" class="space-y-2 p-4">
        <Skeleton v-for="row in 4" :key="row" height="4rem" radius="0.39rem" />
      </div>

      <div v-else-if="businessFlows.length" class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-left">
          <thead class="border-b border-foreground/10 bg-foreground/[0.025]">
            <tr>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Flow
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Channels
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Payment
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Delivery
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Status
              </th>
              <th
                class="px-4 py-2.5 text-right text-[11px] font-bold text-foreground/45"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/10">
            <tr
              v-for="flow in businessFlows"
              :key="flow.id"
              class="transition hover:bg-primary/[0.035]"
            >
              <td class="px-4 py-3 align-middle">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                  >
                    <FileText class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p
                      class="max-w-[16rem] truncate text-xs font-bold text-foreground"
                    >
                      {{ flow.title }}
                    </p>
                    <p
                      class="mt-0.5 max-w-[16rem] truncate text-[11px] font-semibold text-foreground/45"
                    >
                      {{ flow.description || "Selling assistant" }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 align-middle">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="channel in flow.channels"
                    :key="channel"
                    class="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/55"
                  >
                    <component :is="channelIcon(channel)" class="h-3 w-3" />
                    {{ channel }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 align-middle">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    flow.paymentEnabled
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-amber-400/10 text-amber-400',
                  ]"
                >
                  {{
                    flow.paymentEnabled
                      ? "MTN/Airtel active"
                      : "Needs payment tool"
                  }}
                </span>
              </td>
              <td class="px-4 py-3 align-middle">
                <span
                  class="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400"
                >
                  {{
                    flow.productDelivery
                      ? "Product delivery active"
                      : "Needs product delivery"
                  }}
                </span>
              </td>
              <td class="px-4 py-3 align-middle">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    flow.active
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-foreground/5 text-foreground/45',
                  ]"
                >
                  {{ flow.active ? "Active" : "Paused" }}
                </span>
              </td>
              <td class="px-4 py-3 text-right align-middle">
                <div class="flex justify-end gap-2">
                  <NuxtLink
                    :to="manageRoute(flow)"
                    class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:border-primary/20 hover:text-primary"
                  >
                    <Settings2 class="h-3.5 w-3.5" />
                    Manage
                  </NuxtLink>
                  <NuxtLink
                    v-for="channel in availableChannelTypes(flow)"
                    :key="channel"
                    :to="flowRoute(flow, channel)"
                    class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 text-[11px] font-bold text-primary transition hover:bg-primary/15"
                  >
                    {{
                      availableChannelTypes(flow).length > 1
                        ? `Open ${channelName(channel)}`
                        : "Open flow"
                    }}
                    <ArrowRight class="h-3.5 w-3.5" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="p-8 text-center">
        <MessageSquare class="mx-auto h-8 w-8 text-foreground/25" />
        <p class="mt-3 text-sm font-bold text-foreground">
          No business selling flows yet
        </p>
        <p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">
          Connect an assistant to Instagram or WhatsApp, activate product
          delivery, and enable the MTN/Airtel mobile payment tool. Only flows
          with both activated appear here.
        </p>
      </div>
    </section>
  </div>
</template>
