  import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import PublicOnlyRoute from './components/common/PublicOnlyRoute'
import Spinner from './components/common/Spinner'
import AuditTrailReporter from './components/common/AuditTrailReporter'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import Accounts from './pages/accounts/Accounts'
import AddAccountWizard from './pages/accounts/AddAccountWizard'
import AdminCalendarPage from './pages/admin/AdminCalendarPage'
import AccountActionPlaceholderPage from './pages/admin/accounts/AccountActionPlaceholderPage'

import AdminAddDealPage from './pages/admin/deals/AdminAddDealPage'
import AdminDealDetailPage from './pages/admin/deals/AdminDealDetailPage'
import AdminManageDealPage from './pages/admin/deals/AdminManageDealPage'

import CustomerActionPage from './pages/admin/customers/CustomerActionPage'
import AdminSettingsPage from './pages/admin/settings/AdminSettingsPage'
import AdminWorkStatusPage from './pages/admin/work/AdminWorkStatusPage'
import AdminRemindersPage from './pages/admin/reminders/AdminRemindersPage'
import AddReminderPage from './pages/admin/reminders/AddReminderPage'
import CRMActionPage from './pages/admin/crm-actions/CRMActionPage'
import ClosedSupportRequest from './pages/admin/support-requests/ClosedSupportRequest'
import SupportRequestDetailsPage from './pages/admin/support-requests/SupportRequestDetailsPage'
import SupportRequestManagePage from './pages/admin/support-requests/SupportRequestManagePage'
import SupportRequestActionPage from './pages/admin/support-requests/SupportRequestActionPage'
import SupportRequestReportPage from './pages/admin/support-requests/SupportRequestReportPage'

import SupportCentralPage from './pages/admin/support-requests/SupportCentralPage'
import SupportRequestList from './pages/admin/support-requests/SupportRequestList'
import SupportRequestSearch from './pages/admin/support-requests/SupportRequestSearch'
import SupportRequestView from './pages/admin/support-requests/SupportRequestView'
import TicketPage from './pages/tickets/TicketPage'
import AddTicketPage from './pages/tickets/AddTicketPage'
import IntegrationQrPage from './pages/integrations/IntegrationQrPage'
import OutlookMailPage from './pages/integrations/OutlookMailPage'
import Login from './pages/auth/Login'
import AdminLogin from './pages/auth/AdminLogin'
import Logout from './pages/auth/Logout'
import Register from './pages/auth/Register'
import Deals from './pages/deals/Deals'
import ConvertedDeals from './pages/deals/ConvertedDeals'
import CustomReportsPage from './pages/admin/reports/CustomReportsPage'
import ReportOutputPage from './pages/admin/reports/ReportOutputPage'
import AddAccountReportPage from './pages/admin/reports/AddAccountReportPage'
import AddCustomerReportPage from './pages/admin/reports/AddCustomerReportPage'
import AddDailyStatusReportPage from './pages/admin/reports/AddDailyStatusReportPage'
import AddDealReportPage from './pages/admin/reports/AddDealReportPage'
import AddGeoTrackingReportPage from './pages/admin/reports/AddGeoTrackingReportPage'
import AddQuotationReportPage from './pages/admin/reports/AddQuotationReportPage'
import AddRemarkReportPage from './pages/admin/reports/AddRemarkReportPage'
import AddClosedSupportRequestReportPage from './pages/admin/reports/AddClosedSupportRequestReportPage'
import AddSupportRequestReportPage from './pages/admin/reports/AddSupportRequestReportPage'

import CustomerMapViewPage from './pages/admin/reports/CustomerMapViewPage'
import ChartsPage from './pages/admin/charts/ChartsPage'
import ChartsListPage from './pages/admin/charts/ChartsListPage'
import AdminMessagesPage from './pages/admin/messages/AdminMessagesPage'
import PasswordResetRequestsPage from './pages/admin/users/PasswordResetRequestsPage'
import AdminAdvancedSearchPage from './pages/admin/search/AdminAdvancedSearchPage'
import ProjectDetailsPage from './pages/admin/projects/ProjectDetailsPage'
import AdminLaunchpad from './pages/admin/launchpad/AdminLaunchpad'
import DataManagerPage from './pages/admin/data-manager/DataManagerPage'

