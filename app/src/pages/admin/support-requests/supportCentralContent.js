import {
  FaBolt,
  FaBuilding,
  FaChartBar,
  FaCogs,
  FaFileInvoiceDollar,
  FaHandshake,
  FaPlug,
  FaRocket,
  FaTasks,
  FaUserCog,
  FaUsers,
} from 'react-icons/fa'

export const SUPPORT_CENTRAL_CATEGORIES = [
  {
    key: 'getting-started',
    title: 'Getting Started',
    icon: FaRocket,
    color: '#2b8fc8',
    articles: [
      {
        title: 'Getting started with your CRM workspace',
        summary: 'Set up navigation, profiles, and your first daily workflow.',
        body: 'Use the left navigation to move between Accounts, Customers, Deals, Quotations, Tasks, Reports, and Support Requests. Start by confirming your profile details, then create or import your first working records.',
      },
      {
        title: 'How to organize your daily pipeline',
        summary: 'A quick path for following new leads, reminders, and conversions.',
        body: 'Review your account lists, check active reminders, update follow-up notes, and convert qualified accounts into deals only after the account owner and status are correct.',
      },
      {
        title: 'Where to find key CRM tools',
        summary: 'Locate search, reports, quotation manager, and settings faster.',
        body: 'Use Search for quick record lookups, Reports for summaries and analytics, Quotation Manager for quotation actions, and Settings or User Management for admin controls.',
      },
    ],
  },
  {
    key: 'accounts',
    title: 'Accounts',
    icon: FaBuilding,
    color: '#2874c6',
    articles: [
      {
        title: 'Create and manage accounts',
        summary: 'Add new accounts, update owners, and keep address details complete.',
        body: 'Capture account number, company name, owner, contact details, GSTIN, state code, and address fields so quotation and reminder flows can autofill correctly later.',
      },
      {
        title: 'Using account actions',
        summary: 'Work with reminders, status changes, quotations, and conversions.',
        body: 'Open the Actions menu from the account list or detail view to add reminders, change account status, generate quotation, upload quotation, re-assign ownership, or convert the account to a deal.',
      },
      {
        title: 'Search and filter account lists',
        summary: 'Use owner, status, source, and text filters efficiently.',
        body: 'Column search boxes and owner/status filters help narrow large account lists quickly without changing the underlying data or pagination behavior.',
      },
    ],
  },
  {
    key: 'customers',
    title: 'Customers',
    icon: FaUsers,
    color: '#29a36a',
    articles: [
      {
        title: 'Working with customer records',
        summary: 'Create customer records and keep primary contact details ready.',
        body: 'Customer records should capture billing and communication details so downstream reporting, service, and account coordination remain accurate.',
      },
      {
        title: 'Managing customer ownership',
        summary: 'Keep owner fields and visibility aligned with the team structure.',
        body: 'Owner filters and role-based views make it easier to see only relevant customer records while keeping shared records accessible to admins.',
      },
      {
        title: 'Customer search best practices',
        summary: 'Use table filters and direct record views for quick lookup.',
        body: 'Search by company name, contact name, or contact channels to reach the right customer record quickly and reduce duplication.',
      },
    ],
  },
  {
    key: 'deals',
    title: 'Deals',
    icon: FaHandshake,
    color: '#d68918',
    articles: [
      {
        title: 'Convert accounts into deals',
        summary: 'Move qualified opportunities into the deal pipeline.',
        body: 'Use Convert as Deal only when the account is properly qualified, then complete project, stage, and expected value details so forecast reports remain trustworthy.',
      },
      {
        title: 'Track project stages',
        summary: 'Maintain deal progress and project-specific information.',
        body: 'Keep owner, project name, stage, follow-up dates, and notes updated so deal boards, custom views, and reports stay aligned.',
      },
      {
        title: 'Owner-wise and location-wise deal views',
        summary: 'Use segmented views to monitor active opportunities.',
        body: 'Switch between owner-wise, project, and city-specific deal views to manage large pipelines without changing the underlying records.',
      },
    ],
  },
  {
    key: 'task-reminders',
    title: 'Task & Reminders',
    icon: FaTasks,
    color: '#b455c6',
    articles: [
      {
        title: 'Create reminders for follow-ups',
        summary: 'Assign reminders from account and related workflows.',
        body: 'Use reminders to track callbacks, visits, and internal actions. Reminder lists remain dynamic and owner-specific, so accurate ownership matters.',
      },
      {
        title: 'Manage open and closed tasks',
        summary: 'Keep daily work visible without losing completed history.',
        body: 'Update task status promptly so the active and closed views remain meaningful for users and team leaders.',
      },
      {
        title: 'Use reminder filters effectively',
        summary: 'Narrow down owner, due date, and status-based reminder lists.',
        body: 'Apply list filters instead of creating duplicate reminders; this keeps dashboards lighter and reporting more accurate.',
      },
    ],
  },
  {
    key: 'user-management',
    title: 'User Management',
    icon: FaUserCog,
    color: '#5674e9',
    articles: [
      {
        title: 'Add and manage CRM users',
        summary: 'Create team members and align permissions with their role.',
        body: 'Keep user names, email IDs, and ownership mappings updated so dropdowns, assignment flows, reminders, and reports all stay in sync.',
      },
      {
        title: 'Role-based access overview',
        summary: 'Understand admin, owner, and viewer access differences.',
        body: 'Admins can generally access all actions, while regular users should see only the records and quotation actions permitted by role and ownership.',
      },
      {
        title: 'Keeping owner lists consistent',
        summary: 'Why shared owner directories matter across the CRM.',
        body: 'Unified owner lists help avoid mismatched names between accounts, reminders, quotations, and summary reports.',
      },
    ],
  },
  {
    key: 'admin-settings',
    title: 'Admin Settings',
    icon: FaCogs,
    color: '#1c8f88',
    articles: [
      {
        title: 'Core CRM configuration',
        summary: 'Maintain master settings without affecting user data flows.',
        body: 'Admin Settings should be used for workspace-level configuration, not day-to-day record edits, so system behavior stays predictable.',
      },
      {
        title: 'Keep branding and organization details updated',
        summary: 'Profile information powers quotation headers and communication.',
        body: 'Organization details like address, GSTIN, state code, and contact channels should remain current because quotations and PDFs depend on them.',
      },
      {
        title: 'Safe configuration changes',
        summary: 'Change one administrative area at a time and verify impacted screens.',
        body: 'When updating settings, confirm dependent flows like quotation generation, reports, and role-based access still behave as expected.',
      },
    ],
  },
  {
    key: 'reports',
    title: 'Reports',
    icon: FaChartBar,
    color: '#2e86de',
    articles: [
      {
        title: 'Use summary reports effectively',
        summary: 'Configure owner, status, and time-period based reporting.',
        body: 'Summary reports help compare account status and ownership trends. Use saved filters and time periods to make recurring report generation faster.',
      },
      {
        title: 'Build focused report views',
        summary: 'Use templates and filters for accounts, customers, deals, and quotations.',
        body: 'Template-based reporting lets teams repeat the same view logic without rebuilding filters every time.',
      },
      {
        title: 'Read analytics and charts',
        summary: 'Understand trends across records, owners, and time periods.',
        body: 'Charts and analytics complement tabular reports by surfacing movement, conversion patterns, and activity concentration across the CRM.',
      },
    ],
  },
  {
    key: 'quotation-management',
    title: 'Quotation Management',
    icon: FaFileInvoiceDollar,
    color: '#f08a24',
    articles: [
      {
        title: 'Generate quotations from linked accounts',
        summary: 'Use profile selection and account search to start correctly.',
        body: 'Select the organization profile first, choose the linked account from account search, then continue into the quotation builder with client details auto-filled.',
      },
      {
        title: 'Use quotation actions',
        summary: 'Work with PDF, preview, view, approval, rejection, and cloning.',
        body: 'Quotation number action menus provide quick access to View As PDF, Preview, View Quote, Approve Quote, Reject Quote, Clone Quote, and View Account without leaving the manager.',
      },
      {
        title: 'Keep quotation totals accurate',
        summary: 'Protect product, service, tax, and amount calculations.',
        body: 'Use the existing line item flows for products and services so tax and total calculations remain aligned with quotation summaries and PDFs.',
      },
    ],
  },
  {
    key: 'rules-actions',
    title: 'Rules & Actions',
    icon: FaBolt,
    color: '#de5c5c',
    articles: [
      {
        title: 'Use action menus consistently',
        summary: 'Apply record actions from account and quotation views safely.',
        body: 'Action menus are designed to centralize operational steps like reminders, status changes, quotation flows, reassignment, and conversion without changing list layouts.',
      },
      {
        title: 'Status-driven workflows',
        summary: 'Keep account and quotation statuses meaningful for reporting.',
        body: 'Use status changes deliberately because downstream filters, boards, reminders, and summaries depend on the current status value.',
      },
      {
        title: 'Avoid duplicate actions',
        summary: 'Check the current record state before repeating workflow actions.',
        body: 'Before reassigning, converting, or cloning, confirm the latest record state to avoid redundant data or conflicting follow-up work.',
      },
    ],
  },
  {
    key: 'integrations',
    title: 'Integrations',
    icon: FaPlug,
    color: '#21a6b7',
    articles: [
      {
        title: 'Understand integration touchpoints',
        summary: 'Know where external data and CRM modules intersect.',
        body: 'Integrations may influence imports, notifications, or supporting workflows, so validate data mapping before enabling production use.',
      },
      {
        title: 'Uploading and imported data hygiene',
        summary: 'Keep account, customer, and deal imports clean and mapped.',
        body: 'Consistent data formats reduce reconciliation issues across bulk uploads, reports, and downstream action menus.',
      },
      {
        title: 'Troubleshoot common sync issues',
        summary: 'Check field mapping, owner names, and record freshness first.',
        body: 'Most sync issues come from mismatched required fields, old ownership labels, or incomplete source data rather than UI behavior.',
      },
    ],
  },
]

export const getSupportCategory = (categoryKey) => (
  SUPPORT_CENTRAL_CATEGORIES.find((category) => category.key === categoryKey) || null
)
