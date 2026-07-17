<script setup lang="ts">
import {
  ArrowRight,
  GraduationCap,
  Instagram,
  Settings2,
  Smartphone,
  Clock3,
  ClipboardList,
  RefreshCw,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "School | ReplySuite" });

const { schoolFlows, isLoading } = useWorkspaceFlows();
const supabase = useSupabaseClient();
const notify = useNotify();
const { userId } = useAuth();

const schoolAssistants = ref<any[]>([]);
const selectedSchoolAssistantId = ref("");
const schoolSettingsLoading = ref(false);
const schoolSettingsSaving = ref(false);
const selectedSchoolPlanId = ref("");
const schoolSessions = ref<any[]>([]);
const schoolPayments = ref<any[]>([]);
const schoolQuizzes = ref<any[]>([]);
const schoolMonitoringLoading = ref(false);
const schoolPlan = reactive({
  price: 1000,
  currency: "RWF",
  duration_minutes: 30,
  default_question_count: 10,
  allow_student_question_count: true,
  min_question_count: 5,
  max_question_count: 20,
  quiz_delivery_mode: "let_student_choose",
});

const selectedSchoolAssistant = computed(
  () =>
    schoolAssistants.value.find(
      (assistant) => assistant.id === selectedSchoolAssistantId.value,
    ) || null,
);

const syncSchoolSettings = () => {
  const config = selectedSchoolAssistant.value?.tools_config || {};
  const school = config.school_flow || {};
  schoolPlan.price = Number(school.price || 1000);
  schoolPlan.currency = school.currency || "RWF";
  schoolPlan.duration_minutes = Number(school.duration_minutes || 30);
  schoolPlan.default_question_count = Number(
    school.default_question_count || 10,
  );
  schoolPlan.allow_student_question_count =
    school.allow_student_question_count !== false;
  schoolPlan.min_question_count = Number(school.min_question_count || 5);
  schoolPlan.max_question_count = Number(school.max_question_count || 20);
  schoolPlan.quiz_delivery_mode =
    school.quiz_delivery_mode || "let_student_choose";
};

const applySchoolPlanRow = (plan: any) => {
  if (!plan) return;
  selectedSchoolPlanId.value = plan.id || "";
  schoolPlan.price = Number(plan.price || schoolPlan.price || 1000);
  schoolPlan.currency = plan.currency || schoolPlan.currency || "RWF";
  schoolPlan.duration_minutes = Number(
    plan.duration_minutes || schoolPlan.duration_minutes || 30,
  );
  schoolPlan.default_question_count = Number(
    plan.default_question_count || schoolPlan.default_question_count || 10,
  );
  schoolPlan.allow_student_question_count =
    plan.allow_student_question_count !== false;
  schoolPlan.min_question_count = Number(
    plan.min_question_count || schoolPlan.min_question_count || 5,
  );
  schoolPlan.max_question_count = Number(
    plan.max_question_count || schoolPlan.max_question_count || 20,
  );
  schoolPlan.quiz_delivery_mode =
    plan.quiz_delivery_mode ||
    schoolPlan.quiz_delivery_mode ||
    "let_student_choose";
};

const fetchSelectedSchoolPlan = async () => {
  selectedSchoolPlanId.value = "";
  if (!selectedSchoolAssistantId.value) return;
  const { data, error } = await supabase
    .from("school_tutor_plans")
    .select(
      "id, price, currency, duration_minutes, default_question_count, allow_student_question_count, min_question_count, max_question_count, quiz_delivery_mode, passing_score_percent, is_active",
    )
    .eq("chatbot_id", selectedSchoolAssistantId.value)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("Could not load school tutor plan:", error);
    return;
  }
  applySchoolPlanRow(data);
};

