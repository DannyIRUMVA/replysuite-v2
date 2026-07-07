import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'

const AVATAR_BUCKET = 'profile-avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

type AvatarUploadResult = {
  avatarUrl: string
  storagePath?: string
  storage: 'r2' | 'supabase'
}

const isMissingBucketError = (error: any) => {
  const message = String(error?.message || error?.error || '').toLowerCase()
  return message.includes('bucket not found') || message.includes('not found')
}

const ensureAvatarBucket = async (supabase: ReturnType<typeof serverSupabaseServiceRole>) => {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (!listError && buckets?.some((bucket) => bucket.name === AVATAR_BUCKET || bucket.id === AVATAR_BUCKET)) {
    return
  }

  const { error: createBucketError } = await supabase.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: Object.keys(ALLOWED_AVATAR_TYPES),
  })

  if (createBucketError && !String(createBucketError.message || '').toLowerCase().includes('already exists')) {
    throw createBucketError
  }
}

const uploadToAvatarWorker = async (event: any, userId: string, file: any): Promise<AvatarUploadResult | null> => {
  const config = useRuntimeConfig(event)
  const workerUrl = String(config.replySuiteAvatarWorkerUrl || '').trim().replace(/\/+$/, '')
  const workerSecret = String(config.replySuiteAvatarWorkerSecret || '').trim()

  if (!workerUrl || !workerSecret) return null

  const form = new FormData()
  form.append('user_id', userId)
  form.append('avatar', new Blob([file.data], { type: file.type || 'application/octet-stream' }), file.filename || 'avatar')

  const response = await fetch(`${workerUrl}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${workerSecret}`,
    },
    body: form,
  })

  const result = await response.json().catch(() => null) as any

  if (!response.ok || !result?.success || !result?.url) {
    console.error('[Profile Avatar] R2 worker upload failed:', {
      status: response.status,
      error: result?.error || result?.message || 'Unknown worker error',
    })
    throw createError({
      statusCode: response.status === 413 || response.status === 415 ? response.status : 500,
      statusMessage: result?.error || 'Failed to upload avatar. Please try again.',
    })
  }

  return {
    avatarUrl: result.url,
    storagePath: result.key,
    storage: 'r2',
  }
}

const uploadToSupabaseStorage = async (
  supabase: ReturnType<typeof serverSupabaseServiceRole>,
  userId: string,
  file: any,
  extension: string,
  contentType: string,
): Promise<AvatarUploadResult> => {
  const storagePath = `${userId}/avatar-${Date.now()}.${extension}`

  await ensureAvatarBucket(supabase)

  let uploadResult = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, file.data, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    })

  if (uploadResult.error && isMissingBucketError(uploadResult.error)) {
    await ensureAvatarBucket(supabase)
    uploadResult = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, file.data, {
        contentType,
        upsert: false,
        cacheControl: '31536000',
      })
  }

  if (uploadResult.error) {
    console.error('[Profile Avatar] Supabase upload failed:', uploadResult.error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to upload avatar. Please try again.' })
  }

  const { data: publicUrl } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath)

  if (!publicUrl?.publicUrl) {
    await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]).catch(() => null)
    throw createError({ statusCode: 500, statusMessage: 'Failed to prepare avatar URL.' })
  }

  return {
    avatarUrl: publicUrl.publicUrl,
    storagePath,
    storage: 'supabase',
  }
}

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const formData = await readMultipartFormData(event)
  const file = formData?.find((entry) => entry.name === 'avatar')

  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an avatar image first.' })
  }

  const contentType = String(file.type || '').toLowerCase()
  const extension = ALLOWED_AVATAR_TYPES[contentType]

  if (!extension) {
    throw createError({ statusCode: 400, statusMessage: 'Avatar must be a JPG, PNG, WebP, or GIF image.' })
  }

  if (file.data.length > MAX_AVATAR_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Avatar must be smaller than 2 MB.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const upload = await uploadToAvatarWorker(event, userId, file)
    || await uploadToSupabaseStorage(supabase, userId, file, extension, contentType)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, avatar_url: upload.avatarUrl }, { onConflict: 'id' })
    .select('*')
    .single()

  if (profileError || !profile) {
    if (upload.storage === 'supabase' && upload.storagePath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([upload.storagePath]).catch(() => null)
    }
    console.error('[Profile Avatar] Profile update failed:', profileError)
    throw createError({ statusCode: 500, statusMessage: 'Avatar uploaded, but profile update failed.' })
  }

  return {
    success: true,
    avatarUrl: upload.avatarUrl,
    storage: upload.storage,
    profile,
  }
})
