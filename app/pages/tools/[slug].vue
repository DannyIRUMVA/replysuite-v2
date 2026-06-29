<script setup lang="ts">
import { ArrowRight, Check, Clipboard, Eraser, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-vue-next'
import { getFreeTool, type FreeToolLength, type FreeToolTone } from '~~/shared/free-tools'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const tool = computed(() => getFreeTool(slug.value))

if (!tool.value) {
  throw createError({ statusCode: 404, statusMessage: 'Free tool not found' })
}

const currentTool = computed(() => tool.value!)
const sampleExample = computed(() => currentTool.value.examples[0])

useSeoMeta({
  title: () => currentTool.value.seoTitle,
  description: () => currentTool.value.seoDescription,
  keywords: () => `${currentTool.value.keyword}, free ${currentTool.value.keyword}, AI reply generator, customer response generator, ReplySuite tools`,
  robots: 'index, follow, max-image-preview:large',
  ogTitle: () => `${currentTool.value.seoTitle} | ReplySuite`,
  ogDescription: () => currentTool.value.seoDescription,
  ogUrl: () => `https://replysuite.app/tools/${currentTool.value.slug}`,
  twitterTitle: () => `${currentTool.value.seoTitle} | ReplySuite`,
  twitterDescription: () => currentTool.value.seoDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: `https://replysuite.app/tools/${currentTool.value.slug}` }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: currentTool.value.title,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: currentTool.value.seoDescription,
        url: `https://replysuite.app/tools/${currentTool.value.slug}`,
        publisher: { '@type': 'Organization', name: 'ReplySuite', url: 'https://replysuite.app' },
      }),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://replysuite.app' },
          { '@type': 'ListItem', position: 2, name: 'Free tools', item: 'https://replysuite.app/tools' },
          { '@type': 'ListItem', position: 3, name: currentTool.value.title, item: `https://replysuite.app/tools/${currentTool.value.slug}` },
        ],
      }),
    },
  ],
}))

const input = ref('')
const businessName = ref('')
const businessType = ref(currentTool.value.businessTypes[0])
const tone = ref<FreeToolTone>('professional')
const length = ref<FreeToolLength>('medium')
const extraContext = ref('')
const reply = ref('')
const errorMessage = ref('')
const isGenerating = ref(false)
const copied = ref(false)
const inputMaxLength = 2500
const remainingCharacters = computed(() => Math.max(0, inputMaxLength - input.value.length))
const canGenerate = computed(() => input.value.trim().length >= 8 && !isGenerating.value)

watch(slug, () => {
  input.value = ''
  businessName.value = ''
  businessType.value = currentTool.value.businessTypes[0]
  tone.value = 'professional'
  length.value = 'medium'
  extraContext.value = ''
  reply.value = ''
  errorMessage.value = ''
})

const fillExample = (value: string) => {
  input.value = value
  reply.value = ''
  errorMessage.value = ''
}

const fillSampleValues = () => {
  businessName.value = businessName.value || 'ReplySuite Demo'
  businessType.value = currentTool.value.businessTypes[0]
  tone.value = 'professional'
  length.value = 'medium'
  input.value = sampleExample.value?.input || currentTool.value.inputPlaceholder
  extraContext.value = 'Keep it helpful, concise, and easy for the customer to act on.'
  reply.value = ''
  errorMessage.value = ''
  copied.value = false
}

const clearForm = () => {
  input.value = ''
  extraContext.value = ''
  reply.value = ''
  errorMessage.value = ''
  copied.value = false
}

const generateReply = async () => {
  if (!canGenerate.value) return

  isGenerating.value = true
  errorMessage.value = ''
  copied.value = false

  try {
    const response = await $fetch<{ success: boolean, reply: string }>('/api/tools/generate', {
      method: 'POST',
      body: {
        slug: currentTool.value.slug,
        input: input.value,
        businessName: businessName.value,
        businessType: businessType.value,
        tone: tone.value,
        length: length.value,
        extraContext: extraContext.value,
      },
    })

    reply.value = response.reply
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.statusMessage || 'Could not generate a reply right now. Please try again.'
  } finally {
    isGenerating.value = false
  }
}

