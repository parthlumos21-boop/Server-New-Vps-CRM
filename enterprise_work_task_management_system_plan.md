# Implementation Plan: Enterprise Work & Task Management System (Swati CRM)

> [!IMPORTANT]
> **STRICT ADHERENCE:** This is an **ARCHITECTURAL IMPLEMENTATION PLAN ONLY**. **NO CODE IS IMPLEMENTED OR MODIFIED AT THIS STAGE.**
> 
> **Zero-Breakage Guarantee for Existing CRM Modules:**
> - Preserves 100% of existing **Add Account**, `ownerCode` backend, and account assignment logic.
> - Preserves 100% of **Add Deals**, Deal details, Deal creation, and automatic deal convert status.
> - Preserves 100% of **Add Quotations**, Revision quotations, Deal/Account quotation mechanisms, and **Quotation numbering sequences (`quotationNo` / `quotationNumber`)**.
> - Preserves 100% of **Add Customers** logic and customer creation pipelines.
> - Preserves 100% of **Mobile backend**, **Outlook OAuth / Microsoft Graph** mechanisms, and **Codex**.
> - Preserves 100% of existing **Reminders** (will integrate seamlessly without breaking current reminder modals or data).
> - **Sidebar Boundary:** Touches **ONLY** the `Tasks` section menu items in `Sidebar.jsx` and `userSidebarConfig.js`. All other sidebar sections remain untouched.
> - **MongoDB Users Email Identification:** All task creators, assignees, project managers, and team members are dynamically identified by **User Email** from the live MongoDB `users` collection (`email`, `name`, `username`, `role`, `ownerCode`).
> - **Lightweight & Reusable Code:** Maximum modularity, zero third-party bloat, reusable UI components, and lean hooks.
> - **Visual Theme Match:** 100% aligned with `http://localhost:3000/admin/dashboard` (`AdminPanel.jsx` / `AdminPanel.css`) using `.ap-*` cards, brand red gradient accents, and Font Awesome (`react-icons/fa`) icons. No GUI/emoji icons used.

---

## 1. System Architecture & Vision

The goal is to expand the existing Tasks section into a full-scale **Enterprise Work Management Platform** directly inside Swati CRM. 
Employees and management can seamlessly move through the entire lifecycle:
$$\text{Account (Lead)} \longrightarrow \text{Customer} \longrightarrow \text{Deal} \longrightarrow \text{Quotation} \longrightarrow \text{Project} \longrightarrow \text{Tasks} \longrightarrow \text{Time Tracking} \longrightarrow \text{SLA} \longrightarrow \text{Completion} \longrightarrow \text{Reports}$$

### 1.1 Navigation & Icon Architecture (Font Awesome Icons Only)

| Submenu Section | Route (Admin / User) | Font Awesome Icon (`react-icons/fa`) | Primary Function |
| :--- | :--- | :--- | :--- |
| **My Work** | `/admin/tasks/my-work` \| `/tasks/my-work` | `<FaBriefcase />` | Personal execution cockpit, today's schedule, quick actions |
| **Tasks** | `/admin/tasks/all` \| `/tasks/all` | `<FaTasks />` | Multi-view workspace: List, Kanban, Calendar, Timeline |
| **Projects** | `/admin/tasks/projects` \| `/tasks/projects` | `<FaProjectDiagram />` | Project portfolio, milestone roadmap stepper, templates |
| **Time Tracking** | `/admin/tasks/time-tracking` \| `/tasks/time-tracking` | `<FaRegClock />` | Live stopwatch, daily/weekly log entry, timesheet approvals |
| **Workload** | `/admin/tasks/workload` \| `/tasks/workload` | `<FaUsers />` | Team capacity bar matrix, workload rebalancing |
| **Workflows** | `/admin/tasks/workflows` | `<FaSyncAlt />` | Event-driven automation rules (Deal Won ➔ Project) |
| **Approvals** | `/admin/tasks/approvals` \| `/tasks/approvals` | `<FaCheckCircle />` | Multi-tier approvals hub (timesheets, milestones, scope) |
| **Documents** | `/admin/tasks/documents` \| `/tasks/documents` | `<FaFileAlt />` | Centralized attachment and blueprint vault |
| **Reminders** | `/admin/tasks/reminders` \| `/tasks/reminders` | `<FaBell />` | Unified calendar & deadline reminder synchronizer |
| **Activity** | `/admin/tasks/activity` \| `/tasks/activity` | `<FaHistory />` | Audit log, real-time activity stream |