import DocumentBasePage from './pages/admin/data-manager/DocumentBasePage'
import ImageGalleryPage from './pages/admin/data-manager/ImageGalleryPage'
import KnowledgeBasePage from './pages/admin/data-manager/KnowledgeBasePage'
import AddKnowledgeBasePage from './pages/admin/data-manager/AddKnowledgeBasePage'
import BulkUploadsPage from './pages/admin/bulk-uploads/BulkUploadsPage'
import BulkUploadAccountsPage from './pages/admin/bulk-uploads/BulkUploadAccountsPage'
import BulkUploadAccountTablesPage from './pages/admin/bulk-uploads/BulkUploadAccountTablesPage'
import BulkUploadDealsPage from './pages/admin/bulk-uploads/BulkUploadDealsPage'
import BulkUploadDealTablesPage from './pages/admin/bulk-uploads/BulkUploadDealTablesPage'
import BulkUploadCustomerTablesPage from './pages/admin/bulk-uploads/BulkUploadCustomerTablesPage'
import BulkUploadCustomersPage from './pages/admin/bulk-uploads/BulkUploadCustomersPage'
import BulkUploadHistoryPage from './pages/admin/bulk-uploads/BulkUploadHistoryPage'
import BulkUploadProductsPage from './pages/admin/bulk-uploads/BulkUploadProductsPage'
import Tasks from './pages/tasks/Tasks'
import UserDashboardPage from './pages/user/UserDashboardPage'
import UserRemindersPage from './pages/user/UserRemindersPage'
import UserDataManagerPage from './pages/user/UserDataManagerPage'
import { getCrmOwnerOptions } from './features/users/crmUserDirectory'
import { DASHBOARD_ROUTES } from './utils/constants'

const LAUNCHPAD_ALLOWED_EMAILS = new Set([
  'keval@swatiswitchgears.com',
  'keval@swatiswithgears.com',
  'rushabh@support.com',
  'parth@support.com',
])

const LaunchpadAccessRoute = () => {
  const { user } = useAuth()
  const email = String(user?.email || '').trim().toLowerCase()

  if (!LAUNCHPAD_ALLOWED_EMAILS.has(email)) {
    return <Navigate to={DASHBOARD_ROUTES.admin} replace />
  }

  return <AdminLaunchpad />
}

const AdminCustomersPage = React.lazy(() => import('./pages/admin/customers/AdminCustomersPage'))
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel'))
const AdminQuotationsPage = React.lazy(() => import('./pages/admin/quotations/AdminQuotationsPage'))
const AdminUserManagementPage = React.lazy(() => import('./pages/admin/users/AdminUserManagementPage'))
const AddSupportRequest = React.lazy(() => import('./pages/admin/support-requests/AddSupportRequest'))
const CustomReportBuilderPage = React.lazy(() => import('./pages/admin/reports/CustomReportBuilderPage'))
const MyGroupAccountsPage = React.lazy(() => import('./pages/admin/accounts/MyGroupAccountsPage'))
const QuotationSummaryReportPage = React.lazy(() => import('./pages/admin/reports/QuotationSummaryReportPage'))
const Quotations = React.lazy(() => import('./pages/quotations/Quotations'))
const SalesDashboard = React.lazy(() => import('./pages/admin/SalesDashboard'))
const SummaryReportsPage = React.lazy(() => import('./pages/admin/reports/SummaryReportsPage'))
const TeamViewPage = React.lazy(() => import('./pages/admin/team-view/TeamViewPage'))
const CommunicationActivitiesPage = React.lazy(() => import('./pages/communication/CommunicationActivitiesPage'))

const LandingPage = React.lazy(() => import('./pages/landing/LandingPage'))
const PrivacyPolicyPage = React.lazy(() => import('./pages/legal/PrivacyPolicyPage'))
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage'))
const AccountDeletionPage = React.lazy(() => import('./pages/legal/AccountDeletionPage'))

