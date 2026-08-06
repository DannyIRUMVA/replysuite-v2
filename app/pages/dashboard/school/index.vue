<script setup lang="ts">
import {
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Instagram,
  Settings2,
  Smartphone,
  Clock3,
  ClipboardList,
  CreditCard,
  HelpCircle,
  MessageCircle,
  Trophy,
  Users,
  Zap,
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
const schoolRegistrations = ref<any[]>([]);
const schoolMonitoringLoading = ref(false);
const chartRange = ref<"7d" | "30d" | "90d">("7d");
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

const formatNumber = (value: number) => Number(value || 0).toLocaleString();

const tutorEnrollmentCount = computed(
  () =>
    new Set(
      schoolSessions.value.map(
        (session) =>
          session.student_phone || session.student_email || session.student_name || session.id,
      ),
    ).size,
);

const selectedSchoolAssistant = computed(
  () =>
    schoolAssistants.value.find(
      (assistant) => assistant.id === selectedSchoolAssistantId.value,
    ) || null,
);

const paidSessionCount = computed(
  () =>
    schoolSessions.value.filter((session) => {
      const payment = schoolPayments.value.find(
        (item) => item.school_session_id === session.id,
      );
      return session.payment_status === "paid" || payment?.status === "paid";
    }).length,
);

const activeSessionCount = computed(
  () => schoolSessions.value.filter((session) => session.status === "active").length,
);

const pendingRegistrationCount = computed(
  () =>
    schoolRegistrations.value.filter((registration) =>
      ["pending_approval", "paid_pending_approval", "submitted"].includes(
        registration.status,
      ) || registration.approval_status === "pending",
    ).length,
);

const registrationStudentName = (registration: any) =>
  registration?.student_name || registration?.answers?.student_name || "Unnamed student";

const recentRegisteredStudents = computed(() =>
  schoolRegistrations.value.slice(0, 5).map((registration) => ({
    id: registration.id,
    name: registrationStudentName(registration),
    parent: registration.parent_name || registration.answers?.parent_name || "Parent not set",
    className:
      registration.class_applying_for ||
      registration.answers?.class_applying_for ||
      "Class not set",
    status: registration.status || registration.approval_status || "pending",
  })),
);

const selectedSchoolFlow = computed(() => schoolFlows.value[0] || null);

const spotlightTitle = computed(() =>
  selectedSchoolFlow.value?.title || selectedSchoolAssistant.value?.name || "No active school flow yet",
);

const spotlightSubtitle = computed(() => {
  if (selectedSchoolFlow.value) return "Top school flow connected to a live channel.";
  if (selectedSchoolAssistant.value) return "Assistant selected for tutor settings.";
  return "Train and connect a school assistant to start monitoring activity.";
});

const metricClass = (tone: string) => ({
  primary: "bg-primary/10 text-primary ring-primary/15",
  blue: "bg-sky-400/10 text-sky-400 ring-sky-400/15",
  green: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/15",
  amber: "bg-amber-400/10 text-amber-400 ring-amber-400/15",
  violet: "bg-violet-400/10 text-violet-400 ring-violet-400/15",
  rose: "bg-rose-400/10 text-rose-400 ring-rose-400/15",
}[tone] || "bg-foreground/5 text-foreground/60 ring-foreground/10");

const schoolMetricRows = computed(() => [
  {
    label: "Active school flows",
    value: schoolFlows.value.length,
    detail: "Connected tutor or admissions channels",
    icon: GraduationCap,
    tone: "primary",
  },
  {
    label: "Tutor enrolled students",
    value: tutorEnrollmentCount.value,
    detail: "Unique students in tutor sessions",
    icon: Users,
    tone: "blue",
  },
  {
    label: "Active sessions",
    value: activeSessionCount.value,
    detail: "Paid learning time currently open",
    icon: Clock3,
    tone: "green",
  },
  {
    label: "Paid sessions",
    value: paidSessionCount.value,
    detail: "MTN/Airtel confirmed tutor sessions",
    icon: CreditCard,
    tone: "amber",
  },
  {
    label: "Quiz attempts",
    value: schoolQuizzes.value.length,
    detail: "Tutor quiz submissions tracked",
    icon: HelpCircle,
    tone: "violet",
  },
  {
    label: "Registrations",
    value: schoolRegistrations.value.length,
    detail: `${formatNumber(pendingRegistrationCount.value)} waiting for review`,
    icon: ClipboardList,
    tone: "rose",
  },
]);

const chartFilters = [
  { label: "7D", value: "7d", days: 7 },
  { label: "30D", value: "30d", days: 30 },
  { label: "90D", value: "90d", days: 90 },
] as const;

const schoolChartSeries = computed(() => {
  const selected = chartFilters.find((item) => item.value === chartRange.value) || chartFilters[0];
  const now = new Date();
  const buckets = Array.from({ length: selected.days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (selected.days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: 0,
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const session of schoolSessions.value) {
    const key = String(session?.created_at || "").slice(0, 10);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.value += 1;
  }
  return buckets;
});

const schoolChartTotal = computed(() =>
  schoolChartSeries.value.reduce((sum, point) => sum + point.value, 0),
);
const schoolChartMax = computed(() =>
  Math.max(1, ...schoolChartSeries.value.map((point) => point.value)),
);
const schoolChartPath = computed(() =>
  schoolChartSeries.value
    .map((point, index) => {
      const x =
        schoolChartSeries.value.length <= 1
          ? 0
          : (index / (schoolChartSeries.value.length - 1)) * 100;
      const y = 100 - ((point.value / schoolChartMax.value) * 76 + 12);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" "),
);
const schoolChartAreaPath = computed(() =>
  schoolChartPath.value ? `${schoolChartPath.value} L 100 100 L 0 100 Z` : "",
);
const schoolChartScaleLabels = computed(() => [
  { label: formatNumber(schoolChartMax.value), position: "top-4" },
  { label: formatNumber(Math.ceil(schoolChartMax.value / 2)), position: "top-1/2 -translate-y-1/2" },
  { label: "0", position: "bottom-11" },
]);

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

const fetchRegistrationOverview = async (chatbotIds: string[]) => {
  if (!chatbotIds.length) {
    schoolRegistrations.value = [];
    return;
  }
  try {
    const { data, error } = await supabase
      .from("school_student_registrations")
      .select("id, chatbot_id, student_name, parent_name, parent_phone, class_applying_for, status, payment_status, approval_status, answers, created_at")
      .in("chatbot_id", chatbotIds)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    schoolRegistrations.value = data || [];
  } catch (err) {
    console.warn("Unable to load school registration overview:", err);
    schoolRegistrations.value = [];
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
    await fetchRegistrationOverview(schoolAssistants.value.map((assistant) => assistant.id));
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
  <div class="min-h-[calc(100vh-4.5rem)] space-y-5 pb-20 pt-3">
    <div v-if="isLoading || schoolSettingsLoading" class="space-y-5">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section class="rounded-[0.39rem] p-5 sm:p-6">
          <Skeleton width="9rem" height="0.8rem" class="mb-3" />
          <Skeleton width="16rem" height="1.6rem" class="mb-5" />
          <div class="grid gap-3 sm:grid-cols-2">
            <Skeleton v-for="item in 6" :key="item" height="5.25rem" radius="0.39rem" />
          </div>
        </section>
        <section class="rounded-[0.39rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
          <Skeleton width="8rem" height="0.8rem" class="mb-3" />
          <Skeleton width="13rem" height="1.6rem" class="mb-6" />
          <Skeleton width="100%" height="12rem" radius="0.39rem" />
        </section>
      </div>
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <Skeleton width="9rem" height="0.8rem" class="mb-3" />
        <Skeleton width="14rem" height="1.5rem" class="mb-5" />
        <Skeleton width="100%" height="13rem" radius="0.39rem" />
      </section>
    </div>

    <div v-else class="space-y-5">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section class="rounded-[0.39rem] p-5 sm:p-6">
          <div class="mb-5 flex items-end justify-between gap-4">
            <div>
              <p class="dashboard-eyebrow text-primary/80">School command overview</p>
              <h1 class="dashboard-section-title mt-2">Your school workspace at a glance</h1>
              <p class="dashboard-muted mt-1 max-w-2xl">
                Monitor live school flows, tutor enrollments, admissions, payments, and quizzes from one dashboard-native command center.
              </p>
            </div>
            <div class="hidden h-10 w-10 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15 sm:flex">
              <Zap class="h-[1.125rem] w-[1.125rem]" />
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <NuxtLink
              v-for="metric in schoolMetricRows"
              :key="metric.label"
              :to="metric.label === 'Registrations' ? '/dashboard/school/registration' : metric.label.includes('Tutor') || metric.label.includes('sessions') || metric.label.includes('Quiz') ? '#tutor-enrollments' : '#active-school-flows'"
              class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]"
            >
              <div :class="['flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105', metricClass(metric.tone)]">
                <component :is="metric.icon" class="h-7 w-7" />
              </div>
              <div class="min-w-0">
                <p class="dashboard-metric-number leading-none">{{ formatNumber(metric.value) }}</p>
                <p class="mt-1 truncate text-sm font-semibold text-foreground/75">{{ metric.label }}</p>
                <p class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50">{{ metric.detail }}</p>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section class="relative overflow-hidden rounded-[0.39rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
          <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"></div>
          <div class="relative z-10">
            <div class="mb-5 flex items-start justify-between gap-4">
              <div>
                <p class="dashboard-eyebrow text-primary/80">School spotlight</p>
                <h2 class="dashboard-section-title mt-2">Active flow</h2>
                <p class="dashboard-muted mt-1">{{ spotlightSubtitle }}</p>
              </div>
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
                <Trophy class="h-5 w-5" />
              </div>
            </div>

            <div v-if="selectedSchoolFlow || selectedSchoolAssistant" class="space-y-3 rounded-[0.39rem] bg-background/45 p-4 ring-1 ring-foreground/[0.05]">
              <div class="rounded-[0.39rem] bg-foreground/[0.035] p-4 ring-1 ring-foreground/[0.05]">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-foreground">{{ spotlightTitle }}</p>
                    <p class="mt-1 truncate text-xs font-semibold text-foreground/45">
                      {{ selectedSchoolFlow?.assistant || selectedSchoolAssistant?.name || 'School assistant' }}
                    </p>
                  </div>
                  <span :class="['shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', selectedSchoolFlow?.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-foreground/5 text-foreground/45']">
                    {{ selectedSchoolFlow?.active ? 'Active' : 'Setup' }}
                  </span>
                </div>
                <div class="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-[0.39rem] bg-background/55 p-3">
                    <p class="text-lg font-black tabular-nums text-foreground">{{ selectedSchoolFlow?.trainingCount || 0 }}</p>
                    <p class="mt-0.5 text-[10px] font-bold text-foreground/40">Sources</p>
                  </div>
                  <div class="rounded-[0.39rem] bg-background/55 p-3">
                    <p class="text-lg font-black tabular-nums text-foreground">{{ selectedSchoolFlow?.channels?.length || 0 }}</p>
                    <p class="mt-0.5 text-[10px] font-bold text-foreground/40">Channels</p>
                  </div>
                  <div class="rounded-[0.39rem] bg-background/55 p-3">
                    <p class="text-lg font-black tabular-nums text-foreground">{{ formatNumber(schoolPlan.price) }}</p>
                    <p class="mt-0.5 text-[10px] font-bold text-foreground/40">{{ schoolPlan.currency }}</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-2 sm:grid-cols-2">
                <NuxtLink to="/dashboard/school/registration" class="dashboard-action-label inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-4 py-3 text-foreground/65 transition hover:border-primary/25 hover:text-primary">
                  Admissions
                  <ChevronRight class="h-4 w-4" />
                </NuxtLink>
                <NuxtLink v-if="selectedSchoolFlow" :to="flowRoute(selectedSchoolFlow)" class="dashboard-action-label inline-flex items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 py-3 text-black transition hover:brightness-95">
                  Open flow
                  <ChevronRight class="h-4 w-4" />
                </NuxtLink>
                <NuxtLink v-else to="/dashboard/agents/training" class="dashboard-action-label inline-flex items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 py-3 text-black transition hover:brightness-95">
                  Train assistant
                  <ChevronRight class="h-4 w-4" />
                </NuxtLink>
              </div>
            </div>

            <div v-else class="flex min-h-[13rem] flex-col items-center justify-center rounded-[0.39rem] border border-dashed border-foreground/[0.08] bg-background/35 p-6 text-center">
              <MessageCircle class="mb-4 h-10 w-10 text-foreground/20" />
              <h3 class="text-base font-bold text-foreground">No school flow yet</h3>
              <p class="mt-2 max-w-xs text-xs leading-relaxed text-foreground/50">Train a tutor or admissions assistant, then connect it to WhatsApp or Instagram.</p>
              <NuxtLink to="/dashboard/agents/training" class="dashboard-action-label mt-5 inline-flex items-center gap-2 rounded-[0.39rem] bg-primary px-5 py-3 text-black transition hover:brightness-95">
                Train assistant
                <ChevronRight class="h-4 w-4" />
              </NuxtLink>
            </div>
          </div>
        </section>
      </div>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Tutor activity trend</p>
            <h2 class="dashboard-section-title mt-2">Enrollments over time</h2>
            <p class="dashboard-muted mt-1"><span class="tabular-nums font-bold text-foreground/70">{{ formatNumber(schoolChartTotal) }}</span> tutor sessions in selected range</p>
          </div>
          <div class="flex w-fit rounded-[0.39rem] border border-foreground/10 bg-background/55 p-1">
            <button v-for="filter in chartFilters" :key="filter.value" type="button" :class="['dashboard-action-label rounded-[0.3rem] px-3 py-1.5 transition', chartRange === filter.value ? 'bg-primary text-black shadow-sm shadow-primary/20' : 'text-foreground/45 hover:bg-foreground/5 hover:text-foreground']" @click="chartRange = filter.value">
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background/35 p-4 pl-11" style="background-image: linear-gradient(rgb(var(--surface-border) / 0.055) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--surface-border) / 0.055) 1px, transparent 1px); background-size: 2.25rem 2.25rem;">
          <span v-for="scale in schoolChartScaleLabels" :key="scale.label + scale.position" :class="['absolute left-3 z-20 text-[10px] font-bold tabular-nums text-foreground/40', scale.position]">
            {{ scale.label }}
          </span>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="relative z-10 h-52 w-full overflow-visible">
            <path v-if="schoolChartAreaPath" :d="schoolChartAreaPath" fill="currentColor" class="text-primary/10" />
            <path v-if="schoolChartPath" :d="schoolChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-primary" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">
            <span>{{ schoolChartSeries[0]?.label }}</span>
            <span>Peak {{ formatNumber(schoolChartMax) }}</span>
            <span>{{ schoolChartSeries[schoolChartSeries.length - 1]?.label }}</span>
          </div>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 sm:p-5">
          <div class="flex flex-col gap-3 border-b border-foreground/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="dashboard-eyebrow text-primary/80">Tutor settings</p>
              <h2 class="text-sm font-bold text-foreground">Paid tutor session rules</h2>
              <p class="mt-1 text-xs text-foreground/45">Time starts after confirmed payment; learning stays inside chat.</p>
            </div>
            <button :disabled="schoolSettingsSaving || !selectedSchoolAssistantId" class="inline-flex h-8 items-center justify-center rounded-[0.39rem] bg-primary px-3 text-[11px] font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-50" @click="saveSchoolSettings">
              {{ schoolSettingsSaving ? "Saving..." : "Save settings" }}
            </button>
          </div>

          <div class="grid gap-3 pt-4 lg:grid-cols-4">
            <label class="space-y-1.5">
              <span class="text-[11px] font-bold text-foreground/50">Tutor assistant</span>
              <select v-model="selectedSchoolAssistantId" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/40">
                <option v-for="assistant in schoolAssistants" :key="assistant.id" :value="assistant.id">{{ assistant.name || "Untitled assistant" }}</option>
              </select>
            </label>
            <label class="space-y-1.5">
              <span class="text-[11px] font-bold text-foreground/50">Price / duration</span>
              <div class="grid grid-cols-2 gap-2">
                <input v-model.number="schoolPlan.price" type="number" min="0" class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" />
                <input v-model.number="schoolPlan.duration_minutes" type="number" min="1" class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" />
              </div>
            </label>
            <label class="space-y-1.5">
              <span class="text-[11px] font-bold text-foreground/50">Quiz questions</span>
              <div class="grid grid-cols-3 gap-2">
                <input v-model.number="schoolPlan.default_question_count" type="number" min="1" class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" title="Default" />
                <input v-model.number="schoolPlan.min_question_count" type="number" min="1" class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" title="Min" />
                <input v-model.number="schoolPlan.max_question_count" type="number" min="1" class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" title="Max" />
              </div>
            </label>
            <label class="space-y-1.5">
              <span class="text-[11px] font-bold text-foreground/50">Quiz delivery</span>
              <select v-model="schoolPlan.quiz_delivery_mode" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/40">
                <option value="let_student_choose">Let student choose</option>
                <option value="one_by_one">One by one</option>
                <option value="all_at_once">All at once</option>
              </select>
              <label class="flex items-center gap-2 pt-1 text-[11px] font-semibold text-foreground/55">
                <input v-model="schoolPlan.allow_student_question_count" type="checkbox" class="h-3.5 w-3.5 accent-primary" />
                Student can choose count
              </label>
            </label>
          </div>
        </section>

        <aside class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5">
          <p class="dashboard-eyebrow text-primary/80">School shortcuts</p>
          <div class="mt-4 space-y-2">
            <NuxtLink to="/dashboard/school/registration" class="flex items-center justify-between gap-3 rounded-[0.39rem] bg-background/45 p-3 text-xs font-bold text-foreground/65 transition hover:bg-primary/[0.055] hover:text-primary">
              <span class="inline-flex items-center gap-2"><ClipboardList class="h-4 w-4" />Registration dashboard</span>
              <ChevronRight class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink to="#tutor-enrollments" class="flex items-center justify-between gap-3 rounded-[0.39rem] bg-background/45 p-3 text-xs font-bold text-foreground/65 transition hover:bg-primary/[0.055] hover:text-primary">
              <span class="inline-flex items-center gap-2"><Users class="h-4 w-4" />Tutor enrollments</span>
              <ChevronRight class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink to="#active-school-flows" class="flex items-center justify-between gap-3 rounded-[0.39rem] bg-background/45 p-3 text-xs font-bold text-foreground/65 transition hover:bg-primary/[0.055] hover:text-primary">
              <span class="inline-flex items-center gap-2"><GraduationCap class="h-4 w-4" />Active flows</span>
              <ChevronRight class="h-4 w-4" />
            </NuxtLink>
          </div>

          <div class="mt-5 border-t border-foreground/10 pt-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="dashboard-eyebrow text-primary/80">Registered students</p>
                <p class="mt-1 text-xs font-semibold text-foreground/45">Latest admissions names</p>
              </div>
              <NuxtLink to="/dashboard/school/registration" class="text-[11px] font-bold text-primary transition hover:text-primary-accent">View all</NuxtLink>
            </div>
            <div v-if="recentRegisteredStudents.length" class="mt-3 space-y-2">
              <NuxtLink
                v-for="student in recentRegisteredStudents"
                :key="student.id"
                to="/dashboard/school/registration"
                class="block rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3 transition hover:border-primary/20 hover:bg-primary/[0.04]"
              >
                <p class="truncate text-xs font-bold text-foreground">{{ student.name }}</p>
                <p class="mt-1 truncate text-[11px] font-semibold text-foreground/45">{{ student.className }} · {{ student.parent }}</p>
              </NuxtLink>
            </div>
            <div v-else class="mt-3 rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/35 p-3 text-xs font-semibold text-foreground/45">
              No student registrations yet.
            </div>
          </div>
        </aside>
      </section>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5">
        <div id="tutor-enrollments" class="flex flex-col gap-2 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Recent activity</p>
            <h2 class="text-sm font-bold text-foreground">Tutor enrolled students</h2>
            <p class="mt-1 text-xs text-foreground/45">Monitor enrolled students, paid chat-only learning time, mobile money payment state, and quiz attempts.</p>
          </div>
          <button :disabled="schoolMonitoringLoading || !selectedSchoolAssistantId" class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-primary disabled:opacity-50" @click="fetchSchoolMonitoring">
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
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Student</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Session</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Payment</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Time</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Quiz</th>
                <th class="px-4 py-2.5 text-right text-[11px] font-bold text-foreground/45">Conversation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-foreground/10">
              <tr v-for="session in schoolSessions" :key="session.id" class="transition hover:bg-primary/[0.035]">
                <td class="px-4 py-3 align-middle">
                  <p class="max-w-[13rem] truncate text-xs font-bold text-foreground">{{ session.student_name || session.student_phone || "Student" }}</p>
                  <p class="mt-0.5 text-[11px] font-semibold text-foreground/45">{{ session.student_phone || session.student_email || "No contact saved" }}</p>
                </td>
                <td class="px-4 py-3 align-middle">
                  <span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(session.status)]">{{ statusLabel(session.status) }}</span>
                  <p class="mt-1 text-[11px] text-foreground/45">{{ formatDate(session.created_at) }}</p>
                </td>
                <td class="px-4 py-3 align-middle">
                  <span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(session.payment_status)]">{{ statusLabel(session.payment_status) }}</span>
                  <p v-if="latestPaymentForSession(session.id)" class="mt-1 text-[11px] text-foreground/45">{{ Number(latestPaymentForSession(session.id)?.amount || 0).toLocaleString() }} {{ latestPaymentForSession(session.id)?.currency || "RWF" }}</p>
                </td>
                <td class="px-4 py-3 align-middle">
                  <div class="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70"><Clock3 class="h-3.5 w-3.5 text-primary" />{{ timeRemainingLabel(session) }}</div>
                  <p class="mt-1 text-[11px] text-foreground/45">Ends {{ formatDate(session.expires_at) }}</p>
                </td>
                <td class="px-4 py-3 align-middle">
                  <div class="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70"><ClipboardList class="h-3.5 w-3.5 text-primary" />{{ quizzesForSession(session.id).length }} attempt{{ quizzesForSession(session.id).length === 1 ? "" : "s" }}</div>
                  <p v-if="quizzesForSession(session.id)[0]" class="mt-1 text-[11px] text-foreground/45">Latest: {{ quizzesForSession(session.id)[0].percentage ?? 0 }}%</p>
                </td>
                <td class="px-4 py-3 text-right align-middle">
                  <NuxtLink v-if="session.chat_session_id" :to="`/dashboard/conversations?session=${session.chat_session_id}`" class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-primary">Open chat</NuxtLink>
                  <span v-else class="text-[11px] font-semibold text-foreground/35">No chat link</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-8 text-center">
          <Clock3 class="mx-auto h-8 w-8 text-foreground/25" />
          <p class="mt-3 text-sm font-bold text-foreground">No tutor enrollments yet</p>
          <p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">Once students pay for tutor time inside WhatsApp/chat, enrolled students, time remaining, payments, and quiz attempts appear here.</p>
        </div>
      </section>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5">
        <div id="active-school-flows" class="flex flex-col gap-2 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Connected channels</p>
            <h2 class="text-sm font-bold text-foreground">Active school flows</h2>
            <p class="mt-1 text-xs text-foreground/45">Flows appear when an assistant has tutor, course, or registration signals and is connected to a channel.</p>
          </div>
          <span class="text-xs font-bold text-foreground/45">{{ schoolFlows.length }} flow{{ schoolFlows.length === 1 ? "" : "s" }}</span>
        </div>

        <div v-if="isLoading" class="space-y-2 p-4">
          <Skeleton v-for="row in 4" :key="row" height="4rem" radius="0.39rem" />
        </div>
        <div v-else-if="schoolFlows.length" class="overflow-x-auto">
          <table class="w-full min-w-[980px] text-left">
            <thead class="border-b border-foreground/10 bg-foreground/[0.025]">
              <tr>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Flow</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Channels</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Training</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Payment</th>
                <th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Status</th>
                <th class="px-4 py-2.5 text-right text-[11px] font-bold text-foreground/45">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-foreground/10">
              <tr v-for="flow in schoolFlows" :key="flow.id" class="transition hover:bg-primary/[0.035]">
                <td class="px-4 py-3 align-middle">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"><GraduationCap class="h-4 w-4" /></span>
                    <div class="min-w-0">
                      <p class="max-w-[16rem] truncate text-xs font-bold text-foreground">{{ flow.title }}</p>
                      <p class="mt-0.5 text-[11px] font-semibold text-foreground/45">{{ flow.assistant || "Tutor assistant" }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 align-middle">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="channel in flow.channels" :key="channel" class="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/55">
                      <component :is="channelIcon(channel)" class="h-3 w-3" />{{ channel }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 align-middle"><span class="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">{{ flow.trainingCount }} source{{ flow.trainingCount === 1 ? "" : "s" }}</span></td>
                <td class="px-4 py-3 align-middle"><span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold', flow.paymentEnabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400']">{{ flow.paymentEnabled ? "Paid session ready" : "Needs payment tool" }}</span></td>
                <td class="px-4 py-3 align-middle"><span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold', flow.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-foreground/5 text-foreground/45']">{{ flow.active ? "Active" : "Paused" }}</span></td>
                <td class="px-4 py-3 text-right align-middle">
                  <div class="flex justify-end gap-2">
                    <NuxtLink :to="manageRoute(flow)" class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:border-primary/20 hover:text-primary"><Settings2 class="h-3.5 w-3.5" />Manage</NuxtLink>
                    <NuxtLink v-for="channel in availableChannelTypes(flow)" :key="channel" :to="flowRoute(flow, channel)" class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 text-[11px] font-bold text-primary transition hover:bg-primary/15">
                      {{ availableChannelTypes(flow).length > 1 ? `Open ${channelName(channel)}` : "Open flow" }}
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
          <p class="mt-3 text-sm font-bold text-foreground">No school learning flows yet</p>
          <p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">Train an assistant with class/module content, connect it to WhatsApp or Instagram, and add paid-session/payment settings when needed.</p>
        </div>
      </section>
    </div>
  </div>
</template>
