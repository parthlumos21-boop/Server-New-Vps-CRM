const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    return (req, res, next) => {
      // Intercept root GET requests from web browsers (like Safari when scanning http:// QR code)
      const urlPath = req.url ? req.url.split('?')[0] : '';
      const hasPlatform = req.headers['expo-platform'] || (req.url && req.url.includes('platform='));

      if ((urlPath === '/' || urlPath === '') && !hasPlatform) {
        const host = req.headers.host || 'localhost:8081';
        const expUrl = `exp://${host}`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening Sales CRM in Expo Go</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #0f172a;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        padding: 20px;
        text-align: center;
      }
      .card {
        background-color: #1e293b;
        padding: 32px;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 100%;
        border: 1px solid #334155;
      }
      h1 { font-size: 20px; margin-bottom: 12px; color: #38bdf8; }
      p { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
      .btn {
        display: inline-block;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        text-decoration: none;
        padding: 14px 28px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 15px;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      }
    </style>
    <script>
      window.location.href = "${expUrl}";
    </script>
  </head>
  <body>
    <div class="card">
      <h1>Opening Sales CRM in Expo Go</h1>
      <p>Redirecting your iOS device to Expo Go...</p>
      <a class="btn" href="${expUrl}">Open in Expo Go</a>
    </div>
  </body>
</html>`);
        return;
      }

      if (originalEnhanceMiddleware) {
        return originalEnhanceMiddleware(metroMiddleware, server)(req, res, next);
      }
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