### 1.2 Lightweight & Reusable Code Architecture Principles
To guarantee high performance, low bundle footprint, and zero code duplication, the implementation will strictly adhere to these 4 principles:

1. **Atomic Reusable UI Components (`src/pages/tasks/components/common/`):**
   - `TaskCardShell.jsx`: Standardized wrapper encapsulating `.ap-dashboard-card`, header title, and action slot so every page uses the exact same layout wrapper.
   - `TaskStatusBadge.jsx`: Micro-component rendering status, priority, and SLA badges with pre-computed styles.
   - `UserEmailBadge.jsx`: Resolves a MongoDB user email to a clean avatar pill with initials and tooltip name.
   - `TaskFilterBar.jsx`: Reusable toolbar supporting keyword search, assignee dropdown (from MongoDB `users`), and status filters across List, Kanban, and Calendar views.
   - `TaskModalShell.jsx`: Reusable modal wrapper utilizing existing `Modal.jsx` and `.ap-modal-*` styles.
2. **Lean Custom Hooks:**
   - `useTaskWorkspace(filterParams)`: Single data-fetching hook with lightweight state handling, preventing redundant re-fetching.
   - `useTaskTimer()`: Lightweight timer hook operating a single interval instance shared across the persistent navbar and task drawers.
3. **Zero Redundant Libraries:**
   - Pure React 18 hooks (`useState`, `useMemo`, `useCallback`, `useContext`).
   - Pure Font Awesome icons from `react-icons/fa`.
   - Native DOM drag-and-drop or minimal touch handlers for Kanban (no 100KB DnD libraries).
   - Reuses existing CSS utility classes from `AdminPanel.css`.
4. **Backend Lean Projection & Indexing:**
   - MongoDB queries project only necessary fields (`email`, `name`, `role`, `department`), avoiding large document transfers.
   - Compound indexes on `{ companyId: 1, assignedTo: 1, status: 1 }` and `{ companyId: 1, projectId: 1 }` ensure sub-millisecond lookups.

---

## 2. UI/UX & Theme Alignment with `http://localhost:3000/admin/dashboard`

All new Task Management views, cards, modals, tables, and buttons will strictly inherit the visual tokens and design language established in `AdminPanel.jsx` and `AdminPanel.css`:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [FaBriefcase] My Work | Good Morning, Keval V Shah   [Metric: In Progress ▼] [Refresh] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│ │   Active Tasks   │ │  Overdue Tasks   │ │   SLA At Risk    │ │ Active Projects  │    │
│ │        14        │ │        2         │ │        1         │ │        3         │    │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘    │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ .ap-dashboard-card: Today's Scheduled Tasks                                        │ │
│ │ ┌────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [FaTasks] Prepare 33KV Proposal | Deal #3688 | Due 05:00 PM | [High] [Start]   │ │ │
│ │ │ [FaTasks] Review Fabrication CAD Drawing | Project PRJ-0042 | Due Tomorrow     │ │ │
│ │ └────────────────────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Visual Token & Component Mapping:
1. **Container Wrapper:** `.ap-dashboard-shell` providing consistent fluid margins, max-width constraints, and clean vertical rhythm.
2. **Card Structure:** `.ap-dashboard-card` with:
   - Header: `.ap-dashboard-card-header` containing title link `.ap-dashboard-card-title`, icon, and filter controls.
   - Body: `.ap-dashboard-card-body` containing `.ap-dashboard-subtitle` and content grids.