const copyReply = async () => {
  if (!reply.value || !import.meta.client) return
  await navigator.clipboard.writeText(reply.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <main class="min-h-screen overflow-hidden pb-16 pt-10">
    <section class="relative px-4 py-12 sm:px-6 lg:py-20">
      <div class="absolute right-0 top-0 -z-10 h-[420px] w-[min(760px,90vw)] rounded-full bg-primary/10 blur-[140px]"></div>
      <div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div class="lg:sticky lg:top-28">
          <NuxtLink to="/tools" class="inline-flex items-center gap-2 text-sm font-bold text-foreground/60 transition hover:text-primary">
            ← All free tools
          </NuxtLink>
          <div class="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            <Sparkles class="h-4 w-4" /> {{ currentTool.badge }}
          </div>
          <h1 class="mt-6 text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {{ currentTool.title }}
          </h1>
          <p class="mt-5 text-base font-medium leading-relaxed text-foreground/65 sm:text-lg">
            {{ currentTool.description }} Fill the fields or start with sample values, then copy the finished response.
          </p>

          <div class="mt-8 rounded-[30px] border border-primary/20 bg-primary/10 p-5">
            <p class="text-sm font-black uppercase tracking-[0.16em] text-primary">Need this every day?</p>
            <p class="mt-3 text-sm leading-relaxed text-foreground/70">
              Train ReplySuite once and let your assistant reply across website chat, WhatsApp, Instagram, and booking conversations.
            </p>
            <NuxtLink :to="`/register?ref=${currentTool.slug}`" class="btn-gradient mt-5 inline-flex items-center gap-2 px-6 py-3 text-sm font-black">
              Train your assistant
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>

        <form class="rounded-[36px] border border-foreground/10 bg-background-card/80 p-4 shadow-2xl shadow-foreground/5 backdrop-blur-xl sm:p-6 lg:p-8" @submit.prevent="generateReply">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs font-black uppercase tracking-[0.14em] text-foreground/55">Business type</span>
              <select v-model="businessType" class="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50">
                <option v-for="type in currentTool.businessTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-black uppercase tracking-[0.14em] text-foreground/55">Business name</span>
              <input v-model="businessName" type="text" placeholder="Optional" class="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-foreground/45 focus:border-primary/50" />
            </label>
          </div>

          <label class="mt-5 block">
            <span class="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-foreground/55">
              <span>{{ currentTool.inputLabel }}</span>
              <span class="rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[10px] tracking-normal text-foreground/55">Required</span>
            </span>
            <textarea v-model="input" :maxlength="inputMaxLength" :placeholder="currentTool.inputPlaceholder" rows="7" class="mt-2 w-full resize-y rounded-[26px] border border-foreground/10 bg-background px-5 py-4 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-foreground/45 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"></textarea>
          </label>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-foreground/55">
            <span>Paste a real customer message, review, or booking request.</span>
            <span>{{ remainingCharacters }} characters left</span>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-black text-primary transition hover:border-primary/50" @click="fillSampleValues">
              Fill sample values
            </button>
            <button v-for="example in currentTool.examples" :key="example.label" type="button" class="rounded-full border border-foreground/10 px-4 py-2 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-primary" @click="fillExample(example.input)">
              Use {{ example.label }}
            </button>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <span class="text-xs font-black uppercase tracking-[0.14em] text-foreground/55">Tone</span>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button v-for="option in currentTool.tones" :key="option.value" type="button" :aria-pressed="tone === option.value" class="rounded-2xl border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/10" :class="tone === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'" @click="tone = option.value">
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div>
              <span class="text-xs font-black uppercase tracking-[0.14em] text-foreground/55">Length</span>
              <div class="mt-2 grid grid-cols-3 gap-2">
                <button v-for="option in currentTool.lengths" :key="option.value" type="button" :aria-pressed="length === option.value" class="rounded-2xl border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/10" :class="length === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'" @click="length = option.value">
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <label class="mt-5 block">
            <span class="text-xs font-black uppercase tracking-[0.14em] text-foreground/55">Helpful context</span>
            <input v-model="extraContext" type="text" placeholder="Example: Ask them to reply with a booking time." class="mt-2 w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-foreground/45 focus:border-primary/50 focus:ring-4 focus:ring-primary/10" />
          </label>

          <div class="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button type="submit" class="btn-gradient inline-flex w-full items-center justify-center gap-3 px-8 py-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canGenerate">
              <Loader2 v-if="isGenerating" class="h-5 w-5 animate-spin" />
              <Wand2 v-else class="h-5 w-5" />
              {{ isGenerating ? 'Generating reply...' : 'Generate reply' }}
            </button>
            <button type="button" class="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/10 px-5 py-4 text-sm font-black text-foreground/60 transition hover:border-foreground/20 hover:text-foreground" @click="clearForm">
              <Eraser class="h-4 w-4" /> Clear
            </button>
          </div>

          <p v-if="errorMessage" role="alert" class="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
            {{ errorMessage }}
          </p>

          <section v-if="reply" aria-live="polite" class="mt-6 rounded-[30px] border border-primary/20 bg-primary/5 p-5">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div role="heading" aria-level="2" class="text-lg font-black tracking-tight text-foreground">{{ currentTool.outputLabel }}</div>
              <button type="button" class="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-foreground/65 transition hover:border-primary/30 hover:text-primary" @click="copyReply">
                <Check v-if="copied" class="h-4 w-4" />
                <Clipboard v-else class="h-4 w-4" />
                {{ copied ? 'Copied' : 'Copy' }}
              </button>
            </div>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{{ reply }}</p>
            <button type="button" class="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary" @click="generateReply">
              <RefreshCw class="h-4 w-4" /> Generate another version
            </button>
          </section>
        </form>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 sm:px-6">
      <div class="rounded-[30px] border border-foreground/10 bg-foreground/[0.02] p-5 text-center sm:p-6">
        <p class="text-sm font-semibold leading-relaxed text-foreground/65">
          Want replies that already know your policies, booking rules, tone, and channels?
        </p>
        <NuxtLink :to="`/register?ref=${currentTool.slug}`" class="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-black text-primary transition hover:border-primary/50 hover:bg-primary/15">
          Train your ReplySuite assistant
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
