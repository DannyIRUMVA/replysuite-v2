<script setup lang="ts">
import { Bot, Database, MessageSquare, Plus, Sparkles } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "train-assistant"): void;
  (e: "test-assistant"): void;
}>();

const props = defineProps<{
  chatbot: any;
  monthlyUsage: number;
  totalTrainings: number;
  planSlug: string;
  sourcesCount: number;
  limits: {
    maxEmbeddingMb: number;
    maxTrainingUnits: number;
    maxTrainings: number;
    maxReplies: number;
  };
}>();

const intelligenceScore = computed(() => {
  const count = props.chatbot?.embeddings_count || 0;
  if (count === 0) return 0;
  return Math.min(100, Math.floor(Math.sqrt(count / 200) * 100));
});

const intelligenceLabel = computed(() => {
  const score = intelligenceScore.value;
  if (score === 0) return "Needs training";
  if (score < 25) return "Learning";
  if (score < 50) return "Capable";
  if (score < 75) return "Ready";
  return "Strong";
});

const repliesLimitLabel = computed(() =>
  props.limits.maxReplies === -1 ? "∞" : props.limits.maxReplies,
);
const replyUsagePercent = computed(() =>
  props.limits.maxReplies === -1
    ? 0
    : Math.min(
        100,
        (props.monthlyUsage / (props.limits.maxReplies || 1)) * 100,
      ),
);
const storagePercent = computed(() => {
  const used = Number(props.chatbot?.current_embedding_mb || 0);
  const limit = Number(props.limits.maxEmbeddingMb || 1);
  return Math.min(100, (used / limit) * 100);
});

const metricRows = computed(() => [
  {
    label: "Knowledge",
    value: `${intelligenceScore.value}%`,
    detail: intelligenceLabel.value,
    icon: Sparkles,
    tone: "primary",
  },
  {
    label: "Sources",
    value: props.sourcesCount,
    detail: `${props.totalTrainings} sessions`,
    icon: Database,
    tone: "sky",
  },
  {
    label: "Replies",
    value: props.monthlyUsage,
    detail: `limit ${repliesLimitLabel.value}`,
    icon: MessageSquare,
    tone: "emerald",
  },
]);

const metricClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary ring-primary/15",
    sky: "bg-sky-400/10 text-sky-400 ring-sky-400/15",
    emerald: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/15",
  })[tone] || "bg-foreground/5 text-foreground/50 ring-foreground/10";
</script>

<template>
  <section
    class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
  >
    <div
      class="grid gap-0 divide-y divide-foreground/10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:divide-x lg:divide-y-0"
    >
      <div class="p-3 sm:p-4">
        <div
          class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-violet-400/10 text-violet-400 ring-1 ring-violet-400/15"
            >
              <Bot class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-foreground">
                {{ chatbot?.name || "Assistant" }}
              </p>
              <p
                class="mt-0.5 truncate text-[11px] font-semibold text-foreground/45"
              >
                {{ chatbot?.default_language || "English" }} ·
                {{ planSlug || "current" }} plan
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-[11px] font-bold text-foreground/60 transition hover:border-primary/25 hover:text-primary"
              @click="emit('test-assistant')"
            >
              <Sparkles class="h-3.5 w-3.5" />
              Test
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-[11px] font-bold text-black transition hover:bg-primary-accent"
              @click="emit('train-assistant')"
            >
              <Plus class="h-3.5 w-3.5" />
              Add training
            </button>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-3">
          <div
            v-for="metric in metricRows"
            :key="metric.label"
            class="flex items-center gap-2 rounded-[0.39rem] bg-background/45 p-2 ring-1 ring-foreground/[0.06]"
          >
            <div
              :class="[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] ring-1',
                metricClass(metric.tone),
              ]"
            >
              <component :is="metric.icon" class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <p class="text-base font-bold leading-none text-foreground">
                {{ metric.value }}
              </p>
              <p
                class="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/35"
              >
                {{ metric.label }} · {{ metric.detail }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3 p-3 sm:p-4">
        <div>
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-bold text-foreground/45">Reply usage</p>
            <p class="text-[11px] font-bold text-foreground/50">
              {{ monthlyUsage }} / {{ repliesLimitLabel }}
            </p>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/5">
            <div
              class="h-full rounded-full bg-primary transition-all duration-700"
              :style="{ width: `${replyUsagePercent}%` }"
            />
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-bold text-foreground/45">
              Knowledge storage
            </p>
            <p class="text-[11px] font-bold text-foreground/50">
              {{ Number(chatbot?.current_embedding_mb || 0).toFixed(1) }} MB
            </p>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/5">
            <div
              class="h-full rounded-full bg-sky-400 transition-all duration-700"
              :style="{ width: `${storagePercent}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