3. **Primary Brand Colors & Accents:**
   - Swati Crimson Gradient: `linear-gradient(135deg, #80000e 0%, #c60016 58%, #e11d2e 100%)` for active tabs, primary action buttons, and highlighted counters.
   - Surface Background: Pure white `#ffffff` cards on clean slate light surface (`#f8fafc`).
   - Borders: Subtle structural borders `1.5px solid #e2e8f0` (or `rgba(202, 213, 229, 0.95)`).
   - Corner Radius: `16px` for cards and badges; `20px` for header shells.
   - Shadows: Soft diffusion `0 4px 18px rgba(0, 0, 0, 0.04)`.
4. **Action Buttons:**
   - Primary: `.ap-tab-add` and `.ap-modal-btn-primary` (Crimson gradient, bold white text, subtle elevation).
   - Secondary: `.ap-header-item-btn` and `.ap-modal-btn-secondary` (`rgba(198, 0, 22, 0.05)` background with `#c60016` border and hover transition).
5. **Icon Standard:** Font Awesome (`react-icons/fa`) strictly embedded within `.ap-tab-icon` or header wrappers. Zero emoji/GUI icons.

---

## 3. User Identification via User Email from MongoDB `users` Collection

All user relationships across Tasks, Projects, Time Tracking, Workload, and Activity are identified by **User Email** (`email` field) from the live MongoDB `users` collection (`User = getMongoModel('users')` / `userRepository.js`).

### 3.1 MongoDB User Document Mapping
```javascript
// Live record from MongoDB 'users' collection:
{
  id: 1,
  _id: "64f1a2...",
  email: "keval@swatiswitchgears.com", // CANONICAL IDENTIFIER FOR COLLABORATION
  name: "Keval V Shah",
  username: "keval",
  role: "admin",
  ownerCode: "SW-01",
  department: "Switchgear Sales",
  companyId: 1
}
```

### 3.2 Canonical User Email Model in Task Entities
In the database and APIs, tasks reference the authenticated **user email** as the primary identity key:
```javascript
{
  id: "TASK-10482",
  legacyId: 10482,
  companyId: 1,
  title: "Prepare Techno-Commercial Proposal for 33KV Substation",
  
  // User Email Identifiers from MongoDB 'users' Collection:
  createdBy: "keval@swatiswitchgears.com",       // Creator user email
  assignedTo: "parth@support.com",              // Assignee user email
  teamId: "sales-ahmedabad",
  followers: [
    "rushabh@support.com",                      // Follower user email
    "keval@swatiswitchgears.com"
  ],
  
  // Associated CRM Entities (Deep Links)
  accountId: "123",
  customerId: "cust-402",
  dealId: "deal-3688",
  quotationId: "qt-82",
  projectId: "proj-901",
  
  status: "in_progress",                        // open, in_progress, review, completed, blocked, cancelled
  priority: "high",                             // low, medium, high, urgent
  estimatedMinutes: 240,
  actualMinutes: 165,
  isTimerRunning: false,
  
  // Work Breakdown & Checklists
  subtasks: [
    { id: "sub-1", title: "Verify Single Line Diagram", completed: true, completedBy: "parth@support.com" },
    { id: "sub-2", title: "Check Busbar Sizing & Ratings", completed: true, completedBy: "parth@support.com" },
    { id: "sub-3", title: "Calculate Custom Sheet Metal Cost", completed: false, completedBy: null }
  ],
  progress: 66,
  
  // SLA Tracking
  slaDeadline: "2026-10-16T17:00:00Z",
  slaStatus: "compliant",                       // compliant, at_risk, breached
  
  createdAt: "2026-10-15T09:00:00Z",
  updatedAt: "2026-10-15T11:45:00Z"
}
```

