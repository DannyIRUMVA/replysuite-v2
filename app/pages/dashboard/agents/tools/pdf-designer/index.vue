<script setup lang="ts">
import {
  ArrowLeft,
  Download,
  FileText,
  Palette,
  Sparkles,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "PDF Designer | ReplySuite" });

const title = ref("Service proposal");
const subtitle = ref("A polished one-page document for customers");
const businessName = ref("ReplySuite Studio");
const accent = ref("emerald");
const sections = ref(
  "Overview\nDescribe the offer, service, or project in clear customer language.\n\nWhat is included\nList the main deliverables, timeline, and next step.\n\nNext step\nInvite the customer to confirm, book, or reply with questions.",
);

const accentClass = computed(
  () =>
    ({
      emerald:
        "from-emerald-400/20 via-primary/10 to-sky-400/10 text-emerald-300 ring-emerald-400/20",
      sky: "from-sky-400/20 via-primary/10 to-violet-400/10 text-sky-300 ring-sky-400/20",
      violet:
        "from-violet-400/20 via-primary/10 to-pink-400/10 text-violet-300 ring-violet-400/20",
      amber:
        "from-amber-400/20 via-primary/10 to-orange-400/10 text-amber-300 ring-amber-400/20",
    })[accent.value] ||
    "from-emerald-400/20 via-primary/10 to-sky-400/10 text-emerald-300 ring-emerald-400/20",
);

const parsedSections = computed(() =>
  sections.value
    .split(/\n\s*\n/g)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return {
        heading: lines[0] || "Section",
        body: lines.slice(1).join(" ") || "Add section content.",
      };
    })
    .filter((section) => section.heading || section.body),
);

const printPdf = () => {
  if (import.meta.client) window.print();
};
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4 pb-24 pt-5 lg:pb-12 lg:pt-6">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <NuxtLink
          to="/dashboard/agents/tools"
          class="inline-flex items-center gap-2 text-xs font-bold text-foreground/45 transition hover:text-primary"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          Tools
        </NuxtLink>
        <h1 class="mt-2 text-xl font-bold text-foreground">PDF designer</h1>
        <p class="mt-1 max-w-2xl text-sm font-medium text-foreground/50">
          Create a clean, designed customer PDF. Use your browser print dialog
          to save it as PDF.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:bg-primary-accent"
        @click="printPdf"
      >
        <Download class="h-4 w-4" />
        Save as PDF
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
      >
        <div class="mb-4 flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
          >
            <Palette class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground">Document setup</p>
            <p class="text-xs font-medium text-foreground/45">
              Write once, preview instantly.
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <label class="block">
            <span class="text-xs font-bold text-foreground/55"
              >Business name</span
            >
            <input
              v-model="businessName"
              class="mt-1 h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-sm font-semibold outline-none focus:border-primary/40"
            />
          </label>
          <label class="block">
            <span class="text-xs font-bold text-foreground/55">Title</span>
            <input
              v-model="title"
              class="mt-1 h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-sm font-semibold outline-none focus:border-primary/40"
            />
          </label>
          <label class="block">
            <span class="text-xs font-bold text-foreground/55">Subtitle</span>
            <input
              v-model="subtitle"
              class="mt-1 h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-sm font-semibold outline-none focus:border-primary/40"
            />
          </label>
          <label class="block">
            <span class="text-xs font-bold text-foreground/55">Accent</span>
            <select
              v-model="accent"
              class="mt-1 h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-sm font-semibold outline-none focus:border-primary/40"
            >
              <option value="emerald">Emerald command</option>
              <option value="sky">Sky clean</option>
              <option value="violet">Violet premium</option>
              <option value="amber">Amber offer</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold text-foreground/55">Sections</span>
            <textarea
              v-model="sections"
              rows="12"
              class="mt-1 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-3 text-sm font-medium leading-relaxed outline-none focus:border-primary/40"
              placeholder="Heading\nBody text..."
            />
          </label>
        </div>
      </section>

      <section
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
      >
        <div
          id="pdf-preview"
          class="mx-auto max-w-[820px] overflow-hidden rounded-[0.39rem] bg-white text-slate-950 shadow-sm ring-1 ring-black/10 print:shadow-none print:ring-0"
        >
          <div :class="['bg-gradient-to-br p-8 ring-1', accentClass]">
            <div class="flex items-start justify-between gap-6">
              <div>
                <p
                  class="text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                >
                  {{ businessName }}
                </p>
                <h2
                  class="mt-6 max-w-xl text-4xl font-black leading-none tracking-tight text-slate-950"
                >
                  {{ title }}
                </h2>
                <p
                  class="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-slate-600"
                >
                  {{ subtitle }}
                </p>
              </div>
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-sm ring-1 ring-black/10"
              >
                <FileText class="h-7 w-7" />
              </div>
            </div>
          </div>

          <div class="space-y-5 p-8">
            <article
              v-for="(section, index) in parsedSections"
              :key="`${section.heading}-${index}`"
              class="grid gap-4 border-b border-slate-200 pb-5 last:border-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)]"
            >
              <div
                class="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400"
              >
                <Sparkles class="h-3.5 w-3.5" />
                {{ String(index + 1).padStart(2, "0") }}
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-950">
                  {{ section.heading }}
                </h3>
                <p class="mt-2 text-sm font-medium leading-7 text-slate-600">
                  {{ section.body }}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@media print {
  :global(body *) {
    visibility: hidden;
  }

  #pdf-preview,
  #pdf-preview * {
    visibility: visible;
  }

  #pdf-preview {
    position: absolute;
    inset: 0;
    width: 100%;
    max-width: none;
    border-radius: 0;
  }
}
</style>
