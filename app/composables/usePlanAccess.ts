export const usePlanAccess = () => {
  const { planSlug, plan } = useAuth()

  const normalizedPlanSlug = computed(() => String(planSlug.value || '').toLowerCase())
  const isSilverPlan = computed(() => normalizedPlanSlug.value === 'silver')
  const isGoldPlan = computed(() => normalizedPlanSlug.value === 'gold')
  const isEnterprisePlan = computed(() => ['enterprise-ready', 'enterprise'].includes(normalizedPlanSlug.value))
  const isSilverOrHigher = computed(() => isSilverPlan.value || isGoldPlan.value || isEnterprisePlan.value)
  const isGoldOrHigher = computed(() => isGoldPlan.value || isEnterprisePlan.value)

  return {
    normalizedPlanSlug,
    isSilverPlan,
    isGoldPlan,
    isEnterprisePlan,
    isSilverOrHigher,
    isGoldOrHigher,
    canUseWebsiteChatbot: computed(() => Boolean(plan.value)),
    canUseWhatsApp: isSilverOrHigher,
    canUseInstagramWorkflow: isGoldOrHigher,
    canUseBusinessTools: isEnterprisePlan,
  }
}
