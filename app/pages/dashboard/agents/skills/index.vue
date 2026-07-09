<script setup lang="ts">
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  Globe2,
  Headphones,
  Instagram,
  Languages,
  Loader2,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Assistant Skills | ReplySuite" });

const route = useRoute();
const { userId } = useAuth();
const supabase = useSupabaseClient();
const notify = useNotify();

const isLoading = ref(true);
const isSaving = ref(false);
const assistants = ref<any[]>([]);
const selectedAssistantId = useState<string>(
  "dashboard-skills-selected-bot-id",
  () => "",
);
const skillsBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-skills-bot-options",
  () => [],
);
const assignedSkills = ref<string[]>([]);
const skillSearch = ref("");
const skillCategoryFilter = ref("all");
const skillStatusFilter = ref("all");
const skillChannelFilter = ref("all");
const selectedSkillId = ref("website_conversion_guide");
const skillPage = ref(1);
const skillPageSize = ref(5);

const skillGroups = [
  {
    title: "Website conversations",
    desc: "Shape website chat into confident answers and clean next steps.",
    icon: Globe2,
    skills: [
      {
        id: "website_conversion_guide",
        name: "Website Conversion Guide",
        desc: "Identify intent, answer from training, then guide to contact, booking, reservation, or handoff.",
        icon: Target,
        channels: ["Website"],
      },
      {
        id: "lead_qualification",
        name: "Lead Qualification",
        desc: "Ask one short question at a time about need, budget, timeline, and contact preference.",
        icon: Users,
        channels: ["Website", "WhatsApp"],
      },
      {
        id: "sales_advisor",
        name: "Sales Advisor",
        desc: "Recommend the right option without inventing prices, discounts, or policies.",
        icon: Sparkles,
        channels: ["Website", "Instagram"],
      },
      {
        id: "customer_memory_context",
        name: "Customer Memory Context",
        desc: "Use conversation history so customers do not repeat details.",
        icon: Database,
        channels: ["All"],
      },
    ],
  },
  {
    title: "Appointment and booking conversations",
    desc: "Collect scheduling details without promising unavailable times.",
    icon: Calendar,
    skills: [
      {
        id: "appointment_intake",
        name: "Appointment & Booking Intake",
        desc: "Collect service or reservation type, preferred time, name, phone, party size, and notes before handoff or confirmation.",
        icon: Calendar,
        channels: ["Website", "WhatsApp"],
      },
      {
        id: "whatsapp_service_closer",
        name: "WhatsApp Service Closer",
        desc: "Keep mobile replies short, confirm details clearly, and move toward one concrete next step.",
        icon: MessageCircle,
        channels: ["WhatsApp"],
      },
      {
        id: "checkout_guardrails",
        name: "Local Payment Guardrails",
        desc: "Only discuss MTN/Airtel mobile payment for existing appointment or booking payments verified by the server.",
        icon: CreditCard,
        channels: ["All"],
      },
      {
        id: "concise_follow_up",
        name: "Concise Follow-up",
        desc: "End with one useful next step instead of many questions.",
        icon: ArrowRight,
        channels: ["All"],
      },
    ],
  },
  {
    title: "Instagram comments and DMs",
    desc: "Reply publicly, trigger from keywords, and continue privately.",
    icon: Instagram,
    skills: [
      {
        id: "instagram_public_responder",
        name: "Instagram Public Responder",
        desc: "Reply to comments in one or two safe, friendly sentences.",
        icon: Instagram,
        channels: ["Comments"],
      },
      {
        id: "instagram_comment_to_dm",
        name: "Comment-to-DM Nurturer",
        desc: "Acknowledge the comment context and continue privately with one clear question.",
        icon: MessageSquare,
        channels: ["DM"],
      },
      {
        id: "keyword_trigger_router",
        name: "Keyword Trigger Router",
        desc: "Treat configured keywords as intent and route to the right offer, FAQ, booking, reservation, or DM.",
        icon: Zap,
        channels: ["Instagram", "WhatsApp"],
      },
    ],
  },
  {
    title: "Support, trust, and handoff",
    desc: "Protect the brand when conversations become sensitive.",
    icon: ShieldCheck,
    skills: [
      {
        id: "support_triage",
        name: "Support Triage",
        desc: "Classify urgency, collect missing details, and keep the customer calm.",
        icon: Headphones,
        channels: ["All"],
      },
      {
        id: "complaint_recovery",
        name: "Complaint Recovery",
        desc: "Acknowledge issues, collect minimum details, and route refunds or disputes to staff.",
        icon: RotateCcw,
        channels: ["All"],
      },
      {
        id: "escalation_guardrails",
        name: "Escalation Guardrails",
        desc: "Hand off legal, medical, financial, refund, angry, or account-sensitive requests.",
        icon: ShieldCheck,
        channels: ["All"],
      },
      {
        id: "multilingual_service",
        name: "Multilingual Service",
        desc: "Preserve customer language across local and global conversations.",
        icon: Languages,
        channels: ["All"],
      },
      {
        id: "review_request_collector",
        name: "Review Request Collector",
        desc: "Ask for feedback or a review only after satisfaction or completion signals.",
        icon: PackageCheck,
        channels: ["Website", "WhatsApp"],
      },
    ],
  },
];

