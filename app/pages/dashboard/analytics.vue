<script setup lang="ts">
// Use a helper function for icons to avoid serialization of component functions
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'time': return Clock
    case 'reach': return Users
    case 'ctr': return MousePointer2
    case 'conv': return TrendingUp
    default: return TrendingUp
  }
}

const stats = [
  { id: 'time', name: 'Avg. Response Time', value: '1.2s', change: '-0.3s', changeType: 'increase' },
  { id: 'reach', name: 'Total Reach', value: '12.4k', change: '+15%', changeType: 'increase' },
  { id: 'ctr', name: 'Click Through Rate', value: '4.8%', change: '+0.5%', changeType: 'increase' },
  { id: 'conv', name: 'Conversion Rate', value: '2.1%', change: '+0.2%', changeType: 'increase' },
]
</script>

<template>
  <div>
    <div class="mb-12">
      <h1 class="text-4xl font-black tracking-tighter mb-4 text-white">Analytics</h1>
      <p class="text-gray-400 font-medium">Deep insights into your AI Agent performance.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div v-for="stat in stats" :key="stat.name" class="glass-card p-8 border-white/5 bg-[#0a0a0a] group hover:border-primary/30 transition-all relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-white/5 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <component :is="getIcon(stat.id)" class="w-6 h-6" />
          </div>
          <span :class="stat.changeType === 'increase' ? 'text-green-500' : 'text-gray-500'" class="text-xs font-bold tracking-widest">{{ stat.change }}</span>
        </div>
        <p class="text-gray-500 text-xs mb-1 tracking-widest font-bold leading-none capitalize">{{ stat.name }}</p>
        <p class="text-3xl font-black mt-2 tracking-tighter">{{ stat.value }}</p>
      </div>
    </div>

    <div class="glass-card p-12 border-white/5 bg-[#0a0a0a] flex flex-col items-center justify-center text-center min-h-[400px]">
      <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <TrendingUp class="w-10 h-10 text-primary opacity-30" />
      </div>
      <h3 class="text-2xl font-black mb-4 tracking-tight">Chart Data Coming Soon</h3>
      <p class="text-gray-500 max-w-sm mb-8 font-medium">We are currently aggregating your automation data. Check back in a few hours for detailed growth charts.</p>
    </div>
  </div>
</template>
