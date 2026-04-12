export const useActivity = () => {
  const user = useSupabaseUser()

  /**
   * Tracks a user activity from the frontend.
   * Sends the event to the server for processing.
   */
  const track = async (type: string, meta: Record<string, any> = {}) => {
    try {
      if (!user.value) return 

      await $fetch('/api/activity/log', {
        method: 'POST',
        body: {
          type,
          meta,
          source: window.location.pathname
        }
      })
    } catch (err) {
      console.error('[useActivity] Failed to trace activity:', err)
    }
  }

  return {
    track
  }
}
