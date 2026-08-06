<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Lock,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  XCircle,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "School Registration | ReplySuite" });

const supabase = useSupabaseClient();
const notify = useNotify();
const { userId } = useAuth();
const { canUseSchoolRegistration } = usePlanAccess();

const assistants = ref<any[]>([]);
const selectedAssistantId = ref("");
const formId = ref("");
const loading = ref(false);
const saving = ref(false);
const registrationsLoading = ref(false);
const registrations = ref<any[]>([]);
const payments = ref<any[]>([]);
const search = ref("");
const selectedRegistrationId = ref("");
const showSetupForm = ref(false);

const form = reactive({
  name: "Student Registration",
  description: "Collect student admissions information inside WhatsApp/chat.",
  is_active: true,
  payment_required: false,
  registration_fee: 0,
  currency: "RWF",
  requires_approval: true,
  academic_year: "",
  intake_label: "",
  confirmation_message:
    "Registration submitted. The school team will follow up.",
  pending_approval_message:
    "Registration received and is waiting for school approval.",
  approval_message: "Registration approved.",
  rejection_message: "Registration was not approved at this time.",
});

const defaultFields = [
  ["student_name", "Student full name", "text", true, true, 10],
  ["date_of_birth", "Date of birth / age", "text", false, true, 20],
  ["gender", "Gender", "select", false, true, 30],
  ["class_applying_for", "Class / grade applying for", "text", true, true, 40],
  ["previous_school", "Previous school", "text", false, true, 50],
  ["parent_name", "Parent / guardian full name", "text", true, true, 60],
  ["parent_phone", "Parent / guardian phone", "phone", true, true, 70],
  ["parent_email", "Parent / guardian email", "email", false, true, 80],
  ["home_address", "Home address", "textarea", false, true, 90],
  ["emergency_contact", "Emergency contact", "phone", false, true, 100],
  ["notes", "Notes", "textarea", false, true, 110],
].map(([field_key, label, field_type, required, enabled, sort_order]) => ({
  id: "",
  field_key,
  label,
  field_type,
  required,
  enabled,
  sort_order,
}));
const fields = ref<any[]>(defaultFields.map((field) => ({ ...field })));

const selectedAssistant = computed(
  () =>
    assistants.value.find(
      (assistant) => assistant.id === selectedAssistantId.value,
    ) || null,
);

const paymentByRegistration = computed(() => {
  const map = new Map<string, any>();
  for (const payment of payments.value) {
    if (!map.has(payment.registration_id))
      map.set(payment.registration_id, payment);
  }
  return map;
});

const filteredRegistrations = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return registrations.value;
  return registrations.value.filter((registration) =>
    [
      registration.student_name,
      registration.parent_name,
      registration.parent_phone,
      registration.class_applying_for,
      registration.status,
      registration.payment_status,
      registration.approval_status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  );
});

const selectedRegistration = computed(
  () => registrations.value.find((item) => item.id === selectedRegistrationId.value) || null,
);

const selectedRegistrationPayment = computed(() =>
  selectedRegistration.value
    ? paymentByRegistration.value.get(selectedRegistration.value.id)
    : null,
);

const openRegistrationModal = (registration: any) => {
  selectedRegistrationId.value = registration?.id || "";
};

const closeRegistrationModal = () => {
  selectedRegistrationId.value = "";
};

const answerEntries = (registration: any) =>
  Object.entries(registration?.answers || {}).filter(([, value]) =>
    Array.isArray(value) ? value.length : value !== null && value !== undefined && value !== "",
  );

const registrationSetupComplete = computed(() => Boolean(formId.value && selectedAssistantId.value));

const stats = computed(() => ({
  total: registrations.value.length,
  pendingApproval: registrations.value.filter((item) =>
    ["pending_approval", "paid_pending_approval"].includes(item.status),
  ).length,
  pendingPayment: registrations.value.filter(
    (item) =>
      item.status === "pending_payment" || item.payment_status === "pending",
  ).length,
  approved: registrations.value.filter((item) => item.status === "approved")
    .length,
}));

