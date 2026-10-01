# CRM MongoDB Setup

CRM uses MongoDB through Mongoose for runtime storage.

## 1. Configure MongoDB

Create or update `server/.env` and set:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/crm
MONGODB_DB=crm
JWT_SECRET=change-this-secret
CLIENT_URL=http://localhost:3000
```

## 2. Initialize Collections And Indexes

From the `server` directory:

```bash
npm run db:create
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd run db:create
```

This connects to MongoDB and syncs the application indexes.

## 3. Create The Admin Account

From the `server` directory:

```bash
npm run admin:create -- --email admin@yourcompany.com --password YourAdminPassword123
```

Default login username:

```text
admin
```

## 4. Check Setup Health

From the `server` directory:

```bash
npm run doctor
```

The doctor command checks MongoDB connectivity, collection availability, admin account presence, and user approval counts.

## 5. Data Protection

MongoDB is the only runtime database. Do not drop databases, drop collections, truncate data, or clear uploaded files during deployment. Use soft delete fields (`isDeleted`, `deletedAt`, `deletedBy`) for user-facing deletion, write audit log entries for create/update/delete/login/logout actions, and update documents with `$set`, `$push`, `$inc`, or `$addToSet` instead of full document replacement.

## 6. Access Flow

Admin access:

```text
Open http://localhost:3000/login
Click Admin Login
Login with username admin or the admin email
Use the password passed to npm run admin:create
```

User access:

```text
Admin creates and approves users from User Management.
Users log in with their assigned username or email after approval.
```

## 7. Storage

User accounts, approval status, login roles, accounts, contacts, leads, deals, converted deals, quotations, products, invoices, tasks, notifications, WhatsApp messages, Outlook emails, files, reports, audit logs, and CRM data are stored permanently in MongoDB.

## 8. Microsoft Outlook Integration

Create a Microsoft Azure App Registration. Choose **Accounts in any organizational directory and personal Microsoft accounts** if the connected mailbox can be an `@outlook.com`, `@hotmail.com`, or Microsoft 365 account.

Add a **Web** redirect URI:

```text
http://127.0.0.1:5000/api/integrations/outlook/callback
```

Add delegated Microsoft Graph permissions:

```text
offline_access
User.Read
Mail.Send
```

Set these values in `server/.env`:

```env
MICROSOFT_CLIENT_ID=replace-with-azure-application-client-id
MICROSOFT_CLIENT_SECRET=replace-with-azure-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://127.0.0.1:5000/api/integrations/outlook/callback
MICROSOFT_LOGIN_REDIRECT_URI=http://127.0.0.1:5000/api/auth/microsoft/callback
MICROSOFT_TOKEN_ENCRYPTION_KEY=replace-with-32-byte-random-hex
```

Create a real client secret in Azure under **Certificates & secrets**. Do not leave `MICROSOFT_CLIENT_SECRET` as the placeholder value, or Outlook login will be disabled in CRM.

Restart the backend after changing `.env`, then open:

```text
http://127.0.0.1:3000/admin/integrations/outlook
```
