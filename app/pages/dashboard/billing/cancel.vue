<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Payment Cancelled'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center relative overflow-hidden">
    <!-- Background Glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-foreground/5 rounded-full blur-[120px] -z-10"></div>

    <!-- Cancel Icon Container -->
    <div class="relative mb-12">
      <div class="absolute inset-0 bg-foreground/10 rounded-[2.5rem] blur-2xl"></div>
      <div class="relative bg-background border border-foreground/10 w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
        <Icon name="ph:prohibit-bold" class="text-foreground/40 text-6xl" />
      </div>
    </div>

    <h1 class="text-5xl font-black text-foreground mb-6 tracking-tighter uppercase italic-none">
      Checkout <span class="text-foreground/40">Aborted.</span>
    </h1>
    
    <p class="text-lg text-foreground/40 max-w-md mb-12 font-medium lowercase">
      no changes were made to your account. you remain on your current plan. if you encountered a technical issue, our team is ready to assist.
    </p>

    <!-- Support Link -->
    <div class="glass-card p-6 border-foreground/10 bg-foreground/5 flex items-center gap-4 mb-12">
      <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        <Icon name="ph:chat-circle-dots-fill" class="text-xl" />
      </div>
      <a href="mailto:support@replysuite.app" class="text-xs font-bold tracking-widest text-primary uppercase hover:underline">
        Need assistance? Contact support
      </a>
    </div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
      <NuxtLink 
        to="/dashboard/pricing"
        class="flex-1 px-8 py-5 bg-primary text-black rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-primary-accent transition-all transform hover:-translate-y-1 shadow-xl shadow-primary/20 text-center"
      >
        Try Again
      </NuxtLink>
      <NuxtLink 
        to="/dashboard"
        class="flex-1 px-8 py-5 bg-foreground/5 border border-foreground/10 text-foreground rounded-2xl font-black text-xs tracking-widest uppercase transition-all hover:bg-foreground/10 text-center"
      >
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>
