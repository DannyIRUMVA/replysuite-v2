import { H3Event } from 'h3'

const cleanEnvValue = (value: unknown) =>
  String(value || '').trim().replace(/^(["'])(.*)\1$/, '$2')

const getCloudflareEnv = (event: H3Event) =>
  ((event.context as any)?.cloudflare?.env || {}) as Record<string, unknown>

export async function dispatchTrainingJob(event: H3Event, jobId: string) {
  const config = useRuntimeConfig(event)
  const cloudflareEnv = getCloudflareEnv(event)
  const workerUrl = cleanEnvValue(
    config.trainingWorkerUrl ||
      cloudflareEnv.TRAINING_WORKER_URL ||
      cloudflareEnv.NUXT_TRAINING_WORKER_URL,
  )
  const workerSecret = cleanEnvValue(
    config.trainingWorkerSecret ||
      cloudflareEnv.TRAINING_WORKER_SECRET ||
      cloudflareEnv.NUXT_TRAINING_WORKER_SECRET,
  )

  if (!workerUrl || !workerSecret) {
    console.warn('[Training Dispatch] TRAINING_WORKER_URL or TRAINING_WORKER_SECRET is not configured. Job remains queued.', {
      jobId,
      hasRuntimeWorkerUrl: Boolean(config.trainingWorkerUrl),
      hasRuntimeWorkerSecret: Boolean(config.trainingWorkerSecret),
      hasCloudflareWorkerUrl: Boolean(cloudflareEnv.TRAINING_WORKER_URL || cloudflareEnv.NUXT_TRAINING_WORKER_URL),
      hasCloudflareWorkerSecret: Boolean(cloudflareEnv.TRAINING_WORKER_SECRET || cloudflareEnv.NUXT_TRAINING_WORKER_SECRET),
    })
    return { dispatched: false, reason: 'missing_worker_config' }
  }

  try {
    const response = await fetch(`${workerUrl.replace(/\/$/, '')}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-training-secret': workerSecret,
      },
      body: JSON.stringify({ jobId }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[Training Dispatch] Worker rejected job dispatch', {
        jobId,
        status: response.status,
        body,
      })
      return { dispatched: false, reason: 'worker_rejected' }
    }

    return { dispatched: true }
  } catch (error) {
    console.error('[Training Dispatch] Failed to contact training worker', { jobId, error })
    return { dispatched: false, reason: 'network_error' }
  }
}
