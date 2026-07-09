<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "dashboard" });

const route = useRoute();

await navigateTo(
  {
    path: `/dashboard/flows/${route.params.id}`,
    query: { ...route.query, channel: route.query.channel || "instagram" },
  },
  { redirectCode: 301 },
);
</script>

<template>
  <div />
</template>
