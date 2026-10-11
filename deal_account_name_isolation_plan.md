# Implementation Plan: Deal Name & Account Name Isolation

## 1. Overview & Problem Statement

### Reported Issue:
* When navigating to `http://localhost:3000/admin/deals/view/3688` and editing the **Deal Name**, the **Account Name** is also being changed / updated.
* In the main deals table at `http://localhost:3000/admin/deals/view`, the **Account Name** column also changes or displays the Deal/Project name instead of maintaining the account identity.
* In MongoDB, the collection fields for **Account Name** and **Project Name / Deal Name** are distinct entities and must work completely isolated from each other.
* Editing the Deal Name on a deal must **never** mutate the linked account's name in MongoDB, nor should it change the Account Name displayed in the table.

---

## 2. Root Cause Analysis (MongoDB & Codebase Verification)

Live inspection of **Deal `3688`** and its linked **Account/Lead `3663`** revealed the following:

### A. MongoDB Document State

#### Deal `3688` (`deals` collection):
```json
{
  "_id": "6ac9fd1a56838c620a7dbbc7",
  "legacyId": 3688,
  "dealNumber": "DL00008",
  "accountId": 3663,
  "accountName": "New my account",
  "linkedAccountName": "New my account",
  "customerName": "New my account",
  "title": "New my account tst Demo",
  "dealName": "New my account tst Demo",
  "projectName": "New my account tst Demo",
  "companyName": "New my account tst Demo"
}
```

#### Linked Lead `3663` (`leads` collection):
```json
{
  "_id": "6ac9fd1a56838c620a7dbbc0",
  "legacyId": 3663,
  "accountName": "New my account",
  "customerName": "New my account",
  "projectName": "New my account tst Demo",
  "dealName": "New my account tst Demo",
  "company": "New my account tst Demo",
  "formData": {
    "accountName": "New my account",
    "customerName": "New my account",
    "projectName": "New my account tst Demo",
    "dealName": "New my account tst Demo"
  }
}
```

### B. Identified Breakpoints in Codebase

1. **In Table View (`src/pages/deals/Deals.jsx`):**
   * The column labeled `"Account Name"` has key `companyCustomerName`:
     ```javascript
     { key: 'companyCustomerName', label: 'Account Name', placeholder: 'Search Account Name', sourceField: 'account_name' }
     ```
   * Its value is computed by `getDealCompanyCustomerName()` (lines 869–875):
     ```javascript
     const getDealCompanyCustomerName = (deal = {}, linkedCustomer = null) => (
       [...new Set([
         getDealCompanyName(deal, linkedCustomer),       // reads deal.companyName ("New my account tst Demo")
         getDealCustomerName(deal, linkedCustomer),      // reads deal.customerName ("New my account")
         cleanDealNameCellValue(deal.linkedAccountName || deal.accountName || ''),
       ].filter(Boolean))].join(' / ')
     )
     ```
   * Because `deal.companyName` contains the Project/Deal Name, the Account Name column merges them or displays `"New my account tst Demo / New my account"`.

2. **In Deal Detail Page (`src/pages/admin/deals/AdminDealDetailPage.jsx`):**
   * When the user inline-edits `dealName` (lines 328–337):
     ```javascript
     const result = await updateDeal(targetDealId, updatePayload)
     if (result.success && key === 'dealName') {
       const linkedAccountId = deal.linkedAccountId || deal.accountId || sourceDeal?.accountId || sourceDeal?.customerId || ''
       if (linkedAccountId && updateAccount) {
         await updateAccount(linkedAccountId, {
           dealName: editValue,
           projectName: editValue,
         })
       }
     }
     ```
   * Calling `updateAccount(linkedAccountId, ...)` mutates the linked lead via `leadService.updateLead`, which overwrites `lead.company = projectName` on the account, causing cross-contamination.

3. **In Deal Service (`server/services/dealService.js`):**
   * `syncDealNameToLinkedLead()` updates the linked lead in MongoDB whenever `dealName` is edited.
   * `buildPayload()` in `dealService.js` and `normalizeMappedDeal()` in `dealRepository.js` need strict isolation to ensure `accountName` is never mapped to `dealName`/`projectName` or vice-versa.

---

## 3. Data Flow & Field Isolation Matrix

| Attribute | Purpose | Mongo `deals` Field | Mongo `leads` Field | Frontend Table Column | Detail Page Field |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Account Name** | Organization Identity | `accountName`, `linkedAccountName` | `accountName`, `formData.accountName` | **Account Name** (Strictly resolved from account fields) | **Customer / Account** |
| **Project / Deal Name** | Project / Opportunity Title | `projectName`, `dealName`, `title`, `name` | `projectName`, `dealName` | **Project Name** | **Deal Name** / **Project Name** |

---

## 4. Detailed Phased Implementation Plan

