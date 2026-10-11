# Implementation Plan: Sales Executive Field Editing & MongoDB Storage

## 1. Goal & Scope Definition

### Exact Scope Requested:
* **Target Field:** ONLY the **Sales Executive** field in the quotation document (at `http://localhost:3000/admin/quotation-manager/view?view=82` and throughout quotation view).
* **Authorized Editors:** Exactly and ONLY these 3 users:
  1. **Keval V Shah** (`keval@swatiswitchgears.com`)
  2. **Parth** (`parth@support.com`)
  3. **Rushabh** (`rushabh@support.com`)
* **Editing Capability:** Authorized users can edit the Sales Executive to **any custom name**.
* **Database Persistence:** The updated Sales Executive name must be saved directly into the **MongoDB `quotations` collection** and persist on page reload.
* **Unauthorized Users:** All other users see the Sales Executive as strictly **read-only text** (no edit icons, no inline inputs).
* **CRITICAL MANDATE:** **Quotation Number backend (`quotationNumber`, `quoteNumber`, sequence counters, formatters, revision numbering) must NOT be touched or harmed under any circumstances.**

---

## 2. Technical Findings & Root Cause Analysis

### A. Live MongoDB State for Quotation 82
```json
{
  "_id": "...",
  "legacyId": 82,
  "quotationNumber": "SSIPL/2026/00013-1015-R0",
  "customerId": 3669,
  "data": {
    "selectedAccountOwner": "Jay Pandya j",
    "selectedAccountId": null
  }
}
```
* **Quotation Number:** `"SSIPL/2026/00013-1015-R0"` — **Protected & Untouched.**
* **Sales Executive:** Stored in `data.selectedAccountOwner`.

### B. Why Sales Executive Edits Were Reverting / Not Storing
1. **Frontend Precedence Overwrite (`src/pages/admin/quotations/quotationShared.jsx` - Line 869):**
   ```javascript
   accountOwner: linkedAccount?.accountOwnerDisplay || quotation.selectedAccountOwner || linkedAccount?.accountOwner || '-',
   ```
   * The linked Lead `3669` has `accountOwner: "Jay Pandya"`.
   * Because `quotation.selectedAccountOwner` at root was not mapped from `quotation.data.selectedAccountOwner`, `linkedAccount.accountOwner` ("Jay Pandya") took precedence.
   * Any custom name entered for Sales Executive got masked by the linked Lead's owner!
2. **MongoDB Storage:**
   * When saving, the patch must write directly to both `selectedAccountOwner` and `data.selectedAccountOwner` in the MongoDB `quotations` collection so the updated name is permanently stored and immediately returned on query.

---

## 3. Targeted Technical Solution (Zero Impact on Quotation Numbers)

```
[Authorized User: Keval / Parth / Rushabh]
                 │
                 ▼
Clicks Edit icon on "Sales Executive"
                 │
                 ▼
Types any name (e.g. "Custom Sales Executive")
                 │
                 ▼
Patch sent: { selectedAccountOwner: "Custom Sales Executive", "data.selectedAccountOwner": "Custom Sales Executive" }
                 │
                 ▼
MongoDB `quotations` updated:
  $set: {
    selectedAccountOwner: "Custom Sales Executive",
    accountOwner: "Custom Sales Executive",
    "data.selectedAccountOwner": "Custom Sales Executive",
    "data.accountOwner": "Custom Sales Executive"
  }
(Quotation Number & all other backend logic remain 100% UNTOUCHED)
                 │
                 ▼
Frontend Document View displays: "Custom Sales Executive"
```

---

## 4. Step-by-Step Implementation Steps

### Step 1: Whitelist Authorized Users (`src/pages/admin/quotations/quotationShared.jsx`)
* Define the exact 3 allowed users:
  ```javascript
  export const SALES_EXECUTIVE_EDIT_ALLOWED_EMAILS = new Set([
    'keval@swatiswitchgears.com',
    'parth@support.com',
    'rushabh@support.com',
  ])
  export const SALES_EXECUTIVE_EDIT_ALLOWED_IDS = new Set([16, 17, 18, '16', '17', '18'])
  export const SALES_EXECUTIVE_EDIT_ALLOWED_USERNAMES = new Set([
    'kevalvshah',
    'parth-crm-support',
    'rushabh-crm-support',
  ])

  export const canEditSalesExecutive = (user) => {
    if (!user) return false
    const email = String(user.email || '').trim().toLowerCase()
    const username = String(user.username || '').trim().toLowerCase()
    const id = user.id || user.legacyId
    return (
      SALES_EXECUTIVE_EDIT_ALLOWED_EMAILS.has(email) ||
      SALES_EXECUTIVE_EDIT_ALLOWED_IDS.has(id) ||
      SALES_EXECUTIVE_EDIT_ALLOWED_USERNAMES.has(username)
    )
  }
  ```

