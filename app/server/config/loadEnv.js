const fs = require('fs')
const path = require('path')

const initialEnvKeys = new Set(Object.keys(process.env))

const candidatePaths = [
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env.local'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '.env.local'),
]

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

const normalizeValue = (rawValue) => stripWrappingQuotes(
  rawValue
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .trim()
)

const parseLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const normalized = trimmed.startsWith('export ')
    ? trimmed.slice(7).trim()
    : trimmed

  const separatorIndex = normalized.indexOf('=')
  if (separatorIndex === -1) return null

  const key = normalized.slice(0, separatorIndex).trim()
  if (!key) return null

  const value = normalizeValue(normalized.slice(separatorIndex + 1))
  return { key, value }
}

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return

  const fileContent = fs.readFileSync(filePath, 'utf8')
  fileContent.split(/\r?\n/).forEach((line) => {
    const parsed = parseLine(line)
    if (!parsed) return

    if (!initialEnvKeys.has(parsed.key)) {
      process.env[parsed.key] = parsed.value
    }
  })
}

candidatePaths.forEach(loadEnvFile)