### 3.3 Dynamic User Dropdowns in Frontend
- All dropdowns (`Assignee`, `Created By`, `Project Manager`, `Team Members`, `Reviewer`) query live user documents via `apiClient.get('/users')`.
- Options display the user's formatted name and role, and store the user's **email** value:
  `<option value="parth@support.com">Parth (parth@support.com)</option>`
- Ensures seamless alignment with `useAuth()` (`user.email`), Outlook integration, and MongoDB users.

---

## 4. Dual-Role Visibility & Access Model

The system enforces role-based data isolation at both the UI and API levels:

```mermaid
flowchart TD
    subgraph Admin_Level ["Admin / Super Admin Scope"]
        A_KPI["1. Org KPI Cards (Tasks, Projects, Time, SLA Breaches, Pending Approvals)"]
        A_User["2. Team Work Overview (MongoDB Users Performance Table by User Email)"]
        A_Proj["3. Project Portfolio Overview (Progress, Milestones, SLA Compliance)"]
        A_Drill["3-Level Drill-Down: Organization ➔ User Profile ➔ Project Workspace"]
        A_KPI --> A_User --> A_Proj --> A_Drill
    end

    subgraph User_Level ["Normal User Scope"]
        U_KPI["1. Personal Micro-KPIs (My Tasks, Overdue, SLA At Risk, My Projects)"]
        U_Today["2. Today's Scheduled Timeline (Hourly agenda & quick actions)"]
        U_Assigned["3. Personal Execution Only (Tasks & Projects assigned to user.email)"]
        U_KPI --> U_Today --> U_Assigned
    end

    subgraph Data_Layer ["MongoDB Secure Scoped Queries"]
        A_Drill -->|Query: { companyId }| DB[(MongoDB Collections)]
        U_Assigned -->|Query: { companyId, assignedTo: user.email }| DB
    end
```

### Role Matrix Comparison

| Feature | Admin / Super Admin | Normal End User |
| :--- | :--- | :--- |
| **My Work Dashboard** | Full team selector filter (`My Work` / `All Employees` by user email) | Strict personal cockpit scoped to logged-in `user.email` |
| **Tasks View** | Organization-wide master tasks table + multi-filter matrix | Only tasks where `assignedTo == user.email`, `createdBy == user.email`, or `followers` includes `user.email` |
| **Projects View** | All company projects with health metrics and budget tracking | Only projects where user email is project manager or in team members |
| **Time Tracking** | Team live hours, billable/non-billable ratio, timesheet approval queue | Personal stopwatch timer, daily log entry, submit timesheet |
| **Workload** | Full team capacity view grouped by user email, reassign work | Personal capacity progress indicator (e.g. 32h / 40h = 80%) |
| **Workflows** | Configure triggers (Deal Won ➔ Create Project, SLA 80% ➔ Alert) | Automated task generation runs transparently for the user |
| **Approvals** | Central decision hub: approve, reject, request change | Submit approval requests + review items assigned to user email as approver |
| **Documents** | Access all company project, deal, and quotation document vaults | Access documents linked to assigned projects and tasks |
| **Activity** | Full organization-wide chronological audit trail | Personal activity log (own actions and notifications) |

---

## 5. Comprehensive UI/UX Modules Specification

All modules are designed using the `.ap-dashboard-card` layout, pure Font Awesome icons, and responsive tables matching `http://localhost:3000/admin/dashboard`.

### Module 1: My Work (Employee Daily Cockpit)
**Route:** `/tasks/my-work` (Users) | `/admin/tasks/my-work` (Admins)
- **Header:** Personalized greeting (`Good Morning, Keval V Shah`), Date, and View Selector.
- **Top Micro-KPI Strip (4 Cards styled with `.ap-dashboard-card`):**
  1. `<FaTasks />` `My Tasks` (Active count for `assignedTo: user.email`)
  2. `<FaRegClock />` `Overdue` (Urgent attention badge in red)
  3. `<FaBell />` `SLA At Risk` (Warning countdown)
  4. `<FaProjectDiagram />` `My Projects` (Active assigned projects)
