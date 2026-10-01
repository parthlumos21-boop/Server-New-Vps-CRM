import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const indexPath = path.join(distDir, 'index.html')
const host = '127.0.0.1'
const port = 3000
const backendHost = '127.0.0.1'
const backendPort = 5000

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

const hashedAssetPattern = /-[A-Za-z0-9_-]{6,}\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico)$/i
const staticAssetPathPattern = /^\/(?:assets|images|icons|fonts)\//i

const sendNotFound = (res, message = 'Not found') => {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(message)
}

const sendNoContent = (res, contentType = 'text/plain; charset=utf-8') => {
  res.writeHead(204, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  })
  res.end()
}

const sendMissingAssetReloadModule = (res) => {
  const script = [
    "const key = 'crm_missing_chunk_reload';",
    "const now = Date.now();",
    "const last = Number(sessionStorage.getItem(key) || 0);",
    "if (!last || now - last > 3000) {",
    "  sessionStorage.setItem(key, String(now));",
    "  location.reload();",
    "}",
    'export default null;',
    '',
  ].join('\n')

  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(script),
  })
  res.end(script)
}

const sendMissingAssetStylesheet = (res) => {
  const stylesheet = '/* Missing stale build stylesheet ignored. Refresh loads the current bundle. */\n'

  res.writeHead(200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(stylesheet),
  })
  res.end(stylesheet)
}

const sendFile = (req, res, filePath) => {
  const extension = path.extname(filePath).toLowerCase()
  const contentType = contentTypes[extension] || 'application/octet-stream'

  fs.stat(filePath, (error, stats) => {
    if (error) {
      const statusCode = error.code === 'ENOENT' ? 404 : 500
      res.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(statusCode === 404 ? 'Not found' : 'Unable to read requested file')
      return
    }

    const etag = `"${stats.size}-${Math.floor(stats.mtimeMs)}"`
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304)
      res.end()
      return
    }

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      ETag: etag,
    }

    if (extension === '.html' || extension === '.js' || extension === '.css') {
      headers['Cache-Control'] = 'no-store'
    } else if (hashedAssetPattern.test(path.basename(filePath))) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    } else {
      headers['Cache-Control'] = 'public, max-age=3600'
    }

    res.writeHead(200, headers)
    safePipe(fs.createReadStream(filePath), res)
  })
}

const ignorablePipeErrors = new Set([
  'ERR_STREAM_UNABLE_TO_PIPE',
  'ERR_STREAM_PREMATURE_CLOSE',
  'ERR_STREAM_DESTROYED',
  'ERR_STREAM_WRITE_AFTER_END',
  'ECONNRESET',
  'EPIPE',
])

const destroySource = (source) => {
  if (source && typeof source.destroy === 'function' && !source.destroyed) {
    try { source.destroy() } catch { /* ignore */ }
  }
}

const safePipe = (source, destination) => {
  if (!source) return

  if (!destination || destination.destroyed || destination.writableEnded || destination.writableFinished) {
    destroySource(source)
    return
  }

  source.on('error', (err) => {
    if (err && !ignorablePipeErrors.has(err.code)) {
      console.error('Proxy source error:', err.code || err.message)
    }
    destroySource(source)
  })

  try {
    pipeline(source, destination, (err) => {
      if (err && !ignorablePipeErrors.has(err.code)) {
        console.error('Proxy pipe error:', err.code || err.message)
      }
    })
  } catch (err) {
    if (err && !ignorablePipeErrors.has(err.code)) {
      console.error('Proxy pipe threw:', err.code || err.message)
    }
    destroySource(source)
  }
}

const proxyToBackend = (clientReq, clientRes) => {
  const method = (clientReq.method || 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  let responded = false

  const proxyReq = http.request({
    hostname: backendHost,
    port: backendPort,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: `${backendHost}:${backendPort}`,
    },
  }, (proxyRes) => {
    if (clientRes.writableEnded || clientRes.destroyed) return
    responded = true
    clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
    safePipe(proxyRes, clientRes)
  })

  proxyReq.on('error', () => {
    if (responded || clientRes.writableEnded || clientRes.destroyed) return
    responded = true
    clientRes.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    clientRes.end(JSON.stringify({
      success: false,
      message: 'Backend is not reachable. Run start.bat or "npm run start" after MongoDB is running to start the backend on port 5000 and the frontend.',
    }))
  })

  clientReq.on('aborted', () => {
    proxyReq.destroy()
  })

  if (hasBody) {
    safePipe(clientReq, proxyReq)
  } else {
    proxyReq.end()
  }
}

if (!fs.existsSync(indexPath)) {
  console.error('Frontend build not found. Run "npm.cmd run build" first.')
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || ''
  if (rawUrl.startsWith('/api/') || rawUrl.startsWith('/socket.io/')) {
    proxyToBackend(req, res)
    return
  }

  const url = new URL(rawUrl || '/', `http://${host}:${port}`)
  const requestedPath = decodeURIComponent(url.pathname)

  if (requestedPath === '/favicon.ico') {
    sendNoContent(res, 'image/x-icon')
    return
  }

  const normalizedPath = requestedPath === '/' ? '/index.html' : requestedPath
  const filePath = path.normalize(path.join(distDir, normalizedPath))

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(req, res, filePath)
      return
    }

    if (requestedPath.startsWith('/assets/')) {
      const extension = path.extname(requestedPath).toLowerCase()
      if (extension === '.js') {
        sendMissingAssetReloadModule(res)
        return
      }
      if (extension === '.css') {
        sendMissingAssetStylesheet(res)
        return
      }
    }

    if (staticAssetPathPattern.test(requestedPath) || path.extname(requestedPath)) {
      sendNotFound(res)
      return
    }

    sendFile(req, res, indexPath)
  })
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing frontend and try again.`)
    process.exit(1)
    return
  }

  console.error('Frontend server failed to start:', error)
  process.exit(1)
})

server.on('clientError', (err, socket) => {
  if (socket && !socket.destroyed) {
    try { socket.destroy() } catch { /* ignore */ }
  }
  if (err && !ignorablePipeErrors.has(err.code)) {
    console.error('Client error:', err.code || err.message)
  }
})

process.on('uncaughtException', (err) => {
  if (err && ignorablePipeErrors.has(err.code)) return
  console.error('Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

server.listen(port, host, () => {
  console.log(`Frontend available at http://${host}:${port}/`)
  console.log('Serving static build from dist/')
})
