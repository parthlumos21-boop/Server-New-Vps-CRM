const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CRM API',
    version: '1.0.0',
    description: 'REST API for CRM. Use Bearer token or httpOnly cookie auth.',
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string' },
          requestId: { type: 'string', nullable: true },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Service health check',
        security: [],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string' }, role: { type: 'string', enum: ['admin', 'user'] } } } } },
        },
        responses: { 200: { description: 'Returns token + user' } },
      },
    },
    '/auth/register': { post: { summary: 'Register', security: [], responses: { 201: { description: 'Created' } } } },
    '/auth/me': { get: { summary: 'Current user', responses: { 200: { description: 'Current user' } } } },
    '/auth/logout': { post: { summary: 'Clear auth cookie', responses: { 200: { description: 'OK' } } } },
    '/leads': { get: { summary: 'List leads', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create lead', responses: { 201: { description: 'Created' } } } },
    '/deals': { get: { summary: 'List deals', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create deal', responses: { 201: { description: 'Created' } } } },
    '/tasks': { get: { summary: 'List tasks', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create task', responses: { 201: { description: 'Created' } } } },
    '/reminders': { get: { summary: 'List reminders', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create reminder', responses: { 201: { description: 'Created' } } } },
    '/quotations': { get: { summary: 'List quotations', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create quotation', responses: { 201: { description: 'Created' } } } },
    '/customers': { get: { summary: 'List customers', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create customer', responses: { 201: { description: 'Created' } } } },
    '/support-requests': { get: { summary: 'List support requests', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create support request', responses: { 201: { description: 'Created' } } } },
    '/support-requests/bulk/update': { post: { summary: 'Bulk update', responses: { 200: { description: 'OK' } } } },
    '/support-requests/bulk/delete': { post: { summary: 'Bulk delete', responses: { 200: { description: 'OK' } } } },
    '/bookmarks': { get: { summary: 'List bookmarks', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create bookmark', responses: { 201: { description: 'Created' } } } },
    '/calendar': { get: { summary: 'List calendar events', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create event', responses: { 201: { description: 'Created' } } } },
    '/dashboard/stats': { get: { summary: 'Dashboard stats', responses: { 200: { description: 'OK' } } } },
    '/dashboard/charts': { get: { summary: 'Chart data', responses: { 200: { description: 'OK' } } } },
    '/dashboard/tabs': { get: { summary: 'Dashboard tabs', responses: { 200: { description: 'OK' } } } },
    '/custom-views': { get: { summary: 'List custom views', responses: { 200: { description: 'OK' } } }, post: { summary: 'Create custom view', responses: { 201: { description: 'Created' } } } },
    '/settings/user': { get: { summary: 'List user settings', responses: { 200: { description: 'OK' } } } },
    '/settings/global': { get: { summary: 'List global settings', responses: { 200: { description: 'OK' } } } },
    '/search': { get: { summary: 'Global search', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/attachments': {
      get: { summary: 'List attachments', responses: { 200: { description: 'OK' } } },
      post: { summary: 'Upload attachment (multipart/form-data)', responses: { 201: { description: 'Created' } } },
    },
    '/attachments/{id}/download': { get: { summary: 'Download attachment', responses: { 200: { description: 'File stream' } } } },
  },
}

module.exports = openapiSpec
