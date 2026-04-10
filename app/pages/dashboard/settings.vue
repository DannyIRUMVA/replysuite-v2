<script setup lang="ts">
import { 
  User, 
  CreditCard, 
  Shield, 
  Trash2, 
  Save, 
  Globe, 
  Mail, 
  Phone, 
  Building2,
  Clock,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const activeTab = ref('profile')
const loading = ref(false)
const saveSuccess = ref(false)
const errorMsg = ref('')

const profile = ref({
  full_name: '',
  company_name: '',
  bio: '',
  website: '',
  contact_email: '',
  phone: '',
  country: '',
  timezone: '',
  avatar_url: ''
})

// Fetch Profile
const fetchProfile = async () => {
  if (!user.value) return
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.value.id)
    .single()
  
  if (data) {
    profile.value = { ...profile.value, ...data }
  }
}

// Fetch Membership & Payments: Guard with user ID
const { data: membership } = await useAsyncData('dashboard-membership', async () => {
    if (!user.value?.id) return null
    const { data } = await supabase
      .from('user_memberships')
      .select('*, plans(*)')
      .eq('user_id', user.value.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    return data
}, { watch: [user], immediate: true })

const { data: payments } = await useAsyncData('payment-history', async () => {
    if (!user.value?.id) return null
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(5)
    return data
}, { watch: [user], immediate: true })

onMounted(fetchProfile)

const updateProfile = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    saveSuccess.value = false

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.value.full_name,
        company_name: profile.value.company_name,
        bio: profile.value.bio,
        website: profile.value.website,
        contact_email: profile.value.contact_email,
        phone: profile.value.phone,
        country: profile.value.country,
        timezone: profile.value.timezone,
        avatar_url: profile.value.avatar_url
      })
      .eq('id', user.value?.id)

    if (error) throw error
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err: any) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