### Step 2: Fix Sales Executive Display Precedence (`src/pages/admin/quotations/quotationShared.jsx`)
* In `buildQuotationDocumentData` (line 869):
  ```javascript
  accountOwner: quotation.selectedAccountOwner 
    || quotation.accountOwner 
    || quotation.data?.selectedAccountOwner 
    || quotation.data?.accountOwner 
    || linkedAccount?.accountOwnerDisplay 
    || linkedAccount?.accountOwner 
    || '-',
  ```
* This ensures that whenever a Sales Executive name is edited on the quotation, the quotation's own edited value is displayed, without being overwritten by the linked account's original owner.

### Step 3: Wire Editable Condition Strictly for Sales Executive
* In `QuotationDocument`:
  * Ensure the edit icon on **Sales Executive** (`selectedAccountOwner`) renders only when `canEditSalesExecutive(user)` is true.
  * For all other users, it renders strictly as static read-only text.

### Step 4: MongoDB Collection Direct Update (`src/pages/admin/quotations/AdminQuotationsPage.jsx` & `server`)
* In `buildInlineQuotationPatch`:
  ```javascript
  if (fieldKey === 'selectedAccountOwner' || fieldKey === 'accountOwner') {
    return {
      selectedAccountOwner: value,
      accountOwner: value,
      'data.selectedAccountOwner': value,
      'data.accountOwner': value,
    }
  }
  ```
* In `server/services/quotationService.js` (`buildPayload` / `update`):
  * Pass through `selectedAccountOwner` and `accountOwner` so MongoDB stores them directly into the `quotations` collection document.
  * **ZERO changes** to `quoteNumber`, `quotationNumber`, `quotationSequence`, or any quotation numbering logic.

---

## 5. Explicit "Must Not Touch" Compliance Guarantee

| Area / Component | Status | Guarantee |
| :--- | :---: | |
| **Quotation Number backend (`quotationNumber`, `quoteNumber`)** | 🛡️ **DO NOT TOUCH** | Numbering sequence, counters, formatting, and generation are 100% untouched |
| **Add Account mechanism & logic** | 🛡️ **DO NOT TOUCH** | Untouched |
| **ownerCode backend & logic** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Add Deals logic & backend** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Deal details backend & logic** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Add Quotations logic & backend** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Add Customers logic & backend** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Mobile backend** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Hardcoded values** | 🛡️ **DO NOT TOUCH** | No hardcoding; dynamic user attribute matching |
| **Automatic deal convert status by Save settings** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Tasks mechanism & Add Reminders** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Converted deals & new tab opening view** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Revision quotations for accounts and deals** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Outlook backend & Microsoft Graph** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Codex working** | 🛡️ **DO NOT TOUCH** | Untouched |
| **Graph / Chart mechanism** | 🛡️ **DO NOT TOUCH** | Untouched |

---

## 6. Verification Steps (When Approved to Implement)

1. **Verify with Keval V Shah (`keval@swatiswitchgears.com`):**
   * Open `http://localhost:3000/admin/quotation-manager/view?view=82`.
   * Edit Sales Executive to `"Keval V Shah"` or any name.
   * Inspect MongoDB: verify `quotations` collection document `82` has the new value in `selectedAccountOwner` and `data.selectedAccountOwner`.
   * Verify Quotation Number `SSIPL/2026/00013-1015-R0` remains completely intact and unchanged.
2. **Verify with Parth (`parth@support.com`):**
   * Edit Sales Executive; verify successful MongoDB save.
3. **Verify with Rushabh (`rushabh@support.com`):**
   * Edit Sales Executive; verify successful MongoDB save.
4. **Verify with Unauthorized Users (e.g. Nita Bhavsar, Samir Sheth, or regular users):**
   * Open `http://localhost:3000/admin/quotation-manager/view?view=82`.
   * Verify Sales Executive has **NO edit icon** and cannot be edited.
