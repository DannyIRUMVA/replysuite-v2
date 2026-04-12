export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) {
    throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
    })
  }

  return await trackActivity(event, {
    userId: user.id,
    type: body.type,
    source: body.source,
    meta: body.meta
  })
})
