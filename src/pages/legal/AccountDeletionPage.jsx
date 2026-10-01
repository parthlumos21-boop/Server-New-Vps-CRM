import React from 'react';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';
import '../../styles/landing.css';

export default function AccountDeletionPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main className="lp-section" style={{ paddingTop: '8.5rem' }}>
        <div className="lp-container lp-legal-container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 className="lp-heading-2" style={{ fontSize: '2.75rem', marginBottom: '0.75rem' }}>Account Deletion & Management</h1>
            <p className="lp-subheading">
              Effective Date: September 10, 2026 | Last Updated: September 10, 2026
            </p>
          </div>

          <div className="lp-legal-content">
            <p>This page explains how user accounts are created, managed, disabled, and deleted in Swati CRM.</p>
            <p>Swati CRM is an organization-managed business CRM. User accounts are provisioned and managed by authorized company administrators.</p>

            <h3>1. Administrator-Controlled Accounts</h3>
            <p>Swati CRM does not use an open public account-registration model.</p>
            <p>Individual users do not independently create their Swati CRM accounts.</p>
            <p>Instead, authorized company administrators create and manage accounts for approved users.</p>
            <p>The account information provided by the organization may include: Full name, Company, Location, State, Designation, Business email address, Username/account identifier, Role, Authentication credentials.</p>
            <p>Swati CRM does not require users to provide personal mobile numbers, government identification documents, payment-card information, or personal identity documents merely to create a CRM account.</p>

            <h3>2. Who Can Delete a Swati CRM Account?</h3>
            <p>Only an authorized company administrator with the appropriate user-management permissions can delete a Swati CRM user account.</p>
            <p>Individual CRM users do not have a self-service "Delete Account" function.</p>
            <p>This design reflects the organization's account-management model in which CRM access is controlled by the company.</p>

            <h3>3. How an Administrator Deletes an Account</h3>
            <p>An authorized administrator can initiate account deletion through the Swati CRM user-management functionality.</p>
            <p>The administrator identifies the user account and confirms the deletion action.</p>
            <p>Once the deletion is completed, applicable account information is removed from the active user account system and access is revoked.</p>

            <h3>4. What Happens When an Account Is Deleted?</h3>
            <p>Depending on the applicable account and session data, account deletion may result in: Removal of the user's CRM account, Revocation of authentication access, Invalidation of applicable authentication tokens, Termination or invalidation of active sessions, Removal of the user's ability to sign in using the deleted account, Removal of applicable user-device associations, Removal of applicable account profile information from the active user account record.</p>
            <p>The purpose of these actions is to ensure that a deleted user account can no longer be used to access the CRM.</p>

            <h3>5. What Happens to Company Business Records?</h3>
            <p>Deleting a user's CRM account does not automatically mean that all company business records created or modified by that user are deleted.</p>
            <p>Swati CRM may retain legitimate company business records required for ongoing business operations, continuity, security, accounting, audit, legal, compliance, or other legitimate purposes.</p>
            <p>Such records may include: Customer records, Accounts, Leads, Deals, Quotations, Purchase-order information, Job/project information, Support requests, Support replies, Business attachments, Audit logs, Other company CRM records.</p>
            <p>These records belong to or remain under the control of the relevant organization and are not treated as the deleted user's personal account.</p>
            <p>Where appropriate and technically applicable, personal account information may be removed, minimized, or anonymized from retained business records.</p>

            <h3>6. Audit Records</h3>
            <p>Certain audit records may be retained after a user account has been deleted.</p>
            <p>Audit records may be required to maintain: Security accountability, Business history, System integrity, Fraud prevention, Compliance, Legal records, Investigation of security incidents, Operational history.</p>
            <p>Retention of such records does not mean that the deleted user retains access to Swati CRM.</p>

            <h3>7. Disabled Accounts</h3>
            <p>An administrator may disable an account without permanently deleting it.</p>
            <p>A disabled account cannot be used for normal CRM access while the account remains disabled.</p>
            <p>Account disabling is an access-control action and is different from permanent account deletion.</p>
            <p>When an administrator permanently deletes the account, the applicable user account and authentication access are removed or revoked according to the organization's account-management procedures.</p>

            <h3>8. User Access After Deletion</h3>
            <p>After an administrator deletes an account, the deleted user should no longer be able to authenticate using that account.</p>
            <p>Existing authentication sessions and applicable tokens are revoked or invalidated according to the CRM's security mechanisms.</p>
            <p>A deleted account cannot be used to regain access to Swati CRM.</p>

            <h3>9. Re-Creation of an Account</h3>
            <p>If an organization later requires access for a former or previously deleted user, an authorized administrator may create a new account according to the organization's account-management procedures.</p>
            <p>A newly created account may not be the same technical account as the previously deleted account.</p>

            <h3>10. Business Record Retention</h3>
            <p>The organization may retain company business information after a user's account is deleted where such retention is necessary or appropriate for: Business continuity, Customer relationship management, Contractual obligations, Legal requirements, Security, Fraud prevention, Compliance, Audit, Recordkeeping, Operational requirements.</p>

            <h3>11. Privacy Information</h3>
            <p>For more information about the information processed by Swati CRM and how it is protected, please review the Swati CRM Privacy Policy: <a href="https://swaticrm.com/privacy-policy" target="_blank" rel="noopener noreferrer">https://swaticrm.com/privacy-policy</a></p>
            <p>For the terms governing use of Swati CRM: <a href="https://swaticrm.com/terms-and-conditions" target="_blank" rel="noopener noreferrer">https://swaticrm.com/terms-and-conditions</a></p>

            <h3>12. Contact</h3>
            <p>For questions about account management or deletion, contact the authorized administrator within your organization.</p>
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
