import React from 'react';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export default function TermsPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main className="lp-section" style={{ paddingTop: '8.5rem' }}>
        <div className="lp-container lp-legal-container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 className="lp-heading-2" style={{ fontSize: '2.75rem', marginBottom: '0.75rem' }}>Terms & Conditions</h1>
            <p className="lp-subheading">
              Effective Date: September 10, 2026 | Last Updated: September 10, 2026
            </p>
          </div>

          <div className="lp-legal-content">
            <p>These Terms & Conditions ("Terms") govern access to and use of Swati CRM ("Swati CRM", "the App", "the Service", "we", "us", or "our").</p>
            <p>Swati CRM is operated by Swati Group / Lumos Solution and is intended for authorized business and organizational use.</p>
            <p>By accessing or using Swati CRM, you agree to comply with these Terms.</p>
            <p>If you do not agree with these Terms, you should not use Swati CRM.</p>

            <h3>1. Purpose of Swati CRM</h3>
            <p>Swati CRM is a business customer relationship management platform designed to help authorized organizations manage business information and workflows, including: Customers, Accounts and leads, Deals, Quotations, Purchase orders and related information, Jobs and project information, Support requests, Support replies, Tasks and reminders, User and group management, Business communications, Notifications, Related CRM records and attachments.</p>

            <h3>2. Eligibility and Authorized Users</h3>
            <p>Swati CRM is intended for authorized business users, including: Employees, Managers, Sales personnel, Customer support personnel, Engineers, Administrators, Other personnel authorized by the organization.</p>
            <p>Swati CRM accounts are not intended to be freely created by members of the public.</p>
            <p>User accounts are provisioned and managed by authorized company administrators.</p>

            <h3>3. Account Creation and Management</h3>
            <p>Swati CRM uses an administrator-controlled account system.</p>
            <p>Authorized administrators may create accounts for approved users.</p>
            <p>The information associated with an account may include: Full name, Company, Location, State, Designation, Business email, Username/account identifier, Role, Authentication credentials.</p>
            <p>Users must provide accurate information when requested by their organization and must not attempt to create unauthorized accounts.</p>

            <h3>4. Account Credentials</h3>
            <p>Users are responsible for maintaining the confidentiality of their account credentials.</p>
            <p>Users must not: Share passwords with other individuals, Allow another person to use their account, Attempt to obtain another user's credentials, Circumvent authentication controls, Attempt to access another user's account.</p>
            <p>If a user believes their account has been compromised, they should immediately notify the appropriate company administrator.</p>

            <h3>5. Role-Based Access</h3>
            <p>Swati CRM uses role-based access controls.</p>
            <p>Depending on the user's role, the user may have different access to: Customers, Accounts, Leads, Deals, Quotations, Support records, Attachments, User-management functionality, Notifications, Other CRM features.</p>
            <p>Users may not attempt to bypass or circumvent these permissions.</p>

            <h3>6. Administrator Authority</h3>
            <p>Authorized administrators may, subject to the organization's internal policies: Create user accounts, Edit user accounts, Approve accounts, Disable accounts, Modify roles and permissions, Delete user accounts, Manage groups, Manage access to company CRM information.</p>
            <p>Administrators are responsible for using these capabilities only for legitimate business purposes.</p>

            <h3>7. Account Deletion</h3>
            <p>Swati CRM accounts are organization-managed accounts.</p>
            <p>Individual users do not independently create or delete their CRM accounts.</p>
            <p>An authorized administrator may delete a user account through the CRM's user-management functionality.</p>
            <p>When a user account is deleted, applicable credentials, sessions, authentication access, and account information may be removed or revoked.</p>
            <p>Deletion of a user account does not necessarily delete company business records associated with that user.</p>
            <p>Company business records may include: Customers, Accounts, Leads, Deals, Quotations, Support requests, Support replies, Attachments, Audit records, Other business information.</p>
            <p>Such information may be retained where necessary for legitimate business, operational, legal, security, compliance, or audit purposes.</p>
            <p>Additional information is provided in the Swati CRM Account Deletion policy.</p>

            <h3>8. Company Business Data</h3>
            <p>Swati CRM may contain confidential business information belonging to the organization using the Service.</p>
            <p>Users must treat company CRM information as confidential and use it only for authorized business purposes.</p>
            <p>Users must not: Export customer information without authorization, Copy or disclose confidential CRM information without authorization, Use CRM information for unrelated personal purposes, Provide CRM credentials to unauthorized persons, Attempt to access information belonging to another company or tenant.</p>

            <h3>9. Customer and Third-Party Information</h3>
            <p>Users may enter customer, supplier, partner, contact, or other third-party business information into Swati CRM.</p>
            <p>Users are responsible for ensuring that they have the appropriate authorization to enter, process, store, communicate, or otherwise use such information.</p>
            <p>Users must comply with applicable company policies and laws governing customer and business information.</p>

            <h3>10. Deals, Quotations and Financial Information</h3>
            <p>Swati CRM may contain commercial information including: Deal values, Purchase-order values, Quotation amounts, Project information, Job numbers, Lost-order reasons, Customer information, Commercial status.</p>
            <p>Such information is business information and must be handled only for authorized company purposes.</p>

            <h3>11. Support and Communication</h3>
            <p>Swati CRM may provide support-request and communication functionality.</p>
            <p>Users must use such functionality professionally and only for legitimate business activities.</p>
            <p>Users must not use Swati CRM to: Send unlawful communications, Harass or threaten individuals, Distribute malicious content, Send unauthorized bulk messages, Send spam, Impersonate another person, Misrepresent company communications.</p>

            <h3>12. File Uploads</h3>
            <p>Users may be permitted to upload business files and attachments.</p>
            <p>Supported formats may include: JPEG, PNG, WebP, PDF, XLS, XLSX, CSV, DOC, DOCX, Text files.</p>
            <p>The applicable upload size limit may be up to 25 MB per file.</p>
            <p>Users must not upload: Malware, Viruses, Malicious scripts, Unauthorized confidential information, Illegal content, Content that infringes third-party rights, Content unrelated to legitimate business activities.</p>
            <p>The organization may remove or restrict access to inappropriate or unauthorized uploads.</p>

            <h3>13. Notifications</h3>
            <p>Swati CRM may send notifications relating to CRM activity, including: Account or lead changes, Deals, Purchase orders, Quotations, Support requests, Support replies, Tasks, Reminders, User-management events, Other system activities.</p>
            <p>Notifications may be delivered through in-app notifications, real-time communication, push notifications, or email.</p>

            <h3>14. Microsoft and Other Integrations</h3>
            <p>Swati CRM may provide integrations with third-party services, including Microsoft services and communication services.</p>
            <p>Use of an integration may be subject to the third party's own terms and policies.</p>
            <p>Users must use connected third-party services only where they have appropriate authorization.</p>

            <h3>15. WhatsApp Functionality</h3>
            <p>Where WhatsApp functionality is enabled, users must use it only for authorized business communication.</p>
            <p>Users must not use the functionality for spam, harassment, unlawful communication, unauthorized bulk messaging, or other prohibited activity.</p>

            <h3>16. Prohibited Activities</h3>
            <p>Users must not: Attempt to gain unauthorized access to Swati CRM, Circumvent authentication or authorization controls, Access another user's account without authorization, Attempt to access another organization's/company's data, Scrape or systematically extract CRM information without authorization, Reverse engineer the application except where expressly permitted by applicable law, Introduce malicious code or software, Upload malware or harmful files, Use the Service for unlawful activities, Export customer or company information without authorization, Share confidential CRM information without authorization, Abuse notification, email, WhatsApp, or communication functionality, Interfere with the operation or availability of the Service, Attempt to bypass security controls, Use Swati CRM for activities unrelated to legitimate business purposes where prohibited by the organization.</p>

            <h3>17. Security</h3>
            <p>Swati CRM uses security measures intended to protect the Service and its data. These may include: HTTPS/TLS, Authentication controls, Password hashing, Token-based authentication, Session management, Role-based authorization, Company-level access isolation, Input validation, Rate limiting, Security headers, Audit logging.</p>
            <p>Users must cooperate with reasonable security requirements established by their organization.</p>

            <h3>18. Suspension and Deactivation</h3>
            <p>An organization or authorized administrator may suspend or disable a user's access when necessary, including where: Employment or authorization ends, A security concern exists, Credentials may have been compromised, The user violates these Terms, The organization changes access requirements, The account is no longer required.</p>
            <p>Disabling an account may prevent further access without necessarily deleting company business records associated with that account.</p>

            <h3>19. Termination and User Account Deletion</h3>
            <p>An authorized administrator may permanently delete a user account.</p>
            <p>Upon deletion, applicable account credentials and access mechanisms may be removed or revoked.</p>
            <p>Company business information may remain within the organization's CRM where retention is necessary for legitimate business, operational, legal, security, compliance, or audit purposes.</p>

            <h3>20. Ownership of Business Data</h3>
            <p>Business information entered into Swati CRM by an organization remains subject to the organization's ownership and contractual rights.</p>
            <p>Swati CRM does not claim ownership of a company's underlying CRM business information merely because that information is processed or stored through the Service.</p>

            <h3>21. Intellectual Property</h3>
            <p>Unless otherwise stated, Swati CRM's: Software, Source code, Application design, Branding, Logos, Visual design, Interfaces, Documentation, System architecture, Related intellectual property belong to Swati Group / Lumos Solution, as applicable.</p>
            <p>Nothing in these Terms grants a user ownership of the software or intellectual property.</p>
            <p>Users receive only the access necessary to use the Service for authorized business purposes.</p>

            <h3>22. Confidentiality</h3>
            <p>Users may have access to confidential company information through Swati CRM.</p>
            <p>Users agree to maintain the confidentiality of such information and to follow applicable company confidentiality and information-security policies.</p>

            <h3>23. Availability and Maintenance</h3>
            <p>We may perform maintenance, upgrades, security updates, infrastructure changes, or other operational activities that may temporarily affect availability.</p>
            <p>We aim to maintain reliable service but do not guarantee uninterrupted or error-free availability at all times.</p>

            <h3>24. Third-Party Services</h3>
            <p>Swati CRM may depend on third-party infrastructure and services, including hosting, database, notification, email, authentication, Microsoft, and communication services.</p>
            <p>Third-party services may have their own outages, limitations, policies, and terms.</p>
            <p>We are not responsible for failures caused solely by third-party services outside our reasonable control.</p>

            <h3>25. Privacy</h3>
            <p>Use of Swati CRM is also governed by the Swati CRM Privacy Policy.</p>
            <p>Privacy Policy: <a href="https://swaticrm.com/privacy-policy" target="_blank" rel="noopener noreferrer">https://swaticrm.com/privacy-policy</a></p>

            <h3>26. Changes to These Terms</h3>
            <p>We may update these Terms from time to time.</p>
            <p>Updated Terms will be made available through Swati CRM and/or the Swati CRM website.</p>
            <p>The "Last Updated" date indicates the most recent revision.</p>
            <p>Continued use of Swati CRM after an applicable update may be subject to the revised Terms.</p>

            <h3>27. Governing Law and Legal Compliance</h3>
            <p>Swati CRM and its users must comply with applicable laws and regulations.</p>
            <p>The applicable governing law, jurisdiction, dispute-resolution provisions, and other contractual matters should be determined by the legal entity operating the Service and the organization's applicable agreements.</p>

            <h3>28. Contact</h3>
            <p>For questions regarding these Terms:</p>
            <p>
              Swati Group / Lumos Solution<br />
              Support: support@swaticrm.com<br />
              Privacy: privacy@swaticrm.com<br />
              Website: <a href="https://swaticrm.com/" target="_blank" rel="noopener noreferrer">https://swaticrm.com/</a>
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
