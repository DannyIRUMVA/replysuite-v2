<script setup lang="ts">
import LegalPage from '~~/app/components/legal/LegalPage.vue'

useSeoMeta({
  title: 'AI Ethics & Transparency | ReplySuite',
  description: 'See how ReplySuite approaches AI transparency, customer data handling, human review, and responsible automation.'
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'principles', title: 'Core principles' },
  { id: 'transparency', title: 'Transparency' },
  { id: 'data', title: 'Data & training' },
  { id: 'human-review', title: 'Human review' },
  { id: 'limitations', title: 'Limitations' },
  { id: 'prohibited', title: 'Prohibited use' },
  { id: 'contact', title: 'Contact' }
]

const principles = [
  {
    title: 'Clear AI disclosure',
    desc: 'Businesses should be clear when an automated assistant is responding to customers.'
  },
  {
    title: 'Grounded answers',
    desc: 'AI should be trained on relevant business content instead of relying only on generic responses.'
  },
  {
    title: 'Human oversight',
    desc: 'Automation should support human teams, not remove judgment from high-risk decisions.'
  },
  {
    title: 'Respect for customer data',
    desc: 'Training content and customer conversation data should be handled with clear purpose and control.'
  }
]
</script>

<template>
  <LegalPage
    badge="AI Ethics"
    title="AI ethics & transparency"
    description="ReplySuite is built for practical automation, not black-box hype. This page explains how we think about transparency, customer data, human review, and responsible deployment."
    last-updated="May 09, 2026"
    :sections="sections"
  >
    <section id="principles">
      <h2>Core principles</h2>
      <div class="grid md:grid-cols-2 gap-5 not-prose my-10">
        <div v-for="item in principles" :key="item.title" class="rounded-[28px] border border-foreground/10 bg-foreground/[0.02] p-6">
          <h3 class="text-xl font-bold text-foreground mb-3 tracking-tight">{{ item.title }}</h3>
          <p class="text-sm text-foreground/65 font-medium leading-relaxed">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <section id="transparency">
      <h2>Transparency</h2>
      <p>
        We believe automated interactions should not pretend to be human. If you use ReplySuite, you should present your assistant in a way that is clear, fair, and not deceptive.
      </p>
      <p>
        That matters even more in support and sales contexts, where customers may rely on what the assistant says.
      </p>
    </section>

    <section id="data">
      <h2>Data &amp; training</h2>
      <p>
        ReplySuite is strongest when chatbots are trained on your actual business content: website pages, FAQs, PDFs, and custom text. That approach is more useful and more responsible than generic AI output with no business grounding.
      </p>
      <p>
        We do not describe customer data as something to be casually reused. Training data and conversation data should be processed for the specific service you are using and handled with appropriate access control and review.
      </p>
    </section>

    <section id="human-review">
      <h2>Human review</h2>
      <p>
        ReplySuite is meant to reduce repetitive support work and improve first responses. It is not a substitute for human judgment in sensitive, high-risk, or legally significant decisions.
      </p>
      <p>
        Businesses should keep humans involved where escalation, approval, or interpretation matters.
      </p>
    </section>

    <section id="limitations">
      <h2>Limitations</h2>
      <p>
        AI systems can still be incomplete, wrong, or overly confident. Better training content improves outcomes, but no model should be treated as infallible.
      </p>
      <p>
        We encourage customers to test their chatbot carefully, review high-impact flows, and avoid relying on automated replies where a human review step is clearly necessary.
      </p>
    </section>

    <section id="prohibited">
      <h2>Prohibited use</h2>
      <p>You should not use ReplySuite to enable or automate:</p>
      <ul>
        <li>fraud, spam, impersonation, or deceptive engagement;</li>
        <li>harassment, manipulation, or abusive messaging workflows;</li>
        <li>collection or use of data without proper rights or disclosure;</li>
        <li>unsafe or misleading responses in contexts where people may rely on them materially.</li>
      </ul>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <p>
        Questions about our AI posture or responsible-use expectations can be sent to
        <a href="mailto:security@replysuite.app" class="text-primary hover:underline">security@replysuite.app</a>.
      </p>
    </section>
  </LegalPage>
</template>