const tabs = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'billing', name: 'Billing', icon: CreditCard },
  { id: 'account', name: 'Account', icon: Shield },
]
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <header class="mb-10 text-center lg:text-left">
      <h1 class="text-2xl md:text-3xl font-black tracking-tighter text-white leading-tight">settings</h1>
      <p class="text-gray-500 font-medium font-medium">manage your identity, billing, and account details.</p>
    </header>

    <!-- Tab Container -->
    <div class="flex flex-col lg:flex-row gap-12">
      <!-- Tab Navigation -->
      <aside class="w-full lg:w-64 space-y-1">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group relative overflow-hidden"
          :class="activeTab === tab.id ? 'bg-primary/10 text-primary font-bold shadow-lg shadow-primary/5' : 'text-gray-400 hover:text-white hover:bg-white/5'"
        >
          <div v-if="activeTab === tab.id" class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
          <component :is="tab.icon" class="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span class="text-sm tracking-widest">{{ tab.name.toLowerCase() }}</span>
        </button>
      </aside>

      <!-- Main Section -->
      <main class="flex-1 glass-card p-10 border-white/5 bg-[#0a0a0a] min-h-[600px] relative overflow-hidden">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10"></div>

        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center gap-6 mb-12">
             <div class="w-24 h-24 rounded-3xl bg-primary/10 p-1 group relative cursor-pointer overflow-hidden">
                <img :src="profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user?.email" class="w-full h-full rounded-[20px] object-cover" />
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                   <Save class="w-6 h-6 text-white" />
                </div>
             </div>
             <div>
                <h3 class="text-xl font-black tracking-wide text-primary leading-tight">identity</h3>
                <p class="text-gray-500 text-sm font-medium">your brand avatar and display information.</p>
             </div>
          </div>

          <form @submit.prevent="updateProfile" class="grid md:grid-cols-2 gap-8">
             <div class="col-span-2 md:col-span-1">
                <label class="input-label"><Building2 class="w-4 h-4" /> Full Name</label>
                <input v-model="profile.full_name" type="text" class="setting-input" placeholder="Your Name" />
             </div>
             <div class="col-span-2 md:col-span-1">
                <label class="input-label"><Building2 class="w-4 h-4" /> Company Name</label>
                <input v-model="profile.company_name" type="text" class="setting-input" placeholder="Brand Name" />
             </div>
             <div class="col-span-2">
                <label class="input-label">Short Bio</label>
                <textarea v-model="profile.bio" class="setting-input min-h-[100px] py-4 rounded-[24px]" placeholder="Tell us about your brand..."></textarea>
             </div>
             <div class="col-span-2 md:col-span-1">
                <label class="input-label"><Globe class="w-4 h-4" /> Website URL</label>
                <input v-model="profile.website" type="url" class="setting-input" placeholder="https://..." />
             </div>
             <div class="col-span-2 md:col-span-1">
                <label class="input-label"><Mail class="w-4 h-4" /> Business Email</label>
                <input v-model="profile.contact_email" type="email" class="setting-input" placeholder="contact@brand.com" />
             </div>
             <div class="col-span-2 md:col-span-1">
                <label class="input-label"><Phone class="w-4 h-4" /> Contact Phone</label>
                <input v-model="profile.phone" type="tel" class="setting-input" placeholder="+250..." />
             </div>
             <div class="col-span-2 md:col-span-1">
                <label class="input-label"><Clock class="w-4 h-4" /> Timezone</label>
                <select v-model="profile.timezone" class="setting-input appearance-none">
                   <option value="UTC">UTC (Universal Time Coordinated)</option>
                   <option value="Africa/Kigali">CAT (Central Africa Time)</option>
                   <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                   <option value="America/New_York">EST (Eastern Standard Time)</option>
                </select>
             </div>

             <div class="col-span-2 pt-10 flex items-center justify-between border-t border-white/5 mt-4">
              <div v-if="saveSuccess" class="text-green-400 text-sm font-bold animate-in fade-in zoom-in tracking-widest">
                gold standard applied!
              </div>
                <div v-else-if="errorMsg" class="text-red-400 text-sm font-bold">
                   {{ errorMsg }}
                </div>
                <div v-else></div>
                
                <button type="submit" :disabled="loading" class="btn-gradient px-12 py-4 flex items-center gap-3 group whitespace-nowrap">
                   <Save class="w-5 h-5 group-hover:rotate-12 transition-transform" />
                   {{ loading ? 'securing...' : 'save profile' }}
                </button>
             </div>
          </form>
        </div>

        <!-- Billing Tab -->
        <div v-if="activeTab === 'billing'" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h3 class="text-xl font-black tracking-wide text-primary mb-10">subscription hub</h3>
           
           <!-- Current Plan -->
           <div class="glass-card !bg-primary/5 border-primary/20 p-10 mb-12 relative overflow-hidden group">
              <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] border border-primary/50 group-hover:bg-primary/20 transition-all duration-1000"></div>
              
              <div class="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                 <div class="flex items-center gap-8">
                    <div class="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary relative overflow-hidden">
                       <Zap class="w-10 h-10 fill-current" />
                    </div>
                    <div>
                       <span class="text-[10px] font-bold tracking-widest text-primary">current tier</span>
                       <h4 class="text-2xl font-black tracking-tighter mt-1">{{ membership?.plans?.name || 'free' }}</h4>
                       <p class="text-gray-400 text-sm font-medium mt-1">Renews on: {{ membership?.ends_at ? new Date(membership.ends_at).toLocaleDateString() : 'N/A' }}</p>
                    </div>
                 </div>
                 <NuxtLink to="/pricing" class="w-full md:w-auto btn-gradient px-10 py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-3">
                    Upgrade Now <ChevronRight class="w-4 h-4" />
                 </NuxtLink>
              </div>
           </div>

           <!-- Billing History -->
           <h4 class="text-sm font-bold tracking-widest text-gray-500 mb-6 font-black">payment history</h4>
           <div class="space-y-4">
              <div v-if="!payments?.length" class="text-gray-600 italic py-10 border border-white/5 rounded-[32px] text-center bg-white/[0.01]">
                 No transactions found on this account yet.
              </div>
              <div v-else v-for="pay in payments" :key="pay.id" class="flex items-center justify-between p-6 rounded-[24px] border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors">
                 <div class="flex items-center gap-5">
                    <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                       <CreditCard class="w-6 h-6" />
                    </div>
                    <div>
                       <p class="font-bold text-gray-200">${{ pay.amount }} · {{ pay.status }}</p>
                       <p class="text-xs text-gray-600">{{ new Date(pay.created_at).toLocaleDateString() }}</p>
                    </div>
                 </div>
                 <button class="text-gray-500 hover:text-white transition-colors">
                    <ExternalLink class="w-5 h-5" />
                 </button>
              </div>
           </div>
        </div>

        <!-- Account Tab -->
        <div v-if="activeTab === 'account'" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h3 class="text-xl font-black tracking-wide text-primary mb-10">account control</h3>
           
           <div class="space-y-10">
              <div class="p-8 border border-white/5 rounded-[32px] bg-white/[0.01]">
                 <h4 class="text-sm font-black uppercase tracking-widest text-gray-300 mb-6">Security</h4>
                 <div class="flex items-center justify-between">
                    <div>
                       <p class="font-bold text-gray-200">Email Address</p>
                       <p class="text-sm text-gray-500">{{ user?.email }}</p>
                    </div>
                    <NuxtLink to="/support" class="text-primary text-xs font-black uppercase tracking-widest hover:underline">Change Email</NuxtLink>
                 </div>
                 <hr class="border-white/5 my-8" />
                 <div class="flex items-center justify-between">
                    <div>
                       <p class="font-bold text-gray-200">Password</p>
                       <p class="text-sm text-gray-500">Last changed 2 months ago.</p>
                    </div>
                    <button class="text-primary text-xs font-black uppercase tracking-widest hover:underline">Reset Password</button>
                 </div>
              </div>

              <div class="p-8 border border-red-500/10 rounded-[32px] bg-red-500/[0.02]">
                 <h4 class="text-sm font-black uppercase tracking-widest text-red-500 mb-6">Danger Zone</h4>
                 <div class="flex items-center justify-between">
                    <div class="max-w-md">
                       <p class="font-bold text-gray-200">Delete Account</p>
                       <p class="text-sm text-gray-500 mt-1">Permanently delete your account and all associated AI agents. This action cannot be undone.</p>
                    </div>
                    <button class="px-8 py-3 rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-all">Delete</button>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.setting-input {
  @apply w-full bg-background border border-white/5 rounded-full px-8 py-5 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-gray-700 font-medium;
}
.input-label {
  @apply flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-gray-600 mb-4 ml-4;
}
.glass-card {
  @apply rounded-[48px];
}
</style>
