import React from 'react';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export default function PrivacyPolicyPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main className="lp-section" style={{ paddingTop: '8.5rem' }}>
        <div className="lp-container lp-legal-container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 className="lp-heading-2" style={{ fontSize: '2.75rem', marginBottom: '0.75rem' }}>Privacy Policy</h1>
            <p className="lp-subheading">
              Effective Date: September 10, 2026 | Last Updated: September 10, 2026
            </p>
          </div>

          <div className="lp-legal-content">
            <p>This Privacy Policy explains how Swati CRM ("Swati CRM", "the App", "we", "us", or "our") collects, uses, stores, protects, and handles information in connection with the Swati CRM web application, mobile application, APIs, and related services.</p>
            <p>Swati CRM is operated by Swati Group / Lumos Solution and is intended primarily for authorized company personnel, including employees, managers, sales personnel, engineers, customer support personnel, administrators, and other authorized business users.</p>
            <p>By using Swati CRM, you acknowledge that you have read and understood this Privacy Policy.</p>

            <h3>1. Scope of This Privacy Policy</h3>
            <p>This Privacy Policy applies to:</p>
            <ul>
              <li>The Swati CRM web application.</li>
              <li>The Swati CRM Android application.</li>
              <li>The Swati CRM iOS application.</li>
              <li>APIs and backend services supporting Swati CRM.</li>
              <li>Notifications and communication services associated with Swati CRM.</li>
              <li>Data processed through authorized integrations used by Swati CRM.</li>
            </ul>
            <p>Swati CRM is a business and internal CRM platform. It is not intended to operate as a public social network or consumer service.</p>

            <h3>2. How Swati CRM Accounts Are Created</h3>
            <p>Swati CRM uses an administrator-controlled account model.</p>
            <p>Users do not independently create their Swati CRM accounts through the mobile application.</p>
            <p>User accounts are provisioned and managed exclusively by authorized company administrators. The company provides the account information required for the user to access Swati CRM.</p>
            <p>Depending on the organization's configuration, this may include:</p>
            <ul>
              <li>Full name</li>
              <li>Company</li>
              <li>Location</li>
              <li>State</li>
              <li>Designation</li>
              <li>Work/business email address</li>
              <li>Username or account identifier</li>
              <li>Authentication credentials</li>
            </ul>
            <p>Swati CRM does not require users to provide personal information such as a personal mobile number, government identification document, payment-card information, or personal identity documents merely to create or use a CRM account.</p>
            <p>Information is collected and processed only to the extent necessary to provide the CRM's business functionality and manage authorized access.</p>

            <h3>3. Information We Process</h3>
            <h4>3.1 User Account and Profile Information</h4>
            <p>For authorized CRM users, we may process:</p>
            <ul>
              <li>Full name</li>
              <li>Business/work email address</li>
              <li>Username or account identifier</li>
              <li>Company/company identifier</li>
              <li>Designation</li>
              <li>Role</li>
              <li>State</li>
              <li>City/location</li>
              <li>Account status</li>
              <li>Approval status</li>
              <li>Online/offline status</li>
              <li>Account creation and update timestamps</li>
              <li>Authentication and authorization information</li>
            </ul>
            <p>This information is used to identify authorized users and provide role-based access to CRM functionality.</p>

            <h4>3.2 Authentication and Security Information</h4>
            <p>To secure user accounts and sessions, Swati CRM may process:</p>
            <ul>
              <li>Password hashes</li>
              <li>Authentication tokens</li>
              <li>Refresh-token information</li>
              <li>Authentication/session identifiers</li>
              <li>Device/session information</li>
              <li>Login activity</li>
              <li>Session activity</li>
              <li>IP address information where recorded by the server</li>
              <li>Account security and authentication events</li>
            </ul>
            <p>Passwords are intended to be stored using secure password hashing mechanisms rather than being stored as readable passwords.</p>
            <p>Authentication and session information is used to authenticate users, maintain secure sessions, prevent unauthorized access, and revoke access when required.</p>

            <h3>4. CRM and Business Information</h3>
            <p>Swati CRM processes business information entered into the CRM as part of its core functionality.</p>
            <p>Depending on the features used by the organization, this may include:</p>
            <p><strong>Customers</strong></p>
            <ul>
              <li>Customer number</li>
              <li>Customer/company name</li>
              <li>Business email address</li>
              <li>Business phone number</li>
              <li>Business address</li>
              <li>State and city</li>
              <li>Customer category</li>
              <li>Customer status</li>
              <li>Customer type</li>
              <li>Remarks</li>
              <li>Company/ownership information</li>
            </ul>
            <p><strong>Accounts and Leads</strong></p>
            <ul>
              <li>Account or lead number</li>
              <li>Account/company name</li>
              <li>Project information</li>
              <li>Account owner</li>
              <li>Category and status</li>
              <li>State</li>
              <li>Business contact information</li>
              <li>Contact person</li>
              <li>Purchase-order value</li>
              <li>Job number</li>
            </ul>
            <p><strong>Deals</strong></p>
            <ul>
              <li>Deal number</li>
              <li>Deal name</li>
              <li>Deal value</li>
              <li>Purchase-order value</li>
              <li>Deal stage/status</li>
              <li>Deal owner</li>
              <li>Deal date</li>
              <li>Project</li>
              <li>Job number</li>
              <li>Conversion information</li>
              <li>Lost-order reason</li>
            </ul>
            <p><strong>Quotations</strong></p>
            <ul>
              <li>Quotation number</li>
              <li>Company/customer</li>
              <li>Project</li>
              <li>Owner</li>
              <li>Quotation date</li>
              <li>Amount</li>
              <li>Quotation status</li>
            </ul>
            <p><strong>Support Requests</strong></p>
            <ul>
              <li>Support request number</li>
              <li>Customer</li>
              <li>Title</li>
              <li>Description</li>
              <li>Request type</li>
              <li>Status</li>
              <li>Assigned support personnel</li>
            </ul>
            <p><strong>Support Replies</strong></p>
            <ul>
              <li>Support request reference</li>
              <li>Sender information</li>
              <li>Recipient information</li>
              <li>Sender/recipient business email addresses where applicable</li>
              <li>Message content</li>
              <li>Reply timestamps</li>
            </ul>
            <p>This information is processed to provide the organization's CRM, sales, quotation, customer-management, and support-management functionality.</p>

            <h3>5. Files and Attachments</h3>
            <p>Swati CRM may allow authorized users to upload business files associated with CRM records.</p>
            <p>Supported file types may include: JPEG, PNG, WebP, PDF, XLS, XLSX, CSV, DOC, DOCX, Text files.</p>
            <p>The configured upload limit may be up to 25 MB per file.</p>
            <p>Uploaded files may be stored on the CRM's server infrastructure and associated metadata may be stored in the CRM database.</p>
            <p>Access to uploaded files is restricted through authenticated CRM access and applicable company and role-based permissions.</p>
            <p>Users should not upload information that they are not authorized to process or share through the CRM.</p>

            <h3>6. Device and Notification Information</h3>
            <p>The mobile application may process limited device-related information required to provide mobile functionality.</p>
            <p>This may include:</p>
            <ul>
              <li>Device/platform information</li>
              <li>Push notification token</li>
              <li>Device activation/status information</li>
              <li>User/device association</li>
              <li>Notification delivery information</li>
            </ul>
            <p>Swati CRM uses this information to deliver relevant CRM notifications and maintain notification functionality.</p>
            <p>Push notifications may relate to: Account or lead activity, Deals and purchase orders, Quotations, Support requests and replies, Tasks and reminders, User approval or account-status events, Other CRM activities configured by the organization.</p>

            <h3>7. Location Information</h3>
            <p>Certain field-staff functionality may optionally use location information.</p>
            <p>Location functionality is not required merely to create a standard Swati CRM account.</p>
            <p>Where location functionality is enabled, location information is used only for the applicable business or field-service functionality and should be accessed only when required by the feature.</p>

            <h3>8. Microsoft Integration</h3>
            <p>Swati CRM may provide Microsoft/Azure AD or Microsoft Graph integrations for authorized functionality such as Outlook-related services.</p>
            <p>When a user explicitly connects an applicable Microsoft service, Swati CRM may process information made available through that integration, which may include:</p>
            <ul>
              <li>Microsoft account information</li>
              <li>User email address</li>
              <li>Profile information</li>
              <li>Profile photo where made available</li>
              <li>OAuth/access credentials or tokens required to maintain the authorized connection</li>
            </ul>
            <p>Microsoft information is used only for the functionality for which the integration has been authorized.</p>

            <h3>9. Email and Communication Services</h3>
            <p>Swati CRM may use email/SMTP services to send business notifications and system communications.</p>
            <p>Depending on the functionality, information processed by the email service may include:</p>
            <ul>
              <li>Recipient email address</li>
              <li>Sender information</li>
              <li>Notification subject</li>
              <li>Notification/message content</li>
              <li>CRM-related identifiers required to generate the notification</li>
            </ul>
            <p>Email services are used for legitimate CRM and operational communication.</p>

            <h3>10. WhatsApp Integration</h3>
            <p>Where WhatsApp functionality is enabled by the organization, Swati CRM may process:</p>
            <ul>
              <li>Customer/business phone numbers</li>
              <li>Message content</li>
              <li>CRM-related information necessary to send the requested communication</li>
            </ul>
            <p>WhatsApp functionality is optional and may not be available to every user or organization.</p>
            <p>Users must use such functionality only for legitimate business purposes and only where they are authorized to communicate with the relevant recipient.</p>

            <h3>11. How We Use Information</h3>
            <p>We may use information processed through Swati CRM to:</p>
            <ul>
              <li>Authenticate authorized users.</li>
              <li>Manage user accounts.</li>
              <li>Provide CRM functionality.</li>
              <li>Manage customers and accounts.</li>
              <li>Manage leads and deals.</li>
              <li>Manage quotations.</li>
              <li>Manage support requests and replies.</li>
              <li>Manage tasks and reminders.</li>
              <li>Deliver CRM notifications.</li>
              <li>Maintain user and company permissions.</li>
              <li>Maintain company-level data isolation.</li>
              <li>Secure accounts and sessions.</li>
              <li>Detect and prevent unauthorized access.</li>
              <li>Maintain audit records.</li>
              <li>Maintain and improve operational reliability.</li>
              <li>Provide technical support.</li>
              <li>Maintain integrations requested or enabled by the organization.</li>
              <li>Comply with applicable legal obligations.</li>
            </ul>
            <p>We do not use CRM user information for advertising or unrelated marketing purposes.</p>

            <h3>12. Company and Role-Based Access</h3>
            <p>Swati CRM is designed as a company-controlled CRM platform.</p>
            <p>Access to CRM information is controlled through authentication, user roles, permissions, and company-level access controls.</p>
            <p>Authorized administrators may have access to user-management functions and may create, modify, disable, or delete user accounts according to the organization's internal procedures.</p>
            <p>Users may only access CRM information for which they have been authorized.</p>

            <h3>13. Notifications and Real-Time Updates</h3>
            <p>Swati CRM may use Database notifications, Real-time WebSocket communication, Mobile push notifications, and Email notifications to provide timely information about CRM events.</p>
            <p>The content of a notification may include a short description of the relevant CRM activity and an associated CRM record or identifier.</p>

            <h3>14. Audit Logs</h3>
            <p>Swati CRM may maintain audit information relating to system and business activities.</p>
            <p>Audit records may include: Entity type, Entity identifier, Action performed, User/actor identifier, Date and time of the action.</p>
            <p>Audit logs are used for security, accountability, troubleshooting, operational management, and business recordkeeping.</p>
            <p>Certain audit records may be retained after a user account has been deleted where retention is necessary for legitimate business, security, legal, compliance, or audit purposes.</p>

            <h3>15. Third-Party Service Providers</h3>
            <p>Swati CRM may use trusted technical service providers to operate its services. Depending on the features enabled, these may include:</p>
            <ul>
              <li><strong>MongoDB / Mongoose</strong>: Used for storing and managing CRM operational data.</li>
              <li><strong>Hostinger</strong>: Used for hosting/server infrastructure and may process server logs, API requests, and uploaded files.</li>
              <li><strong>Expo Push Notification Services</strong>: Used to deliver mobile push notifications.</li>
              <li><strong>Microsoft Azure AD / Microsoft Graph</strong>: Used for authorized Microsoft account and Outlook-related integrations.</li>
              <li><strong>SMTP / Nodemailer Services</strong>: Used for sending email notifications and operational emails.</li>
              <li><strong>WhatsApp Services</strong>: Used where authorized WhatsApp messaging functionality is enabled.</li>
            </ul>
            <p>Third-party providers process information only as necessary to provide their applicable services and subject to their own terms and privacy practices.</p>

            <h3>16. Information Sharing</h3>
            <p>We do not sell, rent, or lease CRM user information to advertisers, data brokers, or marketing companies.</p>
            <p>Information may be made available to:</p>
            <ul>
              <li>Authorized personnel within the relevant company or organization.</li>
              <li>Authorized administrators.</li>
              <li>Service providers required to operate CRM functionality.</li>
              <li>Technical infrastructure providers.</li>
              <li>Communication and notification providers.</li>
              <li>Integration providers when a user or organization enables the applicable integration.</li>
              <li>Government authorities or other parties where disclosure is required by applicable law or valid legal process.</li>
            </ul>
            <p>Access is intended to be limited according to role, company, and legitimate business requirements.</p>

            <h3>17. Data Security</h3>
            <p>Swati CRM uses technical and organizational measures intended to protect information against unauthorized access, alteration, disclosure, or destruction.</p>
            <p>Depending on the system component, security measures may include: HTTPS/TLS encryption for data in transit, Password hashing, JWT-based authentication, Secure refresh-token handling, Authentication token versioning, Session management, Role-based authorization, Company-level data isolation, Input validation, Rate limiting, Security headers, Access controls, Audit logging.</p>
            <p>No internet-based service can guarantee absolute security. Users should protect their login credentials and immediately report suspected unauthorized access to the appropriate company administrator.</p>

            <h3>18. Data Retention</h3>
            <p>We retain information for as long as reasonably necessary to provide Swati CRM functionality, maintain company business records, protect the security of the service, comply with legal requirements, resolve disputes, and maintain audit/accountability records.</p>
            <p>When an administrator deletes a user account, the user's account credentials and access are removed or revoked.</p>
            <p>However, deletion of a user account does not necessarily mean that all company business records created, modified, assigned, or accessed by that user are deleted.</p>
            <p>For legitimate business, operational, security, audit, legal, or compliance reasons, the organization may retain: Customer records, Account/lead records, Deal records, Quotation records, Support records, Business attachments, Audit logs, Other company business records.</p>
            <p>Where appropriate, personal account information associated with retained records may be removed, anonymized, or minimized according to the organization's data-retention practices.</p>

            <h3>19. Administrator-Controlled Account Deletion</h3>
            <p>Swati CRM accounts are organization-managed accounts.</p>
            <p>Users do not independently create or delete their Swati CRM accounts.</p>
            <p>An authorized company administrator may delete a user's CRM account through the organization's user-management system.</p>
            <p>When an account is deleted, the system is designed to: Remove the user's CRM account record, Revoke applicable authentication/session access, Prevent further access using the deleted account, Terminate or invalidate applicable active sessions/tokens, Preserve legitimate company business records where required.</p>
            <p>Additional information about the administrator-controlled account deletion process is available at: <a href="https://swaticrm.com/account-deletion" target="_blank" rel="noopener noreferrer">https://swaticrm.com/account-deletion</a></p>

            <h3>20. User Responsibilities</h3>
            <p>Users are responsible for:</p>
            <ul>
              <li>Keeping their authentication credentials confidential.</li>
              <li>Using Swati CRM only for authorized business purposes.</li>
              <li>Not sharing their account credentials.</li>
              <li>Not attempting to access information belonging to another company or unauthorized user.</li>
              <li>Not uploading malicious or unauthorized files.</li>
              <li>Not exporting customer or company data without authorization.</li>
              <li>Following their organization's security and data-handling policies.</li>
            </ul>

            <h3>21. Children's Privacy</h3>
            <p>Swati CRM is a business application intended for authorized company personnel and is not directed toward children.</p>
            <p>We do not knowingly design or market Swati CRM as a service for children.</p>

            <h3>22. Cookies and Similar Technologies</h3>
            <p>The Swati CRM web application may use technically necessary cookies, local storage, session mechanisms, or similar technologies required for authentication, security, session management, and application functionality.</p>
            <p>Swati CRM does not use advertising cookies or advertising tracking technologies as part of the CRM's intended functionality.</p>

            <h3>23. Changes to This Privacy Policy</h3>
            <p>We may update this Privacy Policy when our services, technology, legal requirements, or data practices change.</p>
            <p>When material changes are made, the updated policy will be made available through the Swati CRM website and/or application.</p>
            <p>The "Last Updated" date at the beginning of this Privacy Policy indicates when the policy was most recently revised.</p>

            <h3>24. Contact</h3>
            <p>For privacy-related questions regarding Swati CRM, contact:</p>
            <p>
              Swati Group / Lumos Solution<br />
              Privacy Contact: privacy@swaticrm.com<br />
              Support Contact: support@swaticrm.com<br />
              Website: <a href="https://swaticrm.com/" target="_blank" rel="noopener noreferrer">https://swaticrm.com/</a>
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
