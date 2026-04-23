import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { createCustomerPortalSession } from '~~/server/utils/polar'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)
  const userId = user.id

  const { data: profile } = await client
    .from('profiles')
    .select('polar_customer_id')
    .eq('id', userId)
    .maybeSingle()

  const polarId = profile?.polar_customer_id

  if (!polarId) {
    throw createError({ statusCode: 400, message: 'No Polar identity found. Please sync your account first.' })
  }

  const portalUrl = await createCustomerPortalSession(polarId)
  
  if (!portalUrl) {
    throw createError({ statusCode: 500, message: 'Failed to generate portal session' })
  }

  return { url: portalUrl }
})
