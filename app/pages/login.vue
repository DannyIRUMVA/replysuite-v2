<script setup lang="ts">
import {
  Bot,
  CalendarCheck,
  Loader2,
  MessageCircle,
  Sparkles,
  Zap,
} from "lucide-vue-next";

useSeoMeta({
  title: "Sign In | ReplySuite",
  description:
    "Sign in to manage your chatbot, training, and website or WhatsApp deployment.",
});

definePageMeta({
  middleware: "guest",
  layout: false,
});

const supabase = useSupabaseClient();
const route = useRoute();
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const verified = computed(() => route.query.verified === "true");
const redirectPath = computed(() => {
  const redirect = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect;
  const path = typeof redirect === "string" ? redirect : "";
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  if (path.startsWith("/login") || path.startsWith("/register"))
    return "/dashboard";
  if (path === "/dashboard/pricing" || path.startsWith("/dashboard/pricing?"))
    return "/dashboard";
  return path;
});
const currentYear = new Date().getFullYear();

const loginFeatures = [
  {
    title: "Create AI assistant",
    desc: "Launch a calm assistant for your business.",
    icon: Bot,
  },
  {
    title: "Train with PDFs & FAQs",
    desc: "Use documents, website pages, and notes.",
    icon: Sparkles,
  },
  {
    title: "Reply everywhere",
    desc: "Website chat, WhatsApp, and Instagram.",
    icon: MessageCircle,
  },
  {
    title: "Bookings & payments",
    desc: "Capture appointments and mobile payments in chat.",
    icon: CalendarCheck,
  },
];

const { track } = useActivity();

const handleLogin = async (event?: Event) => {
  const form =
    event?.currentTarget instanceof HTMLFormElement
      ? event.currentTarget
      : null;
  const formData = form ? new FormData(form) : null;
  const submittedEmail = String(
    formData?.get("email") || email.value || "",
  ).trim();
  const submittedPassword = String(
    formData?.get("password") || password.value || "",
  );

  email.value = submittedEmail;
  password.value = submittedPassword;

  if (!submittedEmail || !submittedPassword || loading.value) return;

  try {
    loading.value = true;
    errorMsg.value = "";
    const { error } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password: submittedPassword,
    });
    if (error) throw error;

    await track("LOGIN_SUCCESS", { email: submittedEmail });
    await navigateTo(redirectPath.value);
  } catch (err: any) {
    errorMsg.value = err.message;
    await track("LOGIN_FAILED", { email: submittedEmail, error: err.message });
  } finally {
    loading.value = false;
  }
};

const signInWithGoogle = async () => {
  try {
    loading.value = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/confirm`,
      },
    });
    if (error) throw error;
  } catch (err: any) {
    errorMsg.value = err.message;
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex bg-background relative overflow-hidden">
    <div
      class="hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col justify-between p-10 overflow-hidden border-r border-foreground/5 bg-background-card"
    >
      <div
        class="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-primary/10 blur-[120px] rounded-full animate-pulse opacity-50"
      ></div>
      <div
        class="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary-accent/10 blur-[120px] rounded-full opacity-50"
      ></div>

      <div class="relative z-10 flex items-center gap-3">
        <div
          class="w-9 h-9 bg-gradient-to-tr from-primary to-primary-accent rounded-[0.39rem] flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Zap class="text-white w-5 h-5 fill-current" />
        </div>
        <span class="text-lg font-bold tracking-tight text-foreground"
          >replysuite</span
        >
      </div>

      <div class="relative z-10 space-y-6">
        <div class="space-y-3">
          <h2
            class="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.08] text-foreground"
          >
            Sign in and keep building.
          </h2>
          <p
            class="text-foreground/50 text-base max-w-xs font-medium leading-relaxed"
          >
            Manage your chatbot, training, website widget, and WhatsApp setup
            from one dashboard.
          </p>
        </div>

        <div class="grid gap-3 pt-5">
          <div
            v-for="feat in loginFeatures"
            :key="feat.title"
            class="flex items-center gap-3 rounded-[0.39rem] border border-foreground/5 bg-background/35 p-3"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10 text-primary"
            >
              <component :is="feat.icon" class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-foreground">
                {{ feat.title }}
              </h4>
              <p class="truncate text-xs text-foreground/50">{{ feat.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="relative z-10 flex items-center gap-4 text-foreground/50 text-xs font-semibold"
      >
        <span>© {{ currentYear }} ReplySuite Ltd</span>
        <span class="w-12 h-[1px] bg-foreground/10"></span>
        <span>Train once and reply everywhere</span>
      </div>
    </div>

    <div
      class="flex-1 flex flex-col justify-center items-center p-5 md:p-9 lg:p-14 relative bg-background"
    >
      <div class="lg:hidden absolute top-8 left-8 flex items-center gap-3">
        <div
          class="w-8 h-8 bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center"
        >
          <Zap class="text-foreground w-5 h-5 fill-current" />
        </div>
        <span class="text-lg font-bold tracking-tight">replysuite</span>
      </div>

      <div
        class="w-full max-w-[25rem] animate-in fade-in slide-in-from-bottom-4 duration-700"
      >
        <div class="mb-7 text-center lg:text-left">
          <h1 class="text-3xl font-bold tracking-tight mb-2 text-foreground">
            Sign in
          </h1>
          <p class="text-sm text-foreground/50 font-medium leading-relaxed">
            Open your dashboard and continue setup.
          </p>
        </div>

        <div
          v-if="verified"
          class="mb-6 p-3 rounded-[0.39rem] bg-primary/10 border border-primary/20 flex items-center gap-3 animate-in fade-in zoom-in duration-500"
        >
          <div
            class="w-9 h-9 rounded-[0.39rem] bg-primary/20 flex items-center justify-center text-primary"
          >
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground">Email verified.</p>
            <p class="text-[11px] text-foreground/50">You can sign in now.</p>
          </div>
        </div>

        <div>
          <button
            @click="signInWithGoogle"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-3 py-3.5 rounded-[0.39rem] bg-foreground text-background text-sm font-bold hover:opacity-90 transition-all mb-7 shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div class="relative mb-7">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-foreground/5"></div>
            </div>
            <div
              class="relative flex justify-center text-xs px-4 font-semibold text-foreground/50"
            >
              <span class="bg-background px-4">Or sign in with email</span>
            </div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-bold text-foreground/50">Email</label>
              <input
                v-model="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem] px-4 py-3.5 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm"
                placeholder="name@company.com"
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-bold text-foreground/50"
                >Password</label
              >
              <input
                v-model="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem] px-4 py-3.5 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div
              v-if="errorMsg"
              class="text-red-400 text-sm font-semibold leading-relaxed bg-red-400/5 p-3 rounded-[0.39rem] border border-red-400/10"
            >
              {{ errorMsg }}
            </div>

            <div class="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="w-full h-12 bg-gradient-to-tr from-primary to-primary-accent text-black text-sm font-bold rounded-[0.39rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
                <span v-else>Sign in</span>
              </button>

              <NuxtLink
                to="/register"
                class="w-full py-3.5 text-center text-xs font-bold text-foreground/50 hover:text-foreground transition-colors border border-foreground/5 rounded-[0.39rem]"
              >
                Need an account?
                <span class="text-primary font-bold">Start free</span>
              </NuxtLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
