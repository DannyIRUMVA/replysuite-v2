import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = await serverSupabaseUser(event)
  
  const userId = (user as any).id || (user as any).sub
  if (!userId) {
    throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
    })
  }

  return await trackActivity(event, {
    userId: userId,
    type: body.type,
    source: body.source,
    meta: body.meta
  })
})
