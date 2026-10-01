export const BULK_UPLOAD_HISTORY_KEY = 'crm_bulk_upload_history'

export const parseCsvText = (text = '') => {
  const rows = []
  let current = ''
  let row = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(current.trim())
      current = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  row.push(current.trim())
  if (row.some(Boolean)) rows.push(row)

  if (rows.length === 0) {
    return { headers: [], records: [] }
  }

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`)
  const records = rows.slice(1).map((values, index) => ({
    id: index + 1,
    values: headers.reduce((lookup, header, headerIndex) => ({
      ...lookup,
      [header]: values[headerIndex] || '',
    }), {}),
  }))

  return { headers, records }
}

export const readBulkUploadFile = (file) => new Promise((resolve) => {
  if (!file) {
    resolve({ headers: [], records: [] })
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const parsed = parseCsvText(String(reader.result || ''))
    resolve(parsed)
  }
  reader.onerror = () => resolve({ headers: [], records: [] })
  reader.readAsText(file)
})

export const buildDefaultMapping = (headers = [], crmFields = []) => (
  crmFields.reduce((lookup, field) => {
    const match = headers.find((header) => (
      header.trim().toLowerCase() === field.label.trim().toLowerCase()
      || header.trim().toLowerCase() === field.key.trim().toLowerCase()
    ))

    return {
      ...lookup,
      [field.key]: match || '',
    }
  }, {})
)

export const saveBulkUploadAttempt = ({ moduleName, fileName, rowCount, status = 'Completed' }) => {
  const raw = localStorage.getItem(BULK_UPLOAD_HISTORY_KEY)
  let history = []

  try {
    history = raw ? JSON.parse(raw) : []
  } catch {
    history = []
  }

  const nextHistory = [
    {
      id: `BULK-${Date.now()}`,
      moduleName,
      fileName,
      rowCount,
      status,
      uploadedAt: new Date().toISOString(),
    },
    ...history,
  ].slice(0, 50)

  localStorage.setItem(BULK_UPLOAD_HISTORY_KEY, JSON.stringify(nextHistory))
  return nextHistory
}
