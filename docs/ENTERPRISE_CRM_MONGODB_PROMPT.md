# Enterprise CRM MongoDB Build Prompt

Build a production-ready enterprise CRM platform using MongoDB as the only database.

## Core Applications

- Web CRM: React, TypeScript, Tailwind CSS, React Query, React Router.
- Backend API: Node.js, Express.js, MongoDB, Mongoose, JWT, Socket.IO.
- Mobile App: React Native, Expo, TypeScript.
- Cloud database: MongoDB Atlas or a managed MongoDB-compatible deployment.
- File storage: cloud object storage with metadata stored in MongoDB.

## Critical Data Protection Rules

- Never remove, overwrite, reset, truncate, or lose CRM data unless an authorized Super Admin explicitly confirms the action.
- Never use `deleteMany()`, `dropDatabase()`, `dropCollection()`, `remove()`, or `collection.drop()` in normal application code or deployment scripts.
- Never clear MongoDB collections, uploads, cached permanent data, or indexes during deployment.
- Use soft delete with `isDeleted`, `deletedAt`, and `deletedBy`.
- Every create, update, delete, login, logout, restore, import, export, message, email, and file action must create an audit log entry.
- Use MongoDB update operators such as `$set`, `$push`, `$inc`, and `$addToSet`; do not replace full documents unless a workflow specifically requires it.
- Frontend refresh, app restart, server restart, deployment, crash recovery, logout, and version upgrades must preserve data.

## Scale Requirements

- Support at least 500 active users and 10 admin accounts.
- Support unlimited leads, deals, customers, visitors, appointments, WhatsApp messages, Outlook emails, documents, notes, activities, notifications, products, quotations, invoices, and reports.
- Design the database so future scaling to thousands of users does not require schema redesign.

## Roles

- Admin: manage users, accounts, contacts, deals, converted deals, quotations, tasks, products, invoices, WhatsApp, Outlook emails, reports, dashboards, settings, permissions, and audit logs.
- User: view assigned records, create deals, create contacts, send WhatsApp messages, send emails, manage tasks, and receive notifications.
- Super Admin: approve destructive actions, restore soft-deleted records, manage backups, and control system-level settings.

## CRM Modules

- Dashboard
- Accounts
- Contacts
- Leads
- Deals
- Converted Deals
- Tasks
- Activities
- Calendar
- Appointments
- Visitors and Visitor Passes
- Products
- Quotations
- Invoices
- Payments
- Reports
- WhatsApp
- Emails
- Notifications
- Documents and Attachments
- Users
- Roles and Permissions
- Settings
- Audit Logs

## MongoDB Collections

Use MongoDB collections for:

- `users`
- `admins`
- `roles`
- `permissions`
- `companies`
- `accounts`
- `contacts`
- `customers`
- `leads`
- `deals`
- `converted_deals`
- `tasks`
- `activities`
- `calendar_events`
- `appointments`
- `visitors`
- `visitorPasses`
- `qrCodes`
- `notes`
- `products`
- `quotations`
- `invoices`
- `payments`
- `emails`
- `whatsapp_messages`
- `notifications`
- `documents`
- `attachments`
- `reports`
- `dashboardStats`
- `settings`
- `auditLogs`
- `loginHistory`
- `deviceSessions`
- `refreshTokens`
- `supportTickets`

## Required Indexes

Create indexes for email, phone, lead number, deal number, visitor number, appointment number, invoice number, company, owner, assigned user, status, created date, updated date, and common relationship fields such as `accountId`, `contactId`, `dealId`, and `quotationId`.

## Web CRM Requirements

- Fully responsive admin and user CRM screens.
- Search, filters, pagination, export PDF, export Excel, validation, error handling, empty states, loading states, and optimistic updates where safe.
- React Query must preserve last successful data on API failures.
- Never overwrite UI data with blank arrays or blank objects after failed requests.
- Load saved data from MongoDB after login.

## Mobile Requirements

- Dashboard, accounts, contacts, leads, deals, converted deals, tasks, calendar, WhatsApp, emails, notifications, profile, settings, documents, and offline queue.
- Biometric login, Face ID, fingerprint, push notifications, offline storage, dark mode, file upload, camera upload, gallery upload, voice notes, PDF viewer, WhatsApp chat, and email inbox.
- Use secure storage for tokens and AsyncStorage or an equivalent durable cache for offline data.
- Queue offline writes and sync safely when the network returns without duplicates.

## WhatsApp Integration

Integrate WhatsApp Business API for sending, receiving, two-way chat, real-time sync, delivery status, read receipts, media, PDFs, images, audio, and documents.

Store conversation history with `contactId`, `accountId`, `dealId`, `quotationId`, `message`, `direction`, `status`, `timestamp`, and `attachment`.

## Outlook Integration

Integrate Microsoft Outlook with OAuth login, send email, receive email, inbox sync, sent sync, draft sync, attachments, email tracking, open tracking, and delivery tracking.

Store email history with `subject`, `body`, `from`, `to`, `cc`, `bcc`, `attachments`, `status`, `receivedAt`, `sentAt`, `accountId`, `contactId`, `dealId`, and `quotationId`.

## Realtime Notifications

Use Socket.IO for instant notifications, message updates, status updates, online users, typing indicators, task assignment events, new leads, new deals, converted deals, WhatsApp messages, emails, quotation creation, browser notifications, push notifications, and mobile notifications.

## Backup And Restore

- Run automatic backups hourly, daily, weekly, and monthly.
- Keep the last 365 backups.
- Provide one-click restore for Super Admins.
- Restores must be audited and must not silently overwrite unrelated records.

## Security

- JWT authentication with refresh tokens.
- Device sessions and multiple-device support.
- Password hashing.
- Role-based permissions.
- HTTPS-only production cookies.
- Helmet, CORS, rate limiting, input sanitization, MongoDB validation, request logging, and audit logs.

## Final Requirement

The final system must be a complete working Web CRM, React Native mobile app, Node.js API, MongoDB/Mongoose schema layer, REST API, Socket.IO realtime layer, WhatsApp integration, Outlook integration, admin/user permissions, validation, error handling, search, filters, pagination, exports, backups, restore, and permanent data-protection architecture with zero placeholder business logic.