- **Hourly Schedule & Timeline:** Chronological list of tasks scheduled for today with priority chips, project links, and status badges.
- **Quick Actions Bar:**
  - `+ New Task` (Opens modal pre-linked to current user email)
  - `+ New Project` (Admin/Manager only)
  - `▶ Start Timer` (Instant stopwatch widget)
  - `+ Add Reminder` (Seamlessly links to existing reminder system)

---

### Module 2: Tasks Management Workspace
**Route:** `/tasks/all` (Users) | `/admin/tasks/all` (Admins)
- **Multi-View Modes:**
  1. **List View:** Sortable tabular view styled like the CRM data tables (Task Name, Assignee Email & Avatar, Project, Priority, Due Date, SLA Timer, Progress %, Status).
  2. **Kanban Board:** Columns for `Open`, `In Progress`, `Under Review`, `Completed`. Drag-and-drop status update with live socket emission.
  3. **Calendar View:** Month/Week/Day view showing deadlines, reminders, and milestones.
  4. **Timeline (Gantt-Lite):** Visual bar representation plotted against project dates with dependency links.
- **Task Workspace Drawer (Deep-Dive Panel):**
  Clicking any task opens a comprehensive 9-tab workspace:
  - **Overview:** Meta fields, description, associated Account/Customer/Deal/Quotation pills.
  - **Checklist / Subtasks:** Interactive checkboxes with automatic progress calculation (`Progress: 2 / 3 (66%)`).
  - **Dependencies:** Visual tags showing `Blocked by: [...]` and `Blocking: [...]`.
  - **Live Stopwatch & Time Logs:** Start/Pause button with logged hours breakdown.
  - **SLA Countdown:** Animated progress indicator showing response and resolution time remaining.
  - **Discussion & Comments:** Real-time thread with `@mentions` resolving from MongoDB user emails.
  - **Files & Attachments:** Document viewer and download actions.
  - **Activity Log:** Audit trail of status changes, reassignments, and edits.

---

### Module 3: Projects & Milestone Portfolio
**Route:** `/tasks/projects` (Users) | `/admin/tasks/projects` (Admins)
- **Project Cards & Grid:** High-level cards with overall progress ring, health indicator (Green: On Track, Yellow: At Risk, Red: Delayed), Project Manager email avatar, and days remaining.
- **Project Detail Workspace (`/tasks/projects/:id`):**
  - **Dashboard Summary:** Micro-KPIs (Tasks Total/Done, Milestones 4/7, Team Count, Hours Estimated vs Actual, SLA Compliance %).
  - **Milestone Stepper:** Horizontal roadmap showing project stages (1. Requirement ➔ 2. Engineering ➔ 3. Procurement ➔ 4. Fabrication ➔ 5. Testing ➔ 6. Handover). Clicking a milestone filters the tasks under that phase.
  - **Project Templates Hub:** One-click generation of pre-defined project hierarchies (e.g. *Standard 11KV Switchgear Project* auto-creates 5 milestones and standard tasks).

---

### Module 4: Deal Won & Quotation PO Auto-Conversion Hook
- When a Deal is marked **Won** or an Account is saved as **PO Converted** (`convert_to_po`), the CRM prompts the user:
  ```
  [Deal Won! Create Project?]
  Select Template: [Standard Panel Fabrication & Installation ▼]
  Project Manager: [Select User Email from MongoDB users Collection ▼]
  Target Completion: [15 Dec 2026]
  [Create Project & Generate Tasks]
  ```
- **Zero Breakage Guarantee:** This runs asynchronously as a post-conversion hook without modifying existing deal conversion status or quotation numbering logic.

---

### Module 5: Time Tracking & Timesheet Approvals
**Route:** `/tasks/time-tracking` & `/admin/tasks/time-tracking`
- **Global Sticky Timer:** A persistent, minimal stopwatch widget in the top navigation bar. When active, it displays:
  `<FaRegClock /> 01:24:18 | Preparing Quotation - ABC Industries | [Pause] [Stop]`
