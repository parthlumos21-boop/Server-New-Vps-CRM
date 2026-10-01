/**
 * Parse CSV string into array of records
 * @param {string} csvContent - Raw CSV content
 * @returns {{ headers: string[], records: object[] }}
 */
export const parseCSV = (csvContent) => {
  const lines = csvContent.split('\n').filter((line) => line.trim() !== '')
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse headers from first line
  const headers = parseCSVLine(lines[0])
  
  if (headers.length === 0) {
    throw new Error('CSV file has no headers')
  }

  // Parse data rows
  const records = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line)
    const record = {}
    
    headers.forEach((header, i) => {
      record[header] = values[i] || ''
    })
    
    return record
  })

  return { headers, records }
}

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line - Single CSV line
 * @returns {string[]}
 */
export const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Read file as text
 * @param {File} file - File object from input
 * @returns {Promise<string>}
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}