const RootRouteHandler = () => {
  const { user, loading } = useAuth()
  if (loading) {
    return <Spinner fullScreen text="Loading..." />
  }
  if (!user) {
    return <LandingPage />
  }
  return (
    <ProtectedRoute allowedRoles={['user', 'manager', 'engineer', 'sales']}>
      <Layout />
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <AuditTrailReporter />
            <React.Suspense fallback={<Spinner fullScreen text="Loading page..." />}>
              <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-and-conditions" element={<TermsPage />} />
              <Route path="/account-deletion" element={<AccountDeletionPage />} />
              <Route
                path="/login"
                element={(
                  <Login />
                )}
              />
              <Route path="/register" element={<Register />} />
              <Route
                path="/admin/login"
                element={(
                  <AdminLogin />
                )}
              />
              <Route path="/logout" element={<Logout />} />
              <Route path="/unauthorized" element={<Navigate to="/login" replace />} />
              <Route
                path="/admin/launchpad"
                element={(
                  <ProtectedRoute requireAdmin>
                    <LaunchpadAccessRoute />
                  </ProtectedRoute>
                )}
              />

              <Route
                path="/"
                element={(
                  <RootRouteHandler />
                )}
              >
                <Route index element={<Navigate to={DASHBOARD_ROUTES.user} replace />} />
                <Route path="home" element={<Navigate to={DASHBOARD_ROUTES.user} replace />} />
                <Route path="search" element={<AdminAdvancedSearchPage />} />
                <Route path="dashboard" element={<UserDashboardPage />} />
                <Route path="monitoring" element={<UserDashboardPage />} />
                <Route path="accounts/new" element={<AddAccountWizard />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="accounts/search" element={<MyGroupAccountsPage variantKey="searchAccount" />} />
                <Route path="accounts/my-group-accounts" element={<MyGroupAccountsPage variantKey="myGroup" />} />
                <Route path="accounts/my-accounts" element={<MyGroupAccountsPage variantKey="myAccounts" />} />
                <Route path="accounts/source-view" element={<Navigate to="/accounts/my-group-accounts" replace />} />
                <Route path="accounts/daily-fresh-leads" element={<MyGroupAccountsPage variantKey="dailyFreshLeads" />} />
                <Route path="accounts/no-follow-leads" element={<MyGroupAccountsPage variantKey="noFollowLeads" />} />
                <Route path="accounts/actions/:actionKey" element={<AccountActionPlaceholderPage />} />
                <Route path="customers" element={<Navigate to="/customers/search" replace />} />

                <Route path="customers/search" element={<AdminCustomersPage variantKey="search" basePath="/customers" ownerOptionsOverride={getCrmOwnerOptions()} />} />
                <Route path="customers/my-customers" element={<AdminCustomersPage variantKey="myCustomers" basePath="/customers" ownerOptionsOverride={getCrmOwnerOptions()} />} />
                <Route path="customers/view/:customerId" element={<AdminCustomersPage variantKey="view" basePath="/customers" ownerOptionsOverride={getCrmOwnerOptions()} />} />
                <Route path="customers/manage/:customerId" element={<AdminCustomersPage variantKey="manage" basePath="/customers" ownerOptionsOverride={getCrmOwnerOptions()} />} />
                <Route path="customers/actions/:actionKey" element={<CustomerActionPage basePath="/customers" />} />
                <Route path="crm-actions/:actionKey" element={<CRMActionPage />} />
                <Route path="deals" element={<Navigate to="/deals/view" replace />} />
                <Route path="deals/search" element={<Deals variantKey="search" />} />
                <Route path="deals/view" element={<Deals variantKey="view" />} />
                <Route path="deals/view/:dealId" element={<AdminDealDetailPage />} />
                <Route path="deals/manage/:dealId" element={<AdminManageDealPage />} />
                <Route path="deals/owner-wise" element={<Navigate to="/deals/view" replace />} />

                <Route path="deals/ahmadabad" element={<Deals variantKey="ahmadabad" />} />
                <Route path="deals/vadodara" element={<Deals variantKey="vadodara" />} />
                <Route path="deals/converted" element={<ConvertedDeals />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="team-view" element={<TeamViewPage isAdminView={false} />} />
                <Route path="communication-activities" element={<CommunicationActivitiesPage isAdmin={false} />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="quotation-manager" element={<Navigate to="/quotation-manager/view" replace />} />
                <Route path="quotation-manager/view" element={<AdminQuotationsPage allowUsers generatorPath="/quotations" />} />
                <Route path="reports" element={<Navigate to="/reports/custom" replace />} />
                <Route path="reports/custom" element={<CustomReportsPage basePath="/reports" />} />
                <Route path="reports/custom/builder" element={<CustomReportBuilderPage basePath="/reports" />} />
                <Route path="reports/output" element={<ReportOutputPage />} />
                <Route path="reports/templates/account/new" element={<AddAccountReportPage />} />
                <Route path="reports/templates/customer/new" element={<AddCustomerReportPage />} />
                <Route path="reports/templates/daily-status/new" element={<AddDailyStatusReportPage />} />
                <Route path="reports/templates/deal/new" element={<AddDealReportPage />} />
                <Route path="reports/templates/geo-tracking/new" element={<AddGeoTrackingReportPage />} />
                <Route path="reports/templates/quotation/new" element={<AddQuotationReportPage />} />
                <Route path="reports/templates/remark/new" element={<AddRemarkReportPage />} />
                <Route path="reports/templates/sr/new" element={<AddSupportRequestReportPage />} />
                <Route path="reports/templates/closed-sr/new" element={<AddClosedSupportRequestReportPage />} />
                <Route path="reports/summary" element={<SummaryReportsPage />} />
                <Route path="reports/quotation-summary" element={<QuotationSummaryReportPage basePath="/reports" />} />

                <Route path="reports/customer-map" element={<CustomerMapViewPage />} />
                <Route path="tickets" element={<TicketPage basePath="/tickets" />} />
                <Route path="ticket" element={<TicketPage basePath="/tickets" />} />
                <Route path="tickets/add" element={<AddTicketPage basePath="/tickets" />} />
                <Route path="calendar" element={<AdminCalendarPage isAdmin={false} />} />
                <Route path="support-requests" element={<Navigate to="/support-requests/list" replace />} />
                <Route path="support-requests/add" element={<AddSupportRequest />} />
                <Route path="support-requests/new" element={<AddSupportRequest />} />
                <Route path="support-requests/list" element={<SupportRequestList basePath="/support-requests" showActionMenu={false} />} />
                <Route path="support-requests/help" element={<SupportCentralPage />} />
                <Route path="support-requests/help/:categoryKey" element={<SupportCentralPage />} />
                <Route path="support-requests/details/:supportRequestId" element={<SupportRequestDetailsPage />} />
                <Route path="support-requests/manage/:supportRequestId" element={<SupportRequestManagePage />} />
                <Route path="support-requests/actions/:actionKey/:supportRequestId" element={<SupportRequestActionPage />} />
                <Route path="support-requests/report/:supportRequestId" element={<SupportRequestReportPage />} />
                <Route path="support-requests/view" element={<SupportRequestView />} />
                <Route path="support-requests/search" element={<SupportRequestSearch />} />
                <Route path="support-requests/closed" element={<ClosedSupportRequest basePath="/support-requests" showActionMenu={false} />} />
                <Route path="search" element={<AdminAdvancedSearchPage />} />
                <Route path="reminders" element={<Navigate to="/reminders/my" replace />} />
                <Route path="reminders/add" element={<AddReminderPage />} />
                <Route path="reminders/my" element={<UserRemindersPage variantKey="my" />} />
                <Route path="reminders/active" element={<UserRemindersPage variantKey="active" />} />
                <Route path="reminders/closed" element={<UserRemindersPage variantKey="closed" />} />
                <Route path="charts" element={<ChartsPage basePath="/charts" />} />
                <Route path="charts/list" element={<ChartsListPage basePath="/charts" />} />
                <Route path="view-settings/*" element={<Navigate to="/dashboard" replace />} />
                <Route path="data-manager" element={<UserDataManagerPage />} />
                <Route path="data-manager/image-gallery" element={<ImageGalleryPage />} />
                <Route path="data-manager/document-base" element={<DocumentBasePage basePath="/data-manager" />} />
                <Route path="data-manager/knowledge-base" element={<KnowledgeBasePage basePath="/data-manager" />} />
                <Route path="data-manager/knowledge-base/add" element={<AddKnowledgeBasePage basePath="/data-manager" />} />
                <Route path="image-gallery" element={<ImageGalleryPage />} />
                <Route path="integrations/*" element={<Navigate to="/dashboard" replace />} />
                <Route path="outlook" element={<Navigate to="/dashboard" replace />} />
                <Route path="messages" element={<AdminMessagesPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              <Route
                path="/admin"
                element={(
                  <ProtectedRoute requireAdmin>
                    <Layout isAdmin />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<Navigate to={DASHBOARD_ROUTES.admin} replace />} />
                <Route path="home" element={<Navigate to={DASHBOARD_ROUTES.admin} replace />} />
                <Route path="dashboard" element={<AdminPanel />} />
                <Route path="sales-dashboard" element={<SalesDashboard />} />
                <Route path="monitoring" element={<AdminPanel />} />
                <Route path="calendar" element={<AdminCalendarPage />} />
                <Route path="accounts/new" element={<AddAccountWizard />} />
                <Route path="accounts" element={<MyGroupAccountsPage variantKey="viewAll" />} />
                <Route path="accounts/my-group-accounts" element={<MyGroupAccountsPage variantKey="myGroup" />} />
                <Route path="accounts/my-accounts" element={<MyGroupAccountsPage variantKey="myAccounts" />} />
                <Route path="accounts/search" element={<MyGroupAccountsPage variantKey="searchAccount" />} />
                <Route path="accounts/source-view" element={<Navigate to="/admin/accounts/my-group-accounts" replace />} />
                <Route path="accounts/weekly-reports-all" element={<Navigate to="/admin/accounts/my-accounts" replace />} />
                <Route path="accounts/sw-baroda-mum" element={<MyGroupAccountsPage variantKey="swBarodaMum" />} />
                <Route path="accounts/user-wise-leads" element={<MyGroupAccountsPage variantKey="userWiseLeads" />} />

                <Route path="accounts/actions/:actionKey" element={<AccountActionPlaceholderPage />} />

                <Route path="customers/search" element={<AdminCustomersPage variantKey="search" />} />
                <Route path="customers/my-customers" element={<AdminCustomersPage variantKey="myCustomers" />} />
                <Route path="customers/view/:customerId" element={<AdminCustomersPage variantKey="view" />} />
                <Route path="customers/manage/:customerId" element={<AdminCustomersPage variantKey="manage" />} />
                <Route path="customers/actions/:actionKey" element={<CustomerActionPage />} />
                <Route path="crm-actions/:actionKey" element={<CRMActionPage />} />
                <Route path="deals" element={<Navigate to="/admin/deals/view" replace />} />
                <Route path="deals/view/:dealId" element={<AdminDealDetailPage />} />
                <Route path="deals/manage/:dealId" element={<AdminManageDealPage />} />
                <Route path="deals/search" element={<Deals isAdmin variantKey="search" />} />
                <Route path="deals/view" element={<Deals isAdmin variantKey="view" />} />
                <Route path="deals/converted" element={<ConvertedDeals isAdmin />} />
                <Route path="deals/owner-wise" element={<Navigate to="/admin/deals/view" replace />} />

                <Route path="deals/ahmadabad" element={<Deals isAdmin variantKey="ahmadabad" />} />
                <Route path="deals/vadodara" element={<Deals isAdmin variantKey="vadodara" />} />

                <Route path="deals/actions/:actionKey" element={<CRMActionPage />} />
                <Route path="tickets" element={<TicketPage basePath="/admin/tickets" />} />
                <Route path="ticket" element={<TicketPage basePath="/admin/tickets" />} />
                <Route path="tickets/add" element={<AddTicketPage basePath="/admin/tickets" />} />
                <Route path="support-requests/add" element={<AddSupportRequest />} />
                <Route path="support-requests/list" element={<SupportRequestList />} />
                <Route path="support-requests/help" element={<SupportCentralPage />} />
                <Route path="support-requests/help/:categoryKey" element={<SupportCentralPage />} />
                <Route path="support-requests/details/:supportRequestId" element={<SupportRequestDetailsPage />} />
                <Route path="support-requests/manage/:supportRequestId" element={<SupportRequestManagePage />} />
                <Route path="support-requests/actions/:actionKey/:supportRequestId" element={<SupportRequestActionPage />} />
                <Route path="support-requests/report/:supportRequestId" element={<SupportRequestReportPage />} />
                <Route path="support-requests/view" element={<SupportRequestView />} />
                <Route path="support-requests/search" element={<SupportRequestSearch />} />
                <Route path="support-requests/closed" element={<ClosedSupportRequest />} />

                <Route path="search" element={<AdminAdvancedSearchPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                <Route path="reminders" element={<Navigate to="/admin/reminders/active" replace />} />
                <Route path="reminders/add" element={<AddReminderPage />} />
                <Route path="reminders/my" element={<AdminRemindersPage variantKey="my" />} />
                <Route path="reminders/active" element={<AdminRemindersPage variantKey="active" />} />
                <Route path="reminders/closed" element={<AdminRemindersPage variantKey="closed" />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="team-view" element={<TeamViewPage />} />
                <Route path="communication-activities" element={<CommunicationActivitiesPage isAdmin />} />
                <Route path="reports"               element={<Navigate to="/admin/reports/custom" replace />} />
                <Route path="reports/custom"       element={<CustomReportsPage />} />
                <Route path="reports/custom/builder" element={<CustomReportBuilderPage />} />
                <Route path="reports/output" element={<ReportOutputPage />} />
                <Route path="reports/templates/account/new" element={<AddAccountReportPage />} />
                <Route path="reports/templates/customer/new" element={<AddCustomerReportPage />} />
                <Route path="reports/templates/daily-status/new" element={<AddDailyStatusReportPage />} />
                <Route path="reports/templates/deal/new" element={<AddDealReportPage />} />
                <Route path="reports/templates/geo-tracking/new" element={<AddGeoTrackingReportPage />} />
                <Route path="reports/templates/quotation/new" element={<AddQuotationReportPage />} />
                <Route path="reports/templates/remark/new" element={<AddRemarkReportPage />} />
                <Route path="reports/templates/sr/new" element={<AddSupportRequestReportPage />} />
                <Route path="reports/templates/closed-sr/new" element={<AddClosedSupportRequestReportPage />} />
                <Route path="reports/summary"              element={<SummaryReportsPage />} />
                <Route path="reports/quotation-summary"    element={<QuotationSummaryReportPage />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="quotation-manager" element={<Navigate to="/admin/quotation-manager/view" replace />} />
                <Route path="quotation-manager/view" element={<AdminQuotationsPage />} />

                <Route path="reports/customer-map" element={<CustomerMapViewPage />} />
                <Route path="charts" element={<ChartsPage />} />
                <Route path="charts/list" element={<ChartsListPage />} />
                <Route path="view-settings/*" element={<Navigate to="/admin/monitoring" replace />} />
                <Route path="my-work-status" element={<AdminWorkStatusPage />} />
                <Route path="user-management" element={<AdminUserManagementPage />} />
                <Route path="user-management/add-user" element={<AdminUserManagementPage />} />
                <Route path="user-management/manage-users" element={<AdminUserManagementPage />} />
                <Route path="user-management/manage-user-groups" element={<AdminUserManagementPage />} />
                <Route path="user-management/manage-user-types" element={<AdminUserManagementPage />} />
                <Route path="password-reset-requests" element={<PasswordResetRequestsPage />} />
                <Route path="messages" element={<AdminMessagesPage />} />
                <Route path="integrations/outlook" element={<Navigate to="/admin/settings" replace />} />
                <Route path="integrations" element={<IntegrationQrPage />} />
                <Route path="integrations/:channel" element={<IntegrationQrPage />} />
                <Route path="outlook" element={<OutlookMailPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="data-manager" element={<DataManagerPage />} />

                <Route path="data-manager/image-gallery" element={<ImageGalleryPage />} />
                <Route path="data-manager/document-base" element={<DocumentBasePage />} />
                <Route path="data-manager/knowledge-base" element={<KnowledgeBasePage />} />
                <Route path="data-manager/knowledge-base/add" element={<AddKnowledgeBasePage />} />
                <Route path="bulk-uploads" element={<BulkUploadsPage />} />
                <Route path="bulk-uploads/accounts" element={<BulkUploadAccountsPage />} />
                <Route path="bulk-uploads/account-tables" element={<BulkUploadAccountTablesPage />} />
                <Route path="bulk-uploads/customers" element={<BulkUploadCustomersPage />} />
                <Route path="bulk-uploads/customer-tables" element={<BulkUploadCustomerTablesPage />} />
                <Route path="bulk-uploads/deals" element={<BulkUploadDealsPage />} />
                <Route path="bulk-uploads/deal-tables" element={<BulkUploadDealTablesPage />} />
                <Route path="bulk-uploads/products" element={<BulkUploadProductsPage />} />
                <Route path="bulk-uploads/history" element={<BulkUploadHistoryPage />} />
                <Route path="*" element={<Navigate to={DASHBOARD_ROUTES.admin} replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </React.Suspense>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
