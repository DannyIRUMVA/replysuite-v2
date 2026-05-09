<script setup lang="ts">
import ArticleView from '~~/app/components/blog/ArticleView.vue'
import { blogArticleMap } from '~~/app/data/blog'

const articleMeta = blogArticleMap['reduce-support-tickets']

useSeoMeta({
  title: `${articleMeta.title} | ReplySuite`,
  description: articleMeta.description,
  ogTitle: articleMeta.title,
  ogDescription: articleMeta.description,
  ogType: 'article',
  ogImage: `https://replysuite.app${articleMeta.ogImage}`,
  twitterCard: 'summary_large_image',
  twitterTitle: articleMeta.title,
  twitterDescription: articleMeta.description,
  twitterImage: `https://replysuite.app${articleMeta.ogImage}`
})

useHead({
  link: [{ rel: 'canonical', href: `https://replysuite.app${articleMeta.to}` }]
})

definePageMeta({
  layout: 'default'
})

const { data: article, pending } = await useAsyncData('blog-reduce-support-tickets', async () => articleMeta)
</script>

<template>
  <ArticleView :article="article || articleMeta" :pending="pending" :cta="{
    title: 'Reduce repetitive support with ReplySuite',
    text: 'Train your chatbot on your business content and let it answer common questions before they become tickets.',
    buttonLabel: 'Create your chatbot',
    buttonTo: '/register'
  }">
    <p class="text-xl text-foreground/70 leading-relaxed font-medium mb-12">
      Most support teams do not have a volume problem first. They have a repetition problem first. The same shipping questions, pricing questions, availability questions, and policy questions keep appearing. That is exactly where a trained AI chatbot can reduce support tickets without damaging customer experience.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Why support volume feels heavier than it looks</h2>
    <p class="text-foreground/50 mb-8">
      Not every support message needs a human. But if every incoming question still lands in the same workflow, the team feels overloaded anyway. A lot of the stress comes from context switching and repeated explanations, not from deeply complex cases.
    </p>
    <p class="text-foreground/50 mb-12">
      That is why reducing support tickets is not really about hiding customers from your team. It is about giving customers accurate answers earlier, so humans only step in where they add the most value.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">What a trained chatbot can remove first</h2>
    <div class="not-prose grid sm:grid-cols-2 gap-6 my-14">
      <div v-for="item in [
        'Pricing and package questions',
        'Shipping and delivery questions',
        'Hours, contact, and availability',
        'Basic service or product FAQ',
        'Simple onboarding questions',
        'After-hours support coverage'
      ]" :key="item" class="p-8 rounded-[28px] bg-foreground/[0.02] border border-foreground/10 text-sm font-medium text-foreground/70">
        {{ item }}
      </div>
    </div>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">The practical 3-step workflow</h2>
    <ol class="text-foreground/50 space-y-6">
      <li><strong class="text-foreground">Train the chatbot on real business content.</strong> Use your website, FAQs, PDFs, and custom text so common questions get grounded answers.</li>
      <li><strong class="text-foreground">Deploy the chatbot where demand starts.</strong> For many businesses that is the website widget, where visitors ask the same pre-sales and support questions repeatedly.</li>
      <li><strong class="text-foreground">Improve the weak spots.</strong> Review what the chatbot handles well, then update the content where answers need more clarity.</li>
    </ol>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Why this works better than generic automation</h2>
    <p class="text-foreground/50 mb-8">
      Generic automation can deflect users, but it often does not solve the real question. A trained chatbot works better because it uses the business's own content. That makes the answer more relevant and reduces the need for the conversation to escalate into a ticket.
    </p>
    <p class="text-foreground/50 mb-12">
      In practice, that means fewer repetitive messages for the team and faster answers for the customer.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">How ReplySuite helps</h2>
    <p class="text-foreground/50 mb-8">
      ReplySuite is useful here because it gives businesses a simple loop: train the chatbot on owned content, test it, embed it on the site, and then expand into WhatsApp if needed. The business does not have to start with a huge support transformation project.
    </p>
    <p class="text-foreground/50 mb-12">
      That lower-friction path is important. Support teams usually adopt AI faster when the first success is obvious and easy to measure.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Final takeaway</h2>
    <p class="text-foreground/50 mb-12">
      The easiest way to reduce support tickets is not to hide your support channel. It is to answer repeat questions better, earlier, and with less manual effort. A trained AI chatbot can do that well when it is grounded in your business content and deployed where customers already ask for help.
    </p>
  </ArticleView>
</template>