const statusTone = (status: string) => {
  if (["approved", "submitted", "paid"].includes(status))
    return "bg-emerald-400/10 text-emerald-400";
  if (
    [
      "pending",
      "pending_payment",
      "pending_approval",
      "paid_pending_approval",
      "unpaid",
    ].includes(status)
  )
    return "bg-amber-400/10 text-amber-400";
  if (
    ["rejected", "payment_failed", "failed", "cancelled", "refunded"].includes(
      status,
    )
  )
    return "bg-red-400/10 text-red-400";
  return "bg-foreground/5 text-foreground/45";
};
const statusLabel = (status: string) =>
  String(status || "unknown").replaceAll("_", " ");
const isRegistrationApproved = (registration: any) =>
  registration?.status === "approved" || registration?.approval_status === "approved";
const isRegistrationRejected = (registration: any) =>
  registration?.status === "rejected" || registration?.approval_status === "rejected";
const canApproveRegistration = (registration: any) =>
  Boolean(registration?.id) && !isRegistrationApproved(registration);
const canRejectRegistration = (registration: any) =>
  Boolean(registration?.id) && !isRegistrationRejected(registration);
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const syncForm = (row: any) => {
  formId.value = row?.id || "";
  form.name = row?.name || "Student Registration";
  form.description =
    row?.description ||
    "Collect student admissions information inside WhatsApp/chat.";
  form.is_active = row?.is_active !== false;
  form.payment_required = Boolean(row?.payment_required);
  form.registration_fee = Number(row?.registration_fee || 0);
  form.currency = row?.currency || "RWF";
  form.requires_approval = row?.requires_approval !== false;
  form.academic_year = row?.academic_year || "";
  form.intake_label = row?.intake_label || "";
  form.confirmation_message =
    row?.confirmation_message || form.confirmation_message;
  form.pending_approval_message =
    row?.pending_approval_message || form.pending_approval_message;
  form.approval_message = row?.approval_message || form.approval_message;
  form.rejection_message = row?.rejection_message || form.rejection_message;
};

const loadAssistants = async () => {
  if (!userId.value || !canUseSchoolRegistration.value) return;
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select("id, name, enabled_tools, tools_config, created_at")
      .eq("user_id", userId.value)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    assistants.value = data || [];
    selectedAssistantId.value =
      assistants.value.find((assistant) => {
        const tools = Array.isArray(assistant.enabled_tools)
          ? assistant.enabled_tools
          : [];
        return (
          assistant.tools_config?.school_registration?.enabled ||
          tools.some((tool: string) =>
            [
              "school_registration",
              "student_registration",
              "admissions",
            ].includes(tool),
          )
        );
      })?.id ||
      assistants.value[0]?.id ||
      "";
    await loadRegistrationModule();
  } catch (error: any) {
    notify.error(error?.message || "Unable to load school registration.");
  } finally {
    loading.value = false;
  }
};

const seedFields = async (id: string) => {
  try {
    const { error } = await supabase.rpc(
      "seed_school_registration_default_fields",
      { target_form_id: id },
    );
    if (!error) return;
  } catch {}
  await supabase.from("school_registration_fields").upsert(
    defaultFields.map((field) => ({ ...field, form_id: id, id: undefined })),
    { onConflict: "form_id,field_key" },
  );
};

const loadRegistrationModule = async () => {
  if (!selectedAssistantId.value || !canUseSchoolRegistration.value) return;
  registrationsLoading.value = true;
  try {
    const { data: formRow, error: formError } = await supabase
      .from("school_registration_forms")
      .select("*")
      .eq("chatbot_id", selectedAssistantId.value)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (formError && formError.code !== "PGRST116") throw formError;
    syncForm(formRow);
    showSetupForm.value = !formRow?.id;

    if (formRow?.id) {
      await seedFields(formRow.id);
      const { data: fieldRows } = await supabase
        .from("school_registration_fields")
        .select(
          "id, field_key, label, field_type, required, enabled, sort_order",
        )
        .eq("form_id", formRow.id)
        .order("sort_order", { ascending: true });
      fields.value = fieldRows?.length
        ? fieldRows
        : defaultFields.map((field) => ({ ...field }));
    } else {
      fields.value = defaultFields.map((field) => ({ ...field }));
    }

    await loadRegistrations();
  } catch (error: any) {
    notify.error(error?.message || "Unable to load registration settings.");
  } finally {
    registrationsLoading.value = false;
  }
};