- **Weekly Timesheet Grid:** Displays Mon-Sun breakdown of hours spent per task and project for the user email.
- **Manager Approval Lifecycle:**
  - User clicks `Submit Timesheet for Week 42`.
  - Admin/Manager receives approval card with 1-click `Approve`, `Reject`, or `Request Adjustment`.

---

### Module 6: Team Workload & Resource Capacity Matrix
**Route:** `/admin/tasks/workload` (Admin) | `/tasks/workload` (User)
- **Admin Team Matrix:**
  - Horizontal capacity bars calculated from estimated hours on active tasks divided by standard weekly capacity (40h), grouping by each team member's email from the MongoDB `users` collection:
    - `keval@swatiswitchgears.com`: 33h / 40h $\rightarrow$ **82%** (Optimal)
    - `raj@swatiswitchgears.com`: 45h / 40h $\rightarrow$ **112% ⚠️ OVERLOADED**
    - `parth@support.com`: 24h / 40h $\rightarrow$ **60%** (Available)
  - Admin can drag a task card directly between team members to rebalance the team workload instantly.
- **User View:** Shows only the individual's personal workload bar and active task distribution.

---

### Module 7: SLA Management & Automatic Escalation
- **Visual Timers:** Color-coded badges:
  - Green: $> 50\%$ SLA time remaining
  - Amber: $25\% - 50\%$ time remaining (Warning)
  - Red: $< 25\%$ time remaining (Critical / At Risk)
  - Crimson/Dark Red: SLA Breached
- **Automated Escalation Flow:**
  $$\text{Task Created} \xrightarrow{50\%} \text{Warning Badge} \xrightarrow{75\%} \text{Team Lead Alert} \xrightarrow{90\%} \text{Manager Notification} \xrightarrow{100\%} \text{Breached Flag}$$

---

### Module 8: Admin 3-Level Drill-Down Management Dashboard
**Route:** `/admin/tasks`
The Admin Management dashboard is structured into 3 interactive zoom levels:

```
LEVEL 1: ORGANIZATION LEVEL
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Tasks  │ │ Completed    │ │ Overdue      │ │ SLA Breached │
│     248      │ │     164      │ │      18      │ │       5      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Projects 32  │ │ Tracked 842h │ │ Approvals 12 │ │ Workload 82% │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

               │
               ▼ (Click on any Employee in Team Overview Table)

LEVEL 2: USER DRILL-DOWN (e.g. keval@swatiswitchgears.com)
┌────────────────────────────────────────────────────────────────┐
│ Keval V Shah | Tasks: 28 (Done: 19, Overdue: 2) | Workload: 82% │
│ Active Projects: 4 | Tracked Time: 46h | SLA Compliance: 94%   │
│ [View Keval's Tasks] [View Keval's Timesheets] [Rebalance Work]│
└────────────────────────────────────────────────────────────────┘

               │
               ▼ (Click on any Project in Project Portfolio Table)

LEVEL 3: PROJECT DRILL-DOWN (e.g. ABC Plant Automation)
┌────────────────────────────────────────────────────────────────┐
│ ABC Plant Automation | Progress: 64% | Milestones: 4/7 Done     │
│ Manager: Parth | Team: 8 Members | SLA: 96.2% | Issues: 3 Open  │
│ [Overview] [Milestones] [Tasks] [Gantt] [Team] [Docs] [Audit]   │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Sidebar Navigation Configuration (Tasks Section ONLY)

To strictly adhere to user instructions, **ONLY the Tasks section** will be touched in `Sidebar.jsx` and `userSidebarConfig.js`. All other sidebar items remain completely untouched.

### 6.1 Admin Sidebar (`Sidebar.jsx` lines 254–265)
```javascript
// STRICT SCOPE: Only touch tasksMenuItems in Sidebar.jsx
const tasksMenuItems = [
  { label: 'Management Dashboard', to: '/admin/tasks' },
  { label: 'My Work', to: '/admin/tasks/my-work' },
  { label: 'All Tasks', to: '/admin/tasks/all' },
  { label: 'Projects', to: '/admin/tasks/projects' },
  { label: 'Time Tracking', to: '/admin/tasks/time-tracking' },
  { label: 'Workload', to: '/admin/tasks/workload' },
  { label: 'Workflows', to: '/admin/tasks/workflows' },
  { label: 'Approvals', to: '/admin/tasks/approvals' },
  { label: 'Documents', to: '/admin/tasks/documents' },
  { label: 'Reminders', to: '/admin/tasks/reminders' },
  { label: 'Activity', to: '/admin/tasks/activity' },
]
```

### 6.2 User Sidebar (`userSidebarConfig.js` lines 94–103)
```javascript
// STRICT SCOPE: Only touch the 'tasks' entry in userSidebarConfig.js
{
  key: 'tasks',
  label: 'Tasks',
  icon: FaTasks,
  routePrefix: '/tasks',
  items: [
    { label: 'My Work', to: '/tasks/my-work' },
    { label: 'My Tasks', to: '/tasks/all' },
    { label: 'My Projects', to: '/tasks/projects' },
    { label: 'Time Tracking', to: '/tasks/time-tracking' },
    { label: 'My Workload', to: '/tasks/workload' },
    { label: 'My Approvals', to: '/tasks/approvals' },
    { label: 'Documents', to: '/tasks/documents' },
    { label: 'Reminders', to: '/tasks/reminders' },
    { label: 'My Activity', to: '/tasks/activity' },
  ],
}
```

---

## 7. Implementation Phases & Roadmap

### Phase 1: MongoDB Schemas & Backend User Email Integration
1. **User Email Resolution Service:** Connect task models directly with the existing `userRepository.js` and `users` collection in MongoDB using `email` as the canonical user key.
2. **Modular Data Schemas:** Register schemas in `server/models/mongoModels.js` for `projects`, `project_templates`, `time_entries`, `sla_policies`, `workflows`, and `approvals`.
3. **Task Service Enhancement:** Upgrade `server/services/taskService.js` to handle checklists, subtasks, SLA tracking, and deep CRM entity relations (`accountId`, `dealId`, `quotationId`, `customerId`).
4. **Project & Milestone Service:** Build `server/services/projectService.js` for portfolio management and milestone progress calculation.
5. **Time & SLA Services:** Build `server/services/timeTrackingService.js` and `server/services/slaService.js`.
6. **Scoped API Endpoints:** Build controllers ensuring strict role filtering:
   - Admin gets organization-wide aggregates and team metrics.
   - Non-admin users are strictly scoped to their logged-in `user.email`.

### Phase 2: Sidebar & Shell Routing Setup
1. **Sidebar Integration (Tasks Section ONLY):** Update `tasksMenuItems` in `Sidebar.jsx` and the `tasks` entry in `userSidebarConfig.js`. Leave all other sidebar items untouched.
2. **Routing:** Register sub-routes in `src/App.jsx` under `/admin/tasks/*` and `/tasks/*`.
3. **Reusable Theme Atoms (`AdminPanel.css` Alignment):** Create reusable styled atoms inheriting `.ap-dashboard-card`, `.ap-tab-add`, `.ap-header-item-btn`, and pure Font Awesome (`react-icons/fa`) icons.

### Phase 3: My Work Cockpit & Tasks Workspace
1. **`MyWorkPage.jsx`:** The daily hub with morning greeting, micro-KPI cards, today's schedule, and quick-action modals.
2. **`TasksMasterPage.jsx`:** Tabbed multi-view workspace (List, Kanban board with drag-and-drop, Calendar, Timeline Gantt).
3. **`TaskDetailDrawer.jsx`:** 9-tab deep-dive slide-over workspace with real-time comments, subtasks, attachments, and dependency graph.

### Phase 4: Projects Portfolio, Templates & CRM Conversion Hook
1. **`ProjectsPage.jsx` & `ProjectDetailPage.jsx`:** Project health overview, milestone roadmap stepper, and team roster with avatars from MongoDB user emails.
2. **Template Library:** Interface to select and apply project blueprints.
3. **CRM Conversion Hook:** Non-intrusive post-save modal when Deal Won or PO Converted occurs to instantiate the linked project automatically without touching core deal logic.

### Phase 5: Time Tracking, Workload Matrix, SLA, & Approvals
1. **`TimeTrackingPage.jsx` & `TimesheetApprovalModal.jsx`:** Timesheet logging and approval cycles.
2. **`WorkloadMatrixPage.jsx`:** Visual team capacity bar graphs with drag-and-drop task redistribution for managers based on MongoDB user emails.
3. **`ApprovalsPage.jsx`:** Multi-tier approvals queue with 1-click decisions.
4. **`ActivityFeedPage.jsx`:** Chronological event stream powered by Socket.io.

### Phase 6: Admin 3-Level Management Dashboard & Reports
1. **Level 1:** Organization overview dashboard with top micro-KPI cards styled with `.ap-dashboard-card`.
2. **Level 2:** User-wise performance summary table (resolving each user from MongoDB user emails) with 1-click drill-down to employee details.
3. **Level 3:** Project-wise performance summary table with 1-click drill-down to project workspace.
4. **Reports Analytics:** Exportable task completion, team productivity, and SLA compliance reports.

---

## 8. Verification & Testing Matrix

| Test Scenario | Verification Target | Expected Result |
| :--- | :--- | :--- |
| **User Email Resolution from MongoDB** | View assignee dropdown & team tables | Real names and roles loaded directly from MongoDB `users` collection mapped to their `email` (`keval@swatiswitchgears.com`, `parth@support.com`, etc.). Zero mock IDs. |
| **Lightweight Code Quality** | Code review & bundle check | Reusable UI atoms (`TaskCardShell`, `TaskStatusBadge`, `UserEmailBadge`) used across all pages; zero external library bloat. |
| **Sidebar Isolation** | Inspect Sidebar navigation | ONLY the Tasks submenu reflects the new structure. All other menus (Accounts, Deals, Quotations, Reports, Reminders) remain 100% untouched. |
| **Theme & UI Matching** | Compare `/admin/tasks` to `/admin/dashboard` | 100% aesthetic match: identical `.ap-dashboard-card` layout, red gradient accents, pill styling, and button states. |
| **Icon Standard** | Verify all icons | All icons rendered using Font Awesome (`react-icons/fa`). Absolutely zero GUI/emoji icons. |
| **Admin Organization Scope** | Log in as Admin on `/admin/tasks` | Full organization statistics, all users in Team Overview table, all projects visible. |
| **User Personal Scope** | Log in as Normal User on `/tasks/my-work` | Sees only assigned tasks, own projects, own time tracking, and own activity matching `user.email`. |
| **Subtask Auto-Progress** | Complete 2 out of 3 checklist items | Task progress updates to exactly 66% in database and UI in real-time. |
| **CRM Entity Deep-Linking** | Open task created from Deal #3688 | Clicking Deal pill navigates directly to Deal details; clicking Account pill opens Account drawer. |
| **Deal ➔ Project Hook** | Mark deal won or account `convert_to_po` | Prompt offers project creation; core CRM save completes cleanly with zero errors. |
| **Live Timer Persistence** | Start timer on Task A, navigate across pages | Timer continues ticking in top navbar; stopping timer records exact duration in `time_entries`. |
| **Zero CRM Regression** | Test Add Account, Add Deals, Add Quotations, Add Customers | All existing forms, numbering sequences, and APIs function 100% identically with zero breakage. |
