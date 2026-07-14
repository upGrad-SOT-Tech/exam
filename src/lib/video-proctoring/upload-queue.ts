import { uploadBinary, uploadJson } from './supabase-storage'
import type { FrameUploadJob, FrameUploadPriority } from '@/lib/vision/types'

type QueueStats = {
  queued: number
  inflight: number
  uploaded: number
  failed: number
  dropped: number
}

type UploadQueueOptions = {
  maxQueueSize?: number
  concurrency?: number
  maxAttempts?: number
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export class FrameUploadQueue {
  private readonly maxQueueSize: number
  private readonly concurrency: number
  private readonly maxAttempts: number
  private readonly queue: FrameUploadJob[] = []
  private inflight = 0
  private stopped = false
  private uploaded = 0
  private failed = 0
  private dropped = 0

  constructor(options: UploadQueueOptions = {}) {
    this.maxQueueSize = options.maxQueueSize ?? 36
    this.concurrency = options.concurrency ?? 2
    this.maxAttempts = options.maxAttempts ?? 4
  }

  getStats(): QueueStats {
    return {
      queued: this.queue.length,
      inflight: this.inflight,
      uploaded: this.uploaded,
      failed: this.failed,
      dropped: this.dropped,
    }
  }

  enqueue(input: {
    attemptId: string
    priority: FrameUploadPriority
    reason: string
    blob: Blob
    meta?: Record<string, unknown>
    folder?: 'frames' | 'screenshots'
  }) {
    if (this.stopped) return

    while (this.queue.length >= this.maxQueueSize) {
      const dropIndex = this.queue.findIndex((job) => job.priority === 'sample')
      if (dropIndex === -1) break
      this.queue.splice(dropIndex, 1)
      this.dropped += 1
    }

    if (this.queue.length >= this.maxQueueSize && input.priority === 'sample') {
      this.dropped += 1
      return
    }

    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift()
      this.dropped += 1
    }

    this.queue.push({
      id: createId(),
      attemptId: input.attemptId,
      priority: input.priority,
      reason: input.reason,
      blob: input.blob,
      meta: {
        ...(input.meta ?? {}),
        folder: input.folder ?? 'frames',
      },
      createdAt: Date.now(),
      attempts: 0,
    })

    this.queue.sort((a, b) => {
      if (a.priority === b.priority) return a.createdAt - b.createdAt
      return a.priority === 'critical' ? -1 : 1
    })

    this.pump()
  }

  async uploadCalibrationProfile(attemptId: string, profile: unknown) {
    const path = `attempts/${attemptId}/calibration/profile.json`
    await uploadJson(attemptId, path, profile)
  }

  async flush(timeoutMs = 8_000) {
    const started = Date.now()
    while ((this.queue.length > 0 || this.inflight > 0) && Date.now() - started < timeoutMs) {
      this.pump()
      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }
  }

  stop() {
    this.stopped = true
    this.queue.length = 0
  }

  private pump() {
    while (!this.stopped && this.inflight < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()
      if (!job) return
      this.inflight += 1
      void this.runJob(job).finally(() => {
        this.inflight -= 1
        this.pump()
      })
    }
  }

  private async runJob(job: FrameUploadJob) {
    const safeReason = job.reason.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
    const folder =
      typeof job.meta.folder === 'string' && job.meta.folder === 'screenshots'
        ? 'screenshots'
        : 'frames'
    const path = `attempts/${job.attemptId}/${folder}/${job.createdAt}_${safeReason}_${job.id}.jpg`

    try {
      await uploadBinary(job.attemptId, path, job.blob, 'image/jpeg')
      const metaPath = `attempts/${job.attemptId}/${folder}/${job.createdAt}_${safeReason}_${job.id}.json`
      await uploadJson(job.attemptId, metaPath, {
        ...job.meta,
        reason: job.reason,
        priority: job.priority,
        createdAt: new Date(job.createdAt).toISOString(),
        storagePath: path,
      })
      this.uploaded += 1
    } catch {
      job.attempts += 1
      if (job.attempts >= this.maxAttempts) {
        this.failed += 1
        return
      }

      const delay = Math.min(8_000, 400 * 2 ** job.attempts)
      window.setTimeout(() => {
        if (this.stopped) return
        this.queue.unshift(job)
        this.pump()
      }, delay)
    }
  }
}