const fetchSchoolMonitoring = async () => {
  if (!selectedSchoolAssistantId.value) {
    schoolSessions.value = [];
    schoolPayments.value = [];
    schoolQuizzes.value = [];
    return;
  }
  schoolMonitoringLoading.value = true;
  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from("school_tutor_sessions")
      .select("*")
      .eq("chatbot_id", selectedSchoolAssistantId.value)
      .order("created_at", { ascending: false })
      .limit(20);
    if (sessionsError) throw sessionsError;
    schoolSessions.value = sessions || [];

    const sessionIds = schoolSessions.value.map((session) => session.id);
    if (!sessionIds.length) {
      schoolPayments.value = [];
      schoolQuizzes.value = [];
      return;
    }

    const [{ data: payments }, { data: quizzes }] = await Promise.all([
      supabase
        .from("school_tutor_payments")
        .select("*")
        .in("school_session_id", sessionIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("school_tutor_quizzes")
        .select("*")
        .in("school_session_id", sessionIds)
        .order("created_at", { ascending: false }),
    ]);
    schoolPayments.value = payments || [];
    schoolQuizzes.value = quizzes || [];
  } catch (err: any) {
    console.warn("Unable to load school monitoring:", err);
    schoolSessions.value = [];
    schoolPayments.value = [];
    schoolQuizzes.value = [];
  } finally {
    schoolMonitoringLoading.value = false;
  }
};

const fetchSchoolAssistants = async () => {
  if (!userId.value) return;
  schoolSettingsLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select("id, name, enabled_tools, tools_config, created_at")
      .eq("user_id", userId.value)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    schoolAssistants.value = data || [];
    selectedSchoolAssistantId.value =
      schoolAssistants.value.find((assistant) => {
        const tools = Array.isArray(assistant.enabled_tools)
          ? assistant.enabled_tools
          : [];
        return (
          assistant.tools_config?.school_flow ||
          tools.some((tool: string) =>
            ["school", "tutor", "school_tutor"].includes(tool),
          )
        );
      })?.id ||
      schoolAssistants.value[0]?.id ||
      "";
    syncSchoolSettings();
    await fetchSelectedSchoolPlan();
    await fetchSchoolMonitoring();
  } catch (err: any) {
    notify.error(err?.message || "Unable to load school settings.");
  } finally {
    schoolSettingsLoading.value = false;
  }
};

const saveSchoolSettings = async () => {
  const assistant = selectedSchoolAssistant.value;
  if (!assistant || schoolSettingsSaving.value) return;
  schoolSettingsSaving.value = true;
  try {
    const tools = new Set(
      Array.isArray(assistant.enabled_tools) ? assistant.enabled_tools : [],
    );
    tools.add("school");
    tools.add("tutor");
    tools.add("payments");
    const previousConfig = assistant.tools_config || {};
    const nextConfig = {
      ...previousConfig,
      school_flow: {
        ...(previousConfig.school_flow || {}),
        enabled: true,
        payment_enabled: true,
        paid_session_enabled: true,
        payment_tool: "replysuite_mobile_payment_worker",
        price: Number(schoolPlan.price || 1000),
        currency: schoolPlan.currency || "RWF",
        duration_minutes: Number(schoolPlan.duration_minutes || 30),
        default_question_count: Number(schoolPlan.default_question_count || 10),
        allow_student_question_count: Boolean(
          schoolPlan.allow_student_question_count,
        ),
        min_question_count: Number(schoolPlan.min_question_count || 5),
        max_question_count: Number(schoolPlan.max_question_count || 20),
        quiz_delivery_mode: schoolPlan.quiz_delivery_mode,
        updated_at: new Date().toISOString(),
      },
      website_payment: {
        ...(previousConfig.website_payment || {}),
        enabled: true,
        provider: "replysuite_mobile_payment_worker",
      },
    };
    const nextTools = Array.from(tools);
    const { error } = await supabase
      .from("chatbots")
      .update({ enabled_tools: nextTools, tools_config: nextConfig })
      .eq("id", assistant.id)
      .eq("user_id", userId.value);
    if (error) throw error;

    const planPayload = {
      chatbot_id: assistant.id,
      name: "Sobanukirwa Tutor Session",
      description:
        "Paid chat-only tutoring session with ask mode and quiz mode. Learning stays inside WhatsApp/chat.",
      price: Number(schoolPlan.price || 1000),
      currency: schoolPlan.currency || "RWF",
      duration_minutes: Number(schoolPlan.duration_minutes || 30),
      default_question_count: Number(schoolPlan.default_question_count || 10),
      allow_student_question_count: Boolean(
        schoolPlan.allow_student_question_count,
      ),
      min_question_count: Number(schoolPlan.min_question_count || 5),
      max_question_count: Number(schoolPlan.max_question_count || 20),
      quiz_delivery_mode: schoolPlan.quiz_delivery_mode,
      passing_score_percent: 70,
      is_active: true,
    };

    if (selectedSchoolPlanId.value) {
      const { error: planError } = await supabase
        .from("school_tutor_plans")
        .update(planPayload)
        .eq("id", selectedSchoolPlanId.value)
        .eq("chatbot_id", assistant.id);
      if (planError) throw planError;
    } else {
      const { data: createdPlan, error: planError } = await supabase
        .from("school_tutor_plans")
        .insert(planPayload)
        .select("id")
        .single();
      if (planError) throw planError;
      selectedSchoolPlanId.value = createdPlan?.id || "";
    }
    schoolAssistants.value = schoolAssistants.value.map((item) =>
      item.id === assistant.id
        ? { ...item, enabled_tools: nextTools, tools_config: nextConfig }
        : item,
    );
    notify.success("School tutor settings saved.");
  } catch (err: any) {
    notify.error(err?.message || "Unable to save school settings.");
  } finally {
    schoolSettingsSaving.value = false;
  }
};

