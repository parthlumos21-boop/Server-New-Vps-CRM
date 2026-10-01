import { spawn } from 'node:child_process'
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
      return
    }

    console.log('')
    await runWindowsServiceStart('frontend')
    printWindowsSummary()
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