const loadRegistrations = async () => {
  if (!selectedAssistantId.value) return;
  const { data: rows, error } = await supabase
    .from("school_student_registrations")
    .select("*")
    .eq("chatbot_id", selectedAssistantId.value)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  registrations.value = rows || [];
  const ids = registrations.value.map((item) => item.id);
  if (!ids.length) {
    payments.value = [];
    return;
  }
  const { data: paymentRows } = await supabase
    .from("school_registration_payments")
    .select("*")
    .in("registration_id", ids)
    .order("created_at", { ascending: false });
  payments.value = paymentRows || [];
};

const saveSettings = async () => {
  if (!selectedAssistant.value || !canUseSchoolRegistration.value) return;
  saving.value = true;
  try {
    const payload = {
      chatbot_id: selectedAssistantId.value,
      owner_id: userId.value,
      name: form.name || "Student Registration",
      description: form.description || null,
      is_active: true,
      payment_required: Boolean(form.payment_required),
      registration_fee: Number(form.registration_fee || 0),
      currency: form.currency || "RWF",
      requires_approval: Boolean(form.requires_approval),
      academic_year: form.academic_year || null,
      intake_label: form.intake_label || null,
      confirmation_message: form.confirmation_message || null,
      pending_approval_message: form.pending_approval_message || null,
      approval_message: form.approval_message || null,
      rejection_message: form.rejection_message || null,
    };

    let id = formId.value;
    if (id) {
      const { error } = await supabase
        .from("school_registration_forms")
        .update(payload)
        .eq("id", id)
        .eq("chatbot_id", selectedAssistantId.value);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("school_registration_forms")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
      formId.value = id;
    }

    const fieldRows = fields.value.map((field, index) => ({
      ...(field.id ? { id: field.id } : {}),
      form_id: id,
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type || "text",
      required: Boolean(field.required),
      enabled: Boolean(field.enabled),
      sort_order: Number(field.sort_order || (index + 1) * 10),
    }));
    const { error: fieldsError } = await supabase
      .from("school_registration_fields")
      .upsert(fieldRows, { onConflict: "form_id,field_key" });
    if (fieldsError) throw fieldsError;

    const currentTools = new Set(
      Array.isArray(selectedAssistant.value.enabled_tools)
        ? selectedAssistant.value.enabled_tools
        : [],
    );
    currentTools.add("school_registration");
    currentTools.add("payments");
    const previousConfig = selectedAssistant.value.tools_config || {};
    const nextConfig = {
      ...previousConfig,
      school_registration: {
        ...(previousConfig.school_registration || {}),
        enabled: true,
        payment_required: Boolean(form.payment_required),
        registration_fee: Number(form.registration_fee || 0),
        currency: form.currency || "RWF",
        requires_approval: Boolean(form.requires_approval),
        academic_year: form.academic_year || null,
        intake_label: form.intake_label || null,
        updated_at: new Date().toISOString(),
      },
      website_payment: {
        ...(previousConfig.website_payment || {}),
        enabled: true,
        provider: "replysuite_mobile_payment_worker",
      },
    };
    const { error: assistantError } = await supabase
      .from("chatbots")
      .update({
        enabled_tools: Array.from(currentTools),
        tools_config: nextConfig,
      })
      .eq("id", selectedAssistantId.value)
      .eq("user_id", userId.value);
    if (assistantError) throw assistantError;

    notify.success("School registration settings saved.");
    showSetupForm.value = false;
    await loadRegistrationModule();
  } catch (error: any) {
    notify.error(error?.message || "Unable to save registration settings.");
  } finally {
    saving.value = false;
  }
};

const setApproval = async (registration: any, approved: boolean) => {
  const reason = approved
    ? ""
    : window.prompt("Reason for rejection?", "") || "";
  const update = approved
    ? {
        status: "approved",
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: userId.value,
        rejected_at: null,
        rejection_reason: null,
      }
    : {
        status: "rejected",
        approval_status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      };
  const { error } = await supabase
    .from("school_student_registrations")
    .update(update)
    .eq("id", registration.id)
    .eq("chatbot_id", selectedAssistantId.value);
  if (error) {
    notify.error(error.message);
    return;
  }
  await supabase.from("school_registration_events").insert({
    registration_id: registration.id,
    chatbot_id: selectedAssistantId.value,
    event_type: approved ? "approved" : "rejected",
    metadata: approved ? {} : { reason },
  });
  notify.success(
    approved ? "Registration approved." : "Registration rejected.",
  );
  await loadRegistrations();
};