const selectedAssistant = computed(
  () =>
    assistants.value.find(
      (assistant) => assistant.id === selectedAssistantId.value,
    ) || null,
);
const activeToolsConfig = computed(
  () => selectedAssistant.value?.tools_config || {},
);
const assistantSkills = computed(() =>
  Array.isArray(activeToolsConfig.value?.assistant_skills)
    ? activeToolsConfig.value.assistant_skills
    : [],
);
const allSkills = computed(() =>
  skillGroups.flatMap((group) =>
    group.skills.map((skill) => ({
      ...skill,
      category: group.title,
      categoryIcon: group.icon,
      groupDesc: group.desc,
    })),
  ),
);
const skillCategories = computed(() => [
  "all",
  ...skillGroups.map((group) => group.title),
]);
const skillChannels = computed(() => [
  "all",
  ...Array.from(new Set(allSkills.value.flatMap((skill) => skill.channels))),
]);
const filteredSkills = computed(() => {
  const query = skillSearch.value.trim().toLowerCase();
  return allSkills.value.filter((skill) => {
    const status = assignedSkills.value.includes(skill.id)
      ? "Enabled"
      : "Disabled";
    const matchesSearch =
      !query ||
      [skill.name, skill.desc, skill.category, skill.channels.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesCategory =
      skillCategoryFilter.value === "all" ||
      skill.category === skillCategoryFilter.value;
    const matchesStatus =
      skillStatusFilter.value === "all" || status === skillStatusFilter.value;
    const matchesChannel =
      skillChannelFilter.value === "all" ||
      skill.channels.includes(skillChannelFilter.value);
    return matchesSearch && matchesCategory && matchesStatus && matchesChannel;
  });
});
const skillTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredSkills.value.length / skillPageSize.value)),
);
const paginatedSkills = computed(() => {
  const start = (skillPage.value - 1) * skillPageSize.value;
  return filteredSkills.value.slice(start, start + skillPageSize.value);
});
const skillPageStart = computed(() =>
  filteredSkills.value.length === 0
    ? 0
    : (skillPage.value - 1) * skillPageSize.value + 1,
);
const skillPageEnd = computed(() =>
  Math.min(skillPage.value * skillPageSize.value, filteredSkills.value.length),
);
const selectedSkill = computed(
  () =>
    allSkills.value.find((skill) => skill.id === selectedSkillId.value) ||
    filteredSkills.value[0] ||
    allSkills.value[0],
);
const selectedSkillEnabled = computed(() =>
  Boolean(
    selectedSkill.value &&
    assignedSkills.value.includes(selectedSkill.value.id),
  ),
);
const skillDotClass = (enabled: boolean) =>
  enabled
    ? "bg-emerald-400 shadow-emerald-400/30"
    : "bg-foreground/25 shadow-foreground/10";

