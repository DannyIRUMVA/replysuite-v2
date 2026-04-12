export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()

  if (!user.value && to.path.startsWith('/dashboard')) {
    return navigateTo('/login')
  }
})
