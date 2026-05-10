import { H3Event } from 'h3'

export async function dispatchTrainingJob(event: H3Event, jobId: string) {
  const config = useRuntimeConfig(event)
  const workerUrl = config.trainingWorkerUrl
  const workerSecret = config.trainingWorkerSecret

  if (!workerUrl || !workerSecret) {
    console.warn('[Training Dispatch] TRAINING_WORKER_URL or TRAINING_WORKER_SECRET is not configured. Job remains queued.', { jobId })
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
