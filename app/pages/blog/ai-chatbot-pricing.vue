<script setup lang="ts">
import ArticleView from '~~/app/components/blog/ArticleView.vue'
import { blogArticleMap } from '~~/app/data/blog'

const articleMeta = blogArticleMap['ai-chatbot-pricing']

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

const { data: article, pending } = await useAsyncData('blog-ai-chatbot-pricing', async () => articleMeta)

const replySuitePlans = [
  { plan: 'Free', price: '$0.00/mo', fit: 'Test your first website chatbot', includes: '1 chatbot, 100 replies, 10 training sessions' },
  { plan: 'Silver', price: '$17.88/mo', fit: 'Growing businesses', includes: '3 chatbots, 4,000 replies, 30 training sessions' },
  { plan: 'Gold', price: '$26.88/mo', fit: 'Higher volume + WhatsApp', includes: '5 chatbots, 10,000 replies, 100 training sessions, WhatsApp integration' }
]

const pricingModels = [
  { model: 'Flat monthly', goodFor: 'Teams that want predictable cost', risk: 'You may pay more than needed at very low volume' },
  { model: 'Per-resolution', goodFor: 'Low and stable support volume', risk: 'Bills rise when AI resolves more conversations' },
  { model: 'Per-seat', goodFor: 'Helpdesk-heavy teams', risk: 'You keep paying for humans even as AI handles more' },
  { model: 'Credit-based', goodFor: 'Controlled or bursty usage', risk: 'Harder to predict monthly spend' }
]
</script>

<template>
  <ArticleView :article="article || articleMeta" :pending="pending" :cta="{
    title: 'See ReplySuite pricing in practice',
    text: 'Start with a free chatbot, train it on your content, and upgrade only when your volume or channels grow.',
    buttonLabel: 'Start free',
    buttonTo: '/register'
  }">
    <div class="not-prose rounded-[32px] border border-primary/20 bg-primary/5 p-8 mb-14">
      <h2 class="text-2xl font-bold text-foreground mb-4 tracking-tight">TL;DR</h2>
      <div class="space-y-4 text-sm font-medium text-foreground/75">
        <p>Pricing model matters as much as starting price.</p>
        <p>Predictable pricing gets easier to manage as support volume grows.</p>
        <p>ReplySuite is strongest for teams that want a trained website chatbot first and WhatsApp integration next.</p>
        <p>The simpler the setup and pricing, the easier it is to adopt AI support early.</p>
      </div>
    </div>

    <p class="text-xl text-foreground/70 leading-relaxed font-medium mb-12">
      A chatbot can look cheap on day one and still become expensive later. The key question is not only “what does it cost today?” but also “what happens when my support volume grows and the bot starts doing more work?”
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Why pricing models matter more than headline prices</h2>
    <p class="text-foreground/50 mb-8">
      AI chatbot vendors price their products in very different ways. Some charge a fixed monthly fee. Some charge for usage. Some charge per seat because the product is still built like a traditional helpdesk. Others use credit systems that make forecasting harder.
    </p>
    <p class="text-foreground/50 mb-12">
      That means two tools with similar-looking entry plans can feel completely different once your support volume grows.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">The four common pricing models</h2>
    <div class="not-prose overflow-x-auto my-12">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b border-foreground/10 text-left">
            <th class="py-4 pr-6 text-foreground/40 uppercase tracking-widest text-[10px]">Model</th>
            <th class="py-4 pr-6 text-foreground/40 uppercase tracking-widest text-[10px]">Best when</th>
            <th class="py-4 text-foreground/40 uppercase tracking-widest text-[10px]">Main risk</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pricingModels" :key="row.model" class="border-b border-foreground/5">
            <td class="py-4 pr-6 font-bold text-foreground">{{ row.model }}</td>
            <td class="py-4 pr-6 text-foreground/60">{{ row.goodFor }}</td>
            <td class="py-4 text-foreground/60">{{ row.risk }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">The growth trap in variable AI pricing</h2>
    <p class="text-foreground/50 mb-8">
      Variable pricing can punish success. When your chatbot becomes more useful and handles more conversations, the invoice can rise with that success. That makes budgeting harder, especially for small teams that want cost clarity as they grow.
    </p>
    <p class="text-foreground/50 mb-12">
      Flat monthly pricing is not always the cheapest at very low volume, but it is often the easiest model to live with once support starts scaling.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Where ReplySuite fits</h2>
    <p class="text-foreground/50 mb-8">
      ReplySuite fits businesses that want practical AI support value early. You train the chatbot on your website, PDFs, FAQs, and custom text. Then you deploy it on your website and expand into WhatsApp when you want more direct support or sales conversations.
    </p>
    <p class="text-foreground/50 mb-12">
      That makes ReplySuite feel more like useful chatbot infrastructure than a complicated AI add-on.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">ReplySuite pricing at a glance</h2>
    <div class="not-prose overflow-x-auto my-12">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b border-foreground/10 text-left">
            <th class="py-4 pr-6 text-foreground/40 uppercase tracking-widest text-[10px]">Plan</th>
            <th class="py-4 pr-6 text-foreground/40 uppercase tracking-widest text-[10px]">Price</th>
            <th class="py-4 pr-6 text-foreground/40 uppercase tracking-widest text-[10px]">Best for</th>
            <th class="py-4 text-foreground/40 uppercase tracking-widest text-[10px]">What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in replySuitePlans" :key="row.plan" class="border-b border-foreground/5">
            <td class="py-4 pr-6 font-bold text-primary">{{ row.plan }}</td>
            <td class="py-4 pr-6 text-foreground">{{ row.price }}</td>
            <td class="py-4 pr-6 text-foreground/60">{{ row.fit }}</td>
            <td class="py-4 text-foreground/60">{{ row.includes }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Why ReplySuite ranks first in this pricing view</h2>
    <p class="text-foreground/50 mb-8">
      ReplySuite ranks first for businesses that want an embeddable chatbot because the pricing is easy to explain and the workflow is easy to follow. Train on your content. Launch on your website. Improve responses. Expand into WhatsApp when needed.
    </p>
    <p class="text-foreground/50 mb-12">
      That is a stronger fit for many growing businesses than tools where AI pricing becomes harder to reason about as the chatbot becomes more successful.
    </p>

    <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Final takeaway</h2>
    <p class="text-foreground/50 mb-12">
      AI chatbot pricing is not only about the cheapest first month. It is about whether the product still feels affordable, clear, and useful once the chatbot becomes part of your actual support workflow. ReplySuite stands out because the pricing is simple, the setup path is practical, and the product lines up with what many businesses actually need.
    </p>
  </ArticleView>
</template>