watch(selectedSchoolAssistantId, async () => {
  syncSchoolSettings();
  await fetchSelectedSchoolPlan();
  await fetchSchoolMonitoring();
});
watch(userId, () => void fetchSchoolAssistants());
onMounted(fetchSchoolAssistants);

const latestPaymentForSession = (sessionId: string) =>
  schoolPayments.value.find(
    (payment) => payment.school_session_id === sessionId,
  );
const quizzesForSession = (sessionId: string) =>
  schoolQuizzes.value.filter((quiz) => quiz.school_session_id === sessionId);
const timeRemainingLabel = (session: any) => {
  if (!session?.expires_at) return "—";
  const remainingMs = new Date(session.expires_at).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";
  const minutes = Math.ceil(remainingMs / 60000);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left`
    : `${minutes}m left`;
};
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const statusTone = (status: string) => {
  if (["active", "paid", "completed"].includes(status))
    return "bg-emerald-400/10 text-emerald-400";
  if (["pending", "pending_payment", "unpaid"].includes(status))
    return "bg-amber-400/10 text-amber-400";
  if (["expired", "failed", "cancelled"].includes(status))
    return "bg-red-400/10 text-red-400";
  return "bg-foreground/5 text-foreground/45";
};
const statusLabel = (status: string) =>
  String(status || "unknown").replaceAll("_", " ");
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

const manageRoute = (flow: any) => {
  if (flow.routeIdsByChannel?.instagram) {
    return `/dashboard/integrations/instagram/${flow.routeIdsByChannel.instagram}`;
  }
  const routeId = flow.routeIdsByChannel?.whatsapp || flow.routeId;
  return `/dashboard/integrations/whatsapp/${routeId}`;
};
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-5 pb-20 pt-3">
    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p class="dashboard-eyebrow text-primary/80">School command center</p>
          <h1 class="dashboard-section-title mt-2">Learning flows</h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/65">
            School shows assistants connected to WhatsApp or Instagram with real
            course/module training, paid session support, and a visible learning
            flow.
          </p>
        </div>
        <NuxtLink
          to="/dashboard/agents/training"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
        >
          <GraduationCap class="h-3.5 w-3.5" />
          Train tutor assistant
        </NuxtLink>
      </div>
    </section>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 sm:p-5"
    >
      <div
        class="flex flex-col gap-3 border-b border-foreground/10 pb-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-sm font-bold text-foreground">
            Paid tutor session settings
          </h2>
          <p class="mt-1 text-xs text-foreground/45">
            Sessions stay inside chat. Time starts after confirmed payment; when
            time ends, the assistant asks the student to pay again.
          </p>
        </div>
        <button
          :disabled="schoolSettingsSaving || !selectedSchoolAssistantId"
          class="inline-flex h-8 items-center justify-center rounded-[0.39rem] bg-primary px-3 text-[11px] font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-50"
          @click="saveSchoolSettings"
        >
          {{ schoolSettingsSaving ? "Saving..." : "Save settings" }}
        </button>
      </div>

      <div v-if="schoolSettingsLoading" class="grid gap-3 pt-4 sm:grid-cols-4">
        <Skeleton v-for="row in 4" :key="row" height="3rem" radius="0.39rem" />
      </div>
      <div v-else class="grid gap-3 pt-4 lg:grid-cols-4">
        <label class="space-y-1.5">
          <span class="text-[11px] font-bold text-foreground/50"
            >Tutor assistant</span
          >
          <select
            v-model="selectedSchoolAssistantId"
            class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/40"
          >
            <option
              v-for="assistant in schoolAssistants"
              :key="assistant.id"
              :value="assistant.id"
            >
              {{ assistant.name || "Untitled assistant" }}
            </option>
          </select>
        </label>
        <label class="space-y-1.5">
          <span class="text-[11px] font-bold text-foreground/50"
            >Price / duration</span
          >
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model.number="schoolPlan.price"
              type="number"
              min="0"
              class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"
            />
            <input
              v-model.number="schoolPlan.duration_minutes"
              type="number"
              min="1"
              class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"
            />
          </div>
        </label>
        <label class="space-y-1.5">
          <span class="text-[11px] font-bold text-foreground/50"
            >Quiz questions</span
          >
          <div class="grid grid-cols-3 gap-2">
            <input
              v-model.number="schoolPlan.default_question_count"
              type="number"
              min="1"
              class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"
              title="Default"
            />
            <input
              v-model.number="schoolPlan.min_question_count"
              type="number"
              min="1"
              class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"
              title="Min"
            />
            <input
              v-model.number="schoolPlan.max_question_count"
              type="number"
              min="1"
              class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"
              title="Max"
            />
          </div>
        </label>
        <label class="space-y-1.5">
          <span class="text-[11px] font-bold text-foreground/50"
            >Quiz delivery</span
          >
          <select
            v-model="schoolPlan.quiz_delivery_mode"
            class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/40"
          >
            <option value="let_student_choose">Let student choose</option>
            <option value="one_by_one">One by one</option>
            <option value="all_at_once">All at once</option>
          </select>
          <label
            class="flex items-center gap-2 pt-1 text-[11px] font-semibold text-foreground/55"
          >
            <input
              v-model="schoolPlan.allow_student_question_count"
              type="checkbox"
              class="h-3.5 w-3.5 accent-primary"
            />
            Student can choose count
          </label>
        </label>
      </div>
    </section>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div
        class="flex flex-col gap-2 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-sm font-bold text-foreground">Tutor sessions</h2>
          <p class="mt-1 text-xs text-foreground/45">
            Monitor paid chat-only learning time, MTN/Airtel payment state, and
            quiz attempts.
          </p>
        </div>
        <button
          :disabled="schoolMonitoringLoading || !selectedSchoolAssistantId"
          class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-primary disabled:opacity-50"
          @click="fetchSchoolMonitoring"
        >
          <RefreshCw class="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div v-if="schoolMonitoringLoading" class="space-y-2 p-4">
        <Skeleton v-for="row in 3" :key="row" height="4rem" radius="0.39rem" />
      </div>
      <div v-else-if="schoolSessions.length" class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-left">
          <thead class="border-b border-foreground/10 bg-foreground/[0.025]">
            <tr>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Student
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Session
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Payment
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Time
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Quiz
              </th>
              <th
                class="px-4 py-2.5 text-right text-[11px] font-bold text-foreground/45"
              >
                Conversation
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/10">
            <tr
              v-for="session in schoolSessions"
              :key="session.id"
              class="transition hover:bg-primary/[0.035]"
            >
              <td class="px-4 py-3 align-middle">
                <div class="min-w-0">
                  <p
                    class="max-w-[13rem] truncate text-xs font-bold text-foreground"
                  >
                    {{
                      session.student_name || session.student_phone || "Student"
                    }}
                  </p>
                  <p
                    class="mt-0.5 text-[11px] font-semibold text-foreground/45"
                  >
                    {{
                      session.student_phone ||
                      session.student_email ||
                      "No contact saved"
                    }}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3 align-middle">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                    statusTone(session.status),
                  ]"
                  >{{ statusLabel(session.status) }}</span
                >
                <p class="mt-1 text-[11px] text-foreground/45">
                  {{ formatDate(session.created_at) }}
                </p>
              </td>
              <td class="px-4 py-3 align-middle">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                    statusTone(session.payment_status),
                  ]"
                  >{{ statusLabel(session.payment_status) }}</span
                >
                <p
                  v-if="latestPaymentForSession(session.id)"
                  class="mt-1 text-[11px] text-foreground/45"
                >
                  {{
                    Number(
                      latestPaymentForSession(session.id)?.amount || 0,
                    ).toLocaleString()
                  }}
                  {{ latestPaymentForSession(session.id)?.currency || "RWF" }}
                </p>
              </td>
              <td class="px-4 py-3 align-middle">
                <div
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70"
                >
                  <Clock3 class="h-3.5 w-3.5 text-primary" />
                  {{ timeRemainingLabel(session) }}
                </div>
                <p class="mt-1 text-[11px] text-foreground/45">
                  Ends {{ formatDate(session.expires_at) }}
                </p>
              </td>
              <td class="px-4 py-3 align-middle">
                <div
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70"
                >
                  <ClipboardList class="h-3.5 w-3.5 text-primary" />
                  {{ quizzesForSession(session.id).length }} attempt{{
                    quizzesForSession(session.id).length === 1 ? "" : "s"
                  }}
                </div>
                <p
                  v-if="quizzesForSession(session.id)[0]"
                  class="mt-1 text-[11px] text-foreground/45"
                >
                  Latest:
                  {{ quizzesForSession(session.id)[0].percentage ?? 0 }}%
                </p>
              </td>
              <td class="px-4 py-3 text-right align-middle">
                <NuxtLink
                  v-if="session.chat_session_id"
                  :to="`/dashboard/conversations?session=${session.chat_session_id}`"
                  class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-primary"
                >
                  Open chat
                </NuxtLink>
                <span
                  v-else
                  class="text-[11px] font-semibold text-foreground/35"
                  >No chat link</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="p-8 text-center">
        <Clock3 class="mx-auto h-8 w-8 text-foreground/25" />
        <p class="mt-3 text-sm font-bold text-foreground">
          No tutor sessions yet
        </p>
        <p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">
          Once students pay for tutor time inside WhatsApp/chat, sessions, time
          remaining, payments, and quiz attempts appear here.
        </p>
      </div>
    </section>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div
        class="flex flex-col gap-2 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-sm font-bold text-foreground">Active school flows</h2>
          <p class="mt-1 text-xs text-foreground/45">
            Flows appear here when an assistant has tutor/school/course signals
            and is connected to a channel.
          </p>
        </div>
        <span class="text-xs font-bold text-foreground/45">
          {{ schoolFlows.length }} flow{{ schoolFlows.length === 1 ? "" : "s" }}
        </span>
      </div>

      <div v-if="isLoading" class="space-y-2 p-4">
        <Skeleton v-for="row in 4" :key="row" height="4rem" radius="0.39rem" />
      </div>

      <div v-else-if="schoolFlows.length" class="overflow-x-auto">
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
                Training
              </th>
              <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">
                Payment
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
              v-for="flow in schoolFlows"
              :key="flow.id"
              class="transition hover:bg-primary/[0.035]"
            >
              <td class="px-4 py-3 align-middle">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                  >
                    <GraduationCap class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p
                      class="max-w-[16rem] truncate text-xs font-bold text-foreground"
                    >
                      {{ flow.title }}
                    </p>
                    <p
                      class="mt-0.5 text-[11px] font-semibold text-foreground/45"
                    >
                      Tutor assistant
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
                  class="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400"
                >
                  {{ flow.trainingCount }} source{{
                    flow.trainingCount === 1 ? "" : "s"
                  }}
                </span>
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
                      ? "Paid session ready"
                      : "Needs payment tool"
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
        <GraduationCap class="mx-auto h-8 w-8 text-foreground/25" />
        <p class="mt-3 text-sm font-bold text-foreground">
          No school learning flows yet
        </p>
        <p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">
          Train an assistant with class/module content, connect it to WhatsApp
          or Instagram, and add paid-session/payment settings when needed.
        </p>
      </div>
    </section>
  </div>
</template>
