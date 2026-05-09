<script setup lang="ts">
import LegalPage from '~~/app/components/legal/LegalPage.vue'

useSeoMeta({
  title: 'Privacy Policy | ReplySuite',
  description: 'Learn what data ReplySuite collects, how it is used, and how we handle chatbot, account, and customer conversation data.'
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'what-we-collect', title: 'What we collect' },
  { id: 'how-we-use-it', title: 'How we use it' },
  { id: 'providers', title: 'Infrastructure & providers' },
  { id: 'retention', title: 'Retention & deletion' },
  { id: 'rights', title: 'Your rights' },
  { id: 'contact', title: 'Contact' }
]
</script>

<template>
  <LegalPage
    badge="Privacy"
    title="Privacy policy"
    description="This page explains what data ReplySuite processes, why we process it, and how we handle account information, chatbot training data, and customer conversations."
    last-updated="May 09, 2026"
    :sections="sections"
  >
    <section id="overview">
      <h2>Overview</h2>
      <p>
        ReplySuite helps businesses create AI chatbots for their website and WhatsApp workflows. To do that, we process account information, chatbot configuration, training content, and conversation data needed to operate the product.
      </p>
      <p>
        We aim to keep this policy readable. It is a practical explanation of how the product works, not a vague promise page.
      </p>
      <blockquote>
        You remain responsible for the content you upload, connect, or use to train your chatbot. ReplySuite processes that information to deliver the service to you.
      </blockquote>
    </section>

    <section id="what-we-collect">
      <h2>What we collect</h2>
      <h3>1. Account and business information</h3>
      <p>
        This can include your name, email address, business name, billing plan, and account preferences.
      </p>

      <h3>2. Chatbot and workspace data</h3>
      <p>
        This includes chatbot names, settings, prompts, deployment preferences, supported channels, and connected integrations.
      </p>

      <h3>3. Training content and knowledge sources</h3>
      <p>
        If you train a ReplySuite agent using website content, PDFs, FAQs, uploaded files, or custom text, we process that content so your chatbot can generate more relevant answers.
      </p>

      <h3>4. Conversation and usage data</h3>
      <p>
        We may process messages sent through your chatbot, support interactions, logs, diagnostic data, and product usage events needed to operate, secure, and improve the service.
      </p>

      <h3>5. Billing data</h3>
      <p>
        Paid billing is handled through our payment provider. ReplySuite may store plan, subscription, and transaction references, but payment-card handling is managed by the payment provider rather than stored directly by us.
      </p>
    </section>

    <section id="how-we-use-it">
      <h2>How we use it</h2>
      <p>We use personal and business data to:</p>
      <ul>
        <li>create and maintain your account;</li>
        <li>train and operate your chatbot;</li>
        <li>deliver website and WhatsApp automation features;</li>
        <li>provide billing, support, diagnostics, and account management;</li>
        <li>protect the service from abuse, fraud, or unauthorized access;</li>
        <li>measure product performance and improve reliability.</li>
      </ul>
      <p>
        We do not describe customer data as “anonymous magic fuel.” If data is used to run the product, secure it, or improve operations, this policy should say so clearly.
      </p>
    </section>

    <section id="providers">
      <h2>Infrastructure &amp; providers</h2>
      <p>
        ReplySuite uses third-party infrastructure and service providers to deliver the product. Depending on the feature you use, this may include:
      </p>
      <ul>
        <li><strong>Cloudflare Pages and edge services</strong> for deployment, delivery, and edge protection;</li>
        <li><strong>Supabase</strong> for database, storage, and authentication services;</li>
        <li><strong>Polar</strong> or other payment tooling for subscription and billing workflows;</li>
        <li><strong>Email and messaging providers</strong> for verification, transactional email, and support communication;</li>
        <li><strong>Optional analytics tools</strong> if you consent to analytics cookies.</li>
      </ul>
      <p>
        These providers process data only to help us deliver the service or related operations. Their own privacy and security terms may also apply.
      </p>
    </section>

    <section id="retention">
      <h2>Retention &amp; deletion</h2>
      <p>
        We keep data for as long as needed to operate your account, provide the service, meet legal obligations, resolve disputes, and maintain platform integrity.
      </p>
      <p>
        If you delete content or close your account, some data may remain in backups, logs, or records for a limited period where reasonably necessary for security, compliance, or recovery purposes.
      </p>
    </section>

    <section id="rights">
      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, export, or restrict certain uses of your personal data. You may also have the right to object to some processing activities.
      </p>
      <p>
        You can also manage optional cookies through our cookie settings and review our <NuxtLink to="/cookie" class="text-primary hover:underline">Cookie Policy</NuxtLink> for more detail.
      </p>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <p>
        Questions about privacy or data handling can be sent to
        <a href="mailto:privacy@replysuite.app" class="text-primary hover:underline">privacy@replysuite.app</a>.
      </p>
    </section>
  </LegalPage>
</template>
