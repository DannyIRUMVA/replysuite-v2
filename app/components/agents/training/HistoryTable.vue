<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Globe,
  History,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  Type,
} from "lucide-vue-next";

const props = defineProps<{
  jobs: any[];
  sources: any[];
  isPremium: boolean;
  rerunningJobId?: string | null;
}>();

const emit = defineEmits<{
  (e: "view-extraction", job: any): void;
  (e: "delete-source", id: string): void;
  (e: "rerun-job", job: any): void;
}>();

const searchQuery = ref("");
const statusFilter = ref<
  | "all"
  | "finished"
  | "failed"
  | "queued"
  | "processing"
  | "retry_wait"
  | "stalled"
>("all");
const typeFilter = ref<"all" | "url" | "file" | "text">("all");
const currentPage = ref(1);
const itemsPerPage = ref(5);
const itemsPerPageOptions = [5, 10, 20];

const getJobSource = (job: any) => {
  return props.sources.find(
    (s) =>
      s.id === job.data_source_id ||
      (s.metadata?.url && s.metadata.url === job.meta?.url) ||
      (s.metadata?.filename && s.metadata.filename === job.meta?.filename) ||
      (s.type === "text" && s.metadata?.title === job.meta?.title),
  );
};

const getJobType = (job: any) => job.meta?.type || job.job_type || "batch";
const getJobTitle = (job: any) =>
  job.meta?.title || job.meta?.filename || job.meta?.url || "Batch processing";
const getJobSubline = (job: any) =>
  job.progress_label || job.meta?.url || job.meta?.filename || "Manual entry";
const getJobProgress = (job: any) => {
  const value = Math.max(0, Math.min(100, Number(job?.progress || 0)));
  if (value > 0) return value;
  if (["queued", "processing", "retry_wait"].includes(job?.status)) return 5;
  return 0;
};

const getJobTimestamp = (job: any) =>
  job.started_at || job.created_at || job.finished_at || null;
const getJobDateLabel = (job: any) => {
  const value = getJobTimestamp(job);
  if (!value) return "Not started";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not started";
  return date.toLocaleDateString();
};

const isStaleProcessing = (job: any) => {
  if (job?.status !== "processing") return false;
  const heartbeat =
    job?.meta?.worker?.lastHeartbeatAt || job?.started_at || job?.created_at;
  if (!heartbeat) return true;
  const ageMs = Date.now() - Date.parse(heartbeat);
  return Number.isFinite(ageMs) && ageMs > 15 * 60 * 1000;
};

const getDisplayStatus = (job: any) =>
  isStaleProcessing(job) ? "stalled" : job?.status;
const getStatusLabel = (job: any) => {
  const status = getDisplayStatus(job);
  if (status === "retry_wait") return "retry wait";
  return status || "pending";
};

const getStatusClass = (status: string) => {
  if (status === "finished") return "bg-emerald-400/10 text-emerald-400";
  if (status === "failed") return "bg-red-400/10 text-red-400";
  if (status === "stalled" || status === "retry_wait")
    return "bg-amber-400/10 text-amber-400";
  return "bg-primary/10 text-primary";
};

const getIconClass = (type: string) => {
  if (type === "url") return "bg-sky-400/10 text-sky-400 ring-sky-400/15";
  if (type === "file")
    return "bg-amber-400/10 text-amber-400 ring-amber-400/15";
  if (type === "text")
    return "bg-violet-400/10 text-violet-400 ring-violet-400/15";
  return "bg-foreground/5 text-foreground/45 ring-foreground/10";
};

const getProgressHint = (job: any) => {
  if (isStaleProcessing(job)) return "Needs resume or rerun";
  if (job?.status === "retry_wait") return getRetryHint(job);
  const checkpoint = job?.meta?.worker;
  if (
    job?.status === "processing" &&
    checkpoint?.totalChunks &&
    checkpoint?.nextChunkIndex >= checkpoint?.totalChunks
  ) {
    return "Finalizing training";
  }
  return getJobSubline(job);
};

