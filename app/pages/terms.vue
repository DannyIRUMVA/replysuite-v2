<script setup lang="ts">
import LegalPage from '~~/app/components/legal/LegalPage.vue'

useSeoMeta({
  title: 'Terms of Service | ReplySuite',
  description: 'Read the terms that govern your use of ReplySuite, including account responsibilities, billing, and acceptable use.'
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'accounts', title: 'Accounts' },
  { id: 'acceptable-use', title: 'Acceptable use' },
  { id: 'customer-data', title: 'Customer data' },
  { id: 'billing', title: 'Billing' },
  { id: 'third-party', title: 'Third-party services' },
  { id: 'termination', title: 'Suspension & termination' },
  { id: 'contact', title: 'Contact' }
]
</script>

<template>
  <LegalPage
    badge="Terms"
    title="Terms of service"
    description="These terms explain how you may use ReplySuite, what you are responsible for, and how subscriptions, third-party channels, and account access work."
    last-updated="May 09, 2026"
    :sections="sections"
  >
    <section id="overview">
      <h2>Overview</h2>
      <p>
        By creating an account, accessing the site, or using ReplySuite, you agree to these terms and our <NuxtLink to="/privacy" class="text-primary hover:underline">Privacy Policy</NuxtLink>.
      </p>
      <p>
        ReplySuite provides software for AI chatbot setup, training, deployment, and connected support workflows. These terms govern your use of that software and related services.
      </p>
    </section>

    <section id="accounts">
      <h2>Accounts</h2>
      <p>You are responsible for your account and for activity under it. That includes:</p>
      <ul>
        <li>using accurate registration and billing information;</li>
        <li>keeping login credentials secure;</li>
        <li>promptly reporting unauthorized access or suspected compromise;</li>
        <li>ensuring people you invite or authorize use the service lawfully.</li>
      </ul>
    </section>

    <section id="acceptable-use">
      <h2>Acceptable use</h2>
      <p>You may not use ReplySuite for unlawful, deceptive, harmful, or abusive activity. This includes, without limitation:</p>
      <ul>
        <li>spam, fraud, impersonation, or social-engineering abuse;</li>
        <li>content or workflows that violate third-party platform rules;</li>
        <li>collection or processing of data you do not have the right to use;</li>
        <li>attempts to disrupt, reverse engineer, probe, or misuse the service.</li>
      </ul>
      <p>
        If you deploy an AI chatbot, you remain responsible for how it is configured, what content it is trained on, and how it is presented to end users.
      </p>
    </section>

    <section id="customer-data">
      <h2>Customer data</h2>
      <p>
        You retain responsibility for the business content, uploaded files, web content, prompts, and conversation data you choose to process through ReplySuite.
      </p>
      <p>
        You must have the rights and permissions needed to use that content, including any required notices or disclosures for your own customers.
      </p>
      <p>
        AI-generated outputs can be useful, but they are not guaranteed to be error-free. You should review important workflows and high-risk use cases before relying on automated responses.
      </p>
    </section>

    <section id="billing">
      <h2>Billing</h2>
      <p>
        Some ReplySuite features are offered on paid plans. Paid subscriptions renew according to the billing interval shown at checkout unless canceled under the applicable plan terms.
      </p>
      <p>
        Fees, plan limits, and included usage may change over time. If material billing changes affect your plan, we aim to communicate them in a reasonable way.
      </p>
    </section>

    <section id="third-party">
      <h2>Third-party services</h2>
      <p>
        ReplySuite may integrate with services such as website widgets, WhatsApp-related tooling, analytics tools, payment providers, cloud hosting providers, and database/auth services.
      </p>
      <p>
        Your use of those connected services may also be subject to their own terms, policies, and availability constraints.
      </p>
    </section>

    <section id="termination">
      <h2>Suspension &amp; termination</h2>
      <p>
        We may suspend or terminate access where reasonably necessary to protect the service, comply with law, address abuse, or respond to non-payment or material term violations.
      </p>
      <p>
        You may stop using ReplySuite at any time, subject to any active billing commitments or obligations already incurred.
      </p>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to
        <a href="mailto:legal@replysuite.app" class="text-primary hover:underline">legal@replysuite.app</a>.
      </p>
    </section>
  </LegalPage>
</template>
