const logger = require('../utils/logger')

const handlers = new Map()
const queue = []
let processing = false

const registerHandler = (jobType, handler) => {
  handlers.set(jobType, handler)
}

const enqueue = (jobType, payload = {}) => {
  const job = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: jobType,
    payload,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  }
  queue.push(job)
  setImmediate(processNext)
  return job
}

const processNext = async () => {
  if (processing) return
  const job = queue.shift()
  if (!job) return
  processing = true
  const handler = handlers.get(job.type)
  if (!handler) {
    logger.warn({ jobType: job.type }, 'No handler registered for job type')
    processing = false
    setImmediate(processNext)
    return
  }
  try {
    job.attempts += 1
    await handler(job.payload, job)
    logger.info({ jobId: job.id, jobType: job.type }, 'Job completed')
  } catch (error) {
    logger.error({ err: error, jobId: job.id, jobType: job.type, attempts: job.attempts }, 'Job failed')
    if (job.attempts < 3) {
      setTimeout(() => { queue.push(job); processNext() }, 1000 * job.attempts)
    }
  } finally {
    processing = false
    setImmediate(processNext)
  }
}

const getQueueStatus = () => ({
  pending: queue.length,
  processing,
  handlers: Array.from(handlers.keys()),
})

module.exports = { registerHandler, enqueue, getQueueStatus }