const skillStats = computed(() => {
  const rows = allSkills.value;
  const enabledCount = rows.filter((skill) =>
    assignedSkills.value.includes(skill.id),
  ).length;
  const disabledCount = Math.max(0, rows.length - enabledCount);
  return [
    {
      label: "Skills",
      value: rows.length,
      detail: "Available behavior modules",
      tone: "primary",
      icon: Sparkles,
    },
    {
      label: "Enabled",
      value: enabledCount,
      detail: "Assigned to this assistant",
      tone: enabledCount > 0 ? "green" : "primary",
      icon: CheckCircle2,
    },
    {
      label: "Disabled",
      value: disabledCount,
      detail: "Not active on this assistant",
      tone: disabledCount > 0 ? "red" : "primary",
      icon: ShieldCheck,
    },
    {
      label: "Categories",
      value: skillGroups.length,
      detail: "Website, booking, social, support",
      tone: "amber",
      icon: PackageCheck,
    },
  ];
});
const enabledSkillRows = computed(() =>
  allSkills.value.filter((skill) => assignedSkills.value.includes(skill.id)),
);
const skillStatCardClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary ring-primary/15",
    green: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/15",
    amber: "bg-amber-400/10 text-amber-400 ring-amber-400/15",
    red: "bg-red-400/10 text-red-400 ring-red-400/15",
  })[tone] || "bg-foreground/5 text-foreground/60 ring-foreground/10";
const skillStatusPillClass = (enabled: boolean) =>
  enabled
    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-700 dark:text-emerald-200"
    : "border-foreground/10 bg-foreground/[0.03] text-foreground/55";
const channelIcon = (channel: string) =>
  ({
    Website: Globe2,
    WhatsApp: MessageCircle,
    Instagram,
    Comments: MessageSquare,
    DM: MessageSquare,
    All: Bot,
  })[channel] || Sparkles;
const resetSkillFilters = () => {
  skillSearch.value = "";
  skillCategoryFilter.value = "all";
  skillStatusFilter.value = "all";
  skillChannelFilter.value = "all";
  skillPage.value = 1;
};

const hasChanges = computed(() => {
  const currentSkills = [...assistantSkills.value].sort().join("|");
  const nextSkills = [...assignedSkills.value].sort().join("|");
  return currentSkills !== nextSkills;
});

const syncSelection = () => {
  const assistant = selectedAssistant.value;
  assignedSkills.value = Array.isArray(
    assistant?.tools_config?.assistant_skills,
  )
    ? [...assistant.tools_config.assistant_skills]
    : [];
};

const fetchAssistants = async () => {
  if (!userId.value) return;
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select(
        "id, name, default_language, enabled_tools, tools_config, created_at",
      )
      .eq("user_id", userId.value)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    assistants.value = data || [];
    skillsBotOptions.value = assistants.value.map((assistant) => ({
      label: assistant.name || "Untitled assistant",
      value: assistant.id,
    }));
    const requestedAssistantId =
      typeof route.query.id === "string"
        ? route.query.id
        : typeof route.query.chatbotId === "string"
          ? route.query.chatbotId
          : "";
    if (
      requestedAssistantId &&
      assistants.value.some(
        (assistant) => assistant.id === requestedAssistantId,
      )
    )
      selectedAssistantId.value = requestedAssistantId;
    else if (
      !selectedAssistantId.value ||
      !assistants.value.some(
        (assistant) => assistant.id === selectedAssistantId.value,
      )
    )
      selectedAssistantId.value = assistants.value[0]?.id || "";
    syncSelection();
  } catch (err) {
    console.error("Failed to load assistants:", err);
    notify.error("Failed to load assistants.");
  } finally {
    isLoading.value = false;
  }
};

const toggleSkill = (skillId: string) => {
  assignedSkills.value = assignedSkills.value.includes(skillId)
    ? assignedSkills.value.filter((value) => value !== skillId)
    : [...assignedSkills.value, skillId];
};

