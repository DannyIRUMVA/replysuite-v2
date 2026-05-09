<script setup lang="ts">
import LegalPage from '~~/app/components/legal/LegalPage.vue'

useSeoMeta({
  title: 'Cookie Policy | ReplySuite',
  description: 'See which cookies ReplySuite uses, what they do, and how to manage cookie preferences.'
})

definePageMeta({
  layout: 'default'
})

const { openSettings } = useCookieConsent()

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'types', title: 'Cookie categories' },
  { id: 'analytics', title: 'Analytics consent' },
  { id: 'manage', title: 'Manage preferences' },
  { id: 'contact', title: 'Contact' }
]

const cookieTypes = [
  {
    title: 'Essential cookies',
    required: true,
    desc: 'Needed for security, core navigation, session handling, account access, and basic product functionality.'
  },
  {
    title: 'Analytics cookies',
    required: false,
    desc: 'Only used if you consent. These help us understand traffic, usage, and site performance.'
  },
  {
    title: 'Functional cookies',
    required: false,
    desc: 'Remember preference-related choices so the website feels more consistent when you return.'
  }
]
</script>

<template>
  <LegalPage
    badge="Cookies"
    title="Cookie policy"
    description="This page explains which cookies and similar storage technologies ReplySuite uses, why we use them, and how you can manage your preferences."
    last-updated="May 09, 2026"
    :sections="sections"
  >
    <section id="overview">
      <h2>Overview</h2>
      <p>
        ReplySuite uses cookies and similar storage technologies to keep the site secure, remember certain preferences, and measure usage only where you have consented to analytics.
      </p>
      <p>
        We do not want cookie controls to be a dark pattern. The goal is to let visitors choose clearly.
      </p>
    </section>

    <section id="types">
      <h2>Cookie categories</h2>
      <div class="grid gap-5 not-prose my-10">
        <div v-for="item in cookieTypes" :key="item.title" class="rounded-[28px] border border-foreground/10 bg-foreground/[0.02] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <h3 class="text-xl font-bold text-foreground mb-2 tracking-tight">{{ item.title }}</h3>
            <p class="text-sm text-foreground/65 font-medium leading-relaxed max-w-2xl">{{ item.desc }}</p>
          </div>
          <div :class="item.required ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-foreground/[0.03] border-foreground/10 text-foreground/55'" class="px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.22em] self-start">
            {{ item.required ? 'Required' : 'Optional' }}
          </div>
        </div>
      </div>
    </section>

    <section id="analytics">
      <h2>Analytics consent</h2>
      <p>
        On a new visit, ReplySuite asks whether you want to allow optional analytics and functional cookies. If you decline, we keep only the essential cookies needed to operate the site.
      </p>
      <p>
        Analytics scripts are not meant to load until consent has been given. If you later change your mind, your updated preference will be stored for future visits.
      </p>
    </section>

    <section id="manage">
      <h2>Manage preferences</h2>
      <p>
        You can reopen the cookie settings modal and update your choices at any time.
      </p>
      <div class="not-prose mt-6">
        <button class="btn-gradient px-8 py-4" @click="openSettings">
          Open cookie settings
        </button>
      </div>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <p>
        Questions about cookie usage or tracking preferences can be sent to
        <a href="mailto:privacy@replysuite.app" class="text-primary hover:underline">privacy@replysuite.app</a>.
      </p>
    </section>
  </LegalPage>
</template>