const getRetryHint = (job: any) => {
  const nextRunAfter = job?.meta?.worker?.nextRunAfter;
  if (!nextRunAfter) return getJobSubline(job);

  const retryDate = new Date(nextRunAfter);
  if (Number.isNaN(retryDate.getTime())) return getJobSubline(job);

  return `Retry scheduled ${retryDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const filteredJobs = computed(() => {
  return props.jobs.filter((job) => {
    const title = (
      job.meta?.title ||
      job.meta?.filename ||
      job.meta?.url ||
      ""
    ).toLowerCase();
    const matchesSearch = title.includes(searchQuery.value.toLowerCase());
    const matchesStatus =
      statusFilter.value === "all" ||
      getDisplayStatus(job) === statusFilter.value;
    const matchesType =
      typeFilter.value === "all" || job.meta?.type === typeFilter.value;
    return matchesSearch && matchesStatus && matchesType;
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredJobs.value.length / itemsPerPage.value)),
);

const paginatedJobs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredJobs.value.slice(start, start + itemsPerPage.value);
});

const paginationStart = computed(() =>
  filteredJobs.value.length
    ? (currentPage.value - 1) * itemsPerPage.value + 1
    : 0,
);
const paginationEnd = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, filteredJobs.value.length),
);
const hasActiveJobs = computed(() =>
  props.jobs.some((job) =>
    ["queued", "processing", "retry_wait"].includes(job.status),
  ),
);
const hasStalledJobs = computed(() =>
  props.jobs.some((job) => getDisplayStatus(job) === "stalled"),
);

watch([searchQuery, statusFilter, typeFilter, itemsPerPage], () => {
  currentPage.value = 1;
});
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages;
});
</script>

<template>
  <section
    class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
  >
    <div
      class="flex flex-col gap-3 border-b border-foreground/10 p-3 xl:flex-row xl:items-center xl:justify-between"
    >
      <div class="min-w-0">
        <p class="dashboard-eyebrow text-primary/80">Training registry</p>
        <h2 class="mt-1 text-sm font-bold text-foreground">
          Knowledge sessions
        </h2>
        <p class="mt-0.5 text-xs font-semibold text-foreground/45">
          Review source status, extraction results, and retry stalled jobs.
        </p>
      </div>
      <div class="flex flex-col gap-2 md:flex-row md:items-center">
        <div class="relative md:w-64">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30"
          />
          <input
            v-model="searchQuery"
            placeholder="Search context"
            class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-8 text-xs font-semibold outline-none transition placeholder:text-foreground/30 focus:border-primary/35"
          />
        </div>
        <div class="grid grid-cols-3 gap-2 md:flex">
          <select
            v-model="statusFilter"
            class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground/55 outline-none focus:border-primary/35"
          >
            <option value="all">All status</option>
            <option value="finished">Finished</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="retry_wait">Retry wait</option>
            <option value="stalled">Stalled</option>
          </select>
          <select
            v-model="typeFilter"
            class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground/55 outline-none focus:border-primary/35"
          >
            <option value="all">All types</option>
            <option value="url">Website</option>
            <option value="file">Document</option>
            <option value="text">Text</option>
          </select>
          <select
            v-model.number="itemsPerPage"
            class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground/55 outline-none focus:border-primary/35"
          >
            <option
              v-for="option in itemsPerPageOptions"
              :key="option"
              :value="option"
            >
              {{ option }} / page
            </option>
          </select>
        </div>
      </div>
    </div>

    <div
      v-if="hasActiveJobs"
      class="border-b border-foreground/10 px-3 py-2 text-[11px] font-bold"
      :class="
        hasStalledJobs
          ? 'bg-amber-400/[0.06] text-amber-400'
          : 'bg-primary/[0.06] text-primary'
      "
    >
      {{
        hasStalledJobs
          ? "Some training sessions may need resume or rerun."
          : "Live training progress and retry updates are active."
      }}
    </div>

    <div
      v-if="filteredJobs.length === 0"
      class="flex flex-col items-center justify-center p-10 text-center"
    >
      <div
        class="flex h-12 w-12 items-center justify-center rounded-[0.39rem] bg-foreground/5 text-foreground/30 ring-1 ring-foreground/10"
      >
        <History class="h-6 w-6" />
      </div>
      <p class="mt-3 text-xs font-bold text-foreground">No matching sessions</p>
      <p class="mt-1 text-xs font-semibold text-foreground/45">
        Try adjusting the search or filters.
      </p>
    </div>

    <div v-else>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px] text-left">
          <thead class="bg-foreground/[0.025]">
            <tr>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">
                Source
              </th>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">
                Type
              </th>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">
                Status
              </th>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">
                Started
              </th>
              <th
                class="px-3 py-2.5 text-right text-[11px] font-bold text-foreground/45"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/10">
            <tr
              v-for="job in paginatedJobs"
              :key="job.id"
              class="transition hover:bg-primary/[0.035]"
            >
              <td class="px-3 py-3 align-middle">
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    :class="[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] ring-1',
                      getIconClass(job.meta?.type),
                    ]"
                  >
                    <Globe v-if="job.meta?.type === 'url'" class="h-4 w-4" />
                    <FileText
                      v-else-if="job.meta?.type === 'file'"
                      class="h-4 w-4"
                    />
                    <Type v-else class="h-4 w-4" />
                  </div>
                  <div class="min-w-0">
                    <p
                      class="max-w-[22rem] truncate text-xs font-bold text-foreground"
                    >
                      {{ getJobTitle(job) }}
                    </p>
                    <p
                      class="mt-0.5 max-w-[22rem] truncate text-[11px] font-semibold text-foreground/45"
                    >
                      {{ getProgressHint(job) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 align-middle">
                <span
                  class="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/45"
                >
                  {{ getJobType(job) }}
                </span>
              </td>
              <td class="px-3 py-3 align-middle">
                <div class="min-w-[11rem] space-y-1.5">
                  <div class="flex items-center gap-2">
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                        getStatusClass(getDisplayStatus(job)),
                      ]"
                    >
                      {{ getStatusLabel(job) }}
                    </span>
                    <span
                      v-if="
                        job.status === 'processing' && !isStaleProcessing(job)
                      "
                      class="text-[10px] font-bold text-primary"
                    >
                      {{ getJobProgress(job) }}%
                    </span>
                  </div>
                  <div
                    v-if="
                      ['processing', 'queued', 'retry_wait'].includes(
                        job.status,
                      ) || isStaleProcessing(job)
                    "
                    class="h-1.5 overflow-hidden rounded-full bg-foreground/5"
                  >
                    <div
                      :class="[
                        'h-full rounded-full transition-all duration-500',
                        ['retry_wait', 'stalled'].includes(
                          getDisplayStatus(job),
                        )
                          ? 'bg-amber-400'
                          : 'bg-primary',
                      ]"
                      :style="{ width: `${getJobProgress(job)}%` }"
                    />
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 align-middle">
                <div
                  class="flex items-center gap-2 text-[11px] font-bold text-foreground/45"
                >
                  <Clock class="h-3.5 w-3.5" />
                  {{ getJobDateLabel(job) }}
                </div>
              </td>
              <td class="px-3 py-3 text-right align-middle">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="job.status === 'failed' || isStaleProcessing(job)"
                    type="button"
                    :disabled="props.rerunningJobId === job.id"
                    class="inline-flex h-8 items-center gap-1.5 rounded-[0.39rem] border border-amber-400/20 bg-amber-400/10 px-2 text-[11px] font-bold text-amber-400 transition hover:bg-amber-400/15 disabled:cursor-wait disabled:opacity-60"
                    @click="emit('rerun-job', job)"
                  >
                    <Loader2
                      v-if="props.rerunningJobId === job.id"
                      class="h-3.5 w-3.5 animate-spin"
                    />
                    <RotateCcw v-else class="h-3.5 w-3.5" />
                    {{ isStaleProcessing(job) ? "Resume" : "Rerun" }}
                  </button>

                  <button
                    v-if="job.status === 'finished' || job.status === 'failed'"
                    type="button"
                    :class="[
                      'inline-flex h-8 items-center gap-1.5 rounded-[0.39rem] border px-2 text-[11px] font-bold transition',
                      !isPremium
                        ? 'cursor-not-allowed border-foreground/10 bg-foreground/5 text-foreground/25'
                        : job.status === 'failed'
                          ? 'border-red-400/20 bg-red-400/10 text-red-400 hover:bg-red-400/15'
                          : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15',
                    ]"
                    @click="isPremium ? emit('view-extraction', job) : null"
                  >
                    <component
                      :is="isPremium ? Eye : Lock"
                      class="h-3.5 w-3.5"
                    />
                    {{ job.status === "failed" ? "Error" : "Inspect" }}
                  </button>

                  <button
                    v-if="job.status === 'finished' && getJobSource(job)"
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background text-foreground/40 transition hover:border-red-400/25 hover:text-red-400"
                    aria-label="Delete source"
                    @click="emit('delete-source', getJobSource(job).id)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>

                  <CheckCircle2
                    v-if="job.status === 'finished'"
                    class="h-4 w-4 text-emerald-400"
                  />
                  <AlertTriangle
                    v-else-if="job.status === 'failed'"
                    class="h-4 w-4 text-red-400"
                  />
                  <Clock
                    v-else-if="
                      ['retry_wait', 'stalled'].includes(getDisplayStatus(job))
                    "
                    class="h-4 w-4 text-amber-400"
                  />
                  <Loader2 v-else class="h-4 w-4 animate-spin text-primary" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="flex flex-col gap-3 border-t border-foreground/10 p-3 md:flex-row md:items-center md:justify-between"
      >
        <p class="text-[11px] font-bold text-foreground/45">
          Showing {{ paginationStart }}-{{ paginationEnd }} of
          {{ filteredJobs.length }}
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="currentPage <= 1"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background text-foreground/50 transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
            @click="currentPage = Math.max(1, currentPage - 1)"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
          </button>
          <span
            class="rounded-[0.39rem] bg-foreground/[0.04] px-3 py-2 text-[11px] font-bold text-foreground/50"
          >
            Page {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            type="button"
            :disabled="currentPage >= totalPages"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background text-foreground/50 transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
          >
            <ArrowLeft class="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