const saveAssignments = async () => {
  if (!selectedAssistant.value || isSaving.value) return;
  isSaving.value = true;
  try {
    const nextToolsConfig = {
      ...(selectedAssistant.value.tools_config || {}),
      assistant_skills: assignedSkills.value,
    };
    const { error } = await supabase
      .from("chatbots")
      .update({ tools_config: nextToolsConfig })
      .eq("id", selectedAssistant.value.id)
      .eq("user_id", userId.value);
    if (error) throw error;
    assistants.value = assistants.value.map((assistant) =>
      assistant.id === selectedAssistant.value.id
        ? { ...assistant, tools_config: nextToolsConfig }
        : assistant,
    );
    notify.success("Skills saved to assistant.");
  } catch (err: any) {
    console.error("Failed to save skills:", err);
    notify.error(err?.message || "Failed to save skills.");
  } finally {
    isSaving.value = false;
  }
};

watch(selectedAssistantId, syncSelection);
watch(
  [
    skillSearch,
    skillCategoryFilter,
    skillStatusFilter,
    skillChannelFilter,
    skillPageSize,
  ],
  () => {
    skillPage.value = 1;
  },
);
watch(skillTotalPages, (total) => {
  if (skillPage.value > total) skillPage.value = total;
});
onMounted(fetchAssistants);
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4 pb-24 pt-5 lg:pb-12 lg:pt-6">
    <div v-if="isLoading" class="space-y-4">
      <section class="space-y-3 pt-4 lg:pt-6">
        <div
          class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]"
        >
          <div class="grid grid-cols-2 gap-3">
            <article
              v-for="card in 4"
              :key="`skill-stat-skeleton-${card}`"
              class="flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2"
            >
              <Skeleton width="3.25rem" height="3.25rem" radius="0.39rem" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton width="34%" height="1.1rem" radius="999px" />
                <Skeleton width="58%" height="0.8rem" radius="999px" />
                <Skeleton width="78%" height="0.65rem" radius="999px" />
              </div>
            </article>
          </div>

          <aside
            class="relative overflow-hidden rounded-[0.39rem] bg-background-card/75 p-4 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06]"
          >
            <div
              class="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
            ></div>
            <div class="relative z-10 space-y-3">
              <div
                class="flex items-start justify-between gap-3 border-b border-foreground/10 pb-3"
              >
                <div class="min-w-0 flex-1 space-y-2">
                  <Skeleton width="5.5rem" height="0.65rem" radius="999px" />
                  <Skeleton width="70%" height="1rem" radius="999px" />
                  <Skeleton width="46%" height="0.7rem" radius="999px" />
                </div>
                <Skeleton width="2.5rem" height="2.5rem" radius="0.39rem" />
              </div>
              <Skeleton width="100%" height="0.75rem" radius="999px" />
              <Skeleton width="88%" height="0.75rem" radius="999px" />
              <div class="flex gap-1.5">
                <Skeleton width="4.5rem" height="1.35rem" radius="999px" />
                <Skeleton width="5rem" height="1.35rem" radius="999px" />
              </div>
              <Skeleton width="100%" height="2.25rem" radius="0.39rem" />
            </div>
          </aside>
        </div>
      </section>

      <section
        class="min-w-0 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
      >
        <div class="space-y-3 border-b border-foreground/10 p-3">
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="space-y-2">
              <Skeleton width="7rem" height="0.9rem" radius="999px" />
              <Skeleton width="11rem" height="0.65rem" radius="999px" />
            </div>
            <div class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
              <Skeleton width="16rem" height="2.5rem" radius="0.39rem" />
              <Skeleton width="7.25rem" height="2.5rem" radius="0.39rem" />
              <Skeleton width="9rem" height="2.5rem" radius="0.39rem" />
              <Skeleton width="8rem" height="2.5rem" radius="0.39rem" />
              <Skeleton width="5.5rem" height="2.5rem" radius="0.39rem" />
              <Skeleton width="5rem" height="2.5rem" radius="0.39rem" />
            </div>
          </div>
        </div>

        <div class="overflow-x-auto p-3">
          <table
            class="w-full min-w-[820px] border-separate border-spacing-y-2 text-left"
          >
            <thead class="text-[11px] font-bold text-foreground/35">
              <tr>
                <th class="px-[0.9rem] py-3">Skill name</th>
                <th class="px-[0.9rem] py-3">Category</th>
                <th class="px-[0.9rem] py-3">Status</th>
                <th class="px-[0.9rem] py-3">Channels</th>
                <th class="px-[0.9rem] py-3 text-right">Quick action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in 5"
                :key="`skill-row-skeleton-${row}`"
                class="group"
              >
                <td
                  class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <div class="flex items-center gap-3">
                    <Skeleton
                      width="2.25rem"
                      height="2.25rem"
                      radius="0.39rem"
                    />
                    <div class="min-w-0 flex-1 space-y-2">
                      <Skeleton width="58%" height="0.8rem" radius="999px" />
                      <Skeleton width="42%" height="0.65rem" radius="999px" />
                    </div>
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <div class="flex items-center gap-2">
                    <Skeleton
                      width="1.75rem"
                      height="1.75rem"
                      radius="0.35rem"
                    />
                    <Skeleton width="9rem" height="0.8rem" radius="999px" />
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <Skeleton width="5.5rem" height="1.35rem" radius="999px" />
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <div class="flex gap-1">
                    <Skeleton width="4.5rem" height="1.35rem" radius="999px" />
                    <Skeleton width="5rem" height="1.35rem" radius="999px" />
                  </div>
                </td>
                <td
                  class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <Skeleton
                    width="5.75rem"
                    height="2rem"
                    radius="0.39rem"
                    class="ml-auto"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-foreground/10 px-3 py-3">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <Skeleton width="10rem" height="0.75rem" radius="999px" />
            <div class="flex items-center gap-2">
              <Skeleton width="5.25rem" height="2.25rem" radius="0.39rem" />
              <Skeleton width="12rem" height="2.25rem" radius="0.39rem" />
            </div>
          </div>
        </div>
      </section>
    </div>

    <section
      v-else-if="assistants.length === 0"
      class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background-card/45 p-10 text-center"
    >
      <Bot class="mx-auto mb-5 h-12 w-12 text-foreground/15" />
      <h2 class="text-xl font-bold text-foreground">
        Create an assistant first
      </h2>
      <p
        class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-foreground/50"
      >
        Skills are assigned to an assistant. Create one, then return here to
        tune its behavior.
      </p>
      <NuxtLink
        to="/dashboard/agents"
        class="mt-6 inline-flex rounded-[0.39rem] bg-primary px-6 py-3 text-xs font-bold text-black"
        >Open assistants</NuxtLink
      >
    </section>

    <div v-else class="space-y-4">
      <section class="space-y-3 pt-4 lg:pt-6">
        <div
          v-if="hasChanges"
          class="flex flex-col gap-3 rounded-[0.39rem] border border-primary/15 bg-primary/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary"
            >
              <Save class="h-4 w-4" />
            </div>
            <div>
              <p class="text-sm font-bold text-foreground">
                Unsaved skill changes
              </p>
              <p class="mt-0.5 text-xs font-medium text-foreground/50">
                Save to apply the selected behavior skills to this assistant.
              </p>
            </div>
          </div>
          <button
            type="button"
            :disabled="isSaving"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="saveAssignments"
          >
            <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Save skills
          </button>
        </div>

        <div
          class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]"
        >
          <div class="grid grid-cols-2 gap-3">
            <article
              v-for="stat in skillStats"
              :key="stat.label"
              class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]"
            >
              <div
                :class="[
                  'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105',
                  skillStatCardClass(stat.tone),
                ]"
              >
                <component :is="stat.icon" class="h-7 w-7" />
              </div>
              <div class="min-w-0">
                <p
                  class="text-xl font-bold leading-none tabular-nums text-foreground"
                >
                  {{ stat.value }}
                </p>
                <p
                  class="mt-1 truncate text-sm font-semibold text-foreground/75"
                >
                  {{ stat.label }}
                </p>
                <p
                  class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50"
                >
                  {{ stat.detail }}
                </p>
              </div>
            </article>
          </div>

          <aside
            class="relative overflow-hidden rounded-[0.39rem] bg-background-card/75 p-4 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06]"
          >
            <div
              class="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
            ></div>
            <div class="relative z-10">
              <div
                class="flex items-start justify-between gap-3 border-b border-foreground/10 pb-3"
              >
                <div class="min-w-0">
                  <p class="dashboard-eyebrow text-primary/80">
                    Selected skill
                  </p>
                  <h2 class="mt-1 truncate text-base font-bold text-foreground">
                    {{ selectedSkill?.name }}
                  </h2>
                  <p
                    class="mt-1 truncate text-xs font-semibold text-foreground/45"
                  >
                    {{ selectedSkill?.category }}
                  </p>
                </div>
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                >
                  <component
                    :is="selectedSkill?.icon || Sparkles"
                    class="h-5 w-5"
                  />
                </div>
              </div>
              <div v-if="selectedSkill" class="space-y-3 pt-3">
                <p
                  class="line-clamp-3 text-xs font-medium leading-relaxed text-foreground/55"
                >
                  {{ selectedSkill.desc }}
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="channel in selectedSkill.channels"
                    :key="channel"
                    class="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 text-[11px] font-semibold text-foreground/50"
                  >
                    <component :is="channelIcon(channel)" class="h-3 w-3" />
                    {{ channel }}
                  </span>
                </div>
                <button
                  type="button"
                  class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-primary"
                  @click="toggleSkill(selectedSkill.id)"
                >
                  <component
                    :is="selectedSkillEnabled ? ShieldCheck : CheckCircle2"
                    class="h-3.5 w-3.5"
                  />
                  {{ selectedSkillEnabled ? "Disable skill" : "Enable skill" }}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <main>
        <section
          class="min-w-0 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
        >
          <div class="space-y-3 border-b border-foreground/10 p-3">
            <div
              class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <h2 class="text-sm font-bold text-foreground">
                  Skills catalog
                </h2>
                <p class="mt-0.5 text-xs font-medium text-foreground/45">
                  {{ filteredSkills.length }} / {{ allSkills.length }} skills
                  shown · {{ enabledSkillRows.length }} enabled
                </p>
              </div>
              <div
                class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end"
              >
                <label class="relative block sm:w-64">
                  <Search
                    class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
                  />
                  <input
                    v-model="skillSearch"
                    type="search"
                    placeholder="Search skills or channels"
                    class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40"
                  />
                </label>
                <select
                  v-model="skillStatusFilter"
                  class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
                >
                  <option value="all">All status</option>
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
                <select
                  v-model="skillCategoryFilter"
                  class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
                >
                  <option
                    v-for="category in skillCategories"
                    :key="category"
                    :value="category"
                  >
                    {{ category === "all" ? "All categories" : category }}
                  </option>
                </select>
                <select
                  v-model="skillChannelFilter"
                  class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
                >
                  <option
                    v-for="channel in skillChannels"
                    :key="channel"
                    :value="channel"
                  >
                    {{ channel === "all" ? "All channels" : channel }}
                  </option>
                </select>
                <button
                  type="button"
                  class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/55 transition hover:border-primary/30 hover:text-primary"
                  @click="resetSkillFilters"
                >
                  <RotateCcw class="h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  @click="saveAssignments"
                  :disabled="!hasChanges || isSaving"
                  class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  <Save v-else class="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto p-3">
            <table
              class="w-full min-w-[820px] border-separate border-spacing-y-2 text-left"
            >
              <thead class="text-[11px] font-bold text-foreground/35">
                <tr>
                  <th class="px-[0.9rem] py-3">Skill name</th>
                  <th class="px-[0.9rem] py-3">Category</th>
                  <th class="px-[0.9rem] py-3">Status</th>
                  <th class="px-[0.9rem] py-3">Channels</th>
                  <th class="px-[0.9rem] py-3 text-right">Quick action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="skill in paginatedSkills"
                  :key="skill.id"
                  :class="[
                    'group cursor-pointer',
                    selectedSkillId === skill.id ? 'bg-primary/[0.05]' : '',
                  ]"
                  @click="selectedSkillId = skill.id"
                >
                  <td
                    class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        :class="[
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem]',
                          assignedSkills.includes(skill.id)
                            ? 'bg-primary text-black'
                            : 'bg-foreground/5 text-foreground/50',
                        ]"
                      >
                        <component :is="skill.icon" class="h-4 w-4" />
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-bold text-foreground">
                          {{ skill.name }}
                        </p>
                        <p
                          class="truncate text-xs font-medium text-foreground/35"
                        >
                          {{ skill.id }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    class="max-w-[15rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                      >
                        <component
                          :is="skill.categoryIcon"
                          class="h-3.5 w-3.5"
                        />
                      </div>
                      <p class="truncate text-xs font-bold text-foreground/55">
                        {{ skill.category }}
                      </p>
                    </div>
                  </td>
                  <td
                    class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                  >
                    <span
                      :class="[
                        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold',
                        skillStatusPillClass(assignedSkills.includes(skill.id)),
                      ]"
                    >
                      <span
                        :class="[
                          'h-1.5 w-1.5 rounded-full shadow-sm',
                          skillDotClass(assignedSkills.includes(skill.id)),
                        ]"
                      />
                      {{
                        assignedSkills.includes(skill.id)
                          ? "Enabled"
                          : "Disabled"
                      }}
                    </span>
                  </td>
                  <td
                    class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                  >
                    <div class="flex max-w-[16rem] gap-1 overflow-hidden">
                      <span
                        v-for="channel in skill.channels"
                        :key="channel"
                        class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 text-[11px] font-semibold text-foreground/45"
                      >
                        <component :is="channelIcon(channel)" class="h-3 w-3" />
                        {{ channel }}
                      </span>
                    </div>
                  </td>
                  <td
                    class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                  >
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 py-2 text-xs font-bold text-foreground/60 transition hover:border-primary/30 hover:text-primary"
                      @click.stop="toggleSkill(skill.id)"
                    >
                      <component
                        :is="
                          assignedSkills.includes(skill.id)
                            ? ShieldCheck
                            : CheckCircle2
                        "
                        class="mr-1.5 inline h-3.5 w-3.5"
                      />
                      {{
                        assignedSkills.includes(skill.id) ? "Disable" : "Enable"
                      }}
                    </button>
                  </td>
                </tr>
                <tr v-if="filteredSkills.length === 0">
                  <td
                    colspan="5"
                    class="px-[0.9rem] py-8 text-center text-xs font-bold text-foreground/45"
                  >
                    No skills match the current filters.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="border-t border-foreground/10 px-3 py-3">
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-xs font-semibold text-foreground/45">
                Showing {{ skillPageStart }}-{{ skillPageEnd }} of
                {{ filteredSkills.length }} skills
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <select
                  v-model.number="skillPageSize"
                  class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground/55 outline-none focus:border-primary/40"
                >
                  <option :value="5">5 / page</option>
                  <option :value="10">10 / page</option>
                  <option :value="20">20 / page</option>
                </select>
                <div
                  class="inline-flex items-center overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background"
                >
                  <button
                    type="button"
                    :disabled="skillPage <= 1"
                    class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                    @click="skillPage = Math.max(1, skillPage - 1)"
                  >
                    <ChevronLeft class="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <span
                    class="border-x border-foreground/10 px-3 text-xs font-bold text-foreground/45"
                    >{{ skillPage }} / {{ skillTotalPages }}</span
                  >
                  <button
                    type="button"
                    :disabled="skillPage >= skillTotalPages"
                    class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                    @click="
                      skillPage = Math.min(skillTotalPages, skillPage + 1)
                    "
                  >
                    Next
                    <ChevronRight class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
