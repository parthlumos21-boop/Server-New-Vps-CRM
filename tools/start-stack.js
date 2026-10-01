import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { MongoClient } from 'mongodb'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'server')
const manageRuntimeScript = path.join(rootDir, 'tools', 'manage-runtime.ps1')
const mode = process.argv[2] || 'all'

const VALID_MODES = new Set(['all', 'backend'])

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options,
  })

  child.once('error', reject)
  child.once('exit', (code, signal) => {
    if (code === 0) {
      resolve()
      return
    }

    const outcome = signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`
    reject(new Error(`${command} ${args.join(' ')} failed with ${outcome}.`))
  })
})

const runWindowsServiceStart = (service) => run('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  manageRuntimeScript,
  '-Action',
  'start',
  '-Service',
  service,
])

const runWindowsServiceStop = (service) => run('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  manageRuntimeScript,
  '-Action',
  'stop',
  '-Service',
  service,
])

const printWindowsSummary = () => {
  console.log('')
  console.log('========================================')
  console.log(' Application is ready!')
  console.log('========================================')
  console.log('')
  console.log('Backend:  http://127.0.0.1:5000')
  console.log('Frontend: http://127.0.0.1:3000')
  console.log('')
  console.log('Use stop.bat to stop the tracked services.')
}

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

const readNewContent = (filePath, startPosition) => {
  try {
    if (!fs.existsSync(filePath)) return { text: '', nextPosition: startPosition }
    const stats = fs.statSync(filePath)
    const safeStart = Math.min(startPosition, stats.size)
    if (stats.size <= safeStart) return { text: '', nextPosition: stats.size }

    const fd = fs.openSync(filePath, 'r')
    try {
      const length = stats.size - safeStart
      const buffer = Buffer.alloc(length)
      fs.readSync(fd, buffer, 0, length, safeStart)
      return { text: buffer.toString('utf8'), nextPosition: stats.size }
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return { text: '', nextPosition: startPosition }
  }
}

const formatLogLines = (label, text) => text
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => `[${label}] ${line}`)
  .join('\n')

const readLastLines = (filePath, maxLines = 40) => {
  try {
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-maxLines)
      .join('\n')
  } catch {
    return ''
  }
}

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {}

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return values

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return values

      const key = trimmed.slice(0, separatorIndex).trim()
      let value = trimmed.slice(separatorIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      values[key] = value
      return values
    }, {})
}

const deriveMongoDbName = (uri) => {
  try {
    const parsed = new URL(uri)
    const dbName = parsed.pathname.replace(/^\/+/, '').split('/')[0]
    return dbName || 'crm'
  } catch {
    return 'crm'
  }
}

const getMongoConfig = () => {
  const rootEnv = parseEnvFile(path.join(rootDir, '.env'))
  const serverEnv = parseEnvFile(path.join(serverDir, '.env'))
  const mergedEnv = { ...rootEnv, ...serverEnv, ...process.env }
  const uri = mergedEnv.MONGODB_URI || mergedEnv.MONGO_URI || 'mongodb://127.0.0.1:27017/crm'
  const dbName = mergedEnv.MONGODB_DB || mergedEnv.MONGO_DB || deriveMongoDbName(uri)

  return { uri, dbName }
}

const compactLogPart = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const formatAuditEntry = (entry) => {
  const createdAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  const actor = compactLogPart(entry.actorName || entry.actorEmail || entry.actorId || 'anonymous')
  const mode = compactLogPart(entry.actorMode || entry.actorRole || entry.source || 'system')
  const action = compactLogPart(entry.action || 'audit')
  const target = compactLogPart(entry.path || entry.entityType || entry.entityId || '')
  const method = compactLogPart(entry.method || '')
  const status = entry.statusCode || entry.status ? `status=${entry.statusCode || entry.status}` : ''
  const duration = Number.isFinite(entry.durationMs) ? `${entry.durationMs}ms` : ''

  return [createdAt, mode, actor, action, method, target, status, duration]
    .filter(Boolean)
    .join(' ')
}

const attachDatabaseAuditViewer = () => {
  const { uri, dbName } = getMongoConfig()
  let stopped = false
  let client = null
  let lastCreatedAt = new Date(0)
  let retryNoticeShown = false

  const closeClient = async () => {
    if (!client) return
    try {
      await client.close()
    } catch {
      // The live log viewer should never interrupt application startup.
    } finally {
      client = null
    }
  }

  const printEntries = (entries, { force = false } = {}) => {
    entries.forEach((entry) => {
      const entryCreatedAt = entry.createdAt ? new Date(entry.createdAt) : new Date()
      if (!force && entryCreatedAt <= lastCreatedAt) {
        return
      }

      if (entryCreatedAt > lastCreatedAt) lastCreatedAt = entryCreatedAt
      process.stdout.write(`[database:audit] ${formatAuditEntry(entry)}\n`)
    })
  }

  const watch = async () => {
    while (!stopped) {
      try {
        client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 })
        await client.connect()
        const collection = client.db(dbName).collection('audit_log')

        const recentEntries = await collection
          .find({})
          .sort({ createdAt: -1, _id: -1 })
          .limit(20)
          .toArray()

        if (recentEntries.length === 0) {
          process.stdout.write('[database:audit] Waiting for database audit output...\n')
        } else {
          const isInitialSnapshot = lastCreatedAt.getTime() === 0
          printEntries(recentEntries.reverse(), { force: isInitialSnapshot })
        }

        retryNoticeShown = false

        while (!stopped) {
          const nextEntries = await collection
            .find({ createdAt: { $gt: lastCreatedAt } })
            .sort({ createdAt: 1, _id: 1 })
            .limit(100)
            .toArray()

          printEntries(nextEntries)
          await sleep(1500)
        }
      } catch (error) {
        if (!retryNoticeShown) {
          process.stdout.write(`[database:audit] Waiting for MongoDB audit logs (${error.message || 'connection not ready'}).\n`)
          retryNoticeShown = true
        }
        await closeClient()
        await sleep(3000)
      }
    }

    await closeClient()
  }

  watch()

  return () => {
    stopped = true
    void closeClient()
  }
}

const createLogTailer = ({ label, filePath, isError = false }) => {
  let position = 0

  const flush = () => {
    const result = readNewContent(filePath, position)
    position = result.nextPosition
    if (!result.text) return

    const output = formatLogLines(label, result.text)

    if (!output) return
    ;(isError ? process.stderr : process.stdout).write(`${output}\n`)
  }

  if (fs.existsSync(filePath)) {
    position = fs.statSync(filePath).size
  }

  const intervalId = setInterval(flush, 1000)
  intervalId.unref?.()

  try {
    fs.watchFile(filePath, { interval: 500 }, flush)
  } catch {
    // Polling above is enough if watch registration fails.
  }

  return () => {
    clearInterval(intervalId)
    fs.unwatchFile(filePath, flush)
  }
}

const attachWindowsLogViewer = async ({ includeFrontend }) => {
  const files = [
    { label: 'backend', filePath: path.join(rootDir, 'server-start.log') },
    { label: 'backend:error', filePath: path.join(rootDir, 'server-start.err'), isError: true },
  ]

  if (includeFrontend) {
    files.push(
      { label: 'frontend', filePath: path.join(rootDir, 'frontend-start.log') },
      { label: 'frontend:error', filePath: path.join(rootDir, 'frontend-start.err'), isError: true },
    )
  }

  console.log('')
  console.log('========================================')
  console.log(' Live logs attached')
  console.log('========================================')
  console.log('Press Ctrl+C to stop services and exit.')
  console.log('')

  files.forEach(({ label, filePath, isError = false }) => {
    const recentLines = readLastLines(filePath)
    const output = recentLines ? formatLogLines(label, recentLines) : `[${label}] Waiting for log output...`
    ;(isError ? process.stderr : process.stdout).write(`${output}\n`)
  })

  const cleanupTailers = [
    ...files.map(createLogTailer),
    attachDatabaseAuditViewer(),
  ]
  process.once('SIGINT', async () => {
    cleanupTailers.forEach((cleanup) => cleanup())
    console.log('\nStopping backend and frontend services...')
    await runWindowsServiceStop('backend').catch(() => {})
    await runWindowsServiceStop('frontend').catch(() => {})
    console.log('Services stopped.')
    process.exit(0)
  })

  while (true) {
    await sleep(60_000)
  }
}

const main = async () => {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Unsupported start mode "${mode}". Use "all" or "backend".`)
  }

  if (process.platform === 'win32') {
    console.log('========================================')
    console.log(' CRM - Starting...')
    console.log('========================================')
    console.log('')
    console.log('MongoDB mode: using MONGODB_URI/MONGO_URI or local mongodb://127.0.0.1:27017/crm.')

    console.log('')

    await runWindowsServiceStart('backend')

    if (mode === 'backend') {
      console.log('')
      console.log('Backend ready at http://127.0.0.1:5000')
      await attachWindowsLogViewer({ includeFrontend: false })
      return
    }

    console.log('')
    await runWindowsServiceStart('frontend')
    printWindowsSummary()
    await attachWindowsLogViewer({ includeFrontend: true })
    return
  }

  if (mode === 'backend') {
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['start'], { cwd: serverDir })
    return
  }

  await run('sh', ['start.sh'])
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