### Phase 1: Frontend Table (`src/pages/deals/Deals.jsx` at `/admin/deals/view`)
1. **Isolate the "Account Name" column value:**
   * In `renderDealGridCellContent(row, columnKey)`:
     * When `columnKey === 'companyCustomerName'` or `columnKey === 'accountName'`, strictly return the actual account name:
       ```javascript
       const resolvedAccountName = row.accountName 
         || row.rawDeal?.accountName 
         || row.rawDeal?.linkedAccountName 
         || row.rawDeal?.data?.accountName 
         || row.customerName
       ```
     * Do **not** allow `deal.companyName`, `deal.projectName`, or `deal.dealName` to be rendered in the Account Name cell.
   * In `getDealCompanyCustomerName()`:
     * Exclude `getDealCompanyName` if it equals or matches the deal's project title or deal title.
2. **Preserve "Project Name" column:**
   * Keep `columnKey === 'projectName'` displaying `row.projectName || row.dealName || row.title`.
3. **Table Filters:**
   * Ensure filtering on "Account Name" filters only against `accountName` / `linkedAccountName` without checking project title tokens.

### Phase 2: Deal Detail Page (`src/pages/admin/deals/AdminDealDetailPage.jsx` at `/admin/deals/view/:dealId`)
1. **Isolated Deal Name Save Handler:**
   * In `handleSaveField(key)`:
     * When `key === 'dealName'`, update the deal record:
       ```javascript
       await updateDeal(targetDealId, {
         dealName: editValue,
         projectName: editValue,
         title: editValue,
         name: editValue,
       })
       ```
     * **Eliminate side-effect mutation**: Do not call `updateAccount` to alter the account's company or account identity.
2. **Preserve Normalized Deal State:**
   * In `buildNormalizedDeal()`:
     * Maintain `linkedAccountName` and `customerName` from `deal.accountName`, `deal.linkedAccountName`, or `linkedAccount.accountName`.
     * Keep `dealName` mapped to `deal.name || deal.dealName || deal.title`.

### Phase 3: Backend Services & API Layer (`server/services/dealService.js` & `server/repositories/dealRepository.js`)
1. **`dealService.js` (`update` & `buildPayload`):**
   * In `buildPayload()`:
     * Ensure `accountName` and `linkedAccountName` remain completely unaffected by edits to `title`, `name`, `dealName`, or `projectName`.
   * In `syncDealNameToLinkedLead()`:
     * Ensure that updating a deal's project/deal name syncs only `projectName` and `dealName` on the lead, and **never** mutates `accountName`, `customerName`, `name`, `formData.accountName`, or `formData.customerName`.
2. **`dealRepository.js` (`normalizeMappedDeal`):**
   * Prioritize `Lead.accountName` and `Lead.formData.accountName` so account name resolution never falls back to project-name-contaminated fields.

---

## 5. Constraint Compliance Verification

| Required Constraint | Plan Compliance |
| :--- | :---: |
| **Must not touch Add Account mechanism & logic** | ✅ Account creation wizard and `createLead` backend untouched |
| **Must not touch ownerCode backend & logic** | ✅ All user assignment, group scopes, and `ownerCode` handlers untouched |
| **Must not touch Add Deals logic & backend** | ✅ Deal creation, sequence generator (`DL0000x`), and form submission untouched |
| **Must not touch Deal details backend logic** | ✅ Read handlers, stages, and detail view data untouched |
| **Must not touch Add Quotations & Quotation backend** | ✅ Quotation calculations, creation, and revision history untouched |
| **Must not touch Add Customers & Customer logic** | ✅ Customer creation endpoints, validation, and mappings untouched |
| **Must not touch mobile backend** | ✅ Mobile endpoints and controllers untouched |
| **Must not hardcode anything** | ✅ Schema-driven, dynamic field resolution used |
| **Must not touch Automatic Deal convert status by Save settings** | ✅ Deal conversion triggers and stage update rules untouched |
| **Must not touch tasks mechanism & Add Reminders form/popups** | ✅ Task pipelines and reminder modals/popups untouched |
| **Must not touch Converted Deals & new tab opening view** | ✅ `converted_deals` sync and tab routing untouched |
| **Must not touch revision quotations for accounts & deals** | ✅ Quotation revision history untouched |
| **Must not touch Outlook / Graph backend mechanism** | ✅ Microsoft Outlook / Graph OAuth untouched |
| **Must not touch graph mechanisms & quotation logic** | ✅ Chart controllers and quotation engines untouched |

---

## 6. Execution Strategy (When Approved)

1. Apply targeted fix to `Deals.jsx` to render pure account name in the Account Name column.
2. Apply targeted fix to `AdminDealDetailPage.jsx` to remove unintended account mutations when editing deal name.
3. Validate backend deal update payload in `dealService.js` to ensure isolation.
4. Verify deal `3688` and table `http://localhost:3000/admin/deals/view` in the browser.
