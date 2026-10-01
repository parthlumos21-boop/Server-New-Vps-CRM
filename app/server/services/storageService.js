const fs = require('fs')
const path = require('path')

const uploadsDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads')

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

const getUploadsDir = () => {
  ensureUploadsDir()
  return uploadsDir
}

const resolveStoredPath = (relativePath) => {
  if (!relativePath) {
    return ''
  }

  const fullPath = path.resolve(uploadsDir, String(relativePath))
  const normalizedUploadsDir = path.resolve(uploadsDir)

  if (!fullPath.startsWith(normalizedUploadsDir + path.sep) && fullPath !== normalizedUploadsDir) {
    return ''
  }

  return fullPath
}

const removeFile = (relativePath) => {
  if (!relativePath) return
  const fullPath = resolveStoredPath(relativePath)
  if (!fullPath) return
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath) } catch (_) { /* ignore */ }
  }
}

module.exports = { getUploadsDir, resolveStoredPath, removeFile, uploadsDir }
