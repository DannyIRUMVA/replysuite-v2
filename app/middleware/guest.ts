const getSafeRedirectPath = (value: unknown) => {
  const redirect = Array.isArray(value) ? value[0] : value
  const path = typeof redirect === 'string' ? redirect : ''
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard'
  if (path.startsWith('/login') || path.startsWith('/register')) return '/dashboard'
  return path
}

export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()

  if (user.value) {
    return navigateTo(getSafeRedirectPath(to.query.redirect))
  }
})