watch(selectedAssistantId, () => {
  selectedRegistrationId.value = "";
  void loadRegistrationModule();
});
watch(userId, () => void loadAssistants());
watch(filteredRegistrations, (rows) => {
  if (
    selectedRegistrationId.value &&
    !rows.some((registration) => registration.id === selectedRegistrationId.value)
  ) {
    selectedRegistrationId.value = "";
  }
});
onMounted(loadAssistants);
</script>

<template>
  <div class="min-h-[calc(100vh-4.5rem)] space-y-5 pb-20 pt-3">
    <section v-if="!canUseSchoolRegistration" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-8 text-center shadow-sm shadow-black/5">
      <Lock class="mx-auto h-9 w-9 text-foreground/30" />
      <h1 class="mt-4 text-xl font-black text-foreground">School Registration is Enterprise-only</h1>
      <p class="mx-auto mt-2 max-w-2xl text-sm leading-6 text-foreground/55">Collect student applications, registration fees, and approval workflows directly from WhatsApp/chat with a dedicated admissions dashboard.</p>
      <NuxtLink to="/dashboard/pricing" class="mt-5 inline-flex h-9 items-center justify-center rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:bg-primary-accent">Upgrade to Enterprise</NuxtLink>
    </section>

    <template v-else>
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <NuxtLink to="/dashboard/school" class="dashboard-action-label inline-flex h-8 items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-foreground/55 transition hover:border-primary/20 hover:text-primary">
              <ArrowLeft class="h-3.5 w-3.5" />
              Back to School dashboard
            </NuxtLink>
            <p class="dashboard-eyebrow mt-3 text-primary/80">Admissions flow</p>
            <h1 class="dashboard-section-title mt-2">Student registration</h1>
            <p class="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/65">Configure the admissions bot, review registered students, and open each student record in a focused dashboard modal.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button :disabled="registrationsLoading || !selectedAssistantId" class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-xs font-bold text-foreground/65 transition hover:text-primary disabled:opacity-50" @click="loadRegistrationModule"><RefreshCw class="h-3.5 w-3.5" /> Refresh</button>
          </div>
        </div>
      </section>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="card in [{ label: 'Registered students', value: stats.total, icon: ClipboardList }, { label: 'Pending approval', value: stats.pendingApproval, icon: UserCheck }, { label: 'Pending payment', value: stats.pendingPayment, icon: RefreshCw }, { label: 'Approved students', value: stats.approved, icon: CheckCircle2 }]" :key="card.label" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5">
          <div class="flex items-center justify-between gap-3">
            <div><p class="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/40">{{ card.label }}</p><p class="mt-2 text-2xl font-black text-foreground">{{ card.value }}</p></div>
            <span class="flex h-9 w-9 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"><component :is="card.icon" class="h-4 w-4" /></span>
          </div>
        </article>
      </section>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 sm:p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="dashboard-eyebrow text-primary/80">Registration setup</p>
            <h2 class="mt-2 text-sm font-bold text-foreground">
              {{ registrationSetupComplete ? `${form.name || "Student Registration"} is configured` : "Configure admissions setup" }}
            </h2>
            <p class="mt-1 text-xs text-foreground/45">
              {{ selectedAssistant?.name || "Admissions assistant" }} · {{ form.payment_required ? `${Number(form.registration_fee || 0).toLocaleString()} ${form.currency || 'RWF'} fee` : "No registration fee" }} · {{ form.requires_approval ? "Approval required" : "Auto-submit" }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-primary"
            @click="showSetupForm = true"
          >
            {{ registrationSetupComplete ? "Edit setup" : "Configure setup" }}
          </button>
        </div>
      </section>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5">
        <div class="flex flex-col gap-3 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 class="text-sm font-bold text-foreground">Registered students dashboard</h2><p class="mt-1 text-xs text-foreground/45">Review applications, open a student modal, and approve or reject admissions records.</p></div>
          <label class="relative block w-full sm:w-72"><Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/35" /><input v-model="search" placeholder="Search registrations..." class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 pl-8 pr-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
        </div>
        <div v-if="registrationsLoading" class="space-y-2 p-4"><Skeleton v-for="row in 4" :key="row" height="4rem" radius="0.39rem" /></div>
        <div v-else-if="filteredRegistrations.length" class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="border-b border-foreground/10 bg-foreground/[0.025]"><tr><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Student</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Parent</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Class</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Payment</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Approval</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Submitted</th><th class="px-4 py-2.5 text-right text-[11px] font-bold text-foreground/45">Actions</th></tr></thead>
            <tbody class="divide-y divide-foreground/10">
              <tr v-for="registration in filteredRegistrations" :key="registration.id" :class="['transition hover:bg-primary/[0.035]', selectedRegistration?.id === registration.id ? 'bg-primary/[0.055]' : '']">
                <td class="px-4 py-3 align-middle"><p class="max-w-[14rem] truncate text-xs font-bold text-foreground">{{ registration.student_name || registration.answers?.student_name || "Student" }}</p><span :class="['mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(registration.status)]">{{ statusLabel(registration.status) }}</span></td>
                <td class="px-4 py-3 align-middle"><p class="text-xs font-bold text-foreground/75">{{ registration.parent_name || registration.answers?.parent_name || "—" }}</p><p class="mt-0.5 text-[11px] text-foreground/45">{{ registration.parent_phone || registration.answers?.parent_phone || "No phone" }}</p></td>
                <td class="px-4 py-3 text-xs font-semibold text-foreground/65">{{ registration.class_applying_for || registration.answers?.class_applying_for || "—" }}</td>
                <td class="px-4 py-3 align-middle"><span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(registration.payment_status)]">{{ statusLabel(registration.payment_status) }}</span><p v-if="paymentByRegistration.get(registration.id)" class="mt-1 text-[11px] text-foreground/45">{{ Number(paymentByRegistration.get(registration.id)?.amount || 0).toLocaleString() }} {{ paymentByRegistration.get(registration.id)?.currency || form.currency }}</p></td>
                <td class="px-4 py-3 align-middle"><span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(registration.approval_status)]">{{ statusLabel(registration.approval_status) }}</span></td>
                <td class="px-4 py-3 text-xs font-semibold text-foreground/55">{{ formatDate(registration.created_at) }}</td>
                <td class="px-4 py-3 text-right align-middle"><div class="flex justify-end gap-2"><button class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-primary" @click="openRegistrationModal(registration)">View</button><button v-if="canApproveRegistration(registration)" class="inline-flex h-8 items-center justify-center rounded-[0.39rem] bg-emerald-400/15 px-3 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-400/20" @click="setApproval(registration, true)">Approve</button><span v-else class="inline-flex h-8 items-center justify-center rounded-[0.39rem] bg-emerald-400/10 px-3 text-[11px] font-bold text-emerald-400">Approved</span></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-8 text-center"><ClipboardList class="mx-auto h-8 w-8 text-foreground/25" /><p class="mt-3 text-sm font-bold text-foreground">No registered students yet</p><p class="mx-auto mt-1 max-w-xl text-xs leading-5 text-foreground/45">When parents submit the registration flow, student records will appear here for review.</p></div>
      </section>
    </template>

    <Transition
      enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSetupForm"
        class="fixed inset-0 z-[255] flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        @click.self="registrationSetupComplete ? (showSetupForm = false) : undefined"
      >
        <section class="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-2xl shadow-black/30">
          <header class="flex items-start justify-between gap-4 border-b border-foreground/10 p-4 sm:p-5">
            <div class="min-w-0">
              <p class="dashboard-eyebrow text-primary/80">Registration setup</p>
              <h2 class="mt-2 text-lg font-black tracking-tight text-foreground">Admissions flow settings</h2>
              <p class="mt-1 text-xs font-semibold text-foreground/45">Pick the admissions assistant, fee rule, approval behavior, and required student fields.</p>
            </div>
            <button
              v-if="registrationSetupComplete"
              type="button"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 text-lg leading-none text-foreground/45 transition hover:text-foreground"
              aria-label="Close registration setup"
              @click="showSetupForm = false"
            >
              ×
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <section class="rounded-[0.39rem] border border-foreground/10 bg-background/35 p-4 shadow-sm shadow-black/5 sm:p-5">
              <div class="flex flex-col gap-3 border-b border-foreground/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 class="text-sm font-bold text-foreground">Flow setup</h3><p class="mt-1 text-xs text-foreground/45">These settings control what the registration bot collects and what happens after submission.</p></div>
                <label class="w-full space-y-1.5 sm:w-72"><span class="text-[11px] font-bold text-foreground/50">Assistant</span><select v-model="selectedAssistantId" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"><option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id">{{ assistant.name || "Untitled assistant" }}</option></select></label>
              </div>
              <div v-if="loading" class="grid gap-3 pt-4 lg:grid-cols-4"><Skeleton v-for="row in 8" :key="row" height="3rem" radius="0.39rem" /></div>
              <div v-else class="grid gap-3 pt-4 lg:grid-cols-4">
                <label class="space-y-1.5 lg:col-span-2"><span class="text-[11px] font-bold text-foreground/50">Form name</span><input v-model="form.name" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
                <label class="space-y-1.5"><span class="text-[11px] font-bold text-foreground/50">Academic year</span><input v-model="form.academic_year" placeholder="2026" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
                <label class="space-y-1.5"><span class="text-[11px] font-bold text-foreground/50">Intake</span><input v-model="form.intake_label" placeholder="KG intake" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
                <label class="flex items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3 text-xs font-bold text-foreground/70"><input v-model="form.payment_required" type="checkbox" class="h-3.5 w-3.5 accent-primary" /> Registration fee required</label>
                <label class="space-y-1.5"><span class="text-[11px] font-bold text-foreground/50">Fee</span><input v-model.number="form.registration_fee" :disabled="!form.payment_required" type="number" min="0" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40 disabled:opacity-50" /></label>
                <label class="space-y-1.5"><span class="text-[11px] font-bold text-foreground/50">Currency</span><input v-model="form.currency" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
                <label class="flex items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3 text-xs font-bold text-foreground/70"><input v-model="form.requires_approval" type="checkbox" class="h-3.5 w-3.5 accent-primary" /> Wait for admin approval</label>
                <label class="space-y-1.5 lg:col-span-2"><span class="text-[11px] font-bold text-foreground/50">Pending approval message</span><input v-model="form.pending_approval_message" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
                <label class="space-y-1.5 lg:col-span-2"><span class="text-[11px] font-bold text-foreground/50">Approval message</span><input v-model="form.approval_message" class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></label>
              </div>
            </section>

            <section class="mt-4 rounded-[0.39rem] border border-foreground/10 bg-background/35 shadow-sm shadow-black/5">
              <div class="border-b border-foreground/10 p-4"><h3 class="text-sm font-bold text-foreground">Required information</h3><p class="mt-1 text-xs text-foreground/45">Choose what the bot collects before payment or approval.</p></div>
              <div class="overflow-x-auto"><table class="w-full text-left"><thead class="border-b border-foreground/10 bg-foreground/[0.025]"><tr><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Field</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Label</th><th class="px-4 py-2.5 text-[11px] font-bold text-foreground/45">Type</th><th class="px-4 py-2.5 text-center text-[11px] font-bold text-foreground/45">Enabled</th><th class="px-4 py-2.5 text-center text-[11px] font-bold text-foreground/45">Required</th></tr></thead><tbody class="divide-y divide-foreground/10"><tr v-for="field in fields" :key="field.field_key" class="hover:bg-primary/[0.035]"><td class="px-4 py-3 text-xs font-bold text-foreground/60">{{ field.field_key }}</td><td class="px-4 py-3"><input v-model="field.label" class="h-8 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40" /></td><td class="px-4 py-3"><select v-model="field.field_type" class="h-8 w-full rounded-[0.39rem] border border-foreground/10 bg-background/60 px-2 text-xs font-semibold outline-none focus:border-primary/40"><option value="text">Text</option><option value="phone">Phone</option><option value="email">Email</option><option value="number">Number</option><option value="date">Date</option><option value="select">Select</option><option value="textarea">Textarea</option></select></td><td class="px-4 py-3 text-center"><input v-model="field.enabled" type="checkbox" class="h-3.5 w-3.5 accent-primary" /></td><td class="px-4 py-3 text-center"><input v-model="field.required" :disabled="!field.enabled" type="checkbox" class="h-3.5 w-3.5 accent-primary disabled:opacity-40" /></td></tr></tbody></table></div>
            </section>
          </div>

          <footer class="flex flex-wrap justify-end gap-2 border-t border-foreground/10 p-4">
            <button
              v-if="registrationSetupComplete"
              type="button"
              class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-foreground"
              @click="showSetupForm = false"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="saving || !selectedAssistantId"
              class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 text-[11px] font-bold text-black transition hover:bg-primary-accent disabled:opacity-50"
              @click="saveSettings"
            >
              <Save class="h-3.5 w-3.5" /> {{ saving ? "Saving..." : "Save setup" }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="selectedRegistration"
        class="fixed inset-0 z-[260] flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        @click.self="closeRegistrationModal"
      >
        <section class="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-2xl shadow-black/30">
          <header class="flex items-start justify-between gap-4 border-b border-foreground/10 p-4 sm:p-5">
            <div class="min-w-0">
              <p class="dashboard-eyebrow text-primary/80">Student record</p>
              <h2 class="mt-2 truncate text-lg font-black tracking-tight text-foreground">
                {{ selectedRegistration.student_name || selectedRegistration.answers?.student_name || "Student" }}
              </h2>
              <p class="mt-1 text-xs font-semibold text-foreground/45">
                {{ selectedRegistration.class_applying_for || selectedRegistration.answers?.class_applying_for || "Class not set" }} · Submitted {{ formatDate(selectedRegistration.created_at) }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 text-lg leading-none text-foreground/45 transition hover:text-foreground"
              aria-label="Close student record"
              @click="closeRegistrationModal"
            >
              ×
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div class="flex flex-wrap gap-1.5">
              <span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(selectedRegistration.status)]">{{ statusLabel(selectedRegistration.status) }}</span>
              <span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(selectedRegistration.payment_status)]">Payment {{ statusLabel(selectedRegistration.payment_status) }}</span>
              <span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTone(selectedRegistration.approval_status)]">Approval {{ statusLabel(selectedRegistration.approval_status) }}</span>
            </div>

            <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-3">
              <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3">
                <dt class="font-bold text-foreground/45">Parent</dt>
                <dd class="mt-1 font-semibold text-foreground/75">{{ selectedRegistration.parent_name || selectedRegistration.answers?.parent_name || "—" }}</dd>
                <dd class="mt-0.5 text-foreground/45">{{ selectedRegistration.parent_phone || selectedRegistration.answers?.parent_phone || "No phone" }}</dd>
              </div>
              <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3">
                <dt class="font-bold text-foreground/45">Submitted</dt>
                <dd class="mt-1 font-semibold text-foreground/75">{{ formatDate(selectedRegistration.created_at) }}</dd>
              </div>
              <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3">
                <dt class="font-bold text-foreground/45">Payment record</dt>
                <dd class="mt-1 font-semibold text-foreground/75">
                  {{ selectedRegistrationPayment ? `${Number(selectedRegistrationPayment.amount || 0).toLocaleString()} ${selectedRegistrationPayment.currency || form.currency}` : "No payment record" }}
                </dd>
              </div>
            </dl>

            <div v-if="answerEntries(selectedRegistration).length" class="mt-5 space-y-2">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/40">All answers</p>
              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="([key, value]) in answerEntries(selectedRegistration)"
                  :key="key"
                  class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                >
                  <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">{{ key.replaceAll('_', ' ') }}</p>
                  <p class="mt-1 break-words text-xs font-semibold text-foreground/70">{{ Array.isArray(value) ? value.join(', ') : value }}</p>
                </div>
              </div>
            </div>
          </div>

          <footer class="flex flex-wrap justify-end gap-2 border-t border-foreground/10 p-4">
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 text-[11px] font-bold text-foreground/65 transition hover:text-foreground"
              @click="closeRegistrationModal"
            >
              Close
            </button>
            <button
              v-if="canRejectRegistration(selectedRegistration)"
              type="button"
              class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] bg-red-400/10 px-3 text-[11px] font-bold text-red-400 transition hover:bg-red-400/15"
              @click="setApproval(selectedRegistration, false)"
            >
              <XCircle class="h-3.5 w-3.5" /> Reject
            </button>
            <button
              v-if="canApproveRegistration(selectedRegistration)"
              type="button"
              class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] bg-emerald-400/15 px-3 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-400/20"
              @click="setApproval(selectedRegistration, true)"
            >
              <CheckCircle2 class="h-3.5 w-3.5" /> Approve
            </button>
            <span
              v-else
              class="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.39rem] bg-emerald-400/10 px-3 text-[11px] font-bold text-emerald-400"
            >
              <CheckCircle2 class="h-3.5 w-3.5" /> Approved
            </span>
          </footer>
        </section>
      </div>
    </Transition>
  </div>
</template>
